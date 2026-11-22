import { describe, expect, it, vi } from "vitest";

import { AnalyticsEventType } from "@/lib/validation";
import {
  createAnalyticsSessionId,
  trackAnalyticsEvent,
} from "@/lib/analytics-client";

describe("analytics-client", () => {
  it("creates analytics session id", () => {
    const sessionId = createAnalyticsSessionId();
    expect(sessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("tracks analytics event", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ success: true }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await trackAnalyticsEvent({
      eventType: AnalyticsEventType.TRAINER_IMPRESSION,
      sessionId: "11111111-1111-1111-1111-111111111111",
    });

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/analytics/events",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("throws when tracking fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 500 })));

    await expect(
      trackAnalyticsEvent({
        eventType: AnalyticsEventType.SUBSCRIPTION_CLICK,
        sessionId: "11111111-1111-1111-1111-111111111111",
      }),
    ).rejects.toThrow("Failed to track analytics event");
  });
});