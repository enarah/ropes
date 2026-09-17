import { NextResponse } from "next/server";

import { buildHealthPayload } from "@/lib/health-readiness";

export function GET() {
  return NextResponse.json(buildHealthPayload(), { status: 200 });
}
