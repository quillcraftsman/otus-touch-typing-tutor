import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TrainerClient } from "@/components/trainer/TrainerClient";

let capturedOnLevelChange: ((level: number) => Promise<void>) | undefined;

vi.mock("@/lib/exercise-generator", () => ({
  generateExercise: vi.fn(() => "j"),
}));

vi.mock("@/components/trainer/LevelSelector", () => ({
  LevelSelector: ({
    onLevelChange,
  }: {
    onLevelChange: (level: number) => Promise<void>;
  }) => {
    capturedOnLevelChange = onLevelChange;
    return <div>Level Selector</div>;
  },
}));

vi.mock("@/components/trainer/TypingExercise", () => ({
  TypingExercise: ({
    levelErrorCount,
    onCourseCompleted,
    onLevelAdvance,
    onTypingError,
  }: {
    levelErrorCount: number;
    onCourseCompleted: () => void;
    onLevelAdvance: (level: number, markCourseCompleted: boolean) => Promise<void>;
    onTypingError: () => void;
  }) => (
    <div>
      <p>Ошибки: {levelErrorCount}</p>
      <button type="button" onClick={onTypingError}>
        Record typing error
      </button>
      <button type="button" onClick={onCourseCompleted}>
        Complete course locally
      </button>
      <button
        type="button"
        onClick={() => onLevelAdvance(3, true)}
      >
        Advance from exercise
      </button>
    </div>
  ),
}));

describe("TrainerClient", () => {
  beforeEach(() => {
    capturedOnLevelChange = undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          currentLevel: 2,
          courseCompletedAt: null,
          levelErrorCount: 0,
        }),
      }),
    );
  });

  it("renders trainer controls", () => {
    render(
      <TrainerClient
        alphabet="jfk"
        initialLevel={1}
        maxLevel={3}
        initialCourseCompleted={false}
        initialLevelErrorCount={0}
      />,
    );

    expect(screen.getByText("Level Selector")).toBeInTheDocument();
    expect(screen.getByText("Ошибки: 0")).toBeInTheDocument();
  });

  it("shows course complete banner when completed", () => {
    render(
      <TrainerClient
        alphabet="jfk"
        initialLevel={3}
        maxLevel={3}
        initialCourseCompleted={true}
      />,
    );

    expect(screen.getByText("Курс завершён!")).toBeInTheDocument();
  });

  it("saves progress when level changes", async () => {
    render(
      <TrainerClient
        alphabet="jfk"
        initialLevel={1}
        maxLevel={3}
        initialCourseCompleted={false}
      />,
    );

    await capturedOnLevelChange?.(2);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/progress",
        expect.objectContaining({ method: "PATCH" }),
      );
    });
  });

  it("ignores out-of-range level changes", async () => {
    render(
      <TrainerClient
        alphabet="jfk"
        initialLevel={1}
        maxLevel={3}
        initialCourseCompleted={false}
      />,
    );

    await capturedOnLevelChange?.(0);
    await capturedOnLevelChange?.(99);

    expect(fetch).not.toHaveBeenCalled();
  });

  it("throws when progress save fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
      }),
    );

    render(
      <TrainerClient
        alphabet="jfk"
        initialLevel={1}
        maxLevel={3}
        initialCourseCompleted={false}
      />,
    );

    await expect(capturedOnLevelChange?.(2)).rejects.toThrow(
      "Failed to save progress",
    );
  });

  it("saves progress from typing exercise advance callback", async () => {
    render(
      <TrainerClient
        alphabet="jfk"
        initialLevel={2}
        maxLevel={3}
        initialCourseCompleted={false}
      />,
    );

    await userEvent.setup().click(
      screen.getByRole("button", { name: "Advance from exercise" }),
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/progress",
        expect.objectContaining({
          body: JSON.stringify({
            currentLevel: 3,
            markCourseCompleted: true,
          }),
        }),
      );
    });
  });

  it("marks course completed from typing exercise callback", async () => {
    render(
      <TrainerClient
        alphabet="jfk"
        initialLevel={3}
        maxLevel={3}
        initialCourseCompleted={false}
      />,
    );

    await userEvent.setup().click(
      screen.getByRole("button", { name: "Complete course locally" }),
    );

    expect(screen.getByText("Курс завершён!")).toBeInTheDocument();
  });

  it("records a typing error and keeps the saved count", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          currentLevel: 1,
          courseCompletedAt: null,
          levelErrorCount: 2,
        }),
      }),
    );

    render(
      <TrainerClient
        alphabet="jfk"
        initialLevel={1}
        maxLevel={3}
        initialCourseCompleted={false}
        initialLevelErrorCount={1}
      />,
    );

    await userEvent.setup().click(
      screen.getByRole("button", { name: "Record typing error" }),
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/progress",
        expect.objectContaining({
          body: JSON.stringify({ recordError: true }),
        }),
      );
      expect(screen.getByText("Ошибки: 2")).toBeInTheDocument();
    });
  });

  it("restores the previous error count when recording fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
      }),
    );

    render(
      <TrainerClient
        alphabet="jfk"
        initialLevel={1}
        maxLevel={3}
        initialCourseCompleted={false}
        initialLevelErrorCount={3}
      />,
    );

    await userEvent.setup().click(
      screen.getByRole("button", { name: "Record typing error" }),
    );

    await waitFor(() => {
      expect(screen.getByText("Ошибки: 3")).toBeInTheDocument();
    });
  });

  it("shows zero errors after the level changes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          currentLevel: 2,
          courseCompletedAt: null,
          levelErrorCount: 0,
        }),
      }),
    );

    render(
      <TrainerClient
        alphabet="jfk"
        initialLevel={1}
        maxLevel={3}
        initialCourseCompleted={false}
        initialLevelErrorCount={5}
      />,
    );

    await capturedOnLevelChange?.(2);

    await waitFor(() => {
      expect(screen.getByText("Ошибки: 0")).toBeInTheDocument();
    });
  });

  it("updates course completed state from api response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          currentLevel: 3,
          courseCompletedAt: "2026-01-01T00:00:00.000Z",
        }),
      }),
    );

    render(
      <TrainerClient
        alphabet="jfk"
        initialLevel={2}
        maxLevel={3}
        initialCourseCompleted={false}
      />,
    );

    await capturedOnLevelChange?.(3);

    await waitFor(() => {
      expect(screen.getByText("Курс завершён!")).toBeInTheDocument();
    });
  });
});
