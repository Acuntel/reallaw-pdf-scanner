import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { extractContract, formatFieldsForLLM } from "@/lib/extractPdf";
import { MASTER_PROMPT } from "@/lib/masterPrompt";

export const runtime = "nodejs";
export const maxDuration = 60;

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

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY not configured on server" },
        { status: 500 },
      );
    }

    const groq = new Groq({ apiKey });
    const fieldDump = formatFieldsForLLM(extracted);

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      max_tokens: 2000,
      messages: [
        { role: "system", content: MASTER_PROMPT },
        { role: "user", content: fieldDump },
      ],
    });

    const summary = completion.choices[0]?.message?.content?.trim() ?? "";

    return NextResponse.json({
      summary,
      stats: {
        pageCount: extracted.pageCount,
        fieldCount: extracted.fieldCount,
        filledCount: extracted.filledCount,
        missingCount: extracted.missingCount,
      },
    });
  } catch (err: any) {
    console.error("summarize error", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 },
    );
  }
}
