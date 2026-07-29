import { NextResponse } from "next/server";
import { getAccessToken, supabaseRequest } from "../../../lib/supabase-server";

export async function GET() {
  const accessToken = await getAccessToken();
  if (!accessToken) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const [tradesResponse, capitalResponse] = await Promise.all([
    supabaseRequest(
      "/rest/v1/trades?select=id,trade_date,pair,side,result,pnl,rr,strategy,note,created_at&order=trade_date.desc,created_at.desc",
      accessToken,
    ),
    supabaseRequest(
      "/rest/v1/capital?select=month_key,amount&order=month_key.desc",
      accessToken,
    ),
  ]);
  if (!tradesResponse.ok || !capitalResponse.ok) {
    return NextResponse.json({ message: "Database request failed" }, { status: 502 });
  }
  return NextResponse.json({
    trades: await tradesResponse.json(),
    capital: await capitalResponse.json(),
  });
}

export async function POST(request: Request) {
  const accessToken = await getAccessToken();
  if (!accessToken) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  if (!Array.isArray(body.trades) || !body.capital || typeof body.capital !== "object") {
    return NextResponse.json({ message: "Invalid backup" }, { status: 400 });
  }

  const [deleteTrades, deleteCapital] = await Promise.all([
    supabaseRequest("/rest/v1/trades?id=not.is.null", accessToken, { method: "DELETE" }),
    supabaseRequest("/rest/v1/capital?id=not.is.null", accessToken, { method: "DELETE" }),
  ]);
  if (!deleteTrades.ok || !deleteCapital.ok) {
    return NextResponse.json({ message: "Could not replace existing data" }, { status: 502 });
  }

  const trades = body.trades.map((trade: Record<string, unknown>) => ({
    trade_date: trade.date,
    pair: trade.pair,
    side: trade.side,
    result: trade.result,
    pnl: Number(trade.pnl) || 0,
    rr: trade.rr || "",
    strategy: trade.strategy || "",
    note: trade.note || "",
  }));
  const capital = Object.entries(body.capital).map(([month_key, amount]) => ({
    month_key,
    amount: Number(amount) || 0,
  }));

  if (trades.length) {
    const response = await supabaseRequest("/rest/v1/trades", accessToken, {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(trades),
    });
    if (!response.ok) return NextResponse.json({ message: "Trade import failed" }, { status: 502 });
  }
  if (capital.length) {
    const response = await supabaseRequest("/rest/v1/capital", accessToken, {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(capital),
    });
    if (!response.ok) return NextResponse.json({ message: "Capital import failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
