import { cookies } from "next/headers";

export const authCookies = {
  access: "tj_sb_access",
  refresh: "tj_sb_refresh",
};

export function supabaseConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Supabase is not configured");
  return { url, anonKey };
}

export async function getAccessToken() {
  return (await cookies()).get(authCookies.access)?.value;
}

export async function supabaseRequest(path: string, accessToken: string, init: RequestInit = {}) {
  const { url, anonKey } = supabaseConfig();
  const headers = new Headers(init.headers);
  headers.set("apikey", anonKey);
  headers.set("authorization", `Bearer ${accessToken}`);
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  return fetch(`${url}${path}`, { ...init, headers, cache: "no-store" });
}

export async function accessTokenIsValid(accessToken?: string) {
  if (!accessToken) return false;
  const response = await supabaseRequest("/auth/v1/user", accessToken);
  return response.ok;
}

export type SupabaseSession = {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
};

export async function refreshSupabaseSession(refreshToken: string): Promise<SupabaseSession | null> {
  const { url, anonKey } = supabaseConfig();
  const response = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { apikey: anonKey, "content-type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
    cache: "no-store",
  });
  if (!response.ok) return null;
  return response.json();
}

export function setSessionCookies(response: Response, session: SupabaseSession) {
  const target = response as Response & {
    cookies: {
      set: (name: string, value: string, options: Record<string, unknown>) => void;
    };
  };
  const common = { httpOnly: true, secure: true, sameSite: "strict" as const, path: "/" };
  target.cookies.set(authCookies.access, session.access_token, {
    ...common,
    maxAge: Math.max(60, Number(session.expires_in) || 3600),
  });
  target.cookies.set(authCookies.refresh, session.refresh_token, {
    ...common,
    maxAge: 60 * 60 * 24 * 30,
  });
}
