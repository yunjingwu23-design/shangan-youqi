import type { Metadata } from "next";
import { Shell } from "@/components/shell";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "上岸有期 · 让好机会，离你更近",
    template: "%s · 上岸有期",
  },
  description:
    "从发现机会，到管理投递、准备面试、获得 Offer。属于年轻人的一站式求职平台。",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <a className="skip-link" href="#content">
          跳到主要内容
        </a>
        <div id="content">
          <Shell>{children}</Shell>
        </div>
      </body>
    </html>
  );
}
