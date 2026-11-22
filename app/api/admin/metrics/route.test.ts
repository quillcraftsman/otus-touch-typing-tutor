import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireAdmin = vi.fn();
const mockUserFetch = vi.fn();

vi.mock("@/lib/admin", () => ({
  requireAdminUser: () => mockRequireAdmin(),
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

describe("GET /api/admin/metrics", () => {
  beforeEach(() => {
    mockRequireAdmin.mockReset();
    mockUserFetch.mockReset();
  });

  it("returns forbidden for non-admin", async () => {
    mockRequireAdmin.mockResolvedValue(null);

    const { GET } = await import("@/app/api/admin/metrics/route");
    const response = await GET(
      new Request("http://localhost/api/admin/metrics"),
    );

    expect(response.status).toBe(403);
  });

  it("returns metrics for admin", async () => {
    mockRequireAdmin.mockResolvedValue({ id: "admin-1" });
    mockUserFetch.mockResolvedValue(
      new Response(
        JSON.stringify({ daily: [], funnel: { registrations: 0 } }),
        { status: 200 },
      ),
    );

    const { GET } = await import("@/app/api/admin/metrics/route");
    const response = await GET(
      new Request("http://localhost/api/admin/metrics?days=7"),
    );

    expect(response.status).toBe(200);
  });

  it("returns validation error for invalid days", async () => {
    mockRequireAdmin.mockResolvedValue({ id: "admin-1" });

    const { GET } = await import("@/app/api/admin/metrics/route");
    const response = await GET(
      new Request("http://localhost/api/admin/metrics?days=0"),
    );

    expect(response.status).toBe(400);
  });
});