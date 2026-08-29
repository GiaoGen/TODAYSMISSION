import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TODAYSMISSION",
  description: "TODAYSMISSION carousel prototype",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
