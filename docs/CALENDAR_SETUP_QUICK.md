# Quick Calendar Setup Guide

Since you already have Google OAuth configured for Supabase, you just need to add the calendar scope.

## Step 1: Enable Google Calendar API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (the one with OAuth client ID: `195473160973-841qpfkfg91hwtf9peit52uubg83lf2z`)
3. Go to **"APIs & Services" > "Library"**
4. Search for **"Google Calendar API"**
5. Click **"Enable"**

## Step 2: Add Calendar Scope to OAuth Consent Screen

1. Go to **"APIs & Services" > "OAuth consent screen"**
2. Click **"Edit App"**
3. Go to **"Scopes"** section
4. Click **"Add or Remove Scopes"**
5. Find and check: `https://www.googleapis.com/auth/calendar.readonly`
6. Click **"Update"** then **"Save and Continue"**

## Step 3: Test the Integration

1. **Sign out** from Mirra
2. **Sign in** with Google
3. You should see a consent screen asking for:
   - Basic profile info (already granted)
   - **Calendar access** (new - grant this)
4. After granting, you'll be signed in
5. Go to **Profile** page
6. Calendar should show as **"Connected"** ✅

## Troubleshooting

### "Calendar not connected" after sign-in

**Cause**: You signed in before adding the calendar scope.

**Fix**: 
1. Sign out
2. Sign in again (this will request the new scope)

### "Missing or invalid Authorization header" error

**Cause**: Trying to access old OAuth endpoint that no longer exists.

**Fix**: Don't manually access `/api/calendar/oauth/authorize`. Calendar is connected automatically during sign-in.

### Calendar events not showing

**Cause**: Token not stored or API not enabled.

**Fix**:
1. Verify Google Calendar API is enabled
2. Check browser console for errors
3. Sign out and sign in again to refresh tokens

## How It Works (Technical)

1. **Sign-in request** includes calendar scope:
   ```typescript
   scopes: 'openid profile email https://www.googleapis.com/auth/calendar.readonly'
   ```

2. **After OAuth callback**, Supabase session includes:
   - `provider_token`: Access token for Google APIs
   - `provider_refresh_token`: Refresh token for long-term access

3. **Frontend extracts tokens** from session and stores in database:
   ```typescript
   const providerToken = session.provider_token;
   // Store in user_preferences.google_calendar_token
   ```

4. **Backend uses stored tokens** to fetch calendar events:
   ```python
   # Fetch from user_preferences
   creds = Credentials.from_authorized_user_info(json.loads(creds_json))
   service = build("calendar", "v3", credentials=creds)
   ```

## No Separate OAuth Flow Needed!

Unlike the old implementation, you don't need:
- ❌ Separate "Connect Calendar" button that redirects to OAuth
- ❌ Backend OAuth endpoints (`/oauth/authorize`, `/oauth/callback`)
- ❌ Manual token exchange

Everything happens automatically during sign-in! ✨
