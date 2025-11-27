// src/app/api/generate/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import crypto from "crypto";
import Ajv from "ajv";

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const STORAGE_ROOT = path.resolve(process.cwd(), "storage", "jobs");

if (!OPENAI_KEY) {
  console.error("Missing OPENAI_API_KEY environment variable.");
}

// --- SCHEMA DEFINITION ---
const DSL_SCHEMA = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Manim Animation DSL",
  "type": "object",
  "required": ["title", "scenes"],
  "additionalProperties": false,
  "properties": {
    "title": { "type": "string" },
    "width": { "type": "integer", "minimum": 320, "maximum": 3840, "default": 1280 },
    "height": { "type": "integer", "minimum": 240, "maximum": 2160, "default": 720 },
    "fps": { "type": "integer", "minimum": 15, "maximum": 60, "default": 30 },
    "scenes": {
      "type": "array",
      "minItems": 1,
      "items": { "$ref": "#/definitions/scene" }
    }
  },
  "definitions": {
    "scene": {
      "type": "object",
      "required": ["type", "duration"],
      "additionalProperties": false,
      "properties": {
        "type": {
          "type": "string",
          "enum": [
            "text_slide", "array_display", "highlight", "swap", "draw_graph", "plot_function",
            "equation", "camera_move", "show_image", "voiceover_segment", "parallel", "transition", "final_text"
          ]
        },
        "duration": { "type": "number", "minimum": 0.1 },
        "objects": {
          "type": "array",
          "items": { "$ref": "#/definitions/mobject" }
        }
      }
    },
    "mobject": {
      "type": "object",
      "required": ["type"],
      "properties": {
        "type": { "type": "string" }, // text, circle, square, arrow, line, mathtex
        "text": { "type": "string" },
        "position": {
          "type": "object",
          "properties": { "x": { "type": "number" }, "y": { "type": "number" } }
        },
        "style": {
          "type": "object",
          "properties": {
            "color": { "type": "string" },
            "font_size": { "type": "number" },
            "weight": { "type": "string" }
          }
        },
        "radius": { "type": "number" },
        "width": { "type": "number" },
        "height": { "type": "number" },
        "p1": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" } } },
        "p2": { "type": "object", "properties": { "x": { "type": "number" }, "y": { "type": "number" } } },
        "animation": {
          "type": "string",
          "enum": ["Write", "FadeIn", "GrowFromCenter", "DrawBorderThenFill", "Create"]
        }
      }
    }
  }
};

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(DSL_SCHEMA);

// --- OPENAI HELPER ---
async function callOpenAI(userText: string): Promise<string> {
  if (!OPENAI_KEY) throw new Error("OpenAI API key missing");

  const systemPrompt = `
You are an expert Manim animation generator and Creative Director.
Convert the user's educational text into a JSON DSL that creates intuitive, visual explanations.

CRITICAL INSTRUCTIONS:
1. **Focus & Accuracy**:
   - **ALWAYS** show the mathematical formula clearly using "mathtex" (e.g., A = \\pi r^2).
   - Do **NOT** add unrelated decorative elements or random animations. Every element must serve the explanation.
   - If the user asks for a specific concept (like "Area of Circle"), your TOP priority is to visualize THAT concept accurately.

2. **Object Persistence**: Use the "id" field to track objects. To move an object, use the SAME "id" in the next scene with a different "position".

3. **Visual Strategies**:
   - **Circle Area**: Decompose the circle into "sectors" (wedges) and rearrange them into a rectangle to intuitively show A = πr².
   - **Pythagoras**: Show squares growing from the sides of a triangle.
   - **Formulas**: Don't just show text. Show the shape, then label its parts (radius, height) using "brace" or lines, then fade in the formula.

4. **New Shapes**: You can use "sector", "arc", "brace", "polygon", "line", "arrow", "circle", "square", "rectangle".
5. **Animations**: Use "Transform" to morph shapes, "Create" to draw them, "GrowFromCenter" for emphasis.

Output ONLY valid JSON matching the schema.
`;

  const userPrompt = `Schema: ${JSON.stringify(DSL_SCHEMA)}
User Text: ${userText}
Output JSON:`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2, // Low temp for valid JSON
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${txt}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

function extractJSON(text: string): any | null {
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1) return null;
  try {
    return JSON.parse(text.substring(first, last + 1));
  } catch {
    return null;
  }
}

function makeJobId() {
  return crypto.randomBytes(8).toString("hex");
}

// --- ROUTE HANDLER ---
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userText = body.text || "";

    if (!userText) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    // 1. Generate DSL via OpenAI
    const raw = await callOpenAI(userText);
    const dsl = extractJSON(raw);

    if (!dsl) {
      return NextResponse.json({ error: "Failed to parse AI response", raw }, { status: 500 });
    }

    // 2. Validate DSL (Optional but good)
    // const valid = validate(dsl);
    // if (!valid) console.warn("Schema validation warning:", validate.errors);

    // 3. Create Job
    const jobId = makeJobId();
    const jobDir = path.join(STORAGE_ROOT, jobId);
    const jsonPath = path.join(jobDir, "dsl.json");
    const outDir = path.join(jobDir, "output");
    const logPath = path.join(jobDir, "render.log");

    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(jsonPath, JSON.stringify(dsl, null, 2), "utf8");

    // 4. Spawn Renderer
    const pythonScript = path.resolve(process.cwd(), "scripts", "manim_renderer.py");
    const args = [
      "--input", jsonPath,
      "--outdir", outDir,
      "--scene-class", "GeneratedScene",
      "--quality", "low",
    ];

    const proc = spawn("python3", [pythonScript, ...args], {
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });

    // Stream logs to file
    const logStream = (await fs.open(logPath, 'a')).createWriteStream();

    proc.stdout.on("data", (c) => {
      const s = c.toString();
      console.log(`[job ${jobId}]`, s.trim());
      logStream.write(s);
    });
    proc.stderr.on("data", (c) => {
      const s = c.toString();
      console.error(`[job ${jobId}]`, s.trim());
      logStream.write(s);
    });
    proc.on("close", (code) => {
      logStream.write(`\nProcess exited with code ${code}\n`);
      logStream.end();
    });

    console.log("Generated DSL:", JSON.stringify(dsl, null, 2));

    return NextResponse.json(
      { jobId, statusUrl: `/api/job-status?jobId=${jobId}`, dsl },
      { status: 202 }
    );

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
