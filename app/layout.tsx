import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "REAL Law Contract Scanner",
  description:
    "Drop a Multi-Board Residential Contract PDF, get a shorthand summary plus missing fields.",
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
