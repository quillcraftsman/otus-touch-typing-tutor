import { NextResponse } from "next/server";

import { djangoJson, djangoPublicFetch } from "@/lib/django-client";
import { registerSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Некорректные данные" },
        { status: 400 },
      );
    }

    const response = await djangoPublicFetch("/api/v1/auth/register/", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    });
    const { data } = await djangoJson<{ error?: string; success?: boolean }>(
      response,
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error ?? "Не удалось зарегистрироваться" },
        { status: response.status },
      );
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Не удалось зарегистрироваться" },
      { status: 500 },
    );
  }
}