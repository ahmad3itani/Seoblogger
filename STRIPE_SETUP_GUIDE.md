# Stripe Setup Guide for BloggerSEO

## Step 1: Create Stripe Account

1. Go to https://dashboard.stripe.com/register
2. Complete account setup
3. Verify your email

---

## Step 2: Create Products & Prices

### Create Starter Plan ($12/month)

1. Go to: https://dashboard.stripe.com/products
2. Click **"+ Add product"**
3. Fill in:
   - **Name:** BloggerSEO Starter
   - **Description:** Perfect for budget-conscious bloggers - 30 articles/month
   - **Pricing model:** Standard pricing
   - **Price:** $12.00 USD
   - **Billing period:** Monthly
   - **Payment type:** Recurring
4. Click **"Save product"**
5. **Copy the Price ID** (starts with `price_...`) → Add to `.env` as `STRIPE_PRICE_ID_STARTER`

### Create Starter Annual ($120/year)

1. On the same product page, click **"Add another price"**
2. Fill in:
   - **Price:** $120.00 USD
   - **Billing period:** Yearly
3. Click **"Add price"**
4. **Copy the Price ID** → Add to `.env` as `STRIPE_PRICE_ID_STARTER_YEARLY`

### Create Pro Plan ($39/month)

1. Click **"+ Add product"**
2. Fill in:
   - **Name:** BloggerSEO Pro
   - **Description:** Best value for full-time content creators - 100 articles/month
   - **Price:** $39.00 USD
   - **Billing period:** Monthly
3. Click **"Save product"**
4. **Copy the Price ID** → Add to `.env` as `STRIPE_PRICE_ID_PRO`

### Create Pro Annual ($390/year)

1. Add another price: $390.00 USD, Yearly
2. **Copy the Price ID** → Add to `.env` as `STRIPE_PRICE_ID_PRO_YEARLY`

### Create Enterprise Plan ($99/month)

1. Click **"+ Add product"**
2. Fill in:
   - **Name:** BloggerSEO Enterprise
   - **Description:** For agencies and teams - 300 articles/month
   - **Price:** $99.00 USD
   - **Billing period:** Monthly
3. Click **"Save product"**
4. **Copy the Price ID** → Add to `.env` as `STRIPE_PRICE_ID_ENTERPRISE`

### Create Enterprise Annual ($990/year)

1. Add another price: $990.00 USD, Yearly
2. **Copy the Price ID** → Add to `.env` as `STRIPE_PRICE_ID_ENTERPRISE_YEARLY`

---

## Step 3: Get API Keys

1. Go to: https://dashboard.stripe.com/apikeys
2. **Copy "Publishable key"** (starts with `pk_test_...`)
   - Add to `.env` as `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
3. Click **"Reveal test key"** for Secret key
4. **Copy "Secret key"** (starts with `sk_test_...`)
   - Add to `.env` as `STRIPE_SECRET_KEY`

---

## Step 4: Set Up Webhook

1. Go to: https://dashboard.stripe.com/webhooks
2. Click **"+ Add endpoint"**
3. Fill in:
   - **Endpoint URL:** `https://yourdomain.com/api/stripe/webhook`
   - For local testing: Use ngrok or Stripe CLI
4. Click **"Select events"**
5. Select these events:
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
6. Click **"Add endpoint"**
7. **Copy "Signing secret"** (starts with `whsec_...`)
   - Add to `.env` as `STRIPE_WEBHOOK_SECRET`

---

## Step 5: Test Locally with Stripe CLI

### Install Stripe CLI

**Windows:**
```bash
scoop install stripe
```

**Mac:**
```bash
brew install stripe/stripe-cli/stripe
```

### Login to Stripe
```bash
stripe login
```

### Forward webhooks to local server
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

This will give you a webhook signing secret for testing. Use it temporarily in your `.env`.

### Test a payment
```bash
stripe trigger checkout.session.completed
```

---

## Step 6: Update .env File

Your `.env` should look like this:

