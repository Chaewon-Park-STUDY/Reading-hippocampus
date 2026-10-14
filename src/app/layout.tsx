import type { Metadata } from "next";
import "@xyflow/react/dist/style.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "독서해마",
  description: "책 목차 위에 질문 말풍선을 띄우고, 누구와든 의견을 나누는 마인드맵 독서 노트",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="h-full">{children}</body>
    </html>
  );
}
