"use client";

import Image from "next/image";
import LinkTo from "next/link";
import { SettingsLink, SignOut } from "@/components/account-forms";
import {
  ArrowDownUp, ArrowLeft, ArrowRight, Bell, Bookmark, ChartNoAxesColumn, CircleHelp, Compass,
  Ellipsis, Heart, House, ImagePlus, Link, List, Mail, MessageCircle, Plus,
  Search, Settings, ShieldCheck, ShoppingBag, SlidersHorizontal, Smile, Sparkles, Target, Upload, UserRound,
} from "lucide-react";
import { useEffect, useRef, useState, type ComponentProps, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import type { Feed, FeedPost, Person } from "@/lib/feed";
import { publishPost, setActivity } from "@/app/feed-actions";

const navigation = [
  { name: "Home", icon: House }, { name: "Explore", icon: Compass },
  { name: "Notifications", icon: Bell }, { name: "Messages", icon: Mail },
  { name: "Bookmarks", icon: Bookmark }, { name: "Verified", icon: ShieldCheck },
  { name: "Profile", icon: UserRound }, { name: "Settings", icon: Settings },
] as const;
type Section = (typeof navigation)[number]["name"] | (typeof extras)[number]["name"] | "Lists" | "Help Center";
const extras = [
  { name: "Quests", icon: Target }, { name: "Shop", icon: ShoppingBag }, { name: "Premium", icon: Sparkles },
] as const;
type Setting = "Display" | "Account and sign-in" | "Edit profile" | "Push notifications";
type Panel = "compose" | "drawer" | "account" | null;
const themes = { light: "Default", dim: "Dim", dark: "Lights out" } as const;
const accents = { blue: "Blue", yellow: "Yellow", pink: "Pink", purple: "Purple", orange: "Orange", green: "Green" } as const;

function IconButton({ children, ...props }: ComponentProps<"button">) {
  return <button type="button" {...props} className={`icon-button ${props.className ?? ""}`}>{children}</button>;
}

function Avatar({ person, size = 40 }: { person: Person; size?: number }) {
  return <span className="avatar" role="img" aria-label={person.name} style={{ backgroundColor: person.color, width: size, height: size }}>
    {person.avatar ? <Image src={person.avatar} alt="" width={size} height={size} unoptimized /> : person.initials}
  </span>;
}

function VerifiedBadge() {
  return <ShieldCheck className="verified-badge" size={18} aria-label="Verified" />;
}

function Brand() {
  return <><Image src="/logo.svg" alt="" width={37} height={37} priority /><span>Loopr</span></>;
}

function PostCard({ post, onReply, report }: { post: FeedPost; onReply: () => void; report: (message: string) => void }) {
  const [pending, setPending] = useState(false);
  const { liked, reposted, bookmarked } = post;

  async function react(kind: "like" | "repost" | "bookmark", active: boolean) {
    setPending(true);
    try {
      const result = await setActivity(kind, post.id, active);
      if (result.error) report(result.error);
    } catch {
      report("Could not save that change.");
    } finally {
      setPending(false);
    }
  }

  const [menu, setMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(new URL(`#post-${post.id}`, window.location.href).href);
    } catch {
      report("Could not copy the link.");
      return;
    }
    setCopied(true);
    setMenu(false);
  }

  return (
    <article className="post-card" id={`post-${post.id}`}>
      <Avatar person={post.person} />
      <div className="post-content">
        <div className="post-head">
          <strong>{post.person.name}</strong>{post.person.verified && <VerifiedBadge />}
          <span className="post-handle">@{post.person.handle}</span><span>·</span><time>{post.time}</time>
          <div className="post-menu">
            <IconButton aria-label="Post options" aria-expanded={menu} onClick={() => setMenu(!menu)}><Ellipsis size={19} /></IconButton>
            {menu && <div className="popover align-right"><button onClick={() => void copyLink()}><Link size={16} /> Copy link</button></div>}
          </div>
        </div>
        {post.replyHandle && <p className="post-context">Replying to @{post.replyHandle}</p>}
        <p className="post-body">{post.text}</p>
        <div className="post-actions">
          <button aria-label={`Reply, ${post.replies} replies`} onClick={onReply}><MessageCircle size={18} />{post.replies || ""}</button>
          <button className="repost-action" aria-label={`Repost, ${post.reposts} reposts`} aria-pressed={reposted} disabled={pending} onClick={() => void react("repost", !reposted)}><ArrowDownUp size={18} />{post.reposts || ""}</button>
          <button className="like-action" aria-label={`Like, ${post.likes} likes`} aria-pressed={liked} disabled={pending} onClick={() => void react("like", !liked)}><Heart size={18} fill={liked ? "currentColor" : "none"} />{post.likes || ""}</button>
          <span className="view-count"><ChartNoAxesColumn size={18} />{post.views}</span>
          <div className="extra-actions">
            <button aria-label="Bookmark" aria-pressed={bookmarked} disabled={pending} onClick={() => void react("bookmark", !bookmarked)}><Bookmark size={18} fill={bookmarked ? "currentColor" : "none"} /></button>
            <button aria-label="Copy link" onClick={() => void copyLink()}><Upload size={18} /></button>
          </div>
        </div>
        {copied && <span className="copy-status" role="status">Link copied</span>}
      </div>
    </article>
  );
}

