# Google Calendar OAuth Integration - Implementation Guide

## Overview
This document describes the complete implementation of Google Calendar OAuth integration for Eazy.Family, enabling users to authenticate their Google Calendar and sync events with the Eazy.Family calendar system.

## Architecture

### Database Schema
Two new tables have been created:

#### 1. `calendar_integrations` table
Stores OAuth tokens and connection information for Google Calendar accounts.

```sql
CREATE TABLE public.calendar_integrations (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  provider text DEFAULT 'google',
  provider_account_id text, -- Google account email
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamp with time zone,
  token_type text DEFAULT 'Bearer',
  scope text,
  is_active boolean DEFAULT true,
  last_synced_at timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);
```

#### 2. `synced_calendar_events` table
Stores Google Calendar events synced into Eazy.Family.

```sql
CREATE TABLE public.synced_calendar_events (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  integration_id uuid NOT NULL REFERENCES public.calendar_integrations(id),
  google_event_id text NOT NULL,
  title text NOT NULL,
  description text,
  location text,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  all_day boolean DEFAULT false,
  color text DEFAULT 'hsl(220 70% 50%)',
  is_active boolean DEFAULT true,
  google_last_modified timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);
```

**Row Level Security (RLS)** is enabled on both tables with policies ensuring users can only access their own data.

### Supabase Edge Functions

#### 1. `google-calendar-oauth-callback`
**Path:** `/functions/v1/google-calendar-oauth-callback`

Handles the OAuth callback after user authorizes Google Calendar access:
- Exchanges authorization code for access tokens
- Stores integration in `calendar_integrations` table
- Fetches user's Google Calendar events and syncs them to `synced_calendar_events` table
- Supports offline access with refresh tokens

**Request:**
```
GET /functions/v1/google-calendar-oauth-callback?code=AUTHORIZATION_CODE
Authorization: Bearer USER_ACCESS_TOKEN
```

**Response:**
```json
{
  "success": true,
  "message": "Google Calendar connected successfully",
  "integration": {
    "id": "uuid",
    "user_id": "uuid",
    "provider": "google",
    "provider_account_id": "user@gmail.com",
    ...
  }
}
```

#### 2. `sync-google-calendar`
**Path:** `/functions/v1/sync-google-calendar`

Syncs user's Google Calendar events on-demand or via scheduled jobs:
- Refreshes access token if expired using refresh token
- Fetches latest events from Google Calendar API
- Updates synced events in database
- Handles multiple integrations per user

**Request:**
```
GET /functions/v1/sync-google-calendar
Authorization: Bearer USER_ACCESS_TOKEN
```

**Response:**
```json
{
  "message": "Sync completed",
  "synced": 3,
  "errors": 0,
  "total": 3
}
```

### Frontend Components

#### 1. `useGoogleCalendar` Hook
**Location:** `src/hooks/useGoogleCalendar.ts`

Main React hook for managing Google Calendar integration:

```typescript
const {
  integrations,        // Array of connected calendars
  syncedEvents,        // Array of synced Google Calendar events
  loading,             // Loading state
  syncing,             // Syncing state
  error,               // Error message
  initiateOAuth,       // Start OAuth flow
  handleOAuthCallback, // Process OAuth callback
  syncCalendar,        // Manually sync calendar
  disconnectCalendar,  // Disconnect calendar
  refetch,             // Refresh integrations list
  refetchEvents,       // Refresh synced events
} = useGoogleCalendar();
```

**Features:**
- Automatic subscription to database changes via Supabase Realtime
- Secure token management
- Error handling and retry logic
- Multiple integration support

#### 2. `GoogleCalendarSettings` Component
**Location:** `src/components/GoogleCalendarSettings.tsx`

Settings page component for managing Google Calendar integrations:
- Display connected calendars with connection date
- Show last sync timestamp
- Manual sync button
- Disconnect button with confirmation
- Connect new calendar button
- Error display and toast notifications

**Integration Points:**
- Added to `src/pages/Settings.tsx` before ReferralSystem component

#### 3. `GoogleCalendarCallback` Page
**Location:** `src/pages/GoogleCalendarCallback.tsx`

OAuth callback page that handles redirect from Google:
- Extracts authorization code from URL
- Processes OAuth callback
- Shows loading indicator
- Redirects to Settings on success
- Shows error toast on failure

