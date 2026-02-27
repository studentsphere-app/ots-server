import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import cors from "cors";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { auth } from "./auth";
import { PrismaClient } from "./generated/prisma/client";
import { encrypt } from "./lib/encryption";
import {
  getProvider,
  getProvider as getProviderById,
  providers,
} from "./providers/index";
import {
  performSync,
  scheduleTimetableSync,
  triggerImmediateSync,
  timetableQueue,
} from "./queue/index";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

interface RequestWithApiKey extends Request {
  apiKeyUser?: {
    userId: string;
    timetableIds: string[];
  };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || "file:./database.db",
});
const prisma = new PrismaClient({ adapter });

app.use(
  cors({
    origin: true, // Allows any origin and reflects it back
    credentials: true, // Required for Better Auth to set session cookies
  })
);

app.use((req, res, next) => {
  next();
});

// Mount Better Auth handler
// Use a regex to match all paths starting with /api/auth
// This preserves the prefix in req.url (unlike app.use with a string)
// and is compatible with Express 5's stricter path parsing.
app.all(/^\/api\/auth.*/, toNodeHandler(auth));

app.use(express.json());

// --- Timetable API ---

/**
 * GET /api/providers
 * Returns the list of available providers.
 */
app.get("/api/providers", (_req, res) => {
  const list = providers.map((p) => ({
    id: p.id,
    name: p.name,
    logo: p.logo,
    schools: p.schools,
  }));
  res.json(list);
});

/**
 * GET /.well-known/ots
 * Returns information about the OTS server and available providers.
 */

app.get("/.well-known/ots", (_req, res) => {
  const providerList = providers.map((p) => ({
    id: p.id,
    name: p.name,
    logo: p.logo,
    schools: p.schools,
  }));

  res.json({
    ots_spec: "1.0",
    service: "open-timetable-scraper",
    providers: providerList,
  });
});

/**
 * GET /api/timetables
 * Returns the user's linked timetables.
 */
app.get("/api/timetables", async (req: Request, res: Response) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session) {
    return res
      .status(401)
      .json({ error: "UNAUTHORIZED", message: "Not authenticated" });
  }

  try {
    const timetables = await prisma.timetable.findMany({
      where: { userId: session.user.id },
      include: { courses: true },
    });

    let syncingTimetableIds: string[] = [];
    if (timetableQueue) {
      const activeJobs = await timetableQueue.getActive();
      const waitingJobs = await timetableQueue.getWaiting();
      syncingTimetableIds = [...activeJobs, ...waitingJobs].map(
        (job) => job.data.timetableId
      );
    }

    const timetablesWithSyncStatus = timetables.map((t) => ({
      ...t,
      isSyncing: syncingTimetableIds.includes(t.id) || t.lastSyncedAt === null,
    }));

    res.json(timetablesWithSyncStatus);
  } catch (error) {
    console.error("[API Error]", error);
    res.status(500).json({
      error: "FETCH_FAILED",
      message: (error as Error).message,
    });
  }
});

/**
 * POST /api/timetables
 * Link a new timetable (test credentials, save, schedule sync).
 */
app.post("/api/timetables", async (req: Request, res: Response) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session) {
    return res
      .status(401)
      .json({ error: "UNAUTHORIZED", message: "Not authenticated" });
  }

  if (!session.user.emailVerified) {
    return res.status(403).json({
      error: "EMAIL_NOT_VERIFIED",
      message: "Veuillez vérifier votre email pour créer un emploi du temps.",
    });
  }

  const {
    providerId,
    schoolId,
    identifier,
    password,
    syncInterval = 60,
  } = req.body;

  if (!providerId || !identifier || !password) {
    return res
      .status(400)
      .json({ error: "BAD_REQUEST", message: "Missing required fields" });
  }

  const provider = getProvider(providerId);
  if (!provider) {
    return res
      .status(400)
      .json({ error: "UNKNOWN_PROVIDER", message: "Provider not found" });
  }

  if (provider.schools && provider.schools.length > 0 && !schoolId) {
    return res.status(400).json({
      error: "MISSING_SCHOOL",
      message: "Veuillez sélectionner une école.",
    });
  }

  try {
    // 1. Validate credentials with the provider
    const isValid = await provider.validateCredentials({
      identifier,
      password,
      schoolId,
    });
    if (!isValid) {
      return res.status(401).json({
        error: "INVALID_CREDENTIALS",
        message: "Identifiants incorrects",
      });
    }

    // 2. Encrypt credentials
    const credsJson = JSON.stringify({ identifier, password });
    const { encryptedData, iv } = encrypt(credsJson);

    const normalizedSchoolId =
      schoolId && schoolId.trim() !== "" ? schoolId : null;

    // Check if timetable already exists
    const existingTimetable = await prisma.timetable.findFirst({
      where: {
        userId: session.user.id,
        providerId,
        schoolId: normalizedSchoolId,
      },
    });

    if (existingTimetable) {
      return res.status(400).json({
        error: "ALREADY_EXISTS",
        message:
          "Vous avez déjà un emploi du temps pour ce même fournisseur ou établissement. Supprimez d'abord votre autre emploi du temps ou ajoutez un nouvel emploi du temps issu d'un autre fournisseur ou établissement.",
      });
    }

    // 3. Save to database
    const timetable = await prisma.timetable.create({
      data: {
        userId: session.user.id,
        providerId,
        schoolId: normalizedSchoolId,
        syncInterval,
        credentials: {
          create: {
            encryptedCredentials: encryptedData,
            iv,
          },
        },
      },
    });

    // 4. Trigger immediate sync job via BullMQ
    await triggerImmediateSync(timetable.id);

    // 5. Schedule recurring sync job
    await scheduleTimetableSync(timetable.id, syncInterval);

    res.status(202).json({
      success: true,
      timetable,
    });
  } catch (error) {
    console.error("[API Error]", error);
    res.status(500).json({
      error: "INTERNAL_ERROR",
      message: (error as Error).message,
    });
  }
});

/**
 * DELETE /api/timetables/:id
 * Deletes a specific timetable and all its associated data.
 */
app.delete("/api/timetables/:id", async (req, res) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session) {
    return res
      .status(401)
      .json({ error: "UNAUTHORIZED", message: "Not authenticated" });
  }

  const id = req.params.id as string;

  try {
    // Check ownership
    const timetable = await prisma.timetable.findUnique({
      where: { id },
    });

    if (!timetable) {
      return res
        .status(404)
        .json({ error: "NOT_FOUND", message: "Emploi du temps non trouvé" });
    }

    if (timetable.userId !== session.user.id) {
      return res
        .status(403)
        .json({ error: "FORBIDDEN", message: "Accès refusé" });
    }

    // Delete (cascades will handle courses, credentials, and oauth access)
    await prisma.timetable.delete({
      where: { id },
    });

    res.json({ success: true, message: "Emploi du temps supprimé" });
  } catch (error) {
    console.error("[API Error]", error);
    res.status(500).json({
      error: "INTERNAL_ERROR",
      message: (error as Error).message,
    });
  }
});

/**
 * GET /api/oauth/validate-consent
 * Validate that a consent code exists and has not expired.
 */
app.get("/api/oauth/validate-consent", async (req: Request, res: Response) => {
  const { consent_code } = req.query;

  if (!consent_code || typeof consent_code !== "string") {
    return res
      .status(400)
      .json({
        error: "BAD_REQUEST",
        message: "Missing or invalid consent_code",
      });
  }

  try {
    const verification = await prisma.verification.findFirst({
      where: {
        identifier: consent_code,
      },
    });

    if (!verification) {
      return res
        .status(404)
        .json({
          error: "NOT_FOUND",
          message: "Consent code not found or expired",
        });
    }

    if (verification.expiresAt < new Date()) {
      return res
        .status(400)
        .json({ error: "EXPIRED", message: "Consent code has expired" });
    }

    res.json({ success: true, valid: true });
  } catch (error) {
    console.error("[API Error]", error);
    res.status(500).json({
      error: "VALIDATION_FAILED",
      message: (error as Error).message,
    });
  }
});

/**
 * GET /api/oauth/client-info/:clientId
 * Public endpoint — returns safe metadata about an OAuth application (no secret).
 */
app.get(
  "/api/oauth/client-info/:clientId",
  async (req: Request, res: Response) => {
    try {
      const clientId = req.params.clientId as string;
      const application = await prisma.oauthApplication.findUnique({
        where: { clientId },
        select: { name: true, icon: true, metadata: true, userId: true },
      });

      if (!application) {
        return res
          .status(404)
          .json({ error: "NOT_FOUND", message: "Application not found" });
      }

      res.json({
        name: application.name,
        icon: application.icon,
        metadata: application.metadata,
        isInternal: !!application.userId,
      });
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({
        error: "FETCH_FAILED",
        message: (error as Error).message,
      });
    }
  }
);

/**
 * POST /api/oauth/timetable-access
 * Save which timetables the user has granted access to for a specific OAuth client.
 */
app.post("/api/oauth/timetable-access", async (req: Request, res: Response) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session) {
    return res
      .status(401)
      .json({ error: "UNAUTHORIZED", message: "Not authenticated" });
  }

  if (!session.user.emailVerified) {
    return res.status(403).json({
      error: "EMAIL_NOT_VERIFIED",
      message: "Veuillez vérifier votre email pour autoriser une application.",
    });
  }

  const { clientId, timetableIds } = req.body;

  if (!clientId || !Array.isArray(timetableIds)) {
    return res.status(400).json({
      error: "BAD_REQUEST",
      message: "Missing clientId or timetableIds",
    });
  }

  try {
    // First, delete any existing access for this client and user
    await prisma.oauthClientTimetableAccess.deleteMany({
      where: {
        clientId,
        userId: session.user.id,
      },
    });

    // Then, create new access records
    if (timetableIds.length > 0) {
      await prisma.oauthClientTimetableAccess.createMany({
        data: timetableIds.map((timetableId: string) => ({
          clientId,
          userId: session.user.id,
          timetableId,
        })),
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("[API Error]", error);
    res.status(500).json({
      error: "SAVE_FAILED",
      message: (error as Error).message,
    });
  }
});

/**
 * GET /api/oauth/timetables
 * Returns the timetables the user has granted access to for the authenticated OAuth client.
 */
app.get("/api/oauth/timetables", async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "UNAUTHORIZED", message: "Missing or invalid token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const accessToken = await prisma.oauthAccessToken.findUnique({
      where: { accessToken: token },
      include: { user: true },
    });

    if (!accessToken || !accessToken.userId || !accessToken.clientId) {
      return res
        .status(401)
        .json({ error: "UNAUTHORIZED", message: "Invalid token" });
    }

    if (
      accessToken.accessTokenExpiresAt &&
      accessToken.accessTokenExpiresAt < new Date()
    ) {
      return res
        .status(401)
        .json({ error: "UNAUTHORIZED", message: "Token expired" });
    }

    const accesses = await prisma.oauthClientTimetableAccess.findMany({
      where: {
        clientId: accessToken.clientId,
        userId: accessToken.userId,
      },
      include: {
        timetable: {
          include: { courses: true },
        },
      },
    });

    const timetables = accesses.map((a) => a.timetable);

    res.json(timetables);
  } catch (error) {
    console.error("[OAuth API Error]", error);
    res.status(500).json({
      error: "FETCH_FAILED",
      message: (error as Error).message,
    });
  }
});

/**
 * GET /api/oauth/authorized-apps
 * Returns the list of OAuth applications the user has authorized.
 */
app.get("/api/oauth/authorized-apps", async (req: Request, res: Response) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session) {
    return res
      .status(401)
      .json({ error: "UNAUTHORIZED", message: "Not authenticated" });
  }

  try {
    // Find all unique client IDs the user has granted access to
    const accesses = await prisma.oauthClientTimetableAccess.findMany({
      where: { userId: session.user.id },
      include: {
        oauthapplication: true,
        timetable: {
          include: {
            courses: true,
          },
        },
      },
    });

    let syncingTimetableIds: string[] = [];
    if (timetableQueue) {
      const activeJobs = await timetableQueue.getActive();
      const waitingJobs = await timetableQueue.getWaiting();
      syncingTimetableIds = [...activeJobs, ...waitingJobs].map(
        (job) => job.data.timetableId
      );
    }

    // Group by application
    const appsMap = new Map();
    for (const access of accesses) {
      if (!appsMap.has(access.clientId)) {
        appsMap.set(access.clientId, {
          app: access.oauthapplication,
          createdAt: access.createdAt,
          timetables: [],
        });
      }

      const timetableWithSyncStatus = {
        ...access.timetable,
        isSyncing:
          syncingTimetableIds.includes(access.timetable.id) ||
          access.timetable.lastSyncedAt === null,
      };

      appsMap.get(access.clientId).timetables.push(timetableWithSyncStatus);
    }

    const result = Array.from(appsMap.values());
    res.json(result);
  } catch (error) {
    console.error("[API Error]", error);
    res.status(500).json({
      error: "FETCH_FAILED",
      message: (error as Error).message,
    });
  }
});

/**
 * DELETE /api/oauth/authorized-apps/:clientId
 * Revokes access for a specific OAuth application.
 */
app.delete(
  "/api/oauth/authorized-apps/:clientId",
  async (req: Request, res: Response) => {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      return res
        .status(401)
        .json({ error: "UNAUTHORIZED", message: "Not authenticated" });
    }

    const clientId = req.params.clientId as string;

    try {
      // Delete timetable accesses
      await prisma.oauthClientTimetableAccess.deleteMany({
        where: {
          userId: session.user.id,
          clientId,
        },
      });

      // Delete consents
      await prisma.oauthConsent.deleteMany({
        where: {
          userId: session.user.id,
          clientId: clientId as string,
        },
      });

      // Delete access tokens
      await prisma.oauthAccessToken.deleteMany({
        where: {
          userId: session.user.id,
          clientId: clientId as string,
        },
      });

      res.json({ success: true });
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({
        error: "REVOKE_FAILED",
        message: (error as Error).message,
      });
    }
  }
);

// --- Developer OAuth Management Routes ---

/**
 * GET /api/oauth/developer/applications
 * Returns the developer's registered OAuth applications
 */
app.get(
  "/api/oauth/developer/applications",
  async (req: Request, res: Response) => {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      return res
        .status(401)
        .json({ error: "UNAUTHORIZED", message: "Not authenticated" });
    }

    try {
      const applications = await prisma.oauthApplication.findMany({
        where: { userId: session.user.id },
        select: {
          id: true,
          name: true,
          icon: true,
          metadata: true,
          clientId: true,
          redirectUrls: true,
          type: true,
          disabled: true,
          createdAt: true,
          updatedAt: true,
          // specifically NOT selecting clientSecret to avoid leaking it
        },
        orderBy: { createdAt: "desc" },
      });

      // Parse metadata back to object for convenience
      const appsWithMetadata = applications.map((app) => {
        let parsedMetadata = {};
        try {
          if (app.metadata) {
            parsedMetadata = JSON.parse(app.metadata);
          }
        } catch (e) {
          // Fallback if metadata is invalid JSON
        }
        return {
          ...app,
          metadataParsed: parsedMetadata,
        };
      });

      res.json(appsWithMetadata);
    } catch (error) {
      console.error("[API Error]", error);
      res
        .status(500)
        .json({ error: "FETCH_FAILED", message: (error as Error).message });
    }
  }
);

/**
 * POST /api/oauth/developer/applications
 * Creates a new OAuth application
 */
app.post(
  "/api/oauth/developer/applications",
  async (req: Request, res: Response) => {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      return res
        .status(401)
        .json({ error: "UNAUTHORIZED", message: "Not authenticated" });
    }

    const {
      name,
      icon,
      redirectUrls, // array of strings or comma-separated string
      website,
      requestedPermissions,
      developerContact,
      tosLink,
      privacyPolicyLink,
    } = req.body;

    if (!name) {
      return res
        .status(400)
        .json({
          error: "BAD_REQUEST",
          message: "Application name is required",
        });
    }

    try {
      const clientId = crypto.randomBytes(16).toString("hex");
      const clientSecret = crypto.randomBytes(32).toString("base64url");
      const id = crypto.randomBytes(16).toString("hex"); // Prisma requires an id

      const scopes = Array.isArray(requestedPermissions) ? requestedPermissions : [];
      if (!scopes.includes("openid")) {
        scopes.push("openid");
      }

      const metadataObj = {
        website: website || "",
        requestedPermissions: scopes,
        developerContact: developerContact || "",
        tosLink: tosLink || "",
        privacyPolicyLink: privacyPolicyLink || "",
      };

      const parsedRedirects = Array.isArray(redirectUrls)
        ? redirectUrls.join(",")
        : redirectUrls;

      const newApp = await prisma.oauthApplication.create({
        data: {
          id,
          name,
          icon,
          clientId,
          clientSecret,
          redirectUrls: parsedRedirects,
          metadata: JSON.stringify(metadataObj), // store standard OpenID provider stuff
          userId: session.user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      res.json({
        success: true,
        application: {
          id: newApp.id,
          name: newApp.name,
          clientId: newApp.clientId,
          clientSecret: newApp.clientSecret, // Returned ONLY ONCE
          icon: newApp.icon,
          redirectUrls: newApp.redirectUrls,
          metadataParsed: metadataObj,
        },
      });
    } catch (error) {
      console.error("[API Error]", error);
      res
        .status(500)
        .json({ error: "CREATE_FAILED", message: (error as Error).message });
    }
  }
);

/**
 * PUT /api/oauth/developer/applications/:clientId
 * Updates an OAuth application details
 */
app.put(
  "/api/oauth/developer/applications/:clientId",
  async (req: Request, res: Response) => {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      return res
        .status(401)
        .json({ error: "UNAUTHORIZED", message: "Not authenticated" });
    }

    const clientId = req.params.clientId as string;
    const {
      name,
      icon,
      redirectUrls,
      website,
      requestedPermissions,
      developerContact,
      tosLink,
      privacyPolicyLink,
    } = req.body;

    try {
      const existing = await prisma.oauthApplication.findFirst({
        where: { clientId: String(clientId), userId: String(session.user.id) },
      });

      if (!existing) {
        return res
          .status(404)
          .json({ error: "NOT_FOUND", message: "Application not found" });
      }

      let parsedMetadata: any = {};
      if (existing.metadata) {
        try {
          parsedMetadata = JSON.parse(existing.metadata);
        } catch (e) {}
      }

      let scopesToSave = parsedMetadata.requestedPermissions || [];
      if (requestedPermissions !== undefined) {
         scopesToSave = Array.isArray(requestedPermissions) ? requestedPermissions : [];
      }
      if (!scopesToSave.includes("openid")) {
         scopesToSave.push("openid");
      }

      const newMetadata = {
        ...parsedMetadata,
        website: website !== undefined ? website : parsedMetadata.website,
        requestedPermissions: scopesToSave,
        developerContact:
          developerContact !== undefined
            ? developerContact
            : parsedMetadata.developerContact,
        tosLink: tosLink !== undefined ? tosLink : parsedMetadata.tosLink,
        privacyPolicyLink:
          privacyPolicyLink !== undefined
            ? privacyPolicyLink
            : parsedMetadata.privacyPolicyLink,
      };

      const parsedRedirects = Array.isArray(redirectUrls)
        ? redirectUrls.join(",")
        : redirectUrls !== undefined
          ? String(redirectUrls)
          : existing.redirectUrls;

      const updated = await prisma.oauthApplication.update({
        where: { clientId: String(clientId) },
        data: {
          name: name !== undefined ? String(name) : existing.name,
          icon: icon !== undefined ? String(icon) : existing.icon,
          redirectUrls: parsedRedirects as string,
          metadata: JSON.stringify(newMetadata),
          updatedAt: new Date(),
        },
      });

      res.json({
        success: true,
        application: {
          ...updated,
          metadataParsed: newMetadata,
          clientSecret: undefined,
        },
      });
    } catch (error) {
      console.error("[API Error]", error);
      res
        .status(500)
        .json({ error: "UPDATE_FAILED", message: (error as Error).message });
    }
  }
);

/**
 * POST /api/oauth/developer/applications/:clientId/reset-secret
 * Generates and returns a new client secret
 */
app.post(
  "/api/oauth/developer/applications/:clientId/reset-secret",
  async (req: Request, res: Response) => {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      return res
        .status(401)
        .json({ error: "UNAUTHORIZED", message: "Not authenticated" });
    }

    const { clientId } = req.params;

    try {
      const existing = await prisma.oauthApplication.findFirst({
        where: { clientId: String(clientId), userId: String(session.user.id) },
      });

      if (!existing) {
        return res
          .status(404)
          .json({ error: "NOT_FOUND", message: "Application not found" });
      }

      const newSecret = crypto.randomBytes(32).toString("base64url");

      await prisma.oauthApplication.update({
        where: { clientId: String(clientId) },
        data: {
          clientSecret: newSecret,
          updatedAt: new Date(),
        },
      });

      res.json({ success: true, clientSecret: newSecret });
    } catch (error) {
      console.error("[API Error]", error);
      res
        .status(500)
        .json({ error: "RESET_FAILED", message: (error as Error).message });
    }
  }
);

/**
 * POST /api/oauth/developer/applications/:clientId/revoke-all
 * Revokes all tokens, consents, and accesses for the given application
 */
app.post(
  "/api/oauth/developer/applications/:clientId/revoke-all",
  async (req: Request, res: Response) => {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      return res
        .status(401)
        .json({ error: "UNAUTHORIZED", message: "Not authenticated" });
    }

    const { clientId } = req.params;

    try {
      const existing = await prisma.oauthApplication.findFirst({
        where: { clientId: String(clientId), userId: String(session.user.id) },
      });

      if (!existing) {
        return res
          .status(404)
          .json({ error: "NOT_FOUND", message: "Application not found" });
      }

      await prisma.$transaction([
        prisma.oauthAccessToken.deleteMany({
          where: { clientId: String(clientId) },
        }),
        prisma.oauthConsent.deleteMany({
          where: { clientId: String(clientId) },
        }),
        prisma.oauthClientTimetableAccess.deleteMany({
          where: { clientId: String(clientId) },
        }),
      ]);

      res.json({ success: true, message: "All tokens revoked" });
    } catch (error) {
      console.error("[API Error]", error);
      res
        .status(500)
        .json({ error: "REVOKE_FAILED", message: (error as Error).message });
    }
  }
);

