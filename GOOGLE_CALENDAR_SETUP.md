# Google Calendar Integration - Setup & Testing Guide

## Quick Start

This guide walks you through setting up and testing the Google Calendar OAuth integration for Eazy.Family.

## Part 1: Google Cloud Configuration

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a Project" → "New Project"
3. Enter project name: `Eazy-Family-Calendar`
4. Click "Create"
5. Wait for project to be created

### Step 2: Enable Google Calendar API

1. In the Google Cloud Console, search for "Google Calendar API"
2. Click on the result
3. Click "Enable"
4. Wait for it to be enabled

### Step 3: Create OAuth 2.0 Credentials

1. Go to "Credentials" in the left sidebar
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted to create a consent screen first:
   - Click "Configure Consent Screen"
   - Select "External" user type
   - Click "Create"
   - Fill in:
     - App name: `Eazy.Family`
     - User support email: your email
     - Developer contact: your email
   - Click "Save and Continue"
   - Add scopes:
     - Search for and select `https://www.googleapis.com/auth/calendar.readonly`
     - Search for and select `https://www.googleapis.com/auth/calendar`
     - Click "Update"
   - Click "Save and Continue" through the remaining steps

4. Back on Credentials page, click "Create Credentials" → "OAuth client ID"
5. Application type: **Web application**
6. Name: `Eazy.Family Web Client`
7. Under "Authorized redirect URIs", click "Add URI"
8. Add: `https://xizquwqsthjjjkujwivt.supabase.co/functions/v1/google-calendar-oauth-callback`
   - Replace the domain with your actual Supabase project domain
9. Click "Create"
10. **Copy and save your Client ID and Client Secret** (keep the secret secure!)

## Part 2: Supabase Configuration

### Step 1: Add Secrets

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project: `Eazy.Family`
3. Go to Settings → Secrets
4. Add new secret:
   - Name: `GOOGLE_CALENDAR_CLIENT_ID`
   - Value: `YOUR_CLIENT_ID` (from Google Cloud)
5. Add new secret:
   - Name: `GOOGLE_CALENDAR_CLIENT_SECRET`
   - Value: `YOUR_CLIENT_SECRET` (from Google Cloud)
6. Add new secret:
   - Name: `GOOGLE_CALENDAR_REDIRECT_URI`
   - Value: `https://xizquwqsthjjjkujwivt.supabase.co/functions/v1/google-calendar-oauth-callback`

### Step 2: Deploy Edge Functions

1. Ensure Supabase CLI is installed:
   ```bash
   npm install -g supabase
   ```

2. From project root, deploy the functions:
   ```bash
   supabase functions deploy google-calendar-oauth-callback
   supabase functions deploy sync-google-calendar
   ```

3. Verify deployment:
   - Go to Supabase Dashboard → Edge Functions
   - Should see both functions listed

### Step 3: Run Database Migration

1. From project root:
   ```bash
   supabase db push
   ```
   or use the Supabase SQL editor:
   
2. Go to Supabase Dashboard → SQL Editor
3. Create new query
4. Copy contents of `supabase/migrations/20260309_004_google_calendar_oauth.sql`
5. Run the query
6. Verify tables were created:
   - Query: `SELECT * FROM calendar_integrations LIMIT 1;`
   - Query: `SELECT * FROM synced_calendar_events LIMIT 1;`

## Part 3: Application Configuration

### Step 1: Update Environment Variables

1. Update `.env` file:
   ```
   VITE_GOOGLE_CALENDAR_CLIENT_ID="YOUR_CLIENT_ID"
   ```

2. The client ID should be available to the frontend for OAuth redirect

### Step 2: Build & Test Locally

```bash
# Install dependencies (if not already installed)
npm install

# Start development server
npm run dev

# In another terminal, build for production
npm run build
```

Visit `http://localhost:5173/app/settings` to test

## Part 4: Testing the Integration

### Test 1: OAuth Flow

**Objective:** User can authenticate with Google Calendar

1. Start the app: `npm run dev`
2. Log in with your test account
3. Navigate to Settings
4. Scroll to "Google Calendar" section
5. Click "Connect Google Calendar"
6. You should be redirected to Google login/consent screen
7. Grant all requested permissions
8. You should be redirected back to Settings with success message
9. "Connected" status should show your Google email

**Expected Result:** ✅ OAuth flow completes successfully

### Test 2: Event Syncing

**Objective:** Google Calendar events sync to database

1. Ensure you have events in your Google Calendar
2. After successful OAuth, events should appear in `synced_calendar_events` table
3. Verify in Supabase dashboard:
   - Go to SQL Editor
   - Run: `SELECT * FROM synced_calendar_events WHERE user_id = auth.uid();`
   - Should see your Google Calendar events

**Expected Result:** ✅ Google Calendar events synced to database

### Test 3: Manual Sync

**Objective:** User can manually trigger sync

1. Go to Settings → Google Calendar
2. Click "Sync" button
3. Should see loading state
4. After sync, "Last synced" timestamp should update

**Expected Result:** ✅ Sync button works and updates timestamp

### Test 4: Display in UI

**Objective:** Synced events display correctly

1. Add the `SyncedCalendarEventsDisplay` component to desired pages
2. Events should show with:
   - Event title
   - "Google Calendar" badge
   - Time/date
   - Location (if available)
   - Color indicator

**Expected Result:** ✅ Events display with proper formatting

### Test 5: Disconnect

**Objective:** User can disconnect Google Calendar

1. Go to Settings → Google Calendar
2. Click "Disconnect" button
3. Confirm disconnection
4. Integration should be marked inactive
5. Should be able to reconnect

**Expected Result:** ✅ Disconnect works and user can reconnect

### Test 6: Multiple Calendars

