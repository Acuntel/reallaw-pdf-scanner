import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "REAL Law Contract Scanner",
  description:
    "Drop a Multi-Board 8.0 Residential Contract PDF, get a 30-second attorney review with action items, computed deadlines, and signature integrity checks.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
