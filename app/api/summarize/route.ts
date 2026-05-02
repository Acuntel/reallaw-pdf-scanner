import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { MASTER_PROMPT } from "@/lib/masterPrompt";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BODY_BYTES = 4_400_000;
const MAX_PAGES = 40;

type Body = {
  pages?: string[];
  mediaType?: string;
  fileName?: string;
};

const ALLOWED_MEDIA = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;
type AllowedMedia = (typeof ALLOWED_MEDIA)[number];

export async function POST(req: NextRequest) {
  try {
    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json(
        {
          error: `Body ${(contentLength / 1024 / 1024).toFixed(1)} MB exceeds 4.4 MB cap. Lower DPI client-side or split the PDF.`,
        },
        { status: 413 },
      );
    }

    const body = (await req.json()) as Body;
    const pages = body.pages ?? [];

    if (!Array.isArray(pages) || pages.length === 0) {
      return NextResponse.json(
        {
          error:
            "No pages received. The PDF may have failed to render — re-upload and check the browser console.",
        },
        { status: 400 },
      );
    }

    if (pages.length > MAX_PAGES) {
      return NextResponse.json(
        {
          error: `${pages.length} pages exceeds ${MAX_PAGES}-page limit. Split the contract or contact support.`,
        },
        { status: 413 },
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

    const mediaType: AllowedMedia = (
      ALLOWED_MEDIA.includes(body.mediaType as AllowedMedia)
        ? body.mediaType
        : "image/jpeg"
    ) as AllowedMedia;

    const userContent: Anthropic.ContentBlockParam[] = pages.map((b64) => ({
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: mediaType,
        data: b64,
      },
    }));
    userContent.push({
      type: "text",
      text: `The pages above are a Multi-Board 8.0 Residential Contract (${pages.length} pages, rendered from a PDF). Review per the format.`,
    });

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
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
        pageCount: pages.length,
        fileName: body.fileName ?? null,
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
