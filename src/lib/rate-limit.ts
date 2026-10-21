type Counter = { count: number; resetAt: number };

const localCounters = new Map<string, Counter>();

type RateLimitOptions = {
  namespace: string;
  globalLimit: number;
  subjectLimit: number;
  windowSeconds: number;
};

type RateLimitResult =
  | { allowed: true }
  | { allowed: false; status: 429 | 503; message: string; retryAfterSeconds?: number };

function isProduction() {
  return process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
}

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

function subjectIdentity(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "shared-session";
}

function localIncrement(key: string, now: number, windowMs: number) {
  const current = localCounters.get(key);
  if (!current || current.resetAt <= now) {
    const next = { count: 1, resetAt: now + windowMs };
    localCounters.set(key, next);
    return next;
  }
  current.count += 1;
  return current;
}

async function redisIncrement(key: string, windowSeconds: number) {
  const config = redisConfig();
  if (!config) throw new Error("The rate-limit store is not configured.");

  const response = await fetch(`${config.url}/incr/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${config.token}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("The rate-limit store is unavailable.");
  const payload = await response.json() as number | { result?: number };
  const count = typeof payload === "number" ? payload : Number(payload.result);
  if (!Number.isFinite(count)) throw new Error("The rate-limit store returned an invalid count.");

  // Retry expiry on every call so a transient expiry failure cannot permanently lock a key.
  const expireResponse = await fetch(`${config.url}/expire/${encodeURIComponent(key)}/${windowSeconds}`, {
    headers: { Authorization: `Bearer ${config.token}` },
    cache: "no-store",
  });
  if (!expireResponse.ok) throw new Error("The rate-limit expiry could not be recorded.");
  return count;
}

export async function consumeRateLimit(request: Request, options: RateLimitOptions): Promise<RateLimitResult> {
  const config = redisConfig();
  if (isProduction() && !config) {
    return { allowed: false, status: 503, message: "This service is temporarily unavailable until its production rate-limit store is configured." };
  }

  const now = Date.now();
  const windowMs = options.windowSeconds * 1000;
  const windowId = Math.floor(now / windowMs);
  const subject = subjectIdentity(request);
  const globalKey = `smart-minds:${options.namespace}:global:${windowId}`;
  const subjectKey = `smart-minds:${options.namespace}:subject:${windowId}:${subject}`;

  try {
    const global = config ? await redisIncrement(globalKey, options.windowSeconds) : localIncrement(globalKey, now, windowMs).count;
    const subjectCount = config ? await redisIncrement(subjectKey, options.windowSeconds) : localIncrement(subjectKey, now, windowMs).count;
    if (global > options.globalLimit || subjectCount > options.subjectLimit) {
      const retryAfterSeconds = options.windowSeconds - Math.floor((now / 1000) % options.windowSeconds);
      return { allowed: false, status: 429, message: "Too many requests. Please try again later.", retryAfterSeconds };
    }
    return { allowed: true };
  } catch (error) {
    console.error("Rate-limit check failed", error);
    return { allowed: false, status: 503, message: "This service is temporarily unavailable because its rate-limit check failed." };
  }
}
