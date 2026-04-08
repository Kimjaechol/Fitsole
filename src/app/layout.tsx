import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const pretendard = localFont({
  src: "../fonts/PretendardVariable.subset.woff2",
  display: "swap",
  weight: "400 700",
  variable: "--font-pretendard",
});

export const metadata: Metadata = {
  title: "FitSole - 맞춤 인솔 신발 플랫폼",
  description:
    "스마트폰으로 발을 측정하고, 과학적 분석을 통해 개인 맞춤 인솔을 설계합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${pretendard.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
