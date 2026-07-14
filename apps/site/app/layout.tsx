import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Velocity — a fast, tiny, native AI code editor",
  description:
    "Velocity is a native desktop AI code editor built on the Native SDK. No browser, no DOM — a single small binary that draws every pixel itself.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
