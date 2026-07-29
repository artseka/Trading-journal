import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authCookie, sessionIsValid } from "../../../../lib/auth";

export async function GET() {
  const cookieStore = await cookies();
  const authenticated = await sessionIsValid(cookieStore.get(authCookie.name)?.value);
  return NextResponse.json({ authenticated });
}
