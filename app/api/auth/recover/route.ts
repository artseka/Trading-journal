import { NextResponse } from "next/server";
import { supabaseConfig } from "../../../../lib/supabase-server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const captchaToken = typeof body.captchaToken === "string" ? body.captchaToken.trim() : "";

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ message: "กรุณากรอกอีเมลให้ถูกต้อง" }, { status: 400 });
    }
    if (!captchaToken) {
      return NextResponse.json({ message: "กรุณายืนยันว่าคุณไม่ใช่โปรแกรมอัตโนมัติ" }, { status: 400 });
    }

    const { url, anonKey } = supabaseConfig();
    const origin = new URL(request.url).origin;
    const recoverResponse = await fetch(
      `${url}/auth/v1/recover?redirect_to=${encodeURIComponent(`${origin}/?recovery=1`)}`,
      {
        method: "POST",
        headers: { apikey: anonKey, "content-type": "application/json" },
        body: JSON.stringify({
          email,
          gotrue_meta_security: { captcha_token: captchaToken },
        }),
        cache: "no-store",
      },
    );

    if (!recoverResponse.ok) {
      const result = await recoverResponse.json().catch(() => null);
      const message = typeof result?.msg === "string" ? result.msg : "ไม่สามารถส่งอีเมลได้ กรุณาลองอีกครั้ง";
      return NextResponse.json({ message }, { status: recoverResponse.status });
    }

    return NextResponse.json({
      ok: true,
      message: "หากอีเมลนี้มีบัญชีอยู่ ระบบจะส่งลิงก์ตั้งรหัสผ่านใหม่ให้คุณ",
    });
  } catch {
    return NextResponse.json({ message: "ไม่สามารถส่งอีเมลได้ กรุณาลองอีกครั้ง" }, { status: 400 });
  }
}
