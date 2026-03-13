# Task 1: Google Calendar Webhook Implementation
**Status:** ✅ Complete - Ready for Feature Dev Lead  
**Branch:** backend/sprint-1  
**Date:** March 13, 2026

---

## 📌 Overview

The Google Calendar Webhook Edge Function receives push notifications from Google when calendar events change. This enables real-time sync without polling.

### What Was Created
1. **Supabase Edge Function:** `google-calendar-webhook`
2. **Database Table:** `google_calendar_sync` (tracks sync state per calendar)
3. **Migration:** `20260313_001_google_webhook_sync.sql`

---

## 🔗 Webhook URL

**Auto-Generated Endpoint:**
```
https://[project-id].supabase.co/functions/v1/google-calendar-webhook
```

Replace `[project-id]` with your actual Supabase project ID.

### Example Full URL
```
https://myproject-abc123.supabase.co/functions/v1/google-calendar-webhook
```

---

## 🛠️ How It Works

### Google Calendar Watch Subscription Flow
1. **Feature Dev Lead's code** calls `sync-google-calendar` to establish watch subscription
2. Google returns `resource_id` (unique identifier for this watch)
3. `resource_id` is stored in `google_calendar_sync` table
4. When calendar changes, Google sends POST to webhook URL
5. Webhook reads `x-goog-resource-state` and `x-goog-resource-id` headers
6. Webhook updates sync state (sets `needs_sync: true` or marks deleted)
7. Next sync request performs incremental sync using stored `sync_token`

### Resource States
- **`exists`**: Calendar has changes → Queue sync
- **`not_exists`**: Calendar/permission deleted → Clear token, require re-auth
- **`not_exists`** + expiration: Watch subscription expired → Renew watch

---

## 📊 Database Schema

### `google_calendar_sync` Table
```sql
Column                   | Type              | Description
-------------------------|-------------------|---------------------------------------------
id                       | uuid              | Primary key
user_id                  | uuid              | FK to auth.users
integration_id           | uuid              | FK to calendar_integrations
calendar_id              | text              | Google Calendar ID (email)
resource_id              | text UNIQUE       | Google's watch subscription ID
sync_token               | text (nullable)   | For incremental sync
needs_sync               | boolean           | Webhook sets this to trigger sync
last_synced              | timestamp         | Last successful sync time
watch_expiration         | timestamp         | When Google watch expires
created_at               | timestamp         | Created time
updated_at               | timestamp         | Last updated time
```

### Key Indexes
- `google_calendar_sync_resource_id_idx` — Fast webhook lookup
- `google_calendar_sync_needs_sync_idx` — Find calendars needing sync
- `google_calendar_sync_user_id_idx` — User's calendars

---

## 🔐 Security & RLS

**Row Level Security Policies:**
- ✅ Users can view/manage their own sync state
- ✅ Service role can update sync state (for webhook processing)
- ✅ Automatic cascade delete on user removal

**API Key Security:**
- Edge Function uses `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
- Webhook endpoint is public (accepts Google Pub/Sub notifications)
- Google's push authentication uses custom headers (not validated in v1)

---

## 📝 API Request/Response

### Incoming Webhook Request (from Google)
```json
{
  "message": {
    "attributes": {
      "x-goog-resource-state": "exists",
      "x-goog-resource-id": "abc123xyz",
      "x-goog-message-number": "1",
      "x-goog-resource-uri": "..."
    },
    "data": "..."
  }
}
```

### Successful Response (200 OK)
```json
{
  "status": "success",
  "message": "Webhook processed, sync queued for next user request",
  "resourceId": "abc123xyz",
  "resourceState": "exists"
}
```

### Not Found / Already Synced
```json
{
  "status": "queued",
  "message": "Webhook noted, sync record not found (will sync on next user request)",
  "resourceId": "abc123xyz",
  "resourceState": "exists"
}
```

---

## 🚀 Feature Dev Lead: Next Steps

### 1. Establish Watch Subscription (in `sync-google-calendar`)
```typescript
// When creating/updating calendar integration:
const watchResponse = await fetch(
  'https://www.googleapis.com/calendar/v3/calendars/primary/watch',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: `watch-${userId}-${calendarId}`, // Custom ID
      type: 'web_hook',
      address: 'https://[project-id].supabase.co/functions/v1/google-calendar-webhook',
      events: ['update', 'delete'],
    }),
  }
);

