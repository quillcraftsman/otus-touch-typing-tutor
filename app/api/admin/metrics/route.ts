import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/admin";
import { djangoJson, djangoUserFetch } from "@/lib/django-client";
import { analyticsConfig } from "@/config/analytics";
import { metricsQuerySchema } from "@/lib/validation";

export async function GET(request: Request) {
  const admin = await requireAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = metricsQuerySchema.safeParse({
    days: searchParams.get("days") ?? analyticsConfig.metricsDefaultDays,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid query" },
      { status: 400 },
    );
  }

  const days = parsed.data.days ?? analyticsConfig.metricsDefaultDays;
  const response = await djangoUserFetch(
    admin.id,
    `/api/v1/admin/metrics/?days=${days}`,
  );
  const { data } = await djangoJson<Record<string, unknown>>(response);

  if (!response.ok || !data) {
    return NextResponse.json(
      { error: (data?.error as string) ?? "Failed to load metrics" },
      { status: response.status || 500 },
    );
  }

  return NextResponse.json(data);
}