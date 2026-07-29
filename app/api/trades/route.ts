import { NextResponse } from "next/server";
import { getAccessToken, supabaseRequest } from "../../../lib/supabase-server";

export async function POST(request: Request) {
  const accessToken = await getAccessToken();
  if (!accessToken) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const payload = {
    trade_date: body.date,
    pair: String(body.pair || "").trim().toUpperCase(),
    side: body.side,
    result: body.result,
    pnl: Number(body.pnl) || 0,
    rr: String(body.rr || ""),
    strategy: String(body.strategy || ""),
    note: String(body.note || ""),
  };
  if (!payload.trade_date || !payload.pair) {
    return NextResponse.json({ message: "Invalid trade" }, { status: 400 });
  }
  const response = await supabaseRequest("/rest/v1/trades?select=id,trade_date,pair,side,result,pnl,rr,strategy,note,created_at", accessToken, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => null);
  return NextResponse.json(result, { status: response.ok ? 200 : response.status });
}
