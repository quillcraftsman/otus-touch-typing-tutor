import { beforeEach, describe, expect, it, vi } from "vitest";

import { AnalyticsEventType } from "@/lib/validation";

const mockAuth = vi.fn();
const mockUserFetch = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

vi.mock("@/lib/admin", () => ({
  getAuthenticatedUser: vi.fn(async () => {
    const session = await mockAuth();
    return session?.user ?? null;
  }),
}));

vi.mock("@/lib/django-client", () => ({
  djangoUserFetch: (...args: unknown[]) => mockUserFetch(...args),
  djangoJson: async (response: Response) => {
    const text = await response.text();
    return {
      data: text ? JSON.parse(text) : null,
      status: response.status,
      text,
    };
  },
}));

describe("POST /api/analytics/events", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockUserFetch.mockReset();
  });

  it("returns unauthorized without session", async () => {
    mockAuth.mockResolvedValue(null);

    const { POST } = await import("@/app/api/analytics/events/route");
    const response = await POST(
      new Request("http://localhost/api/analytics/events", {
        method: "POST",
        body: JSON.stringify({
          eventType: AnalyticsEventType.TRAINER_IMPRESSION,
          sessionId: "11111111-1111-1111-1111-111111111111",
        }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("records event", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockUserFetch.mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    );

    const { POST } = await import("@/app/api/analytics/events/route");
    const response = await POST(
      new Request("http://localhost/api/analytics/events", {
        method: "POST",
        body: JSON.stringify({
          eventType: AnalyticsEventType.TRAINER_IMPRESSION,
          sessionId: "11111111-1111-1111-1111-111111111111",
        }),
      }),
    );

    expect(response.status).toBe(200);
  });

  it("returns validation error", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    const { POST } = await import("@/app/api/analytics/events/route");
    const response = await POST(
      new Request("http://localhost/api/analytics/events", {
        method: "POST",
        body: JSON.stringify({ eventType: "BAD", sessionId: "x" }),
      }),
    );

    expect(response.status).toBe(400);
  });
});