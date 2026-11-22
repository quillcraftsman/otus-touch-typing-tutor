import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/admin";
import { djangoJson, djangoUserFetch } from "@/lib/django-client";
import { analyticsEventSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = analyticsEventSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid data" },
        { status: 400 },
      );
    }

    const response = await djangoUserFetch(user.id, "/api/v1/analytics/events/", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    });
    const { data } = await djangoJson<Record<string, unknown>>(response);

    if (!response.ok) {
      return NextResponse.json(
        { error: (data?.error as string) ?? "Failed to record analytics event" },
        { status: response.status },
      );
    }

    return NextResponse.json(data ?? { success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to record analytics event" },
      { status: 500 },
    );
  }
}