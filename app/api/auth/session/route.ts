import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  authCookies,
  getSupabaseUser,
  refreshSupabaseSession,
  setSessionCookies,
} from "../../../../lib/supabase-server";

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(authCookies.access)?.value;
  const currentUser = await getSupabaseUser(accessToken);
  if (currentUser) {
    return NextResponse.json({ authenticated: true, userId: currentUser.id, email: currentUser.email });
  }

  const refreshToken = cookieStore.get(authCookies.refresh)?.value;
  if (!refreshToken) return NextResponse.json({ authenticated: false });
  const session = await refreshSupabaseSession(refreshToken);
  if (!session) return NextResponse.json({ authenticated: false });

  const refreshedUser = await getSupabaseUser(session.access_token);
  if (!refreshedUser) return NextResponse.json({ authenticated: false });
  const response = NextResponse.json({ authenticated: true, userId: refreshedUser.id, email: refreshedUser.email });
  setSessionCookies(response, session);
  return response;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const session = {
      access_token: typeof body.access_token === "string" ? body.access_token : "",
      refresh_token: typeof body.refresh_token === "string" ? body.refresh_token : "",
      expires_in: Number(body.expires_in) || 3600,
    };
    const user = await getSupabaseUser(session.access_token);
    if (!user || !session.refresh_token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    const response = NextResponse.json({ authenticated: true, userId: user.id, email: user.email });
    setSessionCookies(response, session);
    return response;
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 400 });
  }
}
