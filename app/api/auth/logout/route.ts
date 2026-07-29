import { NextResponse } from "next/server";
import { authCookies, getAccessToken, supabaseRequest } from "../../../../lib/supabase-server";

export async function POST() {
  const accessToken = await getAccessToken();
  if (accessToken) await supabaseRequest("/auth/v1/logout", accessToken, { method: "POST" }).catch(() => undefined);
  const response = NextResponse.json({ ok: true });
  const clear = { httpOnly: true, secure: true, sameSite: "strict" as const, path: "/", maxAge: 0 };
  response.cookies.set(authCookies.access, "", clear);
  response.cookies.set(authCookies.refresh, "", clear);
  return response;
}
