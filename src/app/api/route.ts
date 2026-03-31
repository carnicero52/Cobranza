import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ 
    name: "Royalty QR API",
    version: "1.0.0",
    status: "running",
  });
}
