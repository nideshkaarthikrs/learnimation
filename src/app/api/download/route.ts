// src/app/api/download/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const STORAGE_ROOT = path.resolve(process.cwd(), "storage", "jobs");

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId") ?? "";
  const file = searchParams.get("file") ?? "";

  if (!jobId || !file) {
    return NextResponse.json(
      { error: "jobId and file required" },
      { status: 400 }
    );
  }

  if (jobId.includes("..") || file.includes("..")) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }

  const filePath = path.join(STORAGE_ROOT, jobId, "output", file);

  try {
    const data = await fs.readFile(filePath);
    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(data.length),
        "Content-Disposition": `inline; filename="${file}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "file not found" }, { status: 404 });
  }
}
