import { beforeEach, describe, expect, it, vi } from "vitest";

import { Role } from "@/types/role";

const mockPublicFetch = vi.fn();
const capturedConfigs: unknown[] = [];

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

vi.mock("next-auth", () => ({
  default: vi.fn((config: unknown) => {
    capturedConfigs.push(config);
    return {
      handlers: { GET: vi.fn(), POST: vi.fn() },
      auth: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    };
  }),
}));

vi.mock("next-auth/providers/credentials", () => ({
  default: vi.fn((options: unknown) => options),
}));

describe("auth", () => {
  beforeEach(() => {
    capturedConfigs.length = 0;
    mockPublicFetch.mockReset();
  });

  it("authorizes valid credentials", async () => {
    vi.resetModules();
    await import("@/lib/auth");
    const config = capturedConfigs[0] as {
      providers: Array<{ authorize: (credentials: unknown) => Promise<unknown> }>;
    };

    mockPublicFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "user-1",
          email: "test@example.com",
          role: "USER",
        }),
        { status: 200 },
      ),
    );

    const user = await config.providers[0].authorize({
      email: "test@example.com",
      password: "secret123",
    });

    expect(user).toEqual({
      id: "user-1",
      email: "test@example.com",
      role: "USER",
    });
  });

  it("rejects invalid credentials payload", async () => {
    vi.resetModules();
    await import("@/lib/auth");
    const config = capturedConfigs[0] as {
      providers: Array<{ authorize: (credentials: unknown) => Promise<unknown> }>;
    };

    const user = await config.providers[0].authorize({
      email: "bad-email",
      password: "123",
    });

    expect(user).toBeNull();
  });

  it("rejects failed login response", async () => {
    vi.resetModules();
    await import("@/lib/auth");
    const config = capturedConfigs[0] as {
      providers: Array<{ authorize: (credentials: unknown) => Promise<unknown> }>;
    };

    mockPublicFetch.mockResolvedValue(new Response("{}", { status: 401 }));

    const user = await config.providers[0].authorize({
      email: "test@example.com",
      password: "secret123",
    });

    expect(user).toBeNull();
  });

  it("adds user data to jwt token", async () => {
    vi.resetModules();
    await import("@/lib/auth");
    const config = capturedConfigs[0] as {
      callbacks: {
        jwt: (args: { token: Record<string, unknown>; user?: unknown }) => unknown;
      };
    };

    const token = config.callbacks.jwt({
      token: {},
      user: { id: "user-1", role: Role.ADMIN },
    });

    expect(token).toEqual({
      id: "user-1",
      role: Role.ADMIN,
    });
  });

  it("maps jwt fields to session", async () => {
    vi.resetModules();
    await import("@/lib/auth");
    const config = capturedConfigs[0] as {
      callbacks: {
        session: (args: {
          session: { user: { id?: string; role?: Role } };
          token: { id?: string; role?: Role };
        }) => Promise<{ user: { id?: string; role?: Role } }>;
      };
    };

    const session = await config.callbacks.session({
      session: { user: {} },
      token: { id: "user-1", role: Role.ADMIN },
    });

    expect(session.user.id).toBe("user-1");
    expect(session.user.role).toBe(Role.ADMIN);
  });

  it("defaults session role to USER without jwt role", async () => {
    vi.resetModules();
    await import("@/lib/auth");
    const config = capturedConfigs[0] as {
      callbacks: {
        session: (args: {
          session: { user: { role?: Role } };
          token: Record<string, never>;
        }) => Promise<{ user: { role?: Role } }>;
      };
    };

    const session = await config.callbacks.session({
      session: { user: {} },
      token: {},
    });

    expect(session.user.role).toBe(Role.USER);
  });
});