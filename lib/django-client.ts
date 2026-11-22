const defaultUrl = "http://127.0.0.1:8000";

export function getDjangoApiUrl(): string {
  return process.env.DJANGO_API_URL ?? defaultUrl;
}

export function getInternalApiSecret(): string {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) {
    throw new Error("INTERNAL_API_SECRET is not configured");
  }
  return secret;
}

export async function djangoPublicFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${getDjangoApiUrl()}${path}`, {
    ...init,
    headers,
  });
}

export async function djangoUserFetch(
  userId: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${getInternalApiSecret()}`);
  headers.set("X-User-Id", userId);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${getDjangoApiUrl()}${path}`, {
    ...init,
    headers,
  });
}

export async function djangoJson<T>(
  response: Response,
): Promise<{ data: T | null; status: number; text: string }> {
  const text = await response.text();
  if (!text) {
    return { data: null, status: response.status, text };
  }
  try {
    return { data: JSON.parse(text) as T, status: response.status, text };
  } catch {
    return { data: null, status: response.status, text };
  }
}