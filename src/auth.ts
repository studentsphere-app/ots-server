import { betterAuth, type BetterAuthOptions } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { apiKey, oidcProvider } from "better-auth/plugins";
import nodemailer from "nodemailer";
import { PrismaClient } from "./generated/prisma/client.js";
import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { renderEmail } from "./lib/email-renderer";
import { t } from "./lib/i18n.server";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "localhost",
  port: parseInt(process.env.SMTP_PORT || "1025", 10),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER || "user",
    pass: process.env.SMTP_PASS || "pass",
  },
});

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || "file:./database.db",
});
const prisma = new PrismaClient({ adapter });

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  trustedOrigins: process.env.TRUSTED_ORIGINS
    ? process.env.TRUSTED_ORIGINS.split(",")
    : ["http://localhost:5173", "http://localhost:5174"],
  database: prismaAdapter(prisma, {
    provider: "sqlite",
  }),
  user: {
    changeEmail: {
      enabled: true,
    },
    deleteUser: {
      enabled: true,
    },
    additionalFields: {
      language: {
        type: "string",
        defaultValue: "fr",
      },
    },
  },
  events: {
    user: {
      deleted: async ({ user }: { user: any }) => {
        try {
          const lang = user.language || "fr";
          const html = await renderEmail(
            "account-deleted",
            {
              name: user.name || user.email,
            },
            lang
          );

          await transporter.sendMail({
            from:
              process.env.EMAIL_FROM ||
              '"Open TimeTable Scraper" <noreply@opentimetable.app>',
            to: user.email,
            subject: t("email.subjects.account-deleted", lang),
            html,
          });
          console.log(`Final deletion email sent to ${user.email}`);
        } catch (error) {
          console.error(
            `Failed to send deletion confirmation email to ${user.email}:`,
            error
          );
        }
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    sendResetPassword: async ({ user, url }, _request) => {
      const lang = (user as any).language || "fr";
      const html = await renderEmail(
        "reset-password",
        {
          name: user.name || user.email,
          url: url,
        },
        lang
      );

      await transporter.sendMail({
        from:
          process.env.EMAIL_FROM ||
          '"Open TimeTable Scraper" <noreply@opentimetable.app>',
        to: user.email,
        subject: t("email.subjects.reset-password", lang),
        html,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }, request) => {
      try {
        const isEmailChange =
          request?.url?.includes("change-email") ||
          request?.url?.includes("verify-email");
        console.log(
          `[AUTH] Sending verification email to ${user.email} (isEmailChange: ${!!isEmailChange})`
        );

        const lang = (user as any).language || "fr";
        const template = isEmailChange ? "verify-new-email" : "verification";
        const subjectKey = isEmailChange
          ? "email.subjects.verify-new-email"
          : "email.subjects.verification";

        const html = await renderEmail(
          template as any,
          {
            name: user.name || user.email,
            url: url,
          },
          lang
        );

        await transporter.sendMail({
          from:
            process.env.EMAIL_FROM ||
            '"Open TimeTable Scraper" <noreply@opentimetable.app>',
          to: user.email,
          subject: t(subjectKey, lang),
          html,
        });
      } catch (error) {
        console.error(
          `Failed to send verification email to ${user.email}:`,
          error
        );
      }
    },
  },
  plugins: [
    oidcProvider({
      loginPage: process.env.FRONTEND_URL
        ? `${process.env.FRONTEND_URL}/login`
        : "http://localhost:5173/login",
      consentPage: process.env.FRONTEND_URL
        ? `${process.env.FRONTEND_URL}/consent`
        : "http://localhost:5173/consent",
      allowDynamicClientRegistration: true,
      scopes: ["openid", "profile", "email", "timetable", "offline_access"],
      metadata: {
        scopes_supported: [
          "openid",
          "profile",
          "email",
          "offline_access",
          "timetable",
        ],
      },
      accessTokenExpiresIn: 7200, // 2 hours
      refreshTokenExpiresIn: 31536000, // 1 year
      getAdditionalUserInfoClaim: async ({ scopes }) => {
        if (scopes?.includes("timetable")) {
          return {
            timetable_access: true,
          };
        }
        return {};
      },
    }),
    apiKey({
      enableMetadata: true,
      defaultPrefix: "ots_",
      keyExpiration: {
        defaultExpiresIn: 60 * 60 * 24 * 365, // 1 an par défaut (en secondes)
        minExpiresIn: 1, // minimum 1 jour (en jours)
        maxExpiresIn: 365 * 5, // maximum 5 ans (en jours)
      },
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
