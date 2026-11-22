"use client";

import { useCallback, useRef, useState } from "react";

import { CourseComplete } from "@/components/trainer/CourseComplete";
import { LevelSelector } from "@/components/trainer/LevelSelector";
import { TypingExercise } from "@/components/trainer/TypingExercise";

type TrainerClientProps = {
  alphabet: string;
  initialLevel: number;
  maxLevel: number;
  initialCourseCompleted: boolean;
  initialLevelErrorCount: number;
};

export function TrainerClient({
  alphabet,
  initialLevel,
  maxLevel,
  initialCourseCompleted,
  initialLevelErrorCount = 0,
}: TrainerClientProps) {
  const [currentLevel, setCurrentLevel] = useState(initialLevel);
  const [courseCompleted, setCourseCompleted] = useState(initialCourseCompleted);
  const [levelErrorCount, setLevelErrorCount] = useState(initialLevelErrorCount);
  const levelErrorCountRef = useRef(initialLevelErrorCount);

  const saveProgress = useCallback(
    async (level: number, markCourseCompleted = false) => {
      const response = await fetch("/api/progress", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentLevel: level,
          markCourseCompleted,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save progress");
      }

      const data = await response.json();
      setCurrentLevel(data.currentLevel);
      if (typeof data.levelErrorCount === "number") {
        levelErrorCountRef.current = data.levelErrorCount;
        setLevelErrorCount(data.levelErrorCount);
      }
      if (data.courseCompletedAt) {
        setCourseCompleted(true);
      }
    },
    [],
  );

  const recordTypingError = useCallback(async () => {
    const previousCount = levelErrorCountRef.current;
    const optimisticCount = previousCount + 1;
    levelErrorCountRef.current = optimisticCount;
    setLevelErrorCount(optimisticCount);

    try {
      const response = await fetch("/api/progress", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordError: true }),
      });

      if (!response.ok) {
        throw new Error("Failed to record error");
      }

      const data = await response.json();
      if (typeof data.levelErrorCount === "number") {
        levelErrorCountRef.current = data.levelErrorCount;
        setLevelErrorCount(data.levelErrorCount);
      }
    } catch {
      levelErrorCountRef.current = previousCount;
      setLevelErrorCount(previousCount);
    }
  }, []);

  const handleLevelChange = async (level: number) => {
    if (level < 1 || level > maxLevel) {
      return;
    }
    await saveProgress(level);
  };

  return (
    <div className="space-y-6">
      {courseCompleted && <CourseComplete />}
      <LevelSelector
        alphabet={alphabet}
        currentLevel={currentLevel}
        maxLevel={maxLevel}
        onLevelChange={handleLevelChange}
      />
      <TypingExercise
        alphabet={alphabet}
        currentLevel={currentLevel}
        maxLevel={maxLevel}
        courseCompleted={courseCompleted}
        levelErrorCount={levelErrorCount}
        onTypingError={recordTypingError}
        onLevelAdvance={saveProgress}
        onCourseCompleted={() => setCourseCompleted(true)}
      />
    </div>
  );
}
