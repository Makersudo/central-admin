import type { NextFunction, Request, Response } from 'express';
import { ApiError, handleError } from '../lib/http.js';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyPrefix: string;
  keyGenerator?: (req: Request) => string;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;
let nextCleanupAt = 0;

function clientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function cleanup(now: number) {
  if (now < nextCleanupAt && buckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  while (buckets.size >= MAX_BUCKETS) {
    const oldestKey = buckets.keys().next().value;
    if (!oldestKey) break;
    buckets.delete(oldestKey);
  }
  nextCleanupAt = now + 60_000;
}

export function rateLimit(options: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const now = Date.now();
      cleanup(now);

      const identity = options.keyGenerator?.(req) ?? clientIp(req);
      const key = `${options.keyPrefix}:${identity}`;
      const current = buckets.get(key);
      const bucket = current && current.resetAt > now
        ? current
        : { count: 0, resetAt: now + options.windowMs };

      bucket.count += 1;
      buckets.set(key, bucket);

      const remaining = Math.max(0, options.max - bucket.count);
      res.setHeader('RateLimit-Limit', String(options.max));
      res.setHeader('RateLimit-Remaining', String(remaining));
      res.setHeader('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

      if (bucket.count > options.max) {
        res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
        throw new ApiError(429, 'Muitas tentativas. Por favor, aguarde alguns instantes.');
      }

      next();
    } catch (error) {
      return handleError(res, error);
    }
  };
}

export function loginKey(req: Request): string {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : 'unknown';
  return `${clientIp(req)}:${email}`;
}
