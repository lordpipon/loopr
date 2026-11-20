import type { Metadata } from "next";
import "./globals.css";
import { CookieNotice } from "@/components/cookie-notice";

export const metadata: Metadata = {
  title: "Loopr — Home",
  description: "Follow the people, ideas, and conversations you care about.",
  icons: { icon: [{ url: "/favicon.png", type: "image/png", sizes: "48x48" }] },
};

const displayScript = `try { for (const [key, allowed] of Object.entries({theme:['light','dim','dark'], accent:['blue','yellow','pink','purple','orange','green']})) { const value = localStorage.getItem('loopr-' + key); if (allowed.includes(value)) document.documentElement.dataset[key] = value; } } catch {}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: displayScript }} /></head>
      <body>{children}<CookieNotice /></body>
    </html>
  );
}