**Objective:** User can connect multiple Google accounts

1. After first calendar is connected
2. Click "Connect Another Calendar"
3. Follow OAuth flow with different Google account
4. Both should appear in list

**Expected Result:** ✅ Multiple calendars can be connected

### Test 7: Token Refresh

**Objective:** Access token automatically refreshes when expired

1. This happens automatically in background
2. Check Supabase function logs:
   ```bash
   supabase functions logs sync-google-calendar
   ```
3. When token is about to expire, it should refresh automatically

**Expected Result:** ✅ Token refresh works silently

### Test 8: Dark Mode

**Objective:** UI works correctly in dark mode

1. Toggle dark mode in Settings
2. Google Calendar settings should display correctly
3. Synced event cards should be readable
4. Badges should have proper contrast

**Expected Result:** ✅ Dark mode displays correctly

### Test 9: Error Handling

**Objective:** Errors are properly handled and displayed

1. Temporarily disable Google Calendar API in Cloud Console
2. Try to sync
3. Should show error message
4. Re-enable API
5. Sync should work again

**Expected Result:** ✅ Errors display and don't crash app

### Test 10: Feature Gate (Optional)

**Objective:** Feature limited to premium users (if implemented)

1. Set subscription_tier to "free"
2. Settings page should show upgrade prompt
3. Set subscription_tier to "pro" or higher
4. Feature should be accessible

**Expected Result:** ✅ Feature gate works as expected

## Debugging

### Check Edge Function Logs

```bash
# View logs for OAuth callback function
supabase functions logs google-calendar-oauth-callback

# View logs for sync function
supabase functions logs sync-google-calendar
```

### Check Browser Console

1. Open Developer Tools (F12)
2. Check Console tab for errors
3. Check Network tab for API calls
4. Look for CORS issues

### Check Supabase Database

```sql
-- Check integrations
SELECT * FROM calendar_integrations;

-- Check synced events
SELECT * FROM synced_calendar_events;

-- Check user's integrations
SELECT * FROM calendar_integrations 
WHERE user_id = 'YOUR_USER_ID';
```

### Test OAuth Redirect URL

Manually construct and test:
```
https://accounts.google.com/o/oauth2/v2/auth?
  client_id=YOUR_CLIENT_ID&
  redirect_uri=https://xizquwqsthjjjkujwivt.supabase.co/functions/v1/google-calendar-oauth-callback&
  response_type=code&
  scope=https://www.googleapis.com/auth/calendar.readonly+https://www.googleapis.com/auth/calendar&
  access_type=offline&
  prompt=consent
```

## Troubleshooting

### Issue: "No authorization code provided"

**Cause:** OAuth redirect not working
**Solution:**
1. Check redirect URI matches exactly in Google Cloud Console
2. Check browser console for errors
3. Verify redirect URI is in whitelist

### Issue: "User not authenticated"

**Cause:** User not logged into Eazy.Family
**Solution:**
1. Ensure user is logged in
2. Check session in browser localStorage
3. Verify auth context is working

### Issue: "OAuth callback failed"

**Cause:** Supabase edge function error
**Solution:**
1. Check function logs: `supabase functions logs google-calendar-oauth-callback`
2. Verify secrets are set correctly
3. Check network request in browser DevTools

### Issue: Events not syncing

**Cause:** Google Calendar API not enabled or access denied
**Solution:**
1. Verify Google Calendar API is enabled in Cloud Console
2. Check user granted proper scopes during OAuth
3. Check edge function logs for API errors

### Issue: Dark mode looks broken

**Cause:** Missing dark mode CSS
**Solution:**
1. Check Tailwind dark mode is enabled
2. Verify component uses `dark:` prefix for dark mode colors
3. Test in both light and dark themes

## Performance Testing

### Load Testing

1. Add 100+ events to Google Calendar
2. Click sync button
3. Check performance:
   - How long does sync take?
   - Are events all synced?
   - Does UI remain responsive?

### Memory Testing

1. Monitor browser memory usage
2. Open Settings page with many events
3. Check for memory leaks
4. Disconnect and reconnect multiple times

## Security Testing

### 1. Token Security

1. Verify tokens are not exposed in logs
2. Check tokens in database are encrypted
3. Verify tokens not in localStorage or sessionStorage
4. Check tokens not sent to third parties

### 2. CSRF Protection

1. Verify state parameter used in OAuth flow
2. Check state validation in callback

### 3. Access Control

1. Verify users can't access other users' integrations
2. Test RLS policies:
   ```sql
   SET SESSION authorization.uid = 'OTHER_USER_ID';
   SELECT * FROM calendar_integrations;
   -- Should return 0 rows (if other user's data)
   ```

### 4. Data Privacy

1. Verify synced events only contain necessary data
2. Check no sensitive Google Calendar data is logged
3. Verify deleted events are properly removed

## Deployment Checklist

- [ ] Google Cloud OAuth credentials created
- [ ] Supabase secrets configured (CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)
- [ ] Edge functions deployed and tested
- [ ] Database migration run successfully
- [ ] Environment variables set correctly
- [ ] Build passes without errors
- [ ] OAuth flow tested end-to-end
- [ ] Event syncing verified
- [ ] UI displays correctly (light & dark mode)
- [ ] Error handling tested
- [ ] Performance acceptable
- [ ] Security validated
- [ ] Documentation updated
- [ ] Team notified of new feature

## Support

For issues or questions:
1. Check edge function logs
2. Review browser console
3. Verify configuration steps
4. Check database for data integrity
5. Contact Supabase support if needed

## Next Steps

1. Test all scenarios above
2. Fix any issues found
3. Deploy to production
4. Monitor for errors
5. Gather user feedback
6. Iterate and improve