const { id: resourceId, expiration } = await watchResponse.json();

// Store in google_calendar_sync:
await supabase
  .from('google_calendar_sync')
  .upsert({
    user_id: userId,
    integration_id: integrationId,
    calendar_id: 'primary',
    resource_id: resourceId,
    watch_expiration: new Date(parseInt(expiration)).toISOString(),
  });
```

### 2. Check for Pending Sync (before returning events)
```typescript
// In Events.tsx or calendar fetch logic:
const { data: syncState } = await supabase
  .from('google_calendar_sync')
  .select('needs_sync, sync_token')
  .eq('resource_id', resourceId)
  .single();

if (syncState?.needs_sync) {
  // Perform full sync (set sync_token to null)
  await syncCalendar(userId, true); // Force full sync
}
```

### 3. Periodic Watch Renewal (every 24-48 hours)
```typescript
// Background job or cron function:
const renewWatch = async (userId, integration) => {
  // Get current watch expiration
  const { data: syncState } = await supabase
    .from('google_calendar_sync')
    .select('watch_expiration, resource_id')
    .eq('user_id', userId)
    .single();

  // If expires in <12 hours, renew
  if (new Date(syncState.watch_expiration) < new Date(Date.now() + 12 * 60 * 60 * 1000)) {
    // Call watch endpoint with new resource_id
  }
};
```

---

## 🧪 Testing

### Manual Test (curl)
```bash
curl -X POST https://[project-id].supabase.co/functions/v1/google-calendar-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "attributes": {
        "x-goog-resource-state": "exists",
        "x-goog-resource-id": "test-resource-123",
        "x-goog-message-number": "1"
      },
      "data": ""
    }
  }'
```

### Expected Response
```json
{
  "status": "queued",
  "message": "Webhook noted, sync record not found (will sync on next user request)",
  "resourceId": "test-resource-123",
  "resourceState": "exists"
}
```

---

## 📋 Deployment Checklist

- [ ] Deploy migrations with `supabase migration up`
- [ ] Deploy Edge Function with `supabase functions deploy google-calendar-webhook`
- [ ] Verify function URL in Supabase Dashboard > Edge Functions
- [ ] Test webhook with curl (see Testing section)
- [ ] Confirm `google_calendar_sync` table created
- [ ] Feature Dev Lead implements watch subscription in `sync-google-calendar`
- [ ] Feature Dev Lead tests end-to-end sync flow

---

## 📞 Handoff to Feature Dev Lead

**What You Have:**
- ✅ Public webhook URL (endpoint created)
- ✅ Sync tracking table (backend storage)
- ✅ Edge Function (webhook receiver)
- ✅ RLS Policies (security)

**What You Need to Implement:**
- Google Calendar watch subscription API call
- Check `needs_sync` flag before returning events
- Periodic watch renewal logic
- Error handling for expired/revoked permissions

**Questions for Feature Dev Lead:**
1. Should sync be triggered immediately on webhook, or queued for next user request?
   - **Current:** Queued for next request (reduces load, eventual consistency)
2. What's your refresh token refresh strategy? 
   - Store in `calendar_integrations.refresh_token` (already exists)
3. Do you need webhook signature validation?
   - Currently: No (webhook endpoint is public, but Google headers included)
   - Future: Can add HMAC validation if needed

---

## 🔄 Integration with Other Tasks

**Depends On:** None  
**Needed By:**
- Task 2: Mapbox (independent)
- Task 3: Claude Haiku (independent)
- Task 4: Stripe Coupon (independent)
- Task 5: Referral Tracking (independent)
- Task 6: Weather Widget (independent)

