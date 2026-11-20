import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { notFound } from "next/navigation";

import { policySections, policyTitles as pages } from "@/lib/policies";

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
      <article className="legal-content">
        {key === "about" ? <>
          <h2>Behind Loopr</h2>
          <p>Loopr is actively maintained by lordpipon</p>
          <a className="legal-source" aria-label="Source code on GitHub" href="https://github.com/lordpipon/loopr">
            Source code on GitHub <ArrowUpRight size={16} />
          </a>
        </> : <>
          {policySections[key].map(({ title, body }) => <section className="policy-section" key={title}>
            <h2>{title}</h2>
            <p>{body}</p>
          </section>)}
          <section className="policy-section">
            <h2>Contact</h2>
            <p>Reach the <a href="https://github.com/lordpipon">Loopr maintainer on GitHub</a>. Ask for a private channel before sending personal or account information.</p>
          </section>
        </>}
      </article>
    </div>
  </main>;
}
