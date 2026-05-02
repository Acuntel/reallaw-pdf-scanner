"use client";

import { useCallback, useRef, useState } from "react";

type Stats = {
  pageCount: number;
  fileSizeKb: number;
  acroformFilled: number;
  acroformTotal: number;
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string>("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string>("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
  }, []);

  const submit = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    setSummary("");
    setStats(null);
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
      }
    } catch (e: any) {
      setError(e?.message ?? "Network error");
    } finally {
      setLoading(false);
    }
  }, [file]);

  return (
    <main className="min-h-screen flex flex-col items-center px-6 py-10">
      <div className="w-full max-w-3xl">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">
            REAL Law Contract Scanner
          </h1>
          <p className="text-sm text-neutral-600 mt-1">
            Drop a Multi-Board 8.0 Residential Contract PDF. Get a shorthand
            summary and a list of missing fields.
          </p>
        </header>

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
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition ${
            dragOver
              ? "border-accent bg-blue-50"
              : "border-neutral-300 bg-white hover:border-neutral-400"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <div className="text-base">
            {file ? (
              <span className="font-medium">{file.name}</span>
            ) : (
              <>
                <span className="font-medium">Drop a PDF here</span>{" "}
                <span className="text-neutral-500">or click to browse</span>
              </>
            )}
          </div>
          {file && (
            <div className="text-xs text-neutral-500 mt-1">
              {(file.size / 1024).toFixed(0)} KB
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={submit}
            disabled={!file || loading}
            className="px-5 py-2.5 rounded-md bg-ink text-paper text-sm font-medium disabled:opacity-40"
          >
            {loading ? "Scanning…" : "Summarize"}
          </button>
          {file && !loading && (
            <button
              onClick={() => {
                setFile(null);
                setSummary("");
                setStats(null);
                setError("");
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="text-sm text-neutral-500 hover:text-ink"
            >
              Clear
            </button>
          )}
        </div>

        {error && (
          <div className="mt-6 p-4 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        {stats && (
          <div className="mt-6 grid grid-cols-3 gap-3">
            <Stat label="Pages" value={stats.pageCount} />
            <Stat label="Size (KB)" value={stats.fileSizeKb} />
            <Stat
              label="AcroForm filled"
              value={
                stats.acroformTotal > 0
                  ? `${stats.acroformFilled}/${stats.acroformTotal}`
                  : "flat"
              }
              tone={stats.acroformFilled > 0 ? "good" : undefined}
            />
          </div>
        )}

        {summary && (
          <pre className="mt-6 p-5 rounded-md bg-white border border-neutral-200 text-sm font-mono whitespace-pre-wrap leading-relaxed">
            {summary}
          </pre>
        )}

        <footer className="mt-10 text-xs text-neutral-400">
          Built for REAL Law Group · contract data stays on the request —
          nothing is stored.
        </footer>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: "good" | "warn";
}) {
  const color =
    tone === "good"
      ? "text-emerald-700"
      : tone === "warn"
        ? "text-amber-700"
        : "text-ink";
  return (
    <div className="rounded-md bg-white border border-neutral-200 p-3">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className={`text-xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}
