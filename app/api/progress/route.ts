import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { djangoJson, djangoUserFetch } from "@/lib/django-client";
import { patchSchema } from "@/lib/validation";

async function getAuthenticatedUser() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }
  return session.user;
}

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const response = await djangoUserFetch(user.id, "/api/v1/progress/");
  const { data } = await djangoJson<Record<string, unknown>>(response);

  if (response.status === 404) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!response.ok || !data) {
    return NextResponse.json(
      { error: "Failed to load progress" },
      { status: response.status || 500 },
    );
  }

  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid data" },
        { status: 400 },
      );
    }

    const response = await djangoUserFetch(user.id, "/api/v1/progress/", {
      method: "PATCH",
      body: JSON.stringify(parsed.data),
    });
    const { data } = await djangoJson<Record<string, unknown>>(response);

    if (!response.ok || !data) {
      return NextResponse.json(
        { error: data && "error" in data ? data.error : "Failed to update progress" },
        { status: response.status || 500 },
      );
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to update progress" },
      { status: 500 },
    );
  }
}