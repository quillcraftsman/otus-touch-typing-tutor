import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPublicFetch = vi.fn();

vi.mock("@/lib/django-client", () => ({
  djangoPublicFetch: (...args: unknown[]) => mockPublicFetch(...args),
  djangoJson: async (response: Response) => {
    const text = await response.text();
    return {
      data: text ? JSON.parse(text) : null,
      status: response.status,
      text,
    };
  },
}));

describe("POST /api/register", () => {
  beforeEach(() => {
    mockPublicFetch.mockReset();
  });

  it("registers a new user", async () => {
    mockPublicFetch.mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 201 }),
    );

    const { POST } = await import("@/app/api/register/route");
    const response = await POST(
      new Request("http://localhost/api/register", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "secret123",
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(mockPublicFetch).toHaveBeenCalled();
  });

  it("returns validation error for invalid payload", async () => {
    const { POST } = await import("@/app/api/register/route");
    const response = await POST(
      new Request("http://localhost/api/register", {
        method: "POST",
        body: JSON.stringify({ email: "bad", password: "123" }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("returns fallback validation message", async () => {
    const validation = await import("@/lib/validation");
    const route = await import("@/app/api/register/route");
    vi.spyOn(validation.registerSchema, "safeParse").mockReturnValue({
      success: false,
      error: { errors: [{}] },
    } as never);

    const response = await route.POST(
      new Request("http://localhost/api/register", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Некорректные данные");
  });

  it("proxies conflict response", async () => {
    mockPublicFetch.mockResolvedValue(
      new Response(
        JSON.stringify({ error: "Пользователь с таким email уже существует" }),
        { status: 409 },
      ),
    );

    const { POST } = await import("@/app/api/register/route");
    const response = await POST(
      new Request("http://localhost/api/register", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "secret123",
        }),
      }),
    );

    expect(response.status).toBe(409);
  });

  it("returns server error on failure", async () => {
    mockPublicFetch.mockRejectedValue(new Error("network"));

    const { POST } = await import("@/app/api/register/route");
    const response = await POST(
      new Request("http://localhost/api/register", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "secret123",
        }),
      }),
    );

    expect(response.status).toBe(500);
  });
});