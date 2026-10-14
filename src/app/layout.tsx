import type { Metadata, Viewport } from "next";
import "@xyflow/react/dist/style.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "독서해마",
  description: "책 목차 위에 질문 말풍선을 띄우고, 누구와든 의견을 나누는 마인드맵 독서 노트",
};

// Pinch gestures should zoom the mind map, not the whole page (tablets).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="h-full">{children}</body>
    </html>
  );
}
