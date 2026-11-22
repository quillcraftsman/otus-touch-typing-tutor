import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});

vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirect(url),
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

const mockGetCurrentUser = vi.fn();
const mockGetProgress = vi.fn();

vi.mock("@/lib/server-api", () => ({
  getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
  getProgress: (...args: unknown[]) => mockGetProgress(...args),
}));

vi.mock("@/lib/alphabet", () => ({
  loadAlphabet: () => "jfk",
  getMaxLevel: (alphabet: string) => alphabet.length,
}));

vi.mock("@/components/trainer/TrainerClient", () => ({
  TrainerClient: () => <div>Trainer Client</div>,
}));

vi.mock("@/components/auth/LoginForm", () => ({
  LoginForm: () => <div>Login Form</div>,
}));

vi.mock("@/components/auth/RegisterForm", () => ({
  RegisterForm: () => <div>Register Form</div>,
}));

vi.mock("@/components/trainer/SubscribeButton", () => ({
  SubscribeButton: () => (
    <button type="button">Разблокировать все уровни</button>
  ),
}));

vi.mock("@/components/landing/LandingPage", () => ({
  LandingPage: ({
    isAuthenticated,
    isOnWaitlist,
  }: {
    isAuthenticated: boolean;
    isOnWaitlist: boolean;
  }) => (
    <div>
      Landing Page {isAuthenticated ? "auth" : "guest"}{" "}
      {isOnWaitlist ? "waitlist" : "free"}
    </div>
  ),
}));

vi.mock("@/components/landing/LandingCtaButton", () => ({
  LandingCtaButton: ({ label }: { label: string }) => (
    <a href="#metrics">{label}</a>
  ),
}));

vi.mock("@/components/subscription/SubscriptionPlaceholder", () => ({
  SubscriptionPlaceholder: () => <div>Subscription Placeholder</div>,
}));

vi.mock("@/components/admin/MetricsDashboard", () => ({
  MetricsDashboard: () => <div>Metrics Dashboard</div>,
}));

describe("app pages", () => {
  it("renders home page for guests", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue(null);

    const HomePage = (await import("@/app/page")).default;
    render(await HomePage());

    expect(screen.getByText("Landing Page guest free")).toBeInTheDocument();
  });

  it("renders home page for authenticated users", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue({
      user: { id: "1", email: "test@example.com" },
    } as never);
    mockGetCurrentUser.mockResolvedValue({
      waitlistJoinedAt: null,
    });

    const HomePage = (await import("@/app/page")).default;
    render(await HomePage());

    expect(screen.getByText("Landing Page auth free")).toBeInTheDocument();
  });

  it("renders login page", async () => {
    const LoginPage = (await import("@/app/login/page")).default;
    render(<LoginPage />);

    expect(screen.getByText("Login Form")).toBeInTheDocument();
  });

  it("renders register page", async () => {
    const RegisterPage = (await import("@/app/register/page")).default;
    render(<RegisterPage />);

    expect(screen.getByText("Register Form")).toBeInTheDocument();
  });

  it("redirects unauthenticated users from trainer page", async () => {
    redirect.mockClear();
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue(null);

    const TrainerPage = (await import("@/app/trainer/page")).default;

    await expect(TrainerPage()).rejects.toThrow("NEXT_REDIRECT:/login");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("renders trainer page for authenticated users", async () => {
    redirect.mockReset();
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    } as never);
    mockGetProgress.mockResolvedValue({
      currentLevel: 1,
      courseCompletedAt: null,
      maxLevel: 3,
      levelErrorCount: 0,
    });

    const TrainerPage = (await import("@/app/trainer/page")).default;
    render(await TrainerPage());

    expect(screen.getByText("Тренажёр")).toBeInTheDocument();
    expect(screen.getByText("Trainer Client")).toBeInTheDocument();
  });

  it("redirects when trainer user is missing in db", async () => {
    redirect.mockClear();
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    } as never);
    mockGetProgress.mockResolvedValue(null);

    const TrainerPage = (await import("@/app/trainer/page")).default;

    await expect(TrainerPage()).rejects.toThrow("NEXT_REDIRECT:/login");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("renders subscription page", async () => {
    redirect.mockReset();
    const { auth } = await import("@/lib/auth");

    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    } as never);
    mockGetCurrentUser.mockResolvedValue({
      waitlistJoinedAt: null,
    });

    const SubscriptionPage = (await import("@/app/subscription/page")).default;
    render(await SubscriptionPage());

    expect(screen.getByText("Subscription Placeholder")).toBeInTheDocument();
  });

  it("redirects unauthenticated users from subscription page", async () => {
    redirect.mockClear();
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue(null);

    const SubscriptionPage = (await import("@/app/subscription/page")).default;

    await expect(SubscriptionPage()).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("redirects when subscription user is missing in db", async () => {
    redirect.mockClear();
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com" },
    } as never);
    mockGetCurrentUser.mockResolvedValue(null);

    const SubscriptionPage = (await import("@/app/subscription/page")).default;

    await expect(SubscriptionPage()).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("renders investors page", async () => {
    const InvestorsPage = (await import("@/app/investors/page")).default;
    render(<InvestorsPage />);

    expect(screen.getByText("Investor relations")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Запросить pitch deck" }),
    ).toBeInTheDocument();
  });

  it("redirects non-admin users from admin page", async () => {
    redirect.mockClear();
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", email: "test@example.com", role: "USER" },
    } as never);

    const AdminPage = (await import("@/app/admin/page")).default;

    await expect(AdminPage()).rejects.toThrow("NEXT_REDIRECT:/");
    expect(redirect).toHaveBeenCalledWith("/");
  });

  it("renders admin page for admin users", async () => {
    redirect.mockReset();
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin-1", email: "admin@example.com", role: "ADMIN" },
    } as never);

    const AdminPage = (await import("@/app/admin/page")).default;
    render(await AdminPage());

    expect(screen.getByText("Админка")).toBeInTheDocument();
    expect(screen.getByText("Metrics Dashboard")).toBeInTheDocument();
  });

  it("redirects unauthenticated users from admin page", async () => {
    redirect.mockClear();
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValue(null);

    const AdminPage = (await import("@/app/admin/page")).default;

    await expect(AdminPage()).rejects.toThrow("NEXT_REDIRECT:/login");
    expect(redirect).toHaveBeenCalledWith("/login");
  });
});
