import { z } from "zod";

export const AnalyticsEventType = {
  TRAINER_IMPRESSION: "TRAINER_IMPRESSION",
  SUBSCRIPTION_CLICK: "SUBSCRIPTION_CLICK",
  SUBSCRIPTION_PAGE_VIEW: "SUBSCRIPTION_PAGE_VIEW",
  SUBSCRIPTION_PAGE_EXIT: "SUBSCRIPTION_PAGE_EXIT",
  LANDING_CTA_CLICK: "LANDING_CTA_CLICK",
  WAITLIST_JOIN: "WAITLIST_JOIN",
} as const;

const analyticsEventTypeSchema = z.enum([
  AnalyticsEventType.TRAINER_IMPRESSION,
  AnalyticsEventType.SUBSCRIPTION_CLICK,
  AnalyticsEventType.SUBSCRIPTION_PAGE_VIEW,
  AnalyticsEventType.SUBSCRIPTION_PAGE_EXIT,
  AnalyticsEventType.LANDING_CTA_CLICK,
  AnalyticsEventType.WAITLIST_JOIN,
]);

export const registerSchema = z.object({
  email: z.string().email("Некорректный email"),
  password: z.string().min(6, "Пароль должен быть не короче 6 символов"),
});

const levelPatchSchema = z
  .object({
    currentLevel: z.number().int().positive(),
    markCourseCompleted: z.boolean().optional(),
  })
  .strict();

const errorPatchSchema = z
  .object({
    recordError: z.literal(true),
  })
  .strict();

export const patchSchema = z.union([errorPatchSchema, levelPatchSchema]);

export const analyticsEventSchema = z.object({
  eventType: analyticsEventTypeSchema,
  sessionId: z.string().uuid(),
  durationMs: z.number().int().nonnegative().optional(),
});

export const metricsQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(90).optional(),
});

export const waitlistSchema = z.object({
  sessionId: z.string().uuid(),
});