import type { Metadata } from "next";
import "./globals.css";

import styles from "./layout.module.css";

export const metadata: Metadata = {
  title: "TODAYSMISSION",
  description: "TODAYSMISSION carousel prototype",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN">
      <body>
        <main className={styles.shell}>{children}</main>
      </body>
    </html>
  );
}
