// // app/api/generate/route.ts
// import { NextResponse } from "next/server";
// import Ajv from "ajv";

// const OPENAI_KEY = process.env.OPENAI_API_KEY;
// const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

// if (!OPENAI_KEY) {
//   // Fail fast on server startup during dev if missing env
//   console.error("Missing OPENAI_API_KEY environment variable.");
//   // We don't throw here to avoid crashing the server at import time in some environments,
//   // but POST will return a 500 explaining the missing key.
// }

// /**
//  * DSL_SCHEMA: paste your schema here (trimmed for readability in comments)
//  * This must match the schema you want the model to output. We validate the model output against it.
//  */
// const DSL_SCHEMA = {
//   "$schema": "http://json-schema.org/draft-07/schema#",
//   "title": "Manim Animation DSL",
//   "type": "object",
//   "required": ["title", "scenes"],
//   "additionalProperties": false,
//   "properties": {
//     "title": { "type": "string" },
//     "width": { "type": "integer", "minimum": 320, "maximum": 3840, "default": 1280 },
//     "height": { "type": "integer", "minimum": 240, "maximum": 2160, "default": 720 },
//     "fps": { "type": "integer", "minimum": 15, "maximum": 60, "default": 30 },
//     "voiceover": { "type": "string" },
//     "scenes": {
//       "type": "array",
//       "minItems": 1,
//       "items": { "$ref": "#/definitions/scene" }
//     }
//   },
//   "definitions": {
//     "scene": {
//       "type": "object",
//       "required": ["type", "duration"],
//       "additionalProperties": false,
//       "properties": {
//         "type": {
//           "type": "string",
//           "enum": [
//             "text_slide","array_display","highlight","swap","draw_graph","plot_function",
//             "equation","camera_move","show_image","voiceover_segment","parallel","transition","final_text"
//           ]
//         },
//         "duration": { "type": "number", "minimum": 0.1 },
//         "delay": { "type": "number", "minimum": 0, "default": 0 },
//         "mode": {
//           "type": "string",
//           "enum": ["sequence", "parallel"],
//           "default": "sequence"
//         },
//         "id": { "type": "string" },
//         "meta": { "type": "object" },
//         "easing": {
//           "type": "string",
//           "enum": ["linear","ease_in","ease_out","ease_in_out","smooth"]
//         },
//         "text": { "type": "string" },
//         "values": {
//           "type": "array",
//           "items": { "type": "number" }
//         },
//         "layout": {
//           "type": "object",
//           "properties": {
//             "orientation": { "type": "string", "enum": ["horizontal","vertical"] },
//             "x_gap": { "type": "number" },
//             "y_gap": { "type": "number" }
//           },
//           "additionalProperties": true
//         },
//         "position": {
//           "type": "object",
//           "properties": {
//             "x": { "type": "number" },
//             "y": { "type": "number" }
//           }
//         },
//         "style": {
//           "type": "object",
//           "properties": {
//             "color": { "type": "string" },
//             "font_size": { "type": "number" },
//             "weight": { "type": "string" }
//           }
//         },
//         "target": {
//           "type": "object",
//           "properties": {
//             "array_index": { "type": "integer", "minimum": 0 },
//             "element_id": { "type": "string" }
//           }
//         },
//         "i": { "type": "integer", "minimum": 0 },
//         "j": { "type": "integer", "minimum": 0 },
//         "graph": { "type": "object" },
//         "function": { "type": "string" },
//         "image": { "type": "string" },
//         "audio": { "type": "string" },
//         "camera": {
//           "type": "object",
//           "properties": {
//             "zoom": { "type": "number" },
//             "pan": {
//               "type": "object",
//               "properties": {
//                 "x": { "type": "number" },
//                 "y": { "type": "number" }
//               }
//             }
//           }
//         },
//         "children": {
//           "type": "array",
//           "items": { "$ref": "#/definitions/scene" }
//         }
//       }
//     }
//   }
// };

// // AJV validator
// const ajv = new Ajv({ allErrors: true, strict: false });
// const validate = ajv.compile(DSL_SCHEMA);

// // --------------------- Helper functions ---------------------

// /**
//  * callOpenAI - call OpenAI Chat Completions API with a strict JSON-only prompt.
//  * Returns the raw text content returned by the model.
//  */
// async function callOpenAI(userText: string): Promise<string> {
//   if (!OPENAI_KEY) {
//     throw new Error("OpenAI API key is not configured on the server");
//   }

//   const systemPrompt = `
// You are a JSON-only generator. Convert the user's plain-English instruction into a valid JSON object that conforms EXACTLY to the provided JSON Schema. Output ONLY the JSON -- no commentary, no code fences, no extra fields.
// If you cannot produce a valid JSON that satisfies the schema, respond with a JSON object: { "error": "<short explanation>" }.
// Make scene durations realistic (0.5 - 12s each) and ensure total duration <= 180 seconds by default.
// `;

//   const userPrompt = `Schema: ${JSON.stringify(DSL_SCHEMA)}
// User instruction: ${userText}
// Output:`;

//   // Build request body for the Chat Completions endpoint
//   const body = {
//     model: MODEL,
//     messages: [
//       { role: "system", content: systemPrompt },
//       { role: "user", content: userPrompt },
//     ],
//     temperature: 0.0,
//     max_tokens: 1500,
//   };

//   const res = await fetch("https://api.openai.com/v1/chat/completions", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: `Bearer ${OPENAI_KEY}`,
//     },
//     body: JSON.stringify(body),
//   });

//   if (!res.ok) {
//     const text = await res.text();
//     throw new Error(`OpenAI API error ${res.status}: ${text}`);
//   }

//   const data = await res.json();
//   const rawText = data?.choices?.[0]?.message?.content ?? "";
//   return rawText;
// }

