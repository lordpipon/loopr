export const policyTitles = {
  about: "About Loopr",
  terms: "Terms of Service",
  privacy: "Privacy Policy",
  refunds: "Refund Policy",
  cookies: "Cookie Policy",
  guidelines: "Community Guidelines",
} as const;

type Policy = Exclude<keyof typeof policyTitles, "about">;
type Section = { title: string; body: string };

export const policySections: Record<Policy, Section[]> = {
  terms: [
    { title: "These terms", body: "These terms apply when you access Loopr, create an account, or use its features. Loopr is a social service where members can share posts, reply, and follow other accounts." },
    { title: "Eligibility and your account", body: "You must be at least 13 and meet any higher minimum age required where you live. Use an email address you control and provide accurate registration information. Keep your sign-in details secure and contact the maintainer if you think someone else has accessed your account." },
    { title: "Your content", body: "You keep ownership of what you post. By sharing content, you give Loopr permission to store, display, and distribute it through the service as needed to operate it, subject to your sharing settings. Share only material you have permission to use. Others may save or share copies outside Loopr, depending on how you published it." },
    { title: "Acceptable use", body: "Follow the Community Guidelines and applicable law. Do not interfere with the service, bypass access controls, exploit accounts, scrape private information, or use automated accounts to spam people or manipulate engagement." },
    { title: "Moderation and access", body: "Loopr may restrict accounts or remove material that violates these terms or the Community Guidelines, or where action is needed to protect members or comply with law. If you believe a decision was a mistake, you can ask the maintainer to review it." },
    { title: "Third-party services and payments", body: "Links can take you to services governed by their own terms. If you sign in using Google, Google’s terms also apply to your use of that service. The Refund Policy explains Loopr’s current payment status." },
    { title: "Changes and availability", body: "Features may change or become unavailable as Loopr develops. If the terms change materially, Loopr will provide notice in the service where appropriate. You can stop using Loopr at any time." },
    { title: "Your legal rights", body: "Nothing here limits rights or remedies that cannot be waived under applicable law." },
  ],
  privacy: [
    { title: "Scope", body: "This policy describes how Loopr handles information when you visit the site, register, or use an account. It applies to Loopr. Services you open through links have their own privacy practices." },
    { title: "Information you provide", body: "Loopr stores your name, email address, username, and private date of birth. It also stores optional profile details you choose to provide, such as a photo, bio, pronouns, website, and location. If you register with a password, Loopr stores a password hash." },
    { title: "Activity and technical information", body: "Loopr stores the posts, replies, likes, reposts, bookmarks, and follows you create. Account sessions and security systems may process technical information such as network addresses, session identifiers, and request timing. If you enable browser push, Loopr stores the delivery endpoint and keys associated with that subscription." },
    { title: "Sign-in with Google", body: "If you use Google sign-in, Loopr receives the Google account identifier, your email address, and basic profile information that Google provides for authentication. You can disconnect Google in account settings after setting a Loopr password." },
    { title: "Why Loopr uses information", body: "Loopr uses information to create and secure accounts, display profiles and posts, save activity, deliver requested email and push notifications, and prevent abuse. Where applicable, it relies on operating the service you request, legitimate security and operational interests, legal obligations, and your choice to enable optional features." },
    { title: "Visibility and service providers", body: "Your profile and posts may be visible to other members, depending on your account settings. Bookmarks and dates of birth are private. Hosting, database, email, authentication, and push providers may process the information needed to provide their services. Loopr may also disclose information when legally required. Providers may process information in countries other than yours." },
    { title: "Retention and security", body: "Loopr retains information as needed to operate your account, keep the service secure, and meet legal obligations. Some information may remain temporarily in backups or security records. Loopr uses access controls and password hashing to protect account information." },
    { title: "Your choices and rights", body: "Use settings to edit profile information, change your sign-in details, and manage browser push. Depending on your location, you may have rights to access, correct, delete, or export your information, object to or restrict its use, or complain to a data protection authority. Contact the maintainer to make a request and arrange a private channel." },
    { title: "Children and changes", body: "Loopr requires users to be at least 13, or older where local law requires it. Contact the maintainer if you believe an underage account exists. This page will reflect material changes to Loopr’s privacy practices." },
  ],
  refunds: [
    { title: "Current payment status", body: "Loopr does not currently accept live payments or sell subscriptions. Stripe test transactions do not charge money and do not result in refunds." },
    { title: "If Loopr introduces paid features", body: "Loopr will publish prices, billing terms, and the applicable refund or cancellation process before taking live payments. Any mandatory consumer rights will continue to apply." },
    { title: "Unexpected charges", body: "If a charge appears to be associated with Loopr, contact the maintainer through a private channel. Include the date and amount. Keep your full payment details private." },
  ],
  cookies: [
    { title: "Essential cookies", body: "Loopr uses cookies to keep you signed in, protect account requests, and preserve the temporary information needed when you sign in with Google. Signing out ends your current session." },
    { title: "Browser storage", body: "Your browser stores settings such as theme and color preferences and whether you dismissed the cookie notice. During sign-up, the browser may temporarily store your selected birthday so it can carry over into onboarding." },
    { title: "Manage cookies and site data", body: "You can clear cookies or site data in your browser. This may sign you out and reset your display settings. Blocking essential cookies may prevent account features from working." },
  ],
  guidelines: [
    { title: "Treat people with respect", body: "Do not harass, threaten, or stalk people. Do not target people with hateful abuse based on characteristics such as race, religion, disability, or sexual orientation." },
    { title: "Respect privacy and consent", body: "Do not publish someone’s private information or intimate material without consent. Do not impersonate someone in a way that misleads others." },
    { title: "Keep the service safe", body: "Do not post exploitative material, use Loopr for fraud or phishing, spread malicious links, or encourage violence. Respect copyright and other rights when sharing material." },
    { title: "Avoid manipulation", body: "Do not use spam, fake accounts, or coordinated activity to manipulate likes, follows, or distribution." },
    { title: "Reporting and review", body: "Contact the maintainer to report a concern or request review of a moderation decision. Provide enough context to locate the material and keep sensitive information private." },
  ],
};
