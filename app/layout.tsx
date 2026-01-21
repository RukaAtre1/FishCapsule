import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import TopBar from "./components/TopBar";

// PRD v2.0: Inter as primary font for better screen readability
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  title: "FishCapsule",
  description: "Agentic Study Notebook - Turn any PDF into a guided learning flow"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning data-theme="dark" className={`${inter.variable} ${jakarta.variable}`}>
      <body className={`${inter.className} bg-[color:var(--bg0)] text-[color:var(--text)]`}>
        <Providers>
          {/* TopBar disabled - causes layout issues with lecture page */}
          {/* <TopBar /> */}
          {children}
        </Providers>
      </body>
    </html>
  );
}
