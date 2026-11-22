import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getAuthenticatedUser,
  requireAdminUser,
} from "@/lib/admin";
import { Role } from "@/types/role";

const mockAuth = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

describe("admin helpers", () => {
  beforeEach(() => {
    mockAuth.mockReset();
  });

  it("returns null without session", async () => {
    mockAuth.mockResolvedValue(null);
    expect(await getAuthenticatedUser()).toBeNull();
  });

  it("returns session user", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    expect(await getAuthenticatedUser()).toEqual({ id: "user-1" });
  });

  it("requires admin role", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "admin-1", role: Role.ADMIN },
    });

    const admin = await requireAdminUser();
    expect(admin?.role).toBe(Role.ADMIN);
  });

  it("rejects non-admin user", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "user-1", role: Role.USER },
    });

    expect(await requireAdminUser()).toBeNull();
  });

  it("returns null without authenticated session", async () => {
    mockAuth.mockResolvedValue(null);

    expect(await requireAdminUser()).toBeNull();
  });
});