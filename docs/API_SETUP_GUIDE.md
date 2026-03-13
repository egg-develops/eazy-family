# Backend Integration - Third-Party API Setup Guide

**Sprint:** sprint-1  
**Role:** Backend Integration Lead  
**Date:** 2026-03-13  

This guide walks through obtaining and configuring the three remaining APIs needed for Eazy.Family Sprint 1.

---

## 1. Mapbox API Setup

### Account Setup
1. Navigate to [Mapbox Account Registration](https://account.mapbox.com/auth/signup)
2. Sign up or log in
3. Accept terms of service

### Generate Public Token
1. Go to [Mapbox Tokens Page](https://account.mapbox.com/tokens/)
2. Click "Create a token"
3. Enter token name: `eazy-family-sprint1`
4. Under "Public scopes", select:
   - `maps:read`
   - `geolocation:read`
   - `styles:read`
5. Click "Create token"
6. **Copy the generated token** (starts with `pk_`)

### Store in Supabase
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select "Eazy.Family" project
3. Settings → Secrets
4. Click "New secret"
   - Name: `MAPBOX_API_KEY`
   - Value: `pk_[paste_your_token_here]`
   - Click "Save"

### Local Development Setup
1. Add to `.env` file:
   ```
   VITE_MAPBOX_API_KEY=pk_[your_token_here]
   ```
2. Restart dev server

### Verify Installation
```bash
# Should return the token without errors
curl https://api.mapbox.com/tokens/v2?access_token=pk_[your_token]
```

---

## 2. Anthropic (Claude Haiku) API Setup

### Account Setup
1. Navigate to [Anthropic Console](https://console.anthropic.com)
2. Sign up or log in
3. Go to API Keys section

### Generate API Key
1. Click "Create key"
2. Name: `eazy-family-sprint1`
3. **Copy the generated key** (starts with `sk-ant-v4-`)
4. Keep this safe - you won't be able to view it again

### Store in Supabase
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select "Eazy.Family" project
3. Settings → Secrets
4. Click "New secret"
   - Name: `ANTHROPIC_API_KEY`
   - Value: `sk-ant-v4-[paste_your_key_here]`
   - Click "Save"

### Verify Installation
```bash
# Test the key by making a simple API call
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: sk-ant-v4-[your_key]" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-3-5-haiku-20241022",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "Say hello"}]
  }'
```

### Set Rate Limits (Optional)
1. In Anthropic console, you can set usage limits
2. Recommended for production: Set monthly spending cap

---

## 3. Stripe Coupon Setup

### Prerequisites
You should already have a Stripe account. If not:
1. Go to [Stripe Signup](https://dashboard.stripe.com/register)
2. Create account
3. Complete onboarding

### Create Referral Coupon via Dashboard
1. Go to [Stripe Coupons](https://dashboard.stripe.com/coupons)
2. Click "Create coupon"
3. Fill in:
   - Coupon code: `REFERRAL_100_OFF` (or let Stripe auto-generate)
   - Discount type: Percentage
   - Percentage discount: 100
   - Duration: Limited time
   - Duration: 1 month
   - Max redemptions: Leave empty (unlimited)
4. Click "Create coupon"
5. **Copy the coupon ID** (e.g., `REFERRAL_100_OFF`)

### Alternative: Create via Stripe API
```bash
STRIPE_SECRET_KEY="sk_test_your_key_here"

curl https://api.stripe.com/v1/coupons \
  -u $STRIPE_SECRET_KEY: \
  -d percent_off=100 \
  -d duration=limited \
  -d duration_in_months=1 \
  -d name="Referral Reward - 100% Off" \
  -d id="REFERRAL_100_OFF"
```

Expected response:
```json
{
  "id": "REFERRAL_100_OFF",
  "object": "coupon",
  "percent_off": 100,
  "duration": "limited",
  "duration_in_months": 1,
  "created": 1678968000,
  "max_redemptions": null
}
```

### Store Coupon ID in Supabase
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select "Eazy.Family" project
3. Settings → Secrets
4. Click "New secret"
   - Name: `STRIPE_REFERRAL_COUPON_ID`
   - Value: `REFERRAL_100_OFF` (or your coupon ID)
   - Click "Save"

### Verify Installation
Call the initialize-stripe-coupon function to validate:
```bash
curl -X POST https://xizquwqsthjjjkujwivt.supabase.co/functions/v1/initialize-stripe-coupon \
  -H "Authorization: Bearer [SUPABASE_TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{"action": "validate", "coupon_code": "REFERRAL_100_OFF"}'
```

Should return:
```json
{
  "coupon_id": "REFERRAL_100_OFF",
  "valid": true,
  "percent_off": 100,
  "duration": "limited",
  "duration_in_months": 1,
  "message": "Coupon REFERRAL_100_OFF is correctly configured for referral rewards."
}
```

---

## Verification Checklist

After completing all three setups, verify each one:

### Mapbox
- [ ] Token created in Mapbox account
- [ ] Token starts with `pk_`
- [ ] Added to Supabase Secrets as `MAPBOX_API_KEY`
- [ ] Added to local `.env` as `VITE_MAPBOX_API_KEY`
- [ ] Can access Mapbox API successfully

### Anthropic
- [ ] API key created in Anthropic console
- [ ] Key starts with `sk-ant-v4-`
- [ ] Added to Supabase Secrets as `ANTHROPIC_API_KEY`
- [ ] Can make test API call to Claude

### Stripe
- [ ] Coupon created in Stripe dashboard
- [ ] Coupon is 100% off, 1-month duration
- [ ] Coupon ID stored in Supabase Secrets as `STRIPE_REFERRAL_COUPON_ID`
- [ ] initialize-stripe-coupon function validates successfully

---

## Testing Integration

### Test Mapbox in Frontend
```typescript
// In a React component
import mapboxgl from 'mapbox-gl';

const apiKey = import.meta.env.VITE_MAPBOX_API_KEY;
mapboxgl.accessToken = apiKey;

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v12',
  center: [-74.5, 40],
  zoom: 9
});
```

### Test Anthropic in Edge Function
```typescript
// In supabase/functions/my-function/index.ts
const apiKey = Deno.env.get('ANTHROPIC_API_KEY');

const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: 'What is 2+2?'
    }]
  }),
});

const data = await response.json();
console.log(data.content[0].text); // "4"
```

### Test Stripe Referral Coupon
```typescript
// In supabase/functions/apply-referral-coupon/index.ts
// This is already implemented - just needs the coupon ID configured

// Test it end-to-end:
const result = await supabase.functions.invoke('apply-referral-coupon', {
  body: {
    referral_id: 'test-referral-uuid',
    referrer_id: 'test-referrer-uuid',
    new_user_id: 'test-new-user-uuid',
  }
});

console.log(result); // Should show success with coupon applied
```

---

## Common Issues & Troubleshooting

### Mapbox
**Issue:** "Token not found" error
- **Solution:** Ensure token is public (type: "public"), not secret

**Issue:** Maps not rendering
- **Solution:** Check that `VITE_MAPBOX_API_KEY` environment variable is loaded

### Anthropic
**Issue:** "Invalid API key" error
- **Solution:** Ensure key starts with `sk-ant-v4-`, not truncated

**Issue:** Rate limit exceeded
- **Solution:** Check your Anthropic account for usage and limits

### Stripe
**Issue:** "Coupon not found" when applying
- **Solution:** Ensure `STRIPE_REFERRAL_COUPON_ID` exactly matches Stripe coupon ID (case-sensitive)

**Issue:** Subscription has expired coupon
- **Solution:** Ensure coupon duration is set to "limited time" (not "forever")

---

## Next Steps

Once all three APIs are configured:

1. **Notify Feature Dev Lead** that the APIs are ready
2. **Deploy to staging** and run tests
3. **Run QA integration tests** on the referral flow
4. **Create PR to main** once all testing passes
5. **Deploy to production**

---

## Security Notes

1. **Never commit API keys** to the repository
2. **Use `.env.local`** for local development (not `.env`)
3. **Rotate keys regularly** in production
4. **Use different keys** for development, staging, and production
5. **Set spending limits** on Stripe and Anthropic accounts
6. **Monitor usage** in Mapbox, Anthropic, and Stripe dashboards

---

## Resources

- [Mapbox API Documentation](https://docs.mapbox.com/)
- [Anthropic API Documentation](https://docs.anthropic.com/)
- [Stripe API Documentation](https://stripe.com/docs/api)
- [Stripe Coupons Guide](https://stripe.com/docs/billing/subscriptions/discounts/coupons)

---

**Status:** To be completed by EOD 2026-03-13  
**Owner:** Backend Integration Lead  
**Last Updated:** 2026-03-13