// /**
//  * extractJSON - finds the first top-level JSON object in a string by
//  * balancing braces. This is far more robust than naive first/last brace,
//  * and salvages typical LLM wrapping.
//  */
// function extractJSON(text: string): any | null {
//   if (!text || typeof text !== "string") return null;

//   // find the first '{'
//   const firstIndex = text.indexOf("{");
//   if (firstIndex === -1) return null;

//   let depth = 0;
//   let inString = false;
//   let escape = false;
//   for (let i = firstIndex; i < text.length; i++) {
//     const ch = text[i];

//     if (escape) {
//       escape = false;
//       continue;
//     }
//     if (ch === "\\") {
//       escape = true;
//       continue;
//     }
//     if (ch === '"' || ch === "'") {
//       inString = !inString;
//       continue;
//     }
//     if (inString) continue;

//     if (ch === "{") depth++;
//     if (ch === "}") depth--;

//     if (depth === 0) {
//       const candidate = text.substring(firstIndex, i + 1);
//       try {
//         return JSON.parse(candidate);
//       } catch (err) {
//         // Try a cleaned variant (remove trailing commas)
//         const cleaned = candidate.replace(/,\s*(\]|})/g, "$1");
//         try {
//           return JSON.parse(cleaned);
//         } catch (err2) {
//           return null;
//         }
//       }
//     }
//   }

//   return null;
// }

// // --------------------- Route Handler ---------------------

// export async function POST(request: Request) {
//   try {
//     const body = await request.json().catch(() => null);
//     const userText = (body?.text ?? "").toString().trim();

//     if (!userText) {
//       return NextResponse.json({ error: "Empty input" }, { status: 400 });
//     }

//     // Limit input length to prevent abuse
//     if (userText.length > 8000) {
//       return NextResponse.json({ error: "Input too long (limit 8000 chars)" }, { status: 400 });
//     }

//     // Call OpenAI to get JSON DSL
//     const raw = await callOpenAI(userText);

//     // Try to extract a JSON object
//     const parsed = extractJSON(raw);
//     if (!parsed) {
//       return NextResponse.json({ error: "Failed to parse JSON from model output", raw }, { status: 400 });
//     }

//     // Validate with AJV
//     const valid = validate(parsed);
//     if (!valid) {
//       return NextResponse.json({ error: "Schema validation failed", details: validate.errors, raw: parsed }, { status: 400 });
//     }

//     // Ensure scenes is an array (TypeScript-friendly)
//     const scenesRaw = parsed.scenes;
//     if (!Array.isArray(scenesRaw)) {
//       return NextResponse.json({ error: "Invalid DSL: scenes must be an array" }, { status: 400 });
//     }

//     const scenes: any[] = scenesRaw as any[];

//     // Compute total duration safely
//     const totalDuration = scenes.reduce((acc: number, sc: any) => {
//       const dur = Number(sc?.duration) || 0;
//       return acc + dur;
//     }, 0);

//     // Enforce duration limits
//     const MAX_TOTAL = 180; // seconds
//     if (totalDuration > MAX_TOTAL) {
//       return NextResponse.json({ error: `Generated DSL too long (total duration ${totalDuration}s > ${MAX_TOTAL}s)` }, { status: 400 });
//     }

//     // Optionally sanitize some fields or normalize (example: clamp fps)
//     if (typeof parsed.fps === "number") {
//       parsed.fps = Math.max(15, Math.min(60, parsed.fps));
//     } else {
//       parsed.fps = DSL_SCHEMA.properties!.fps!.default ?? 30;
//     }

//     // Success: return validated DSL and metadata
//     return NextResponse.json({ dsl: parsed, totalDuration });
//   } catch (err: any) {
//     console.error("API /api/generate error:", err);
//     return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
//   }
// }








// src/app/api/generate/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import crypto from "crypto";

const STORAGE_ROOT = path.resolve(process.cwd(), "storage", "jobs");

function makeJobId() {
  return crypto.randomBytes(8).toString("hex");
}

export async function POST(req: NextRequest) {
  const dsl = await req.json();

  if (!dsl || !Array.isArray(dsl.scenes) || !dsl.title) {
    return NextResponse.json(
      { error: "Invalid DSL (need title + scenes[])" },
      { status: 400 }
    );
  }

  const jobId = makeJobId();
  const jobDir = path.join(STORAGE_ROOT, jobId);
  const jsonPath = path.join(jobDir, "dsl.json");
  const outDir = path.join(jobDir, "output");
  const logPath = path.join(jobDir, "render.log");

  try {
    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(jsonPath, JSON.stringify(dsl, null, 2), "utf8");

    const pythonScript = path.resolve(process.cwd(), "scripts", "manim_renderer.py");
    const args = [
      "--input",
      jsonPath,
      "--outdir",
      outDir,
      "--scene-class",
      "GeneratedScene",
      "--quality",
      "low",
    ];

    const proc = spawn("python3", [pythonScript, ...args], {
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });

    const chunks: string[] = [];
    proc.stdout.on("data", (c) => {
      const s = c.toString();
      chunks.push(s);
      console.log(`[job ${jobId}]`, s.trim());
    });
    proc.stderr.on("data", (c) => {
      const s = c.toString();
      chunks.push(s);
      console.error(`[job ${jobId}]`, s.trim());
    });
    proc.on("close", async (code) => {
      chunks.push(`\nProcess exited with code ${code}\n`);
      try {
        await fs.writeFile(logPath, chunks.join(""), "utf8");
      } catch (e) {
        console.error(e);
      }
    });

    return NextResponse.json(
      { jobId, statusUrl: `/api/job-status?jobId=${jobId}` },
      { status: 202 }
    );
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
