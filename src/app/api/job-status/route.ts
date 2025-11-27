// src/app/api/job-status/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const STORAGE_ROOT = path.resolve(process.cwd(), "storage", "jobs");

/**
 * Removes ANSI codes and converts CR to LF for readability.
 */
function sanitizeLog(raw: string): string {
    // Remove ANSI escape codes
    // eslint-disable-next-line no-control-regex
    let clean = raw.replace(/\x1b\[[0-9;]*m/g, "");

    // Replace carriage returns with newlines to preserve output history
    // (Manim uses \r to overwrite lines, but we want to see the history or at least parse it)
    clean = clean.replace(/\r+/g, "\n");

    return clean;
}

/**
 * Extracts progress percentage from log lines.
 * Strategies:
 * 1. Look for "N%" pattern (last occurrence).
 * 2. Look for "N/M" pattern (last occurrence) and calculate percentage.
 */
function extractProgress(lines: string[]): number | null {
    // We iterate backwards to find the most recent progress
    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];

        // Strategy 1: " 90% "
        const percentMatch = line.match(/(\d{1,3})%/);
        if (percentMatch) {
            const p = parseInt(percentMatch[1], 10);
            if (!isNaN(p) && p >= 0 && p <= 100) return p;
        }

        // Strategy 2: " 7/30 " (e.g. Manim's "7/30 [00:05<...]")
        const fractionMatch = line.match(/(\d+)\s*\/\s*(\d+)/);
        if (fractionMatch) {
            const current = parseInt(fractionMatch[1], 10);
            const total = parseInt(fractionMatch[2], 10);
            if (total > 0 && current <= total) {
                return Math.round((current / total) * 100);
            }
        }
    }
    return null;
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId") ?? "";
    if (!jobId) {
        return NextResponse.json({ error: "jobId required" }, { status: 400 });
    }

    const jobDir = path.join(STORAGE_ROOT, jobId);
    const outDir = path.join(jobDir, "output");
    const logPath = path.join(jobDir, "render.log");

    try {
        // Check if job exists
        const exists = await fs.stat(jobDir).catch(() => null);
        if (!exists) {
            return NextResponse.json({ error: "job not found" }, { status: 404 });
        }

        // Check for output files
        const files = await fs.readdir(outDir).catch(() => []);
        const mp4s = files.filter((f) => f.endsWith(".mp4"));
        const done = mp4s.length > 0;

        // Read and process log
        let logRaw = "";
        try {
            logRaw = await fs.readFile(logPath, "utf8");
        } catch {
            // Log file might not exist yet if process hasn't started writing or just started
            logRaw = "";
        }

        const sanitizedLog = sanitizeLog(logRaw);
        const logLines = sanitizedLog.split("\n").filter((l) => l.trim().length > 0);

        // Extract progress
        const progress = extractProgress(logLines);

        // Get preview (last 12 lines)
        const log_preview = logLines.slice(-12).join("\n");

        return NextResponse.json({
            files,
            mp4s,
            done,
            log: sanitizedLog,
            log_preview,
            progress,
        });
    } catch (err: any) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
