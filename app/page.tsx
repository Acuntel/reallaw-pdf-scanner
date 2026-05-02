"use client";

import { useCallback, useMemo, useRef, useState } from "react";

type Stats = {
  pageCount: number;
  fileSizeKb: number;
  acroformFilled: number;
  acroformTotal: number;
};

type Usage = {
  input: number;
  output: number;
  cache_read: number;
  cache_write: number;
};

type LineKind = "ok" | "verify" | "action" | "header" | "plain";
type Line = { kind: LineKind; text: string };

const TAG_RE = /^\[(OK|VERIFY|ACTION)\]\s*/;
const HEADER_RE = /^[A-Z][A-Z0-9 /&,]+$/;

function parseSummary(summary: string): Line[] {
  return summary
    .split("\n")
    .map((raw) => raw.trimEnd())
    .filter((l, i, arr) => !(l === "" && arr[i - 1] === ""))
    .map((line): Line => {
      if (line.trim() === "") return { kind: "plain", text: "" };
      const tag = line.match(TAG_RE);
      if (tag) {
        const kind = tag[1].toLowerCase() as "ok" | "verify" | "action";
        return { kind, text: line.replace(TAG_RE, "") };
      }
      if (HEADER_RE.test(line.trim()))
        return { kind: "header", text: line.trim() };
      return { kind: "plain", text: line };
    });
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string>("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [error, setError] = useState<string>("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const lines = useMemo(
    () => (summary ? parseSummary(summary) : []),
    [summary],
  );
  const counts = useMemo(() => {
    const c = { ok: 0, verify: 0, action: 0 };
    for (const l of lines) {
      if (l.kind === "ok" || l.kind === "verify" || l.kind === "action")
        c[l.kind]++;
    }
    return c;
  }, [lines]);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDFs.");
      return;
    }
    setFile(f);
    setError("");
    setSummary("");
    setStats(null);
    setUsage(null);
  }, []);

  const submit = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    setSummary("");
    setStats(null);
    setUsage(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/summarize", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed");
      } else {
        setSummary(data.summary);
        setStats(data.stats);
        setUsage(data.usage ?? null);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Network error";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [file]);

  const clearAll = useCallback(() => {
    setFile(null);
    setSummary("");
    setStats(null);
    setUsage(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-navy-deep text-cream border-b-2 border-gold">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-sm bg-gold flex items-center justify-center">
              <span className="font-serif font-bold text-navy-deep text-xl leading-none">
                R
              </span>
            </div>
            <div>
              <div className="font-serif text-xl tracking-wide text-gold-light">
                REAL Law Group
              </div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-cream/70">
                Contract Scanner
              </div>
            </div>
          </div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-cream/60 hidden sm:block">
            Multi-Board 8.0 · Internal Tool
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="mb-8 max-w-2xl">
            <h1 className="font-serif text-4xl text-navy-deep leading-tight mb-2">
              Drop a contract.<span className="text-gold">.</span>{" "}
              <span className="text-navy/60">Read it in 30 seconds.</span>
            </h1>
            <p className="text-sm text-navy/70 leading-relaxed">
              Upload the executed Multi-Board 8.0 PDF. The scanner reads
              DocuSigned forms, computes contingency deadlines, checks signature
              and initial counts against named parties, and flags every action
              item the attorney needs to confirm before circulation.
            </p>
          </div>

          {/* Upload card */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFiles(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            className={`grain rounded-lg p-10 text-center cursor-pointer transition border-2 ${
              dragOver
                ? "border-gold bg-gold/5 shadow-gold"
                : "border-dashed border-navy/20 bg-paper hover:border-gold hover:shadow-soft"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            {file ? (
              <div>
                <div className="font-serif text-xl text-navy-deep">
                  {file.name}
                </div>
                <div className="text-xs text-navy/50 mt-1">
                  {(file.size / 1024).toFixed(0)} KB · click to replace
                </div>
              </div>
            ) : (
              <div>
                <div className="font-serif text-xl text-navy-deep">
                  Drop a PDF here
                </div>
                <div className="text-xs uppercase tracking-[0.18em] text-navy/50 mt-2">
                  or click to browse
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 flex items-center gap-4">
            <button
              onClick={submit}
              disabled={!file || loading}
              className="px-7 py-3 rounded-sm bg-navy-deep text-cream text-sm uppercase tracking-[0.15em] font-medium hover:bg-navy transition disabled:opacity-40 disabled:cursor-not-allowed shadow-soft"
            >
              {loading ? "Scanning…" : "Scan Contract"}
            </button>
            {file && !loading && (
              <button
                onClick={clearAll}
                className="text-xs uppercase tracking-[0.15em] text-navy/50 hover:text-navy transition"
              >
                Clear
              </button>
            )}
          </div>

          {error && (
            <div className="mt-6 p-4 rounded-sm bg-action-bg border border-action-border text-sm text-action-text">
              {error}
            </div>
          )}

          {/* Results */}
          {summary && stats && (
            <section className="mt-10">
              {/* Action-item banner */}
              <div className="flex flex-wrap gap-3 mb-4">
                <CountChip
                  label="Action items"
                  count={counts.action}
                  tone="action"
                />
                <CountChip label="Verify" count={counts.verify} tone="verify" />
                <CountChip label="OK" count={counts.ok} tone="ok" />
                <div className="ml-auto flex items-center gap-3 text-[11px] uppercase tracking-[0.15em] text-navy/50">
                  <span>{stats.pageCount} pp</span>
                  <span className="text-gold">·</span>
                  <span>{stats.fileSizeKb} KB</span>
                  {stats.acroformFilled > 0 && (
                    <>
                      <span className="text-gold">·</span>
                      <span>
                        {stats.acroformFilled}/{stats.acroformTotal} fields
                      </span>
                    </>
                  )}
                </div>
              </div>

              <article className="bg-paper rounded-lg shadow-soft border border-navy/10 overflow-hidden">
                <div className="px-6 py-4 bg-navy-deep text-cream flex items-center justify-between">
                  <div className="font-serif text-lg tracking-wide text-gold-light">
                    Contract Review
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(summary)}
                    className="text-[11px] uppercase tracking-[0.15em] text-cream/60 hover:text-gold transition"
                    title="Copy raw summary to clipboard"
                  >
                    Copy
                  </button>
                </div>
                <div className="p-6 sm:p-8">
                  <SummaryView lines={lines} />
                </div>
                {usage && (
                  <div className="px-6 py-3 border-t border-navy/10 bg-cream/40 text-[11px] uppercase tracking-[0.13em] text-navy/40 flex flex-wrap gap-x-5 gap-y-1">
                    <span>in {usage.input.toLocaleString()}</span>
                    <span>out {usage.output.toLocaleString()}</span>
                    {usage.cache_read > 0 && (
                      <span>cache hit {usage.cache_read.toLocaleString()}</span>
                    )}
                    <span className="ml-auto">claude-sonnet-4-6</span>
                  </div>
                )}
              </article>
            </section>
          )}
        </div>
      </main>

      <footer className="border-t border-navy/10 mt-16 py-6">
        <div className="max-w-5xl mx-auto px-6 text-[11px] uppercase tracking-[0.15em] text-navy/40 flex justify-between">
          <span>REAL Law Group · Internal Use Only</span>
          <span>Contract data not stored</span>
        </div>
      </footer>
    </div>
  );
}

function CountChip({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: "ok" | "verify" | "action";
}) {
  const styles =
    tone === "action"
      ? "bg-action-bg border-action-border text-action-text"
      : tone === "verify"
        ? "bg-verify-bg border-verify-border text-verify-text"
        : "bg-ok-bg border-ok-border text-ok-text";
  return (
    <div
      className={`px-3 py-1.5 rounded-sm border text-xs flex items-center gap-2 ${styles}`}
    >
      <span className="font-semibold tabular-nums">{count}</span>
      <span className="uppercase tracking-[0.12em]">{label}</span>
    </div>
  );
}

function SummaryView({ lines }: { lines: Line[] }) {
  const blocks: Array<{ header: string | null; items: Line[] }> = [];
  let current: { header: string | null; items: Line[] } = {
    header: null,
    items: [],
  };

  for (const line of lines) {
    if (line.kind === "header") {
      if (current.header || current.items.length) blocks.push(current);
      current = { header: line.text, items: [] };
    } else if (
      line.text === "" &&
      current.items.length === 0 &&
      !current.header
    ) {
      // skip leading blanks
    } else {
      current.items.push(line);
    }
  }
  if (current.header || current.items.length) blocks.push(current);

  return (
    <div className="space-y-7">
      {blocks.map((block, i) => (
        <section key={i}>
          {block.header && (
            <h3 className="font-serif text-sm uppercase tracking-[0.2em] text-navy-deep mb-3 pb-2 border-b border-gold/40">
              {block.header}
            </h3>
          )}
          <ul className="space-y-1.5">
            {block.items.map((item, j) => (
              <SummaryLine key={j} line={item} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function SummaryLine({ line }: { line: Line }) {
  if (line.kind === "plain") {
    if (line.text === "") return null;
    return (
      <li className="text-sm text-navy/70 pl-5 leading-relaxed">{line.text}</li>
    );
  }
  const palette =
    line.kind === "action"
      ? {
          dot: "bg-action-text",
          border: "border-l-action-border",
          bg: "bg-action-bg/40",
          text: "text-action-text",
        }
      : line.kind === "verify"
        ? {
            dot: "bg-verify-text",
            border: "border-l-verify-border",
            bg: "bg-verify-bg/40",
            text: "text-verify-text",
          }
        : {
            dot: "bg-ok-text",
            border: "border-l-ok-border",
            bg: "bg-ok-bg/30",
            text: "text-ok-text",
          };
  return (
    <li
      className={`flex items-start gap-3 text-sm py-1.5 pl-3 pr-2 rounded-r-sm border-l-2 ${palette.border} ${palette.bg}`}
    >
      <span
        className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${palette.dot}`}
      />
      <span className={`leading-relaxed ${palette.text}`}>{line.text}</span>
    </li>
  );
}
