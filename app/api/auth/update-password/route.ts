import { NextResponse } from "next/server";
import { getAccessToken, supabaseRequest } from "../../../../lib/supabase-server";

export async function POST(request: Request) {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json({ message: "ลิงก์ตั้งรหัสผ่านหมดอายุ กรุณาขอลิงก์ใหม่" }, { status: 401 });
    }

    const body = await request.json();
    const password = typeof body.password === "string" ? body.password : "";
    if (password.length < 8) {
      return NextResponse.json({ message: "รหัสผ่านต้องมีอย่างน้อย 8 ตัว" }, { status: 400 });
    }

    const updateResponse = await supabaseRequest("/auth/v1/user", accessToken, {
      method: "PUT",
      body: JSON.stringify({ password }),
    });
    if (!updateResponse.ok) {
      const result = await updateResponse.json().catch(() => null);
      const message = typeof result?.msg === "string" ? result.msg : "ไม่สามารถตั้งรหัสผ่านใหม่ได้";
      return NextResponse.json({ message }, { status: updateResponse.status });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "ไม่สามารถตั้งรหัสผ่านใหม่ได้ กรุณาลองอีกครั้ง" }, { status: 400 });
  }
}
