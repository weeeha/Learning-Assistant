import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Learning Assistant",
  description: "Capture and learn faster.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