**Route:** `/auth/google-calendar`

#### 4. `SyncedCalendarEventsDisplay` Component
**Location:** `src/components/SyncedCalendarEventsDisplay.tsx`

Displays upcoming Google Calendar events with visual indicators:
- Shows next 7 days of synced events
- Displays event title, time, and location
- Color-coded by original Google Calendar color
- "Google Calendar" badge to identify source
- Responsive card layout

### OAuth Flow

```
User clicks "Connect Google Calendar"
         ↓
initiateOAuth() constructs Google OAuth URL
         ↓
User redirected to Google login/consent screen
         ↓
User grants calendar:read + calendar:write scopes
         ↓
Google redirects to /auth/google-calendar with code
         ↓
handleOAuthCallback(code) exchanges code for tokens
         ↓
google-calendar-oauth-callback edge function:
  - Stores tokens in calendar_integrations table
  - Fetches Google Calendar events
  - Syncs events to synced_calendar_events table
         ↓
User redirected to /app/settings
         ↓
GoogleCalendarSettings displays connected account
```

### Scopes Requested
- `https://www.googleapis.com/auth/calendar.readonly` - Read calendar events
- `https://www.googleapis.com/auth/calendar` - Write calendar events (future use)

### Security Considerations

1. **Token Storage:** Access tokens stored in Supabase database with encryption at rest
2. **Refresh Tokens:** Stored securely for automatic token refresh
3. **RLS Policies:** Each user can only access their own integrations and synced events
4. **OAuth State:** State parameter used in OAuth flow for CSRF protection
5. **Token Expiration:** Tokens automatically refreshed before expiration
6. **Offline Access:** `access_type=offline` requested for refresh token support

## Configuration

### Environment Variables

Add to `.env`:
```
VITE_GOOGLE_CALENDAR_CLIENT_ID=YOUR_CLIENT_ID
```

Add to Supabase project secrets (via Supabase dashboard):
```
GOOGLE_CALENDAR_CLIENT_ID=YOUR_CLIENT_ID
GOOGLE_CALENDAR_CLIENT_SECRET=YOUR_CLIENT_SECRET
GOOGLE_CALENDAR_REDIRECT_URI=https://your-domain.supabase.co/functions/v1/google-calendar-oauth-callback
```

### Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google Calendar API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `https://your-domain.supabase.co/functions/v1/google-calendar-oauth-callback`
5. Copy Client ID and Client Secret

## Implementation Status

### Completed ✅

- [x] Database migration (calendar_integrations, synced_calendar_events tables)
- [x] RLS policies for security
- [x] OAuth callback edge function
- [x] Calendar sync edge function
- [x] useGoogleCalendar hook with React Query integration
- [x] GoogleCalendarSettings UI component
- [x] GoogleCalendarCallback redirect handler
- [x] SyncedCalendarEventsDisplay component
- [x] Integration with Settings page
- [x] OAuth flow implementation
- [x] Token refresh logic
- [x] Real-time sync capability
- [x] Error handling and validation
- [x] Build compilation (no errors)

### Testing Checklist

- [ ] OAuth flow: User can authenticate with Google
- [ ] Authorization: User can grant calendar permissions
- [ ] Token storage: Tokens securely stored in database
- [ ] Event syncing: Google Calendar events appear in synced_calendar_events
- [ ] Settings display: Connected calendar shown in Settings
- [ ] Sync button: Manual sync refreshes events
- [ ] Disconnect: User can disconnect and revoke access
- [ ] Multiple calendars: User can connect multiple Google accounts
- [ ] Event display: Synced events visible on Calendar page
- [ ] Dark mode: Synced events display correctly in dark mode
- [ ] Error handling: Errors properly caught and displayed
- [ ] Token refresh: Tokens automatically refresh when expired

### Next Steps

1. **Configure Google Cloud OAuth Credentials**
   - Create OAuth 2.0 credentials in Google Cloud Console
   - Add redirect URI
   - Store credentials in Supabase secrets

2. **Deploy Edge Functions**
   - Deploy `google-calendar-oauth-callback` function
   - Deploy `sync-google-calendar` function
   - Verify functions can access Supabase and Google APIs

3. **Run Database Migration**
   - Apply the migration to create new tables
   - Verify RLS policies are in place

4. **Test Integration**
   - Follow testing checklist above
   - Verify OAuth flow end-to-end
   - Test event syncing and display

5. **Feature Gating (Optional)**
   - Add feature gate for premium users only
   - Update subscription_tier checks if needed

6. **Monitoring & Logging**
   - Set up Supabase function logging
   - Monitor token refresh failures
   - Track sync performance

## API Integration Points

### Frontend Calls

```typescript
// Initiate OAuth
initiateOAuth(); // Redirects to Google

// Handle callback
await handleOAuthCallback(code); // Called in /auth/google-calendar

// Manual sync
await syncCalendar(); // Calls sync-google-calendar function

// Disconnect
await disconnectCalendar(integrationId); // Deactivates integration
```

### Event Displays

**Calendar Page:**
- Synced events can be displayed alongside local events
- Use `syncedEvents` from `useGoogleCalendar()` hook
- Filter by date range as needed

**Homepage:**
- Use `SyncedCalendarEventsDisplay` component
- Shows upcoming Google Calendar events
- Can be added to upcoming events section

**Settings Page:**
- `GoogleCalendarSettings` component manages integrations
- Shows connection status and last sync time
- Provides sync and disconnect buttons

## Error Handling

Common error scenarios and handling:

```typescript
// Access denied
catch (err) {
  if (err.message === 'Access denied') {
    // User declined permissions
  }
}

// Token expired
if (new Date(integration.expires_at) < new Date()) {
  // Auto-refresh using refresh_token
}

// API rate limit
// Sync function retries with exponential backoff

// Invalid credentials
// Edge function returns 401 error
```

## Performance Considerations

1. **Syncing:** Syncs only first 250 events (configurable in edge function)
2. **Database:** Indexes on `user_id`, `provider`, `start_date` for fast queries
3. **Real-time:** Supabase subscriptions watch for local changes
4. **Caching:** Events cached in component state with periodic refresh
5. **Pagination:** Future: Implement pagination for large event lists

## Migration Details

**File:** `supabase/migrations/20260309_004_google_calendar_oauth.sql`

Includes:
- Table creation with proper constraints
- Index creation for performance
- RLS policy setup
- Foreign key relationships
- Unique constraints for data integrity

Apply migration:
```bash
supabase migration up
```

## Files Modified/Created

### New Files
- `supabase/migrations/20260309_004_google_calendar_oauth.sql`
- `supabase/functions/google-calendar-oauth-callback/index.ts`
- `supabase/functions/sync-google-calendar/index.ts`
- `src/hooks/useGoogleCalendar.ts`
- `src/components/GoogleCalendarSettings.tsx`
- `src/components/SyncedCalendarEventsDisplay.tsx`
- `src/pages/GoogleCalendarCallback.tsx`

### Modified Files
- `src/App.tsx` - Added GoogleCalendarCallback route
- `src/pages/Settings.tsx` - Added GoogleCalendarSettings component import
- `.env` - Added VITE_GOOGLE_CALENDAR_CLIENT_ID

### Git Commits
1. `240a108e` - feat: implement Google Calendar OAuth integration with synced events display
2. `1c0ba8ff` - fix: replace LoadingSpinner with inline spinner to fix build

## Troubleshooting

**Issue:** OAuth redirect not working
- Check redirect URI matches in Google Cloud Console
- Verify VITE_GOOGLE_CALENDAR_CLIENT_ID in .env
- Check browser console for errors

**Issue:** Tokens not storing
- Verify Supabase secrets are set (GOOGLE_CALENDAR_CLIENT_SECRET)
- Check edge function logs for errors
- Verify database migration ran successfully

**Issue:** Events not syncing
- Check sync function logs in Supabase
- Verify refresh token is present (offline access)
- Check Google Calendar API is enabled in Cloud Console

**Issue:** Dark mode issues
- Verify CSS classes for dark mode support
- Check color contrast for synced event badges

## Future Enhancements

1. **Two-way sync:** Create events in Eazy.Family → sync to Google Calendar
2. **Multiple calendars:** Sync from specific calendars, not just primary
3. **Recurring events:** Better handling of recurring events
4. **Conflicts:** Detect and handle event conflicts
5. **Invitations:** Support calendar invitations
6. **Notifications:** Real-time notifications for synced events
7. **Webhooks:** Use Google Calendar webhooks for push-based sync
8. **Other providers:** Support for Outlook, Apple Calendar
