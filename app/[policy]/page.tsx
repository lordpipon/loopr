import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { notFound } from "next/navigation";

const pages = {
  about: "About Loopr",
  terms: "Terms of Service",
  privacy: "Privacy Policy",
  refunds: "Refund Policy",
} as const;

type Props = { params: Promise<{ policy: string }> };

export function generateStaticParams() {
  return Object.keys(pages).map((policy) => ({ policy }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { policy } = await params;
  return { title: Object.hasOwn(pages, policy) ? `${pages[policy as keyof typeof pages]} · Loopr` : "Page unavailable · Loopr" };
}

export default async function PolicyPage({ params }: Props) {
  const { policy } = await params;
  if (!Object.hasOwn(pages, policy)) notFound();
  const key = policy as keyof typeof pages;
  return <main className="legal-page">
    <header className="legal-top">
      <Link href="/" className="legal-brand"><Image src="/logo.svg" alt="" width={34} height={34} /> Loopr</Link>
      <Link href="/" className="legal-back"><ArrowLeft size={16} /> Back to Loopr</Link>
    </header>
    <div className="legal-masthead">
      <h1>{pages[key]}</h1>
      {key === "about" && <p>Loopr is a microblogging app for following people and sharing posts.</p>}
    </div>
    <div className="legal-layout">
      <nav aria-label="Loopr policies" className="legal-links">
        {Object.entries(pages).map(([slug, label]) => <Link key={slug} href={`/${slug}`} aria-current={slug === key ? "page" : undefined}>{label}</Link>)}
      </nav>
      <div className="legal-content">
    {key === "about" && <>
      <h2>Behind Loopr</h2>
      <p>Loopr is actively maintained by lordpipon</p>
      <a className="legal-source" aria-label="Source code on GitHub" href="https://github.com/lordpipon/loopr">
        Source code on GitHub <ArrowUpRight size={16} />
      </a>
    </>}
    {key === "terms" && <>
      <h2>Using Loopr</h2><p>You must be at least 13 to create an account. Keep your login details private and use an email address you control.</p>
      <h2>What you share</h2><p>Share only content you have permission to post. Do not use Loopr to harass others, impersonate someone, distribute unlawful content, or abuse the service.</p>
      <h2>Feature availability</h2><p>Features and availability can change during development.</p>
    </>}
    {key === "privacy" && <>
      <h2>Account data</h2><p>Loopr stores account details, your public profile, your private date of birth, and session data. Passwords are stored as hashes. Google sends your account identifier and basic profile information if you choose Google sign-in.</p>
      <h2>Cookies and site storage</h2><p>Loopr uses cookies to keep you signed in and to support Google sign-in. Display settings and the cookie notice preference are stored in your browser.</p>
      <h2>Push notifications</h2><p>If you enable browser push, Loopr stores the device subscription needed to deliver it. You can disable push in Settings or revoke permission in your browser.</p>
    </>}
    {key === "refunds" && <>
      <h2>Stripe payments</h2><p>Loopr does not currently accept live payments. Stripe test transactions do not charge real money and do not result in refunds.</p>
      <h2>Before live checkout</h2><p>Loopr will publish the applicable refund terms before accepting real payments.</p>
    </>}
      </div>
    </div>
  </main>;
}