```env
# Stripe (Payment Processing)
STRIPE_SECRET_KEY=sk_test_51ABC...xyz
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51ABC...xyz
STRIPE_WEBHOOK_SECRET=whsec_ABC...xyz

# Stripe Price IDs
STRIPE_PRICE_ID_STARTER=price_ABC123
STRIPE_PRICE_ID_STARTER_YEARLY=price_DEF456
STRIPE_PRICE_ID_PRO=price_GHI789
STRIPE_PRICE_ID_PRO_YEARLY=price_JKL012
STRIPE_PRICE_ID_ENTERPRISE=price_MNO345
STRIPE_PRICE_ID_ENTERPRISE_YEARLY=price_PQR678
```

---

## Step 7: Update Database

Run the SQL migration to add Stripe fields and update plan limits:

```bash
# Add Stripe fields to User table
psql $DATABASE_URL < prisma/migrations/add_stripe_fields.sql

# Update plan limits with correct pricing
psql $DATABASE_URL < prisma/migrations/update_plan_limits.sql
```

Or use Prisma:
```bash
npx prisma db push
```

---

## Step 8: Test the Integration

### Test Checkout Flow

1. Go to `/pricing` page
2. Click "Start Free Trial" on Starter plan
3. Use Stripe test card: `4242 4242 4242 4242`
4. Expiry: Any future date
5. CVC: Any 3 digits
6. Complete checkout
7. Verify webhook received in Stripe dashboard
8. Check database - user should have:
   - `stripeCustomerId`
   - `stripeSubscriptionId`
   - `stripeSubscriptionStatus = 'active'`
   - `planId` updated to Starter

### Test Subscription Management

1. Go to `/dashboard`
2. Click "Manage Subscription"
3. Should redirect to Stripe Customer Portal
4. Test:
   - Update payment method
   - Cancel subscription
   - Reactivate subscription

### Test Webhooks

Monitor webhook events in Stripe Dashboard:
- https://dashboard.stripe.com/test/webhooks

Check your server logs for webhook processing.

---

## Step 9: Go Live (Production)

### Switch to Live Mode

1. In Stripe Dashboard, toggle from **Test mode** to **Live mode**
2. Repeat Steps 2-4 for live mode:
   - Create products with live prices
   - Get live API keys (start with `pk_live_` and `sk_live_`)
   - Create live webhook endpoint
3. Update production `.env` with live keys
4. Test with real card (small amount first!)

### Enable Payment Methods

1. Go to: https://dashboard.stripe.com/settings/payment_methods
2. Enable:
   - ✅ Cards (Visa, Mastercard, Amex)
   - ✅ Apple Pay
   - ✅ Google Pay
   - Consider: ACH, SEPA, etc.

### Set Up Billing Portal

1. Go to: https://dashboard.stripe.com/settings/billing/portal
2. Configure:
   - Allow customers to update payment methods
   - Allow customers to cancel subscriptions
   - Set cancellation behavior (immediate vs end of period)

---

## Troubleshooting

### Webhook not receiving events
- Check webhook URL is correct
- Verify webhook secret matches
- Check server logs for errors
- Use Stripe CLI to test locally

### Payment fails
- Verify API keys are correct
- Check Stripe Dashboard for error details
- Ensure price IDs match your products

### Subscription not updating in database
- Check webhook signature verification
- Verify userId is in metadata
- Check server logs for webhook processing errors

---

## Test Cards

| Card Number | Description |
|-------------|-------------|
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 0002 | Decline |
| 4000 0000 0000 9995 | Insufficient funds |
| 4000 0025 0000 3155 | Requires authentication (3D Secure) |

---

## Security Checklist

✅ Webhook signature verification enabled  
✅ API keys stored in environment variables  
✅ Never expose secret key to client  
✅ Use HTTPS in production  
✅ Validate price IDs server-side  
✅ Check user authentication before checkout  
✅ Verify subscription status before granting access  

---

## Support

- Stripe Documentation: https://stripe.com/docs
- Stripe Support: https://support.stripe.com
- Test your integration: https://stripe.com/docs/testing
