import { NextResponse } from "next/server";
import { getAccessToken, supabaseRequest } from "../../../lib/supabase-server";

export async function PUT(request: Request) {
  const accessToken = await getAccessToken();
  if (!accessToken) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const amount = Number(body.amount);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(body.monthKey || "") || !Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ message: "Invalid capital" }, { status: 400 });
  }
  const response = await supabaseRequest("/rest/v1/capital?on_conflict=user_id,month_key", accessToken, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ month_key: body.monthKey, amount }),
  });
  return NextResponse.json({ ok: response.ok }, { status: response.ok ? 200 : response.status });
}