const shopItems = [
  { name: "Aurora", description: "A blue and violet glow around your avatar.", price: 150, style: "aurora" },
  { name: "Ember", description: "A warm orange ring around your avatar.", price: 225, style: "ember" },
  { name: "Orbit", description: "A lilac halo around your avatar.", price: 300, style: "orbit" },
  { name: "Evergreen", description: "A dark green frame with a sage edge.", price: 100, style: "evergreen" },
  { name: "Newsprint", description: "A black-and-white double border.", price: 75, style: "newsprint" },
  { name: "Copper", description: "A brushed copper accent ring.", price: 175, style: "copper" },
] as const;

function SettingsSummary({ rows, message = "Editing will be available once accounts are connected." }: { rows: [string, string][]; message?: string }) {
  return <div className="settings-summary">
    <p>{message}</p>
    <dl>{rows.map(([name, description]) => <div key={name}><dt>{name}</dt><dd>{description}</dd></div>)}</dl>
  </div>;
}

function Composer({ onSubmit, placeholder = "What’s happening?", viewer }: { onSubmit: (body: string) => Promise<boolean>; placeholder?: string; viewer: Person }) {
  const [draft, setDraft] = useState("");
  const field = useRef<HTMLTextAreaElement>(null);
  const [pending, setPending] = useState(false);
  const limit = viewer.verified ? 1000 : 280;
  const length = Array.from(draft).length;
  const valid = draft.trim().length > 0 && length <= limit;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid || pending) return;
    setPending(true);
    try {
      if (await onSubmit(draft.trim())) setDraft("");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="composer" onSubmit={submit}>
      <Avatar person={viewer} size={42} />
      <div className="composer-main">
        <textarea ref={field} rows={1} aria-label={placeholder} placeholder={placeholder} value={draft} disabled={pending}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") event.currentTarget.form?.requestSubmit(); }} />
        <div className="composer-actions">
          <div className="composer-tools">
            <IconButton aria-label="Media available in Phase 3" disabled><ImagePlus size={19} /></IconButton>
            <IconButton aria-label="Insert a smile" onClick={() => { setDraft((value) => value + " 🙂"); field.current?.focus(); }}><Smile size={19} /></IconButton>
          </div>
          <span className={length > limit ? "over-limit" : "character-count"}>{length}/{limit}</span>
          <Button type="submit" disabled={!valid || pending}>Post</Button>
        </div>
      </div>
    </form>
  );
}

type ProfileSummary = { bio: string; pronouns: string; location: string | null; website: string | null };

