import { getToken } from "@/lib/auth-server";
import { NextResponse } from "next/server";

export async function GET() {
  const token = await getToken();
  if (!token) {
    return NextResponse.json({ token: null }, { status: 401 });
  }
  return NextResponse.json({ token }, { status: 200 });
}
