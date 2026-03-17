# BloggerSEO Billing & Refund System Documentation

## Overview
This document outlines the complete billing, subscription, refund, and dispute handling system for BloggerSEO, ensuring compliance with our published Refund & Cancellation Policy.

## Database Schema

### Subscription Model
Tracks user subscriptions with full lifecycle management:
- **First-time subscriber tracking**: `isFirstSubscription` and `firstPaymentAt` fields
- **7-day guarantee eligibility**: Automatically calculated based on payment date
- **Cancellation tracking**: `cancelAtPeriodEnd`, `canceledAt`, `cancelReason`
- **Billing cycle**: Monthly or yearly tracking

### RefundRequest Model
Tracks all refund requests with automatic eligibility checking:
- **Eligibility determination**: Automatically checks 7-day guarantee
- **First subscriber verification**: Validates against `isFirstSubscription`
- **Status tracking**: pending → approved/rejected → processed/failed
- **Admin workflow**: Includes admin notes and processing fields

### BillingDispute Model
Handles billing disputes per policy (30-day window):
- **Dispute types**: unauthorized_charge, incorrect_amount, duplicate_charge, service_not_received, other
- **Resolution tracking**: open → investigating → resolved/closed
- **Stripe integration**: Links to Stripe charge/invoice/dispute IDs

## API Endpoints

### POST /api/billing/refund
Submit a refund request
- **Authentication**: Required
- **Automatic eligibility check**: 7-day guarantee for first-time subscribers
- **Response**: Includes eligibility status and expected processing time

### GET /api/billing/refund
Retrieve user's refund request history
- **Authentication**: Required
- **Returns**: All refund requests for the authenticated user

### POST /api/billing/dispute
Submit a billing dispute
- **Authentication**: Required
- **Validation**: Requires dispute type, amount, and detailed description (20+ chars)
- **Response**: Confirmation with 48-hour response commitment

### GET /api/billing/dispute
Retrieve user's billing dispute history
- **Authentication**: Required
- **Returns**: All billing disputes for the authenticated user

## Subscription Lifecycle

### 1. New Subscription (Checkout Completed)
```
Webhook: checkout.session.completed
Actions:
- Create/update User with Stripe details
- Create Subscription record with isFirstSubscription=true, firstPaymentAt=now
- Track billing cycle (monthly/yearly)
```

### 2. Subscription Update
```
Webhook: customer.subscription.updated
Actions:
- Update User plan and Stripe details
- Update Subscription record with new plan/period
- Preserve first-time subscriber status
```

### 3. Subscription Cancellation
```
Webhook: customer.subscription.deleted
Actions:
- Downgrade User to free plan
- Update Subscription status to "canceled"
- Set canceledAt timestamp
- RETAIN ALL USER DATA (articles, blogs, projects, etc.)
```

### 4. Payment Success
```
Webhook: invoice.payment_succeeded
Actions:
- Update subscription status to "active"
- Update current period end date
```

### 5. Payment Failure
```
Webhook: invoice.payment_failed
Actions:
- Update subscription status to "past_due"
- User retains access during grace period
```

## Refund Policy Implementation

### 7-Day Money-Back Guarantee
**Eligibility Criteria** (automatically checked):
1. Request within 7 days of `firstPaymentAt`
2. `isFirstSubscription` must be `true`
3. Account not terminated for ToS violation

**Processing**:
- Eligible requests: Auto-approved, processed within 5-10 business days
- Ineligible requests: Submitted for admin review (case-by-case basis)

### Cancellation Behavior
**Per Policy**: "Your account will be downgraded to the free plan at the end of your billing period"

**Implementation**:
- Stripe handles `cancel_at_period_end` automatically
- Webhook `subscription.deleted` fires at period end
- User retains access until `currentPeriodEnd`
- All data preserved (articles, blogs, images, etc.)
- Usage limits revert to free plan quotas

### Data Retention
**Per Policy**: "You will retain access to all articles and data you created"

**Implementation**:
- NO data deletion on cancellation
- User model uses `onDelete: Cascade` for cleanup only when user deletes account
- Articles, blogs, projects, brand profiles all preserved
- Only usage limits change (enforced by plan checker)

## Plan Upgrades & Downgrades

### Upgrading
**Per Policy**: "New rate takes effect immediately. Prorated amount charged for remainder of current billing cycle."

**Implementation**:
- Stripe handles prorated billing automatically
- Webhook updates User and Subscription records
- New limits take effect immediately

### Downgrading
**Per Policy**: "Current plan remains active until end of billing period. Lower rate takes effect at next renewal. No refund for difference."

**Implementation**:
- Stripe's `proration_behavior` set to `none` for downgrades
- Plan change scheduled for period end
- Webhook updates records at renewal

## Billing Disputes

### 30-Day Window
**Per Policy**: "Contact us within 30 days of unauthorized or incorrect charge"

**Implementation**:
- BillingDispute model tracks submission date
- Admin dashboard shows days since charge
- Automated reminders for disputes approaching resolution deadline

### Resolution Process
1. User submits dispute via API
2. Status: "open"
3. Admin investigates: Status → "investigating"
4. Resolution: Status → "resolved" or "closed"
5. If escalated to Stripe: `stripeDisputeId` tracked

## Database Migration

To apply the new schema changes:

```bash
# Generate migration
npx prisma migrate dev --name add_refund_billing_tracking

# Or apply to production
npx prisma migrate deploy
```

## Testing Checklist

### Subscription Flow
- [ ] New subscription creates Subscription record with `isFirstSubscription=true`
- [ ] `firstPaymentAt` is set correctly
- [ ] Cancellation downgrades to free plan
- [ ] User data is retained after cancellation
- [ ] Usage limits revert to free plan quotas

### Refund Requests
- [ ] 7-day guarantee eligibility calculated correctly
- [ ] First-time subscriber check works
- [ ] Requests submitted successfully
- [ ] Admin can view and process requests

### Billing Disputes
- [ ] All dispute types accepted
- [ ] Description validation (20+ chars) works
- [ ] Disputes tracked and retrievable
- [ ] Admin can resolve disputes

## Admin Dashboard Requirements

### Refund Management
- View all pending refund requests
- Filter by eligibility status
- Approve/reject with notes
- Process refunds via Stripe API
- Track refund status

### Dispute Management
- View all open disputes
- Assign to support staff
- Track resolution timeline
- Link to Stripe charges/invoices
- Close with resolution notes

## Security Considerations

1. **Authentication**: All endpoints require valid user session
2. **Authorization**: Users can only access their own refund/dispute records
3. **Validation**: All inputs sanitized and validated
4. **Stripe Webhooks**: Signature verification required (already implemented)
5. **Rate Limiting**: Prevent abuse of refund/dispute submission

## Compliance

This system ensures full compliance with our published Refund & Cancellation Policy:
- ✅ 7-day money-back guarantee for first-time subscribers
- ✅ Subscription cancellation with period-end downgrade
- ✅ Data retention after cancellation
- ✅ Prorated upgrades, no-refund downgrades
- ✅ 30-day billing dispute window
- ✅ 5-10 business day refund processing

## Support Contact
All refund and billing inquiries: support@bloggerseowriting.com
