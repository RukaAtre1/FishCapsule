import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import TopBar from "./components/TopBar";

const font = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "FishCapsule",
  description: "Explore the Digital Deep"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning data-theme="dark">
      <body className={`${font.className} bg-[color:var(--bg0)] text-[color:var(--text)]`}>
        <Providers>
          {/* <TopBar /> */}
          {children}
        </Providers>
      </body>
    </html>
  );
}
