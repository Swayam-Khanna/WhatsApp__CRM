import crypto from "crypto";

export type JobType =
  | "whatsapp_broadcast"
  | "whatsapp_order_notify"
  | "bulk_notification"
  | "inventory_sync"
  | "scheduled_followup";

export type JobStatus = "queued" | "processing" | "completed" | "failed" | "dead_letter";

export interface QueueJob<T = any> {
  id: string;
  type: JobType;
  idempotencyKey: string;
  payload: T;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  backoffMs: number;
  createdAt: string;
  updatedAt: string;
  processedAt?: string;
  error?: string;
}

export interface QueueMetrics {
  totalJobs: number;
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  deadLetter: number;
}

// In-Memory Queue Store with Dead-Letter recovery
declare global {
  // eslint-disable-next-line no-var
  var __globalJobQueue: Map<string, QueueJob> | undefined;
  // eslint-disable-next-line no-var
  var __globalDeadLetterQueue: QueueJob[] | undefined;
}

if (!globalThis.__globalJobQueue) {
  globalThis.__globalJobQueue = new Map<string, QueueJob>();
}
if (!globalThis.__globalDeadLetterQueue) {
  globalThis.__globalDeadLetterQueue = [];
}

const jobQueue = globalThis.__globalJobQueue;
const deadLetterQueue = globalThis.__globalDeadLetterQueue;

// Registry of asynchronous job handlers
type JobHandler<T = any> = (job: QueueJob<T>) => Promise<any>;
const jobHandlers = new Map<JobType, JobHandler>();

/**
 * Registers an execution handler for a specific job type.
 */
export function registerJobHandler<T = any>(type: JobType, handler: JobHandler<T>): void {
  jobHandlers.set(type, handler);
}

/**
 * Enqueues a job with strict idempotency verification.
 * If a job with the same idempotency key is already completed or queued, it prevents duplicate dispatch.
 */
export function enqueueJob<T = any>(params: {
  type: JobType;
  payload: T;
  idempotencyKey?: string;
  maxAttempts?: number;
  initialBackoffMs?: number;
}): QueueJob<T> {
  const {
    type,
    payload,
    idempotencyKey = `${type}_${crypto.randomUUID()}`,
    maxAttempts = 3,
    initialBackoffMs = 1000,
  } = params;

  // Idempotency check: look up existing job with this idempotency key
  for (const existingJob of jobQueue.values()) {
    if (existingJob.idempotencyKey === idempotencyKey) {
      if (existingJob.status === "completed" || existingJob.status === "processing" || existingJob.status === "queued") {
        return existingJob as QueueJob<T>;
      }
    }
  }

  const job: QueueJob<T> = {
    id: `job_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
    type,
    idempotencyKey,
    payload,
    status: "queued",
    attempts: 0,
    maxAttempts,
    backoffMs: initialBackoffMs,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  jobQueue.set(job.id, job);

  // Trigger non-blocking asynchronous processing
  setImmediate(() => {
    processNextJob(job.id).catch((err) => {
      console.error(`[BackgroundQueue] Uncaught error running job ${job.id}:`, err);
    });
  });

  return job;
}

/**
 * Executes a specific job with exponential backoff retries and dead-letter queue routing.
 */
async function processNextJob(jobId: string): Promise<void> {
  const job = jobQueue.get(jobId);
  if (!job || job.status === "completed" || job.status === "processing") return;

  const handler = jobHandlers.get(job.type);
  if (!handler) {
    console.warn(`[BackgroundQueue] No registered handler for job type '${job.type}'. Job marked dead-letter.`);
    job.status = "dead_letter";
    job.error = `No handler registered for ${job.type}`;
    job.updatedAt = new Date().toISOString();
    deadLetterQueue.push({ ...job });
    return;
  }

  job.status = "processing";
  job.attempts += 1;
  job.updatedAt = new Date().toISOString();

  try {
    await handler(job);
    job.status = "completed";
    job.processedAt = new Date().toISOString();
    job.updatedAt = new Date().toISOString();
    job.error = undefined;
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    job.error = errorMsg;
    job.updatedAt = new Date().toISOString();

    if (job.attempts < job.maxAttempts) {
      job.status = "queued";
      const delay = job.backoffMs * Math.pow(2, job.attempts - 1);
      setTimeout(() => {
        processNextJob(jobId).catch(console.error);
      }, delay);
    } else {
      job.status = "dead_letter";
      deadLetterQueue.push({ ...job });
      console.error(`[BackgroundQueue] Job ${job.id} (${job.type}) exceeded max attempts (${job.maxAttempts}). Routed to Dead-Letter Queue.`);
    }
  }
}

/**
 * Returns current queue telemetry and metrics.
 */
export function getQueueMetrics(): QueueMetrics {
  let queued = 0;
  let processing = 0;
  let completed = 0;
  let failed = 0;
  let deadLetter = 0;

  for (const job of jobQueue.values()) {
    if (job.status === "queued") queued++;
    else if (job.status === "processing") processing++;
    else if (job.status === "completed") completed++;
    else if (job.status === "failed") failed++;
    else if (job.status === "dead_letter") deadLetter++;
  }

  return {
    totalJobs: jobQueue.size,
    queued,
    processing,
    completed,
    failed,
    deadLetter,
  };
}

/**
 * Retrieves the dead-letter queue jobs for operator inspection and retry.
 */
export function getDeadLetterQueue(): QueueJob[] {
  return [...deadLetterQueue];
}
