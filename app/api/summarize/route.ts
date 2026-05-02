import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { extractContract, formatFieldsForLLM } from "@/lib/extractPdf";
import { MASTER_PROMPT } from "@/lib/masterPrompt";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_PDF_BYTES = 4_500_000;

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

    if (file.size > MAX_PDF_BYTES) {
      return NextResponse.json(
        {
          error: `PDF is ${(file.size / 1024 / 1024).toFixed(1)} MB. Vercel caps request bodies at 4.5 MB. Compress the PDF or reduce its page count.`,
        },
        { status: 413 },
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const extracted = await extractContract(bytes);
    const pdfBase64 = Buffer.from(bytes).toString("base64");

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured on server" },
        { status: 500 },
      );
    }

    const client = new Anthropic({ apiKey });

    const userContent: Anthropic.ContentBlockParam[] = [
      {
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: pdfBase64,
        },
      },
    ];

    if (extracted.filledCount > 0) {
      userContent.push({
        type: "text",
        text: `STRUCTURED FIELD MANIFEST (from AcroForm metadata — supplementary; trust the PDF if these disagree):\n\n${formatFieldsForLLM(extracted)}`,
      });
    } else {
      userContent.push({
        type: "text",
        text: "No usable AcroForm field values were extractable (form was likely flattened by DocuSign or rasterized). Read everything directly from the PDF pages above.",
      });
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      thinking: { type: "disabled" },
      system: [
        {
          type: "text",
          text: MASTER_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userContent }],
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
        fileSizeKb: Math.round(file.size / 1024),
        acroformFilled: extracted.filledCount,
        acroformTotal: extracted.fieldCount,
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
