import { NextResponse } from "next/server";

import { buildReadinessResult } from "@/lib/health-readiness";

export async function GET() {
  const readiness = await buildReadinessResult();

  return NextResponse.json(readiness.payload, {
    status: readiness.httpStatus,
  });
}
