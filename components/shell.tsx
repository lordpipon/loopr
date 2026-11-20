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
import { people, posts, trends, type Person, type SamplePost } from "@/lib/mock";

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
const suggestions: Person[] = [people.amina, people.leo, people.sofia];
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

function PostCard({ post, onReply }: { post: SamplePost; onReply: () => void }) {
  const [liked, setLiked] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [menu, setMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(new URL(`#post-${post.id}`, window.location.href).href);
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
        <p className="post-body">{post.text}</p>
        {post.image && <div className="post-media"><Image src={post.image} alt={post.alt ?? ""} fill sizes="(max-width: 699px) 90vw, 510px" priority /></div>}
        <div className="post-actions">
          <button aria-label={`Reply, ${post.replies} replies`} onClick={onReply}><MessageCircle size={18} />{post.replies || ""}</button>
          <button className="repost-action" aria-label={`Repost, ${post.reposts + Number(reposted)} reposts`} aria-pressed={reposted} onClick={() => setReposted(!reposted)}><ArrowDownUp size={18} />{post.reposts + Number(reposted) || ""}</button>
          <button className="like-action" aria-label={`Like, ${post.likes + Number(liked)} likes`} aria-pressed={liked} onClick={() => setLiked(!liked)}><Heart size={18} fill={liked ? "currentColor" : "none"} />{post.likes + Number(liked) || ""}</button>
          <span className="view-count"><ChartNoAxesColumn size={18} />{post.views}</span>
          <div className="extra-actions">
            <button aria-label="Bookmark" aria-pressed={bookmarked} onClick={() => setBookmarked(!bookmarked)}><Bookmark size={18} fill={bookmarked ? "currentColor" : "none"} /></button>
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
type ShopItem = (typeof shopItems)[number];

function SettingsSummary({ rows, message = "Editing will be available once accounts are connected." }: { rows: [string, string][]; message?: string }) {
  return <div className="settings-summary">
    <p>{message}</p>
    <dl>{rows.map(([name, description]) => <div key={name}><dt>{name}</dt><dd>{description}</dd></div>)}</dl>
  </div>;
}

function Composer({ onSubmit, placeholder = "What’s happening?", viewer }: { onSubmit: (body: string) => void; placeholder?: string; viewer: Person }) {
  const [draft, setDraft] = useState("");
  const field = useRef<HTMLTextAreaElement>(null);
  const valid = draft.trim().length > 0 && draft.length <= 280;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid) return;
    onSubmit(draft.trim());
    setDraft("");
  }

  return (
    <form className="composer" onSubmit={submit}>
      <Avatar person={viewer} size={42} />
      <div className="composer-main">
        <textarea ref={field} rows={1} aria-label={placeholder} placeholder={placeholder} value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") event.currentTarget.form?.requestSubmit(); }} />
        <div className="composer-actions">
          <div className="composer-tools">
            <IconButton aria-label="Media available in Phase 3" disabled><ImagePlus size={19} /></IconButton>
            <IconButton aria-label="Insert a smile" onClick={() => { setDraft((value) => value + " 🙂"); field.current?.focus(); }}><Smile size={19} /></IconButton>
          </div>
          <span className={draft.length > 280 ? "over-limit" : "character-count"}>{draft.length}/280</span>
          <Button type="submit" disabled={!valid}>Post</Button>
        </div>
      </div>
    </form>
  );
}

type ProfileSummary = { bio: string; pronouns: string; location: string | null; website: string | null };

