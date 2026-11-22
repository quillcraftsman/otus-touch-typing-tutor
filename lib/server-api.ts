import { djangoJson, djangoUserFetch } from "@/lib/django-client";
import type { Role } from "@/types/role";

export type CurrentUserDto = {
  id: string;
  email: string;
  role: Role;
  waitlistJoinedAt: string | null;
  currentLevel: number;
  courseCompletedAt: string | null;
};

export type ProgressDto = {
  currentLevel: number;
  courseCompletedAt: string | null;
  maxLevel: number;
  levelErrorCount: number;
};

export async function getCurrentUser(userId: string): Promise<CurrentUserDto | null> {
  const response = await djangoUserFetch(userId, "/api/v1/auth/me/");
  if (!response.ok) {
    return null;
  }
  const { data } = await djangoJson<CurrentUserDto>(response);
  return data;
}

export async function getProgress(userId: string): Promise<ProgressDto | null> {
  const response = await djangoUserFetch(userId, "/api/v1/progress/");
  if (!response.ok) {
    return null;
  }
  const { data } = await djangoJson<ProgressDto>(response);
  return data;
}