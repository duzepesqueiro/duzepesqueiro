import { randomUUID } from 'crypto';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

type JobRunnerResult =
  | { status: 'executed'; runId: string }
  | { status: 'skipped'; runId: string };

function fnv1a64(input: string): bigint {
  let hash = 14695981039346656037n;
  for (const ch of input) {
    hash ^= BigInt(ch.codePointAt(0) ?? 0);
    hash = (hash * 1099511628211n) & 18446744073709551615n;
  }
  return hash;
}

function toSignedInt64(value: bigint): bigint {
  const maxSigned = 9223372036854775807n;
  return value > maxSigned ? value - 18446744073709551616n : value;
}

async function tryAcquireAdvisoryLock(
  prisma: PrismaService,
  lockId: bigint,
): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ locked: boolean }>>`
    SELECT pg_try_advisory_lock(${lockId}) AS locked
  `;
  return Boolean(rows?.[0]?.locked);
}

async function releaseAdvisoryLock(prisma: PrismaService, lockId: bigint): Promise<void> {
  await prisma.$queryRaw`SELECT pg_advisory_unlock(${lockId})`;
}

export async function runExclusiveJob(
  prisma: PrismaService,
  jobKey: string,
  handler: () => Promise<void>,
): Promise<JobRunnerResult> {
  const now = new Date();
  const lockId = toSignedInt64(fnv1a64(jobKey));
  const runId = randomUUID();

  const acquired = await tryAcquireAdvisoryLock(prisma, lockId);
  if (!acquired) {
    await prisma.$executeRaw`
      INSERT INTO "job_runs"
        ("id", "job_key", "status", "started_at", "finished_at", "error_message", "meta", "created_at", "updated_at")
      VALUES
        (${runId}, ${jobKey}, ${'SKIPPED'}::"JobRunStatus", ${now}, ${now}, NULL, ${JSON.stringify({ reason: 'lock_not_acquired' })}::jsonb, ${now}, ${now})
    `;
    return { status: 'skipped', runId };
  }

  await prisma.$executeRaw`
    INSERT INTO "job_runs"
      ("id", "job_key", "status", "started_at", "finished_at", "error_message", "meta", "created_at", "updated_at")
    VALUES
      (${runId}, ${jobKey}, ${'RUNNING'}::"JobRunStatus", ${now}, NULL, NULL, NULL, ${now}, ${now})
  `;

  try {
    await handler();
    const finishedAt = new Date();
    await prisma.$executeRaw`
      UPDATE "job_runs"
      SET
        "status" = ${'SUCCESS'}::"JobRunStatus",
        "finished_at" = ${finishedAt},
        "updated_at" = ${finishedAt}
      WHERE "id" = ${runId}
    `;
    return { status: 'executed', runId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const finishedAt = new Date();
    await prisma.$executeRaw`
      UPDATE "job_runs"
      SET
        "status" = ${'FAILED'}::"JobRunStatus",
        "finished_at" = ${finishedAt},
        "error_message" = ${errorMessage},
        "updated_at" = ${finishedAt}
      WHERE "id" = ${runId}
    `;
    throw error;
  } finally {
    await releaseAdvisoryLock(prisma, lockId);
  }
}