export function Shell({ viewer = people.jordan, authenticated = false, profileSummary }: {
  viewer?: Person; authenticated?: boolean; profileSummary?: ProfileSummary;
} = {}) {
  const [xp, setXp] = useState(250);
  const [ownedEffects, setOwnedEffects] = useState<ShopItem["style"][]>([]);
  const [profileEffect, setProfileEffect] = useState<ShopItem["style"]>();
  const [section, setSection] = useState<Section>("Home");
  const [tab, setTab] = useState<"For you" | "Following">("For you");
  const [setting, setSetting] = useState<Setting | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [more, setMore] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [following, setFollowing] = useState<string[]>([]);
  const [localPosts, setLocalPosts] = useState<SamplePost[]>([]);
  const [replyTo, setReplyTo] = useState<SamplePost | null>(null);
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

  function addPost(body: string) {
    const text = replyTo ? `Replying to @${replyTo.person.handle}\n${body}` : body;
    setLocalPosts((current) => [{ id: Date.now(), person: viewer, time: "now", text, likes: 0, replies: 0, reposts: 0, views: "0" }, ...current]);
    if (panel) closePanel();
    setNotice("Your post was sent.");
    navigate("Home");
  }

  const allPosts = [...localPosts, ...posts];
  const visiblePosts = tab === "For you" ? allPosts : allPosts.filter((post) => post.person.handle === viewer.handle || following.includes(post.person.handle));
  const matchingPeople = query.trim() ? suggestions.filter((person) => `${person.name} ${person.handle}`.toLowerCase().includes(query.trim().toLowerCase())) : [];
  const matchingTrends = query.trim() ? trends.filter((trend) => trend.name.toLowerCase().includes(query.trim().toLowerCase())) : [];

  return (
    <div className="shell">
      <aside className="left-rail" aria-label="Sidebar">
        <button className="brand" aria-label="Loopr home" onClick={() => navigate("Home")}><Brand /></button>
        <nav className="main-nav" aria-label="Primary">
          {[...navigation, ...extras].map(({ name, icon: Icon }) => (
            <button className={`nav-item ${section === name ? "selected" : ""}`} key={name} aria-label={name} aria-current={section === name ? "page" : undefined} onClick={() => navigate(name)}>
              <span className="nav-icon"><Icon size={24} strokeWidth={section === name ? 2.4 : 1.8} />{name === "Notifications" && <span className="notification-dot">2</span>}</span>
              <span className="nav-label">{name}</span>
            </button>
          ))}
          <div className="more-menu" ref={moreMenu}>
            <button type="button" className="nav-item" aria-label="More" aria-expanded={more} onClick={() => setMore(!more)}><span className="nav-icon"><Ellipsis size={24} /></span><span className="nav-label">More</span></button>
            {more && <div className="popover">
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
        <button className="account" data-effect={profileEffect} aria-label="Account options" onClick={() => openPanel("account")}><Avatar person={viewer} />
          <span className="account-text"><strong>{viewer.name}</strong><small>@{viewer.handle}</small></span><Ellipsis className="account-more" size={20} />
        </button>
      </aside>

      <main className="main">
        <div className="mobile-top">
          <button className="icon-button" data-effect={profileEffect} aria-label="Open profile menu" onClick={() => openPanel("drawer")}><Avatar person={viewer} size={32} /></button>
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
          {visiblePosts.length ? visiblePosts.map((post) => <PostCard key={post.id} post={post} onReply={() => { setReplyTo(post); openPanel("compose"); }} />)
            : <div className="empty"><UserRound size={26} /><h2>Your following feed is empty</h2><p>Follow people to see their posts here.</p><Button onClick={() => navigate("Explore")}>Explore</Button></div>}
        </> : section === "Settings" ? (
          setting === "Display" ? <div className="display-controls">
          <fieldset><legend>Background</legend><div className="theme-options">
            {Object.entries(themes).map(([value, label]) => <button key={value} className={`theme-option theme-${value}`} aria-pressed={theme === value} onClick={() => { setTheme(value as keyof typeof themes); display("theme", value); }}>{label}</button>)}
          </div></fieldset>
          <fieldset><legend>Accent color</legend><div className="accent-options">
            {Object.entries(accents).map(([value, label]) => <button key={value} className={`accent-option color-${value}`} aria-label={label} title={label} aria-pressed={accent === value} onClick={() => { setAccent(value as keyof typeof accents); display("accent", value); }} />)}
          </div></fieldset>
        </div> :
          setting === "Account and sign-in" ? (authenticated ? <SettingsLink href="/settings/account">Open account settings</SettingsLink> : <SettingsSummary rows={[
            ["Google account", "Link or unlink Google after signing in."],
            ["Change password", "Enter your current password and confirm the new password."],
            ["Change email address", "Confirm with your current password."],
            ["Change username", "Change your username once every 7 days."],
          ]} />) :
          setting === "Push notifications" ? (authenticated ? <SettingsLink href="/settings/notifications">Manage browser push</SettingsLink> : <SettingsSummary rows={[["Browser push", "Sign in to manage push notifications."]]} />) :
          setting === "Edit profile" ? (authenticated ? <SettingsLink href="/settings/profile">Open profile editor</SettingsLink> : <SettingsSummary rows={[
            ["Profile picture", "Upload a profile picture."], ["Display name", "Edit your name whenever you like."],
            ["Pronouns", "Add the pronouns you use."], ["Bio", "Introduce yourself."],
            ["Website", "Add a link to your profile."], ["Location", "Share where you’re based."],
          ]} />) : <div className="settings-list">
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
          : section === "Profile" && profileSummary ? <section className="member-profile">
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
              <strong className="xp-balance" role="status">{xp} XP</strong>
            </div>
            <p className="reward-note">Preview balance. Purchases reset on reload.</p>
            <div className="reward-grid">{shopItems.map((item) => {
              const owned = ownedEffects.includes(item.style);
              const equipped = profileEffect === item.style;
              return <article key={item.name} className="shop-card">
                <div className="effect-preview" data-effect={item.style}><Avatar person={viewer} size={48} /></div>
                <h3>{item.name}</h3><p>{item.description}</p>
                <Button variant={owned ? "outline" : "primary"} disabled={!owned && xp < item.price} aria-label={owned ? (equipped ? `Unequip ${item.name}` : `Equip ${item.name}`) : `Buy ${item.name} for ${item.price} XP`} onClick={() => {
                  if (owned) { setProfileEffect(equipped ? undefined : item.style); return; }
                  setXp((balance) => balance - item.price);
                  setOwnedEffects((effects) => [...effects, item.style]);
                }}>{owned ? (equipped ? "Unequip" : "Equip") : `${item.price} XP`}</Button>
              </article>;
            })}</div>
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
          : section === "Explore" ? <div className="explore-content">{renderSearchPanel()}{renderTrendPanel()}{renderFollowPanel()}</div>
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
        {renderTrendPanel()}
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
          <p><b>128</b> Following <b>304</b> Followers</p>
          {[...navigation.filter(({ name }) => ["Profile", "Bookmarks", "Verified", "Settings"].includes(name)), ...extras].map(({ name, icon: Icon }) => <button key={name} onClick={() => navigate(name)}><Icon size={22} /> {name}</button>)}
          <LinkTo className="drawer-about" href="/about"><CircleHelp size={22} /> About Loopr</LinkTo>
          <button onClick={() => openPanel("account")}><UserRound size={22} /> {authenticated ? "Log out" : "Account options"}</button>
        </div>}
        {panel === "account" && <div className="account-options">{authenticated ? <SignOut handle={viewer.handle} /> : <LinkTo className="button button-outline" href="/welcome">Preview sign-in</LinkTo>}</div>}
      </Modal>
      {notice && <div role="status" className="toast">{notice}</div>}
    </div>
  );

  function renderSearchPanel() {
    return <div className="search-wrap" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setSearchOpen(false); }}>
      <form className="search-input" onSubmit={(event) => { event.preventDefault(); navigate("Explore"); setSearchOpen(false); }}>
        <Search size={19} /><input aria-label="Search Loopr" placeholder="Search Loopr" value={query} onFocus={() => setSearchOpen(true)} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") setSearchOpen(false); }} />
      </form>
      {searchOpen && <div className="popover search-results">
        {query.trim() ? <>
          {matchingPeople.map((person) => <button key={person.handle} onClick={() => { setQuery(person.name); navigate("Explore"); setSearchOpen(false); }}><Avatar person={person} size={28} /> {person.name}</button>)}
          {matchingTrends.map((trend) => <button key={trend.name} onClick={() => { setQuery(trend.name); navigate("Explore"); setSearchOpen(false); }}><Search size={16} /> {trend.name}</button>)}
          {!matchingPeople.length && !matchingTrends.length && <p>No matches in the preview.</p>}
        </> : <p>Search for people or topics.</p>}
      </div>}
    </div>;
  }

  function renderTrendPanel() {
    return <section className="side-card">
      <div className="side-head"><h2>What’s happening</h2></div>
      {trends.map((trend) => <button className="trend-row" key={trend.name} onClick={() => { setQuery(trend.name); navigate("Explore"); }}>
        <span className="trend-category">Trending in {trend.category}</span><strong>{trend.name}</strong><small>{trend.count} posts</small><Ellipsis size={17} />
      </button>)}
      {section !== "Explore" && <button className="show-more" onClick={() => navigate("Explore")}>Show more <ArrowRight size={15} /></button>}
    </section>;
  }

  function renderFollowPanel() {
    return <section className="side-card">
      <div className="side-head"><h2>Who to follow</h2></div>
      {suggestions.map((person) => {
        const active = following.includes(person.handle);
        return <div className="follow-row" key={person.handle}><Avatar person={person} /><div className="follow-person"><strong>{person.name} {person.verified && <VerifiedBadge />}</strong><small>@{person.handle}</small></div>
          <Button className={active ? "following-button" : "follow-button"} variant={active ? "outline" : "quiet"} aria-pressed={active} onClick={() => setFollowing((current) => active ? current.filter((handle) => handle !== person.handle) : [...current, person.handle])}>{active ? "Following" : "Follow"}</Button></div>;
      })}
      {section !== "Explore" && <button className="show-more" onClick={() => navigate("Explore")}>Show more <ArrowRight size={15} /></button>}
    </section>;
  }
}