/**
 * DELETE /api/oauth/developer/applications/:clientId
 * Deletes the developer OAuth application
 */
app.delete(
  "/api/oauth/developer/applications/:clientId",
  async (req: Request, res: Response) => {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      return res
        .status(401)
        .json({ error: "UNAUTHORIZED", message: "Not authenticated" });
    }

    const clientId = req.params.clientId as string;

    try {
      const existing = await prisma.oauthApplication.findFirst({
        where: { clientId: String(clientId), userId: String(session.user.id) },
      });

      if (!existing) {
        return res
          .status(404)
          .json({ error: "NOT_FOUND", message: "Application not found" });
      }

      // Delete application
      await prisma.oauthApplication.delete({
        where: { clientId: String(clientId) },
      });

      res.json({ success: true, message: "Application deleted successfully" });
    } catch (error) {
      console.error("[API Error]", error);
      res
        .status(500)
        .json({ error: "DELETE_FAILED", message: (error as Error).message });
    }
  }
);

// --- API Key Management Routes ---

/**
 * GET /api/api-keys
 * Returns all API keys for the authenticated user
 */
app.get("/api/api-keys", async (req: Request, res: Response) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session) {
    return res
      .status(401)
      .json({ error: "UNAUTHORIZED", message: "Not authenticated" });
  }

  try {
    const apiKeys = await prisma.apikey.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        name: true,
        prefix: true,
        metadata: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
        lastUsedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(apiKeys);
  } catch (error) {
    console.error("[API Keys Error]", error);
    res.status(500).json({
      error: "FETCH_FAILED",
      message: (error as Error).message,
    });
  }
});

/**
 * POST /api/api-keys
 * Creates a new API key with metadata for timetable access
 */
app.post("/api/api-keys", async (req: Request, res: Response) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session) {
    return res
      .status(401)
      .json({ error: "UNAUTHORIZED", message: "Not authenticated" });
  }

  const { name, expiresIn, timetableIds } = req.body;

  if (!name || !expiresIn || !Array.isArray(timetableIds)) {
    return res.status(400).json({
      error: "BAD_REQUEST",
      message: "Missing required fields: name, expiresIn, timetableIds",
    });
  }

  // Validate that all timetables belong to the user
  const timetables = await prisma.timetable.findMany({
    where: {
      id: { in: timetableIds },
      userId: session.user.id,
    },
  });

  if (timetables.length !== timetableIds.length) {
    return res.status(403).json({
      error: "FORBIDDEN",
      message: "One or more timetables do not belong to you",
    });
  }

  try {
    const result = await auth.api.createApiKey({
      body: {
        name,
        expiresIn,
        userId: session.user.id,
        metadata: {
          timetableIds,
        },
      },
    });

    res.json({
      success: true,
      apiKey: result,
    });
  } catch (error) {
    console.error("[API Keys Error]", error);
    res.status(500).json({
      error: "CREATE_FAILED",
      message: (error as Error).message,
    });
  }
});

/**
 * DELETE /api/api-keys/:keyId
 * Deletes a specific API key
 */
app.delete("/api/api-keys/:keyId", async (req: Request, res: Response) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session) {
    return res
      .status(401)
      .json({ error: "UNAUTHORIZED", message: "Not authenticated" });
  }

  const keyId = req.params.keyId as string;

  try {
    // Check ownership
    const apiKey = await prisma.apikey.findUnique({
      where: { id: keyId },
    });

    if (!apiKey) {
      return res
        .status(404)
        .json({ error: "NOT_FOUND", message: "API key not found" });
    }

    if (apiKey.userId !== session.user.id) {
      return res
        .status(403)
        .json({ error: "FORBIDDEN", message: "Access denied" });
    }

    await prisma.apikey.delete({
      where: { id: keyId },
    });

    res.json({ success: true, message: "API key deleted" });
  } catch (error) {
    console.error("[API Keys Error]", error);
    res.status(500).json({
      error: "DELETE_FAILED",
      message: (error as Error).message,
    });
  }
});

/**
 * PATCH /api/api-keys/:keyId
 * Updates an API key's metadata (timetable access)
 */
app.patch("/api/api-keys/:keyId", async (req: Request, res: Response) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session) {
    return res
      .status(401)
      .json({ error: "UNAUTHORIZED", message: "Not authenticated" });
  }

  const keyId = req.params.keyId as string;
  const { name, timetableIds } = req.body;

  try {
    // Check ownership
    const apiKey = await prisma.apikey.findUnique({
      where: { id: keyId },
    });

    if (!apiKey) {
      return res
        .status(404)
        .json({ error: "NOT_FOUND", message: "API key not found" });
    }

    if (apiKey.userId !== session.user.id) {
      return res
        .status(403)
        .json({ error: "FORBIDDEN", message: "Access denied" });
    }

    // Validate timetables if provided
    if (timetableIds && Array.isArray(timetableIds)) {
      const timetables = await prisma.timetable.findMany({
        where: {
          id: { in: timetableIds },
          userId: session.user.id,
        },
      });

      if (timetables.length !== timetableIds.length) {
        return res.status(403).json({
          error: "FORBIDDEN",
          message: "One or more timetables do not belong to you",
        });
      }
    }

    // biome-ignore lint/suspicious/noExplicitAny: dynamic update object
    const updateData: any = {};
    if (name) updateData.name = name;
    if (timetableIds) {
      updateData.metadata = {
        ...(typeof apiKey.metadata === "object" ? apiKey.metadata : {}),
        timetableIds,
      };
    }

    const updatedKey = await prisma.apikey.update({
      where: { id: keyId },
      data: updateData,
      select: {
        id: true,
        name: true,
        prefix: true,
        metadata: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
        lastUsedAt: true,
      },
    });

    res.json({ success: true, apiKey: updatedKey });
  } catch (error) {
    console.error("[API Keys Error]", error);
    res.status(500).json({
      error: "UPDATE_FAILED",
      message: (error as Error).message,
    });
  }
});

// --- Public API Routes (authenticated via API Key) ---

/**
 * Middleware to validate API key and extract user + allowed timetables
 */
async function validateApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers["x-api-key"] as string | string[] | undefined;
  const keyString = (Array.isArray(apiKey) ? apiKey[0] : apiKey)?.trim();

  if (!keyString) {
    return res.status(401).json({
      error: "UNAUTHORIZED",
      message: "Missing x-api-key header",
    });
  }

  try {
    console.log(
      `[API Key Validation] Validating key: ${keyString.substring(0, 6)}... (len: ${keyString.length})`
    );

    const result = await auth.api.verifyApiKey({
      body: {
        key: keyString,
      },
      headers: fromNodeHeaders(req.headers),
    });

    if (!result.valid || !result.key) {
      console.error(
        "[API Key Validation] Validation failed:",
        JSON.stringify(result.error, null, 2)
      );
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: result.error?.message || "Invalid API key",
      });
    }

    const keyRecord = result.key;
    console.log(
      `[API Key Validation] Success. Key ID: ${keyRecord.id}, User ID: ${keyRecord.userId}`
    );

    // Extract timetable IDs from metadata
    let metadata: Record<string, unknown> = {};

    if (typeof keyRecord.metadata === "string") {
      try {
        metadata = JSON.parse(keyRecord.metadata);
      } catch (_e) {
        metadata = {};
      }
    } else if (
      typeof keyRecord.metadata === "object" &&
      keyRecord.metadata !== null
    ) {
      metadata = keyRecord.metadata as Record<string, unknown>;
    }

    const timetableIds = Array.isArray(metadata.timetableIds)
      ? (metadata.timetableIds as string[])
      : [];
    console.log(
      `[API Key Validation] Authorized timetables: ${JSON.stringify(timetableIds)}`
    );

    // Attach to request
    (req as RequestWithApiKey).apiKeyUser = {
      userId: keyRecord.userId,
      timetableIds,
    };

    next();
  } catch (error) {
    console.error("[API Key Validation Error]", error);
    res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Failed to validate API key",
    });
  }
}

/**
 * GET /api/v1/hello
 * Check if API key is valid and return authorized timetables (basic info)
 */
app.get(
  "/api/v1/hello",
  validateApiKey,
  async (req: Request, res: Response) => {
    const { userId, timetableIds } = (req as RequestWithApiKey)
      .apiKeyUser as NonNullable<RequestWithApiKey["apiKeyUser"]>;

    try {
      const timetables = await prisma.timetable.findMany({
        where: {
          userId,
          id: { in: timetableIds },
        },
        select: {
          id: true,
          providerId: true,
          schoolId: true,
          lastSyncedAt: true,
          createdAt: true,
        },
      });

      // Add provider and school names
      const authorizedTimetables = timetables.map((t) => {
        const provider = getProviderById(t.providerId);
        const school = provider?.schools?.find((s) => s.id === t.schoolId);

        return {
          id: t.id,
          providerId: t.providerId,
          providerName: provider?.name || "Unknown",
          schoolId: t.schoolId,
          schoolName: school?.name || null,
          lastSyncedAt: t.lastSyncedAt,
          createdAt: t.createdAt,
        };
      });

      res.json({
        success: true,
        message: "API key is valid",
        authorizedTimetables,
      });
    } catch (error) {
      console.error("[API v1 Hello Error]", error);
      res.status(500).json({
        error: "INTERNAL_ERROR",
        message: "Failed to check API key status",
      });
    }
  }
);

