import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { extractContract, formatFieldsForLLM } from "@/lib/extractPdf";
import { MASTER_PROMPT } from "@/lib/masterPrompt";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      return NextResponse.json(
        { error: "File must be a PDF" },
        { status: 400 },
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const extracted = await extractContract(bytes);

    if (extracted.fieldCount === 0) {
      return NextResponse.json(
        {
          error:
            "No fillable form fields detected in this PDF. The Multi-Board 8.0 contract uses an AcroForm — make sure you're uploading the editable PDF, not a flattened scan.",
        },
        { status: 422 },
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured on server" },
        { status: 500 },
      );
    }

    const client = new Anthropic({ apiKey });
    const fieldDump = formatFieldsForLLM(extracted);

    const response = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system: [
        {
          type: "text",
          text: MASTER_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: fieldDump }],
    });

    const summary = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    return NextResponse.json({
      summary,
      stats: {
        pageCount: extracted.pageCount,
        fieldCount: extracted.fieldCount,
        filledCount: extracted.filledCount,
        missingCount: extracted.missingCount,
      },
      usage: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
        cache_read: response.usage.cache_read_input_tokens ?? 0,
        cache_write: response.usage.cache_creation_input_tokens ?? 0,
      },
    });
  } catch (err: unknown) {
    if (err instanceof Anthropic.APIError) {
      console.error("anthropic error", err.status, err.message);
      return NextResponse.json(
        { error: `Claude API ${err.status}: ${err.message}` },
        { status: err.status >= 500 ? 502 : err.status },
      );
    }
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("summarize error", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
