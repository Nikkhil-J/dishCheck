# DishCheck Operational Runbook

Procedures for common production incidents and administrative tasks.

## Table of Contents

1. [Failed Coupon Redemption](#failed-coupon-redemption)
2. [Sentry Alert Escalation](#sentry-alert-escalation)
3. [Rolling Back a Bad Deploy](#rolling-back-a-bad-deploy)
4. [Manually Adjusting a User's DishPoints Balance](#manually-adjusting-dishpoints)
5. [Restaurant Claim Disputes](#restaurant-claim-disputes)
6. [Razorpay Payment Issues](#razorpay-payment-issues)
7. [Service Configuration & Common Issues](#service-configuration--common-issues)

---

## Failed Coupon Redemption

**Symptoms:** User reports "Failed to redeem coupon" or Sentry shows errors on `/api/rewards/redeem`.

**Diagnosis:**

1. Check Sentry for the specific error. The capture includes `userId` and `couponId`.
2. Open Firebase Console → Firestore → `coupons/{couponId}`:
   - Check `isActive` is `true`
   - Check `claimedCount < totalStock`
   - Check `expiresAt` is in the future (or null)
3. Check `users/{userId}`:
   - Verify `dishPointsBalance >= coupon.pointsCost`
4. Check `users/{userId}/pointTransactions` for a recent `REDEMPTION` entry — if it exists, the redemption succeeded but the response may have timed out.

**Resolution:**

- **Coupon exhausted:** Communicate to user. No action needed.
- **Insufficient balance:** Communicate to user. If there was a UI bug showing wrong balance, file a bug.
- **Transaction exists but user didn't see confirmation:** The coupon was redeemed. Find the `couponClaims` doc and share the code with the user.
- **Transaction failed mid-way (Sentry shows Firestore transaction error):** The atomic transaction should have rolled back. Verify the user's balance is unchanged. If balance was decremented but no claim was created, manually create the claim or refund the points (see [Manually Adjusting DishPoints](#manually-adjusting-dishpoints)).

---

## Sentry Alert Escalation

**When to escalate:** Any Sentry alert tagged `performance: slow` (>2s API response) or any error with >5 occurrences in 1 hour.

**Steps:**

1. Open the Sentry issue. Note the `route` tag and `userId`.
2. Check if the issue is:
   - **Transient** (Firestore quota, network blip): Wait 10 minutes. If it clears, no action.
   - **Code bug** (null pointer, schema mismatch): Fix in code, deploy.
   - **Infrastructure** (Firebase outage): Check [Firebase Status](https://status.firebase.google.com/). Wait it out or enable maintenance mode.
3. For slow routes:
   - Check the Sentry `timing` context for `durationMs`.
   - Common causes: missing Firestore index (check console logs for index creation link), large result set, cold start.

---

## Rolling Back a Bad Deploy

DishCheck is deployed on Vercel. Rollbacks are instant.

**Steps:**

1. Go to [Vercel Dashboard](https://vercel.com) → DishCheck project → Deployments.
2. Find the last known good deployment.
3. Click the three-dot menu → **Promote to Production**.
4. Verify the site is working.
5. Fix the issue on a branch and redeploy once verified.

**Do NOT:**
- Force-push to `main` to trigger a new deploy. Use Vercel's rollback.
- Delete the bad deployment — keep it for debugging.

---

## Manually Adjusting DishPoints

**When:** A user's balance is incorrect due to a failed transaction, or an admin needs to grant/deduct points as a goodwill gesture.

**Prerequisites:** You need Firebase Console access with write permissions.

**Steps:**

1. Open Firebase Console → Firestore → `users/{userId}`.
2. Note the current `dishPointsBalance`.
3. Create a new document in `users/{userId}/pointTransactions`:

```json
{
  "type": "ADMIN_ADJUSTMENT",
  "points": 50,
  "refId": null,
  "description": "Manual adjustment: [reason]",
  "createdAt": "<Firestore Timestamp>"
}
```

4. Update `users/{userId}.dishPointsBalance` to the new value (current + adjustment).
5. **Both steps must be done together.** If you only update the balance without creating a transaction, the audit trail is broken.

**Verification:** Ask the user to check their rewards page. The transaction should appear in their history.

---

## Restaurant Claim Disputes

**When:** A restaurant owner disputes a claim made by another user, or a claim was incorrectly approved.

**Steps:**

1. Open the admin dashboard at `/admin/restaurant-claims`.
2. Find the relevant claim.
3. If the claim was incorrectly approved:
   - In Firestore, set `restaurants/{restaurantId}.ownerId` to `null`.
   - Set `restaurants/{restaurantId}.isVerified` to `false`.
   - Update `restaurantClaims/{claimId}.status` to `'rejected'`.
   - Add an `adminNote` explaining the reversal.
4. If there are competing claims, request proof documents from both parties before approving either.

---

## Razorpay Payment Issues

### User paid but isn't Premium

**Diagnosis:**

1. Check `billingEvents` collection for the user's `userId`.
2. Check if a `subscription_activated` event exists.
3. If no event: the `/api/billing/verify` route likely failed after Razorpay charged the user.

**Resolution:**

1. Verify the payment in Razorpay Dashboard → Payments → search by order ID.
2. If the payment is confirmed:
   - In Firestore, set `users/{userId}.isPremium = true` and `premiumSince = Timestamp.now()`.
   - Manually create a `billingEvents` document for audit trail.
3. If the payment is not in Razorpay, the user may have abandoned checkout.

### Webhook not firing

1. Check Razorpay Dashboard → Webhooks → delivery logs.
2. Verify the webhook URL is `https://dishcheck.app/api/billing/webhook`.
3. Verify `RAZORPAY_WEBHOOK_SECRET` matches the secret in Razorpay Dashboard.
4. Check Sentry for errors on the webhook route.

---

## Service Configuration & Common Issues

### Razorpay Webhook Setup

1. Go to Razorpay Dashboard → Webhooks → **Add New Webhook**.
2. Webhook URL: `https://yourdomain.com/api/billing/webhook`
3. Events to subscribe:
   - `payment.captured`
   - `subscription.cancelled`
   - `subscription.expired`
4. Copy the webhook secret from the Razorpay webhook configuration page.
5. Set `RAZORPAY_WEBHOOK_SECRET` in your environment variables (Vercel / `.env.local`).
6. After saving, use Razorpay's "Test Webhook" button to confirm delivery.

### User Paid but isPremium is False

This happens when `/api/billing/verify` fails after Razorpay charges the user.

1. Check `billingEvents` collection in Firestore for the user's `userId`.
2. Check if a `subscription_activated` event exists.
3. If no event exists, verify the payment in **Razorpay Dashboard → Payments** — search by order ID.
4. If the payment is confirmed in Razorpay:
   - In Firebase Console, set `users/{userId}.isPremium = true` and `users/{userId}.premiumSince` to a current Firestore Timestamp.
   - Manually create a `billingEvents` document with `type: 'manual_activation'` for the audit trail.
5. If the payment is not in Razorpay, the user likely abandoned checkout — no action needed.

### Restaurant Analytics Shows FAILED_PRECONDITION Error

This means a required Firestore composite index is missing. The Sentry error or server log will contain a URL to create the missing index.

**Quick fix:**

```bash
firebase deploy --only firestore:indexes
```

Then wait for the indexes to finish building in **Firebase Console → Firestore → Indexes**. This usually takes 2–5 minutes for small collections.

**Relevant indexes** (defined in `firestore.indexes.json`):
- `reviews`: `restaurantId ASC, isApproved ASC`
- `reviews`: `restaurantId ASC, isApproved ASC, createdAt ASC`

### Typesense Sync Without Downtime

The `scripts/sync-typesense.ts` script **drops and recreates** the Typesense `dishes` collection. During the re-import window (~30s depending on dish count), search will be unavailable and will fall back to Firestore prefix search.

**For zero-downtime sync**, use the admin API route instead:

```bash
curl -X POST https://yourdomain.com/api/admin/sync-typesense \
  -H "Authorization: Bearer <admin-id-token>"
```

This route uses `upsert` on the existing collection — no drop, no downtime. Use this method for routine syncs. Only use the script when the Typesense schema changes and the collection must be recreated.