/**
 * GET /api/v1/timetables
 * Returns all timetables accessible via the API key
 */
app.get(
  "/api/v1/timetables",
  validateApiKey,
  async (req: Request, res: Response) => {
    const { userId, timetableIds } = (req as RequestWithApiKey)
      .apiKeyUser as NonNullable<RequestWithApiKey["apiKeyUser"]>;

    try {
      const timetables = await prisma.timetable.findMany({
        where: {
          userId,
          id: { in: timetableIds },
        },
        include: {
          courses: true,
        },
      });

      // Add provider and school info
      const enrichedTimetables = timetables.map((t) => {
        const provider = getProviderById(t.providerId);
        const school = provider?.schools?.find((s) => s.id === t.schoolId);

        return {
          id: t.id,
          providerId: t.providerId,
          providerName: provider?.name || "Unknown",
          schoolId: t.schoolId,
          schoolName: school?.name || null,
          syncInterval: t.syncInterval,
          lastSyncedAt: t.lastSyncedAt,
          createdAt: t.createdAt,
          coursesCount: t.courses.length,
          courses: t.courses.map((c) => ({
            id: c.id,
            title: c.subject,
            description: null,
            location: c.location,
            startDate: c.start,
            endDate: c.end,
            allDay: false,
            category: null,
            instructors: c.teacher ? [c.teacher] : [],
            groups: [],
            metadata: {},
          })),
        };
      });

      res.json(enrichedTimetables);
    } catch (error) {
      console.error("[API v1 Timetables Error]", error);
      res.status(500).json({
        error: "FETCH_FAILED",
        message: (error as Error).message,
      });
    }
  }
);

/**
 * GET /api/v1/timetables/:id
 * Returns a specific timetable accessible via the API key
 */
app.get(
  "/api/v1/timetables/:id",
  validateApiKey,
  async (req: Request, res: Response) => {
    const { userId, timetableIds } = (req as RequestWithApiKey)
      .apiKeyUser as NonNullable<RequestWithApiKey["apiKeyUser"]>;
    const id = req.params.id as string;

    if (!timetableIds.includes(id)) {
      return res.status(403).json({
        error: "FORBIDDEN",
        message: "This API key does not have access to this timetable",
      });
    }

    try {
      const timetable = await prisma.timetable.findFirst({
        where: {
          id: id,
          userId,
        },
        include: {
          courses: true,
        },
      });

      if (!timetable) {
        return res.status(404).json({
          error: "NOT_FOUND",
          message: "Timetable not found",
        });
      }

      const provider = getProviderById(timetable.providerId);
      const school = provider?.schools?.find(
        (s) => s.id === timetable.schoolId
      );

      const enrichedTimetable = {
        id: timetable.id,
        providerId: timetable.providerId,
        providerName: provider?.name || "Unknown",
        schoolId: timetable.schoolId,
        schoolName: school?.name || null,
        syncInterval: timetable.syncInterval,
        lastSyncedAt: timetable.lastSyncedAt,
        createdAt: timetable.createdAt,
        coursesCount: timetable.courses.length,
        courses: timetable.courses.map((c) => ({
          id: c.id,
          title: c.subject,
          description: null,
          location: c.location,
          startDate: c.start,
          endDate: c.end,
          allDay: false,
          category: null,
          instructors: c.teacher ? [c.teacher] : [],
          groups: [],
          metadata: {},
        })),
      };

      res.json(enrichedTimetable);
    } catch (error) {
      console.error("[API v1 Error]", error);
      res.status(500).json({
        error: "FETCH_FAILED",
        message: (error as Error).message,
      });
    }
  }
);

app.get("/api/health", (_req, res) => {
  res.send({ status: "ok", service: "Open Timetable Scraper Hub" });
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, "public")));

// Handle SPA routing - return index.html for all non-API routes
app.get(/.*/, (req, res, next) => {
  if (req.path.startsWith("/api")) {
    return next();
  }
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, () => {});
