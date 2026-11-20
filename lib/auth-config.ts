import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import nodemailer from "nodemailer";
import { database } from "./database";

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function emailConfigured() {
  return Boolean(process.env.SMTP_URL && process.env.SMTP_FROM);
}

async function sendLink(email: string, subject: string, url: string) {
  const { SMTP_URL, SMTP_FROM } = process.env;
  if (!SMTP_URL || !SMTP_FROM) throw new Error("Email delivery is unavailable.");
  const endpoint = new URL(SMTP_URL);
  if (!["smtp:", "smtps:"].includes(endpoint.protocol)) throw new Error("Use an SMTP URL.");
  const secure = endpoint.protocol === "smtps:";
  const transport = nodemailer.createTransport({
    host: endpoint.hostname, port: endpoint.port ? Number(endpoint.port) : secure ? 465 : 587,
    secure, requireTLS: !secure,
    auth: endpoint.username ? { user: decodeURIComponent(endpoint.username), pass: decodeURIComponent(endpoint.password) } : undefined,
  });
  await transport.sendMail({ from: SMTP_FROM, to: email, subject, text: `${subject}\n\n${url}\n\nYou can ignore this email if you did not request it.` });
}

function createAuth() {
  const { BETTER_AUTH_URL, BETTER_AUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
  if (!BETTER_AUTH_URL || !BETTER_AUTH_SECRET || BETTER_AUTH_SECRET.length < 32) {
    throw new Error("Configure BETTER_AUTH_URL and a BETTER_AUTH_SECRET of at least 32 characters.");
  }
  const mail = emailConfigured();
  return betterAuth({
    appName: "Loopr",
    database: database(),
    baseURL: BETTER_AUTH_URL,
    secret: BETTER_AUTH_SECRET,
    advanced: { database: { generateId: "uuid" } },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 30 },
    emailAndPassword: {
      enabled: true,
      disableSignUp: !mail,
      requireEmailVerification: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      sendResetPassword: mail ? ({ user, url }) => sendLink(user.email, "Reset your Loopr password", url) : undefined,
      revokeSessionsOnPasswordReset: true,
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: mail ? ({ user, url }) => sendLink(user.email, "Verify your Loopr email", url) : undefined,
    },
    socialProviders: GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET
      ? { google: { clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET } }
      : {},
    account: {
      encryptOAuthTokens: true,
      accountLinking: { enabled: true, disableImplicitLinking: true, allowDifferentEmails: true },
    },
    user: {
      changeEmail: {
        enabled: mail,
        sendChangeEmailConfirmation: mail ? ({ user, url }) => sendLink(user.email, "Approve your Loopr email change", url) : undefined,
      },
    },
    plugins: [nextCookies()],
  });
}

let auth: ReturnType<typeof createAuth> | undefined;
export function getAuth() {
  return auth ??= createAuth();
}

export function authEnabled() {
  return Boolean(process.env.DATABASE_URL);
}
