import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockUserFetch = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
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

describe("progress route", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockUserFetch.mockReset();
  });

  it("GET returns unauthorized without session", async () => {
    mockAuth.mockResolvedValue(null);

    const { GET } = await import("@/app/api/progress/route");
    const response = await GET();

    expect(response.status).toBe(401);
  });

  it("GET returns progress for authenticated user", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockUserFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          currentLevel: 2,
          courseCompletedAt: null,
          maxLevel: 3,
        }),
        { status: 200 },
      ),
    );

    const { GET } = await import("@/app/api/progress/route");
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.currentLevel).toBe(2);
  });

  it("GET returns 404 when backend missing user", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockUserFetch.mockResolvedValue(new Response("{}", { status: 404 }));

    const { GET } = await import("@/app/api/progress/route");
    const response = await GET();

    expect(response.status).toBe(404);
  });

  it("PATCH returns unauthorized without session", async () => {
    mockAuth.mockResolvedValue(null);

    const { PATCH } = await import("@/app/api/progress/route");
    const response = await PATCH(
      new Request("http://localhost/api/progress", {
        method: "PATCH",
        body: JSON.stringify({ currentLevel: 2 }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("PATCH records a typing error", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockUserFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          currentLevel: 1,
          courseCompletedAt: null,
          maxLevel: 3,
          levelErrorCount: 1,
        }),
        { status: 200 },
      ),
    );

    const { PATCH } = await import("@/app/api/progress/route");
    const response = await PATCH(
      new Request("http://localhost/api/progress", {
        method: "PATCH",
        body: JSON.stringify({ recordError: true }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mockUserFetch).toHaveBeenCalledWith(
      "user-1",
      "/api/v1/progress/",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ recordError: true }),
      }),
    );
  });

  it("PATCH updates progress", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockUserFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          currentLevel: 2,
          courseCompletedAt: null,
          maxLevel: 3,
        }),
        { status: 200 },
      ),
    );

    const { PATCH } = await import("@/app/api/progress/route");
    const response = await PATCH(
      new Request("http://localhost/api/progress", {
        method: "PATCH",
        body: JSON.stringify({ currentLevel: 2 }),
      }),
    );

    expect(response.status).toBe(200);
  });

  it("PATCH returns validation error", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });

    const { PATCH } = await import("@/app/api/progress/route");
    const response = await PATCH(
      new Request("http://localhost/api/progress", {
        method: "PATCH",
        body: JSON.stringify({ currentLevel: 0 }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("PATCH handles backend failure", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockUserFetch.mockResolvedValue(new Response("{}", { status: 500 }));

    const { PATCH } = await import("@/app/api/progress/route");
    const response = await PATCH(
      new Request("http://localhost/api/progress", {
        method: "PATCH",
        body: JSON.stringify({ currentLevel: 2 }),
      }),
    );

    expect(response.status).toBe(500);
  });

  it("PATCH handles thrown errors", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockUserFetch.mockRejectedValue(new Error("down"));

    const { PATCH } = await import("@/app/api/progress/route");
    const response = await PATCH(
      new Request("http://localhost/api/progress", {
        method: "PATCH",
        body: JSON.stringify({ currentLevel: 2 }),
      }),
    );

    expect(response.status).toBe(500);
  });
});