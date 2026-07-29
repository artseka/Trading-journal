import { NextResponse } from "next/server";
import { authCookie, createSessionToken, credentialsAreValid } from "../../../../lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!(await credentialsAreValid(username, password))) {
      return NextResponse.json({ ok: false, message: "Username หรือ Password ไม่ถูกต้อง" }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(authCookie.name, await createSessionToken(username), {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
      maxAge: authCookie.maxAge,
    });
    return response;
  } catch {
    return NextResponse.json({ ok: false, message: "ไม่สามารถเข้าสู่ระบบได้" }, { status: 400 });
  }
}