export function Shell({ viewer, feed, profileSummary }: { viewer: Person; feed: Feed; profileSummary: ProfileSummary }) {
  const [followPending, setFollowPending] = useState<string>();
  const [section, setSection] = useState<Section>("Home");
  const [tab, setTab] = useState<"For you" | "Following">("For you");
  const [setting, setSetting] = useState<Setting | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [more, setMore] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<FeedPost | null>(null);
  const [notice, setNotice] = useState("");
  const [theme, setTheme] = useState<keyof typeof themes>();
  const [accent, setAccent] = useState<keyof typeof accents>();
  const opener = useRef<HTMLElement | null>(null);
  const moreMenu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!more) return;
    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node && !moreMenu.current?.contains(event.target)) setMore(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") { setMore(false); moreMenu.current?.querySelector("button")?.focus(); }
    }
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", escape);
    };
  }, [more]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 2500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  function openPanel(next: Exclude<Panel, null>) {
    if (!panel && document.activeElement instanceof HTMLElement) opener.current = document.activeElement;
    setMore(false);
    setPanel(next);
  }

  function closePanel() {
    setPanel(null);
    setReplyTo(null);
    requestAnimationFrame(() => opener.current?.focus());
  }

  function navigate(target: Section) {
    setSection(target);
    setSetting(null);
    setMore(false);
    if (panel) closePanel();
    window.scrollTo(0, 0);
  }

  function openSetting(next: Setting) {
    if (next === "Display") {
      const current = document.documentElement.dataset;
      setTheme(current.theme && Object.hasOwn(themes, current.theme) ? current.theme as keyof typeof themes : "light");
      setAccent(current.accent && Object.hasOwn(accents, current.accent) ? current.accent as keyof typeof accents : "blue");
    }
    setSetting(next);
  }

  function display(key: "theme" | "accent", value: string) {
    document.documentElement.dataset[key] = value;
    try { localStorage.setItem(`loopr-${key}`, value); } catch {}
  }

  async function addPost(body: string) {
    try {
      const result = await publishPost(body, replyTo?.id ?? null);
      if (result.error) { setNotice(result.error); return false; }
      navigate("Home");
      setNotice(replyTo ? "Your reply was sent." : "Your post was sent.");
      return true;
    } catch {
      setNotice("Could not publish your post.");
      return false;
    }
  }

  async function follow(person: Feed["people"][number]) {
    setFollowPending(person.id);
    try {
      const result = await setActivity("follow", person.id, !person.follows);
      if (result.error) setNotice(result.error);
    } catch {
      setNotice("Could not save that change.");
    } finally {
      setFollowPending(undefined);
    }
  }

  const visiblePosts = tab === "For you" ? feed.latest : feed.following;
  const matchingPeople = query.trim() ? feed.people.filter((person) => `${person.name} ${person.handle}`.toLowerCase().includes(query.trim().toLowerCase())) : [];

  return (
    <div className="shell">
      <aside className="left-rail" aria-label="Sidebar">
        <button className="brand" aria-label="Loopr home" onClick={() => navigate("Home")}><Brand /></button>
        {renderSidebar(false)}
        <button className="account" aria-label="Account options" onClick={() => openPanel("account")}><Avatar person={viewer} />
          <span className="account-text"><strong>{viewer.name}</strong><small>@{viewer.handle}</small></span><Ellipsis className="account-more" size={20} />
        </button>
      </aside>

      <main className="main">
        <div className="mobile-top">
          <button className="icon-button" aria-label="Open profile menu" onClick={() => openPanel("drawer")}><Avatar person={viewer} size={32} /></button>
          <button className="brand mobile-brand" aria-label="Loopr home" onClick={() => navigate("Home")}><Brand /></button>
          <IconButton aria-label="Settings" onClick={() => navigate("Settings")}><Settings size={21} /></IconButton>
        </div>
        <header className="feed-header">
          <div className="page-title">{section === "Settings" && setting && <IconButton aria-label="Back to Settings" onClick={() => setSetting(null)}><ArrowLeft size={20} /></IconButton>}<h1>{section === "Settings" && setting ? setting : section}</h1></div>
          {section === "Home" && <div className="feed-tabs" aria-label="Feed">
            {(["For you", "Following"] as const).map((item) => <button key={item} aria-pressed={item === tab} onClick={() => setTab(item)}>{item}</button>)}
          </div>}
        </header>

        {section === "Home" ? <>
          <div className="inline-composer"><Composer viewer={viewer} onSubmit={addPost} /></div>
          <div className="feed-marker"><span>{tab === "For you" ? "Latest in your feed" : "Posts from accounts you follow"}</span></div>
          {visiblePosts.length ? visiblePosts.map((post) => <PostCard key={post.id} post={post} report={setNotice} onReply={() => { setReplyTo(post); openPanel("compose"); }} />)
            : <div className="empty"><UserRound size={26} /><h2>{tab === "Following" ? "Your following feed is empty" : "No posts yet"}</h2><p>{tab === "Following" ? "Follow people to see their posts here." : "Start the conversation with a post."}</p><Button onClick={() => navigate("Explore")}>Explore</Button></div>}
        </> : section === "Settings" ? (
          setting === "Display" ? <div className="display-controls">
          <fieldset><legend>Background</legend><div className="theme-options">
            {Object.entries(themes).map(([value, label]) => <button key={value} className={`theme-option theme-${value}`} aria-pressed={theme === value} onClick={() => { setTheme(value as keyof typeof themes); display("theme", value); }}>{label}</button>)}
          </div></fieldset>
          <fieldset><legend>Accent color</legend><div className="accent-options">
            {Object.entries(accents).map(([value, label]) => <button key={value} className={`accent-option color-${value}`} aria-label={label} title={label} aria-pressed={accent === value} onClick={() => { setAccent(value as keyof typeof accents); display("accent", value); }} />)}
          </div></fieldset>
        </div> :
          setting === "Account and sign-in" ? <SettingsLink href="/settings/account">Open account settings</SettingsLink> :
          setting === "Push notifications" ? <SettingsLink href="/settings/notifications">Manage browser push</SettingsLink> :
          setting === "Edit profile" ? <SettingsLink href="/settings/profile">Open profile editor</SettingsLink> : <div className="settings-list">
            {([
              ["Account and sign-in", "Google, password, email and username", ShieldCheck],
              ["Edit profile", "Profile picture, name, pronouns and bio", UserRound],
              ["Display", "Theme and accent color", SlidersHorizontal],
              ["Push notifications", "Browser permissions and test alerts", Bell],
            ] as const).map(([name, description, Icon]) => (
              <button key={name} onClick={() => openSetting(name)}><Icon size={21} /><span><strong>{name}</strong><small>{description}</small></span><ArrowRight size={18} /></button>
            ))}
          </div>
        )
          : section === "Profile" ? <section className="member-profile">
            <div className="member-profile-header"><Avatar person={viewer} size={72} /><LinkTo className="button button-outline" href="/settings/profile">Edit profile</LinkTo></div>
            <h2>{viewer.name} {viewer.verified && <VerifiedBadge />}</h2>
            <p className="member-meta">@{viewer.handle}{profileSummary.pronouns && ` · ${profileSummary.pronouns}`}</p>
            {profileSummary.bio && <p className="member-bio">{profileSummary.bio}</p>}
            <div className="member-meta">
              {profileSummary.location && <span>{profileSummary.location}</span>}
              {profileSummary.website && /^https?:\/\//i.test(profileSummary.website) && <a href={profileSummary.website} rel="nofollow ugc noopener noreferrer" target="_blank">{profileSummary.website}</a>}
            </div>
          </section>
          : section === "Shop" ? <div className="reward-page">
            <div className="reward-intro">
              <div><h2>XP Shop</h2><p>Spend XP on profile effects exclusive to the shop.</p></div>
            </div>
            <p className="reward-note">XP purchases are not available yet.</p>
            <div className="reward-grid">{shopItems.map((item) => <article key={item.name} className="shop-card">
              <div className="effect-preview" data-effect={item.style}><Avatar person={viewer} size={48} /></div>
              <h3>{item.name}</h3><p>{item.description}</p>
              <Button disabled>{item.price} XP</Button>
            </article>)}</div>
          </div>
          : section === "Quests" ? <SettingsSummary message="Quest rewards will start once activities are connected to accounts." rows={[
            ["Daily · Like posts", "Like posts you enjoy to earn XP."],
            ["Daily · Send a message", "Message someone you follow to earn XP."],
            ["Weekly · Follow people", "Find new people to follow throughout the week."],
            ["Daily streak", "Keep your streak going by returning each day."],
          ]} />
          : section === "Premium" ? <SettingsSummary message="Premium is planned for the payments phase." rows={[
            ["Profile and name effects", "Style your profile and display name with Premium effects."],
            ["Animated profile pictures", "Use a moving image as your avatar."],
            ["Super emoji reactions", "Use additional reactions on posts."],
            ["Premium badge", "Show a yellow badge on your profile."],
          ]} />
          : section === "Bookmarks" ? (feed.bookmarks.length ? feed.bookmarks.map((post) =>
            <PostCard key={post.id} post={post} report={setNotice} onReply={() => { setReplyTo(post); openPanel("compose"); }} />)
            : <div className="empty"><Bookmark size={26} /><h2>No bookmarks yet</h2><p>Save a post to find it here later.</p></div>)
          : section === "Explore" ? <div className="explore-content">{renderSearchPanel()}{renderFollowPanel()}</div>
          : <div className="empty"><Compass size={28} /><h2>{section}</h2><p>This page is coming in a later phase.</p><Button variant="outline" onClick={() => navigate("Home")}>Back to Home</Button></div>}
      </main>

      <aside className="right-rail" aria-label="Discover">
        {section !== "Explore" && renderSearchPanel()}
        <section className="verification">
          <div className="verification-icon"><Sparkles size={20} /></div>
          <h2>Get verified</h2>
          <p>Make your profile recognizable with a verified badge.</p>
          <Button onClick={() => navigate("Verified")}>Get verified <ArrowRight size={16} /></Button>
        </section>
        {renderFollowPanel()}
        <footer className="footer-links">
          {[["Terms", "/terms"], ["Privacy", "/privacy"], ["Refunds", "/refunds"], ["About", "/about"]].map(([name, href]) => <LinkTo key={name} href={href}>{name}</LinkTo>)}
          <span>© 2026 Loopr</span>
        </footer>
      </aside>

      <nav className="mobile-tabs" aria-label="Mobile primary">
        {[navigation[0], { name: "Explore" as const, icon: Search }, navigation[2], navigation[3]].map(({ name, icon: Icon }) =>
          <IconButton key={name} aria-label={name === "Explore" ? "Search" : name} aria-current={section === name ? "page" : undefined} onClick={() => navigate(name)}><Icon size={24} /></IconButton>)}
      </nav>
      <Button className="mobile-post" aria-label="New post" onClick={() => openPanel("compose")}><Plus size={26} /></Button>

      <Modal open={panel !== null} onOpenChange={(open) => { if (!open) closePanel(); }} title={panel === "drawer" ? "Your account" : panel === "account" ? "Account options" : replyTo ? "Post your reply" : "New post"} drawer={panel === "drawer"}>
        {panel === "compose" && <Composer viewer={viewer} onSubmit={addPost} placeholder={replyTo ? "Post your reply" : undefined} />}
        {panel === "drawer" && <div className="drawer-content">
          <Avatar person={viewer} size={46} /><strong>{viewer.name}</strong><span>@{viewer.handle}</span>
          <p><b>{feed.counts.following}</b> Following <b>{feed.counts.followers}</b> Followers</p>
          {renderSidebar(true)}
        </div>}
        {panel === "account" && <div className="account-options"><SignOut handle={viewer.handle} /></div>}
      </Modal>
      {notice && <div role="status" className="toast">{notice}</div>}
    </div>
  );

  function renderSidebar(inDrawer: boolean) {
    const expanded = more && (panel === "drawer") === inDrawer;
    return <>
      <nav className="main-nav" aria-label={inDrawer ? "Sidebar navigation" : "Primary"}>
          {[...navigation, ...extras].map(({ name, icon: Icon }) => (
            <button className={`nav-item ${section === name ? "selected" : ""}`} key={name} aria-label={name} aria-current={section === name ? "page" : undefined} onClick={() => navigate(name)}>
              <span className="nav-icon"><Icon size={24} strokeWidth={section === name ? 2.4 : 1.8} />{name === "Notifications" && feed.counts.unread > 0 && <span className="notification-dot">{feed.counts.unread > 99 ? "99+" : feed.counts.unread}</span>}</span>
              <span className="nav-label">{name}</span>
            </button>
          ))}
          <div className="more-menu" ref={(panel === "drawer") === inDrawer ? moreMenu : undefined}>
            <button type="button" className="nav-item" aria-label="More" aria-expanded={expanded} onClick={() => setMore(!more)}><span className="nav-icon"><Ellipsis size={24} /></span><span className="nav-label">More</span></button>
            {expanded && <div className="popover">
              <button onClick={() => navigate("Lists")}><List size={18} /> Lists</button>
              <button onClick={() => navigate("Bookmarks")}><Bookmark size={18} /> Bookmarks</button>
              <button onClick={() => navigate("Settings")}><Settings size={18} /> Settings and privacy</button>
              <button onClick={() => navigate("Help Center")}><CircleHelp size={18} /> Help Center</button>
              <LinkTo href="/about">About Loopr</LinkTo>
              <button onClick={() => openPanel("account")}><UserRound size={18} /> Log out</button>
            </div>}
          </div>
        </nav>
        <Button className="rail-post" aria-label="New post" onClick={() => openPanel("compose")}><Plus size={22} /><span className="nav-label">Post</span></Button>
    </>;
  }

  function renderSearchPanel() {
    return <div className="search-wrap" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setSearchOpen(false); }}>
      <form className="search-input" onSubmit={(event) => { event.preventDefault(); navigate("Explore"); setSearchOpen(false); }}>
        <Search size={19} /><input aria-label="Search Loopr" placeholder="Search Loopr" value={query} onFocus={() => setSearchOpen(true)} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") setSearchOpen(false); }} />
      </form>
      {searchOpen && <div className="popover search-results">
        {query.trim() ? <>
          {matchingPeople.map((person) => <button key={person.handle} onClick={() => { setQuery(person.name); navigate("Explore"); setSearchOpen(false); }}><Avatar person={person} size={28} /> {person.name}</button>)}
          {!matchingPeople.length && <p>No matching people.</p>}
        </> : <p>Search for people.</p>}
      </div>}
    </div>;
  }

  function renderFollowPanel() {
    return <section className="side-card">
      <div className="side-head"><h2>Who to follow</h2></div>
      {!feed.people.length && <p className="side-head">No suggestions yet.</p>}
      {feed.people.map((person) => {
        const active = person.follows;
        return <div className="follow-row" key={person.handle}><Avatar person={person} /><div className="follow-person"><strong>{person.name} {person.verified && <VerifiedBadge />}</strong><small>@{person.handle}</small></div>
          <Button className={active ? "following-button" : "follow-button"} variant={active ? "outline" : "quiet"} aria-pressed={active} disabled={Boolean(followPending)} onClick={() => void follow(person)}>{active ? "Following" : "Follow"}</Button></div>;
      })}
      {section !== "Explore" && <button className="show-more" onClick={() => navigate("Explore")}>Show more <ArrowRight size={15} /></button>}
    </section>;
  }
}
