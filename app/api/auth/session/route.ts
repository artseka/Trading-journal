import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  accessTokenIsValid,
  authCookies,
  refreshSupabaseSession,
  setSessionCookies,
} from "../../../../lib/supabase-server";

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(authCookies.access)?.value;
  if (await accessTokenIsValid(accessToken)) return NextResponse.json({ authenticated: true });

  const refreshToken = cookieStore.get(authCookies.refresh)?.value;
  if (!refreshToken) return NextResponse.json({ authenticated: false });
  const session = await refreshSupabaseSession(refreshToken);
  if (!session) return NextResponse.json({ authenticated: false });

  const response = NextResponse.json({ authenticated: true });
  setSessionCookies(response, session);
  return response;
}
