import { consumeRateLimit } from "@/lib/rate-limit";

export function consumeAiImportQuota(request: Request) {
  const configuredGlobalLimit = Number(process.env.AI_IMPORT_DAILY_LIMIT);
  const configuredUserLimit = Number(process.env.AI_IMPORT_USER_DAILY_LIMIT);
  return consumeRateLimit(request, {
    namespace: "ai-import",
    globalLimit: Number.isFinite(configuredGlobalLimit) && configuredGlobalLimit > 0 ? Math.floor(configuredGlobalLimit) : 20,
    subjectLimit: Number.isFinite(configuredUserLimit) && configuredUserLimit > 0 ? Math.floor(configuredUserLimit) : 10,
    windowSeconds: 24 * 60 * 60,
  });
}
