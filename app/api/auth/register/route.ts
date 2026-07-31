import { NextResponse } from "next/server";
import { supabaseConfig } from "../../../../lib/supabase-server";

const usernamePattern = /^[a-z0-9_]{3,20}$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!usernamePattern.test(username)) {
      return NextResponse.json({ message: "Username ต้องมี 3-20 ตัว และใช้เฉพาะ a-z, 0-9 หรือ _" }, { status: 400 });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ message: "กรุณากรอกอีเมลให้ถูกต้อง" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ message: "รหัสผ่านต้องมีอย่างน้อย 8 ตัว" }, { status: 400 });
    }

    const { url, anonKey } = supabaseConfig();
    const availabilityResponse = await fetch(`${url}/rest/v1/rpc/is_username_available`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${anonKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ candidate: username }),
      cache: "no-store",
    });
    const available = await availabilityResponse.json().catch(() => false);
    if (!availabilityResponse.ok || available !== true) {
      return NextResponse.json({ message: "Username นี้ถูกใช้งานแล้ว กรุณาเลือกชื่ออื่น" }, { status: 409 });
    }

    const origin = new URL(request.url).origin;
    const signupResponse = await fetch(
      `${url}/auth/v1/signup?redirect_to=${encodeURIComponent(`${origin}/?confirmed=1`)}`,
      {
        method: "POST",
        headers: { apikey: anonKey, "content-type": "application/json" },
        body: JSON.stringify({ email, password, data: { username } }),
        cache: "no-store",
      },
    );
    const signupResult = await signupResponse.json().catch(() => null);
    if (!signupResponse.ok) {
      const message = typeof signupResult?.msg === "string" ? signupResult.msg : "ไม่สามารถสมัครสมาชิกได้";
      return NextResponse.json({ message }, { status: signupResponse.status });
    }

    return NextResponse.json({
      ok: true,
      message: "สมัครสำเร็จ กรุณาเปิดอีเมลและกดยืนยันก่อนเข้าสู่ระบบ",
    });
  } catch {
    return NextResponse.json({ message: "ไม่สามารถสมัครสมาชิกได้ กรุณาลองอีกครั้ง" }, { status: 400 });
  }
}
