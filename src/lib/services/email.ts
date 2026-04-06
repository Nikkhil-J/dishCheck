import { Resend } from 'resend'
import { captureError, addBreadcrumb } from '@/lib/monitoring/sentry'
import { env } from '@/lib/env'
import type { CouponClaim } from '@/lib/types/rewards'

// ── Config ──────────────────────────────────────────────

function isConfigured(): boolean {
  return !!(env.RESEND_API_KEY && env.RESEND_FROM_EMAIL)
}

let resendClient: Resend | null = null

function getClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(env.RESEND_API_KEY)
  }
  return resendClient
}

// ── Core send ───────────────────────────────────────────

interface EmailPayload {
  to: string
  subject: string
  html: string
}

async function sendEmail(payload: EmailPayload): Promise<void> {
  if (!isConfigured()) {
    addBreadcrumb('Email skipped (Resend not configured)', { to: '[REDACTED]', subject: payload.subject })
    return
  }

  const fromEmail = env.RESEND_FROM_EMAIL
  if (!fromEmail) {
    addBreadcrumb('Email skipped (RESEND_FROM_EMAIL not set)', { to: '[REDACTED]', subject: payload.subject })
    return
  }

  try {
    await getClient().emails.send({
      from: fromEmail,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    })
  } catch (e) {
    captureError(e, { extra: { subject: payload.subject } })
  }
}

// ── HTML helpers ────────────────────────────────────────

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dishcheck.app'

function wrapHtml(body: string, email: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#1a1a1a;background-color:#f5f5f5;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;">
<tr><td align="center" style="padding:24px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;max-width:600px;width:100%;">
<tr><td style="padding:32px 24px;">
${body}
</td></tr>
</table>
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td style="padding:16px 24px;font-size:12px;color:#888;text-align:center;">
You're receiving this because you have a DishCheck account. This email was sent to ${email}.
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

function ctaButton(text: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
<tr><td style="background-color:#f97316;border-radius:6px;padding:12px 24px;">
<a href="${href}" style="color:#ffffff;text-decoration:none;font-weight:bold;font-size:16px;">${text}</a>
</td></tr>
</table>`
}

function progressBar(current: number, max: number): string {
  const pct = Math.min(Math.round((current / max) * 100), 100)
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
<tr><td style="background-color:#e5e5e5;border-radius:4px;height:12px;padding:0;">
<table role="presentation" width="${pct}%" cellpadding="0" cellspacing="0">
<tr><td style="background-color:#f97316;border-radius:4px;height:12px;">&nbsp;</td></tr>
</table>
</td></tr>
</table>
<p style="margin:4px 0 0;font-size:14px;color:#666;">${current} / ${max} DishPoints</p>`
}

// ── Public email senders ────────────────────────────────

export async function sendPointsMilestoneEmail(
  user: { email: string; displayName: string },
  points: number,
  pointsNeeded: number,
): Promise<void> {
  const html = wrapHtml(`
<h1 style="margin:0 0 16px;font-size:24px;">Hey ${user.displayName}!</h1>
<p>You're <strong>${pointsNeeded} DishPoints</strong> away from redeeming your first free coupon.</p>
${progressBar(points, 500)}
<p>Keep reviewing dishes to earn more points and unlock rewards.</p>
${ctaButton('View Rewards', `${SITE_URL}/rewards`)}
`, user.email)

  await sendEmail({
    to: user.email,
    subject: `You're ${pointsNeeded} DishPoints away from a free coupon`,
    html,
  })
}

export async function sendCouponClaimedEmail(
  user: { email: string; displayName: string },
  claim: CouponClaim,
): Promise<void> {
  const expiryText = claim.expiresAt
    ? `Expires: ${new Date(claim.expiresAt).toLocaleDateString('en-IN', { dateStyle: 'long' })}`
    : 'No expiry date'

  const html = wrapHtml(`
<h1 style="margin:0 0 16px;font-size:24px;">Your coupon is ready!</h1>
<p>Hi ${user.displayName}, here's your coupon:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;background-color:#fef3c7;border-radius:8px;">
<tr><td style="padding:24px;text-align:center;">
<p style="margin:0 0 8px;font-size:14px;color:#92400e;">Coupon Code</p>
<p style="margin:0;font-size:32px;font-weight:bold;letter-spacing:4px;color:#92400e;">${claim.code}</p>
<p style="margin:12px 0 0;font-size:14px;color:#92400e;">${claim.couponTitle}</p>
</td></tr>
</table>
<p style="font-size:14px;color:#666;">${expiryText}</p>
<p>Show this code at checkout to redeem your discount.</p>
${ctaButton('View My Coupons', `${SITE_URL}/rewards`)}
`, user.email)

  await sendEmail({
    to: user.email,
    subject: `Your DishCheck coupon is ready`,
    html,
  })
}

export async function sendWelcomeEmail(
  user: { email: string; displayName: string },
): Promise<void> {
  const html = wrapHtml(`
<h1 style="margin:0 0 16px;font-size:24px;">Welcome to DishCheck!</h1>
<p>Hi ${user.displayName}, great to have you here.</p>
<p>DishCheck helps you know exactly what to order. Search for any dish at any restaurant and read honest, dish-level reviews from real diners.</p>
<h2 style="font-size:18px;margin:24px 0 12px;">How to earn your first DishPoints:</h2>
<ol style="padding-left:20px;">
<li style="margin-bottom:8px;">Find a dish you've tried recently</li>
<li style="margin-bottom:8px;">Write a review with a photo, tags, and a few sentences</li>
<li style="margin-bottom:8px;">Earn up to 25 DishPoints per review</li>
</ol>
<p>Collect 500 DishPoints and redeem them for real restaurant coupons.</p>
${ctaButton('Start Exploring', `${SITE_URL}/explore`)}
`, user.email)

  await sendEmail({
    to: user.email,
    subject: 'Welcome to DishCheck \u2014 know exactly what to order',
    html,
  })
}
