import crypto from "node:crypto";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { type Job, Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import { PrismaClient } from "../generated/prisma/client";
import { decrypt } from "../lib/encryption";
import { getProvider } from "../providers/index";

let redisConnection: Redis | null = null;
let timetableQueue: Queue | null = null;
let timetableWorker: Worker | null = null;

try {
  redisConnection = new Redis(
    process.env.REDIS_URL || "redis://localhost:6379",
    {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      retryStrategy: () => null, // Don't retry on connection failure
    }
  );

  // Test connection
  await redisConnection.connect().catch((err) => {
    console.warn(
      "[Queue] Redis connection failed, queue will be disabled:",
      err.message
    );
    redisConnection = null;
  });

  if (redisConnection) {
    timetableQueue = new Queue("timetable-sync", {
      // biome-ignore lint/suspicious/noExplicitAny: library type mismatch
      connection: redisConnection as any,
    });
  }
  // biome-ignore lint/suspicious/noExplicitAny: error type is unknown
} catch (error: any) {
  console.warn("[Queue] Failed to initialize Redis queue:", error.message);
  console.warn("[Queue] The server will run without background job processing");
  redisConnection = null;
  timetableQueue = null;
}

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || "file:./database.db",
});
const prisma = new PrismaClient({ adapter });

export { timetableQueue };

export async function performSync(timetableId: string) {
  if (!timetableQueue) {
    console.warn("[Queue] Queue not available, sync skipped");
    return { success: false, message: "Queue not initialized" };
  }

  try {
    const timetable = await prisma.timetable.findUnique({
      where: { id: timetableId },
      include: { credentials: true },
    });

    if (!timetable || !timetable.credentials) {
      console.warn(
        `[Worker] Timetable or credentials not found for ID ${timetableId} - removing job from queue`
      );
      // Remove the repeatable job since the timetable doesn't exist anymore
      const repeatableJobs = await timetableQueue.getRepeatableJobs();
      for (const job of repeatableJobs) {
        if (job.id === `sync-${timetableId}`) {
          await timetableQueue.removeRepeatableByKey(job.key);
        }
      }
      return { success: false, message: "Timetable not found" };
    }

    const provider = getProvider(timetable.providerId);
    if (!provider) {
      throw new Error(`Provider ${timetable.providerId} not found`);
    }

    // Decrypt credentials
    const decryptedCredsStr = decrypt(
      timetable.credentials.encryptedCredentials,
      timetable.credentials.iv
    );
    const credentials = JSON.parse(decryptedCredsStr);
    if (timetable.schoolId) {
      credentials.schoolId = timetable.schoolId;
    }

    const now = new Date();
    const currentYear = now.getFullYear();

    // If we are before September (0-7), the academic year started last year
    const startYear = now.getMonth() < 8 ? currentYear - 1 : currentYear;

    const period = {
      startDate: new Date(startYear, 8, 1), // September 1st
      endDate: new Date(startYear + 1, 7, 30), // August 30th
    };

    // Fetch schedule (e.g., next 2 weeks)
    const from = period.startDate;
    const to = period.endDate;
    to.setDate(to.getDate() + 14);

    const courses = await provider.getSchedule(credentials, from, to);

    // Update database
    // 1. Delete old courses in this range (or all future courses)
    await prisma.course.deleteMany({
      where: {
        timetableId: timetable.id,
        start: { gte: from },
      },
    });

    // 2. Insert new courses
    if (courses.length > 0) {
      await prisma.course.createMany({
        data: courses.map((c) => ({
          timetableId: timetable.id,
          hash: c.hash || crypto.randomUUID(),
          subject: c.subject,
          start: c.start,
          end: c.end,
          location: c.location,
          teacher: c.teacher,
          color: c.color,
        })),
      });
    }

    // 3. Update last synced time
    await prisma.timetable.update({
      where: { id: timetable.id },
      data: { lastSyncedAt: new Date() },
    });

    return { success: true, coursesCount: courses.length };
    // biome-ignore lint/suspicious/noExplicitAny: error type is unknown
  } catch (error: any) {
    console.error(
      `[Worker] Failed to sync timetable ${timetableId}:`,
      error.message
    );
    throw error;
  }
}

if (redisConnection && timetableQueue) {
  timetableWorker = new Worker(
    "timetable-sync",
    async (job: Job) => {
      const { timetableId } = job.data;
      return performSync(timetableId);
    },
    {
      // biome-ignore lint/suspicious/noExplicitAny: library type mismatch
      connection: redisConnection as any,
    }
  );

  timetableWorker.on("completed", (_job) => {});

  timetableWorker.on("failed", (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed with error:`, err.message);
  });
} else {
  console.warn("[Queue] Worker not started - Redis unavailable");
}

export { timetableWorker };

// Helper to schedule a sync job
export async function scheduleTimetableSync(
  timetableId: string,
  intervalMinutes: number
) {
  if (!timetableQueue) {
    console.warn("[Queue] Cannot schedule sync - queue not initialized");
    return;
  }

  const jobId = `sync-${timetableId}`;

  // Remove existing repeatable jobs for this timetable
  const repeatableJobs = await timetableQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.id === jobId) {
      await timetableQueue.removeRepeatableByKey(job.key);
    }
  }

  // Add new repeatable job
  await timetableQueue.add(
    "sync",
    { timetableId },
    {
      jobId,
      repeat: {
        every: intervalMinutes * 60 * 1000, // Convert minutes to ms
      },
    }
  );
}

// Helper to trigger an immediate sync
export async function triggerImmediateSync(timetableId: string) {
  if (!timetableQueue) {
    console.warn(
      "[Queue] Cannot trigger immediate sync - queue not initialized"
    );
    return;
  }

  await timetableQueue.add("sync-immediate", { timetableId });
}
