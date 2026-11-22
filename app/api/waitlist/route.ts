import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/admin";
import { djangoJson, djangoUserFetch } from "@/lib/django-client";
import { waitlistSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = waitlistSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid data" },
        { status: 400 },
      );
    }

    const response = await djangoUserFetch(user.id, "/api/v1/waitlist/", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    });
    const { data } = await djangoJson<Record<string, unknown>>(response);

    if (response.status === 404) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!response.ok || !data) {
      return NextResponse.json(
        { error: "Failed to join waitlist" },
        { status: response.status || 500 },
      );
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to join waitlist" },
      { status: 500 },
    );
  }
}