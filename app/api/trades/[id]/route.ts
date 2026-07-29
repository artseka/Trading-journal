import { NextResponse } from "next/server";
import { getAccessToken, supabaseRequest } from "../../../../lib/supabase-server";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const accessToken = await getAccessToken();
  if (!accessToken) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json();
  const payload = {
    pair: String(body.pair || "").trim().toUpperCase(),
    side: body.side,
    result: body.result,
    pnl: Number(body.pnl) || 0,
    rr: String(body.rr || ""),
    strategy: String(body.strategy || ""),
    note: String(body.note || ""),
  };
  const response = await supabaseRequest(
    `/rest/v1/trades?id=eq.${encodeURIComponent(id)}&select=id,trade_date,pair,side,result,pnl,rr,strategy,note,created_at`,
    accessToken,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(payload),
    },
  );
  const result = await response.json().catch(() => null);
  return NextResponse.json(result, { status: response.ok ? 200 : response.status });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const accessToken = await getAccessToken();
  if (!accessToken) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const response = await supabaseRequest(`/rest/v1/trades?id=eq.${encodeURIComponent(id)}`, accessToken, {
    method: "DELETE",
  });
  return NextResponse.json({ ok: response.ok }, { status: response.ok ? 200 : response.status });
}
