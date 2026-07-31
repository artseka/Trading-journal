import { NextResponse } from "next/server";
import { setSessionCookies, supabaseConfig, type SupabaseSession } from "../../../../lib/supabase-server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const expectedUsername = process.env.APP_USERNAME || "";
    const ownerEmail = process.env.SUPABASE_LOGIN_EMAIL || "";
    const email = username.includes("@") ? username.toLowerCase() : username === expectedUsername ? ownerEmail : "";
    if (!username || !password || !email) {
      return NextResponse.json({ ok: false, message: "Username หรือ Password ไม่ถูกต้อง" }, { status: 401 });
    }

    const { url, anonKey } = supabaseConfig();
    const authResponse = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: anonKey, "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });
    if (!authResponse.ok) {
      return NextResponse.json({ ok: false, message: "Username หรือ Password ไม่ถูกต้อง" }, { status: 401 });
    }
    const session: SupabaseSession = await authResponse.json();
    const response = NextResponse.json({ ok: true });
    setSessionCookies(response, session);
    return response;
  } catch {
    return NextResponse.json({ ok: false, message: "ไม่สามารถเข้าสู่ระบบได้" }, { status: 400 });
  }
}
