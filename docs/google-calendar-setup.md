# Google Calendar OAuth Setup

This guide explains how to add Google Calendar integration to your existing Supabase OAuth setup.

## Prerequisites

- You already have Google OAuth configured for Supabase authentication
- Your OAuth client ID: `195473160973-841qpfkfg91hwtf9peit52uubg83lf2z.apps.googleusercontent.com`

## Step 1: Add Calendar API Scope

Since you're already using Google OAuth for authentication, you just need to add the Calendar API scope:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your existing project
3. Enable the **Google Calendar API** (if not already enabled):
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

4. Update OAuth consent screen scopes:
   - Go to "APIs & Services" > "OAuth consent screen"
   - Click "Edit App"
   - In the "Scopes" section, add:
     - `https://www.googleapis.com/auth/calendar.readonly`
   - Save changes

## Step 2: Update Supabase OAuth Configuration

You need to request the calendar scope when users sign in with Google:

### Option A: Request Calendar Scope During Sign-In (Recommended)

Update your Supabase sign-in call to request calendar access:

```typescript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    scopes: 'https://www.googleapis.com/auth/calendar.readonly',
    queryParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  },
})
```

### Option B: Separate Calendar Connection Flow

Keep authentication separate and add calendar connection as an optional feature in the profile page (current implementation).

## Step 3: Configure Backend

The backend is already configured to use your OAuth client. No additional setup needed since Supabase handles the OAuth flow.

## Step 4: Store Calendar Tokens

When a user connects their calendar, we need to store the OAuth tokens. This is handled automatically by the backend when the user clicks "Connect" in their profile.

The tokens are stored in the `user_preferences` table under `google_calendar_token`.

## Implementation Approach

We have two options:

### Option 1: Request Calendar Access During Sign-In
**Pros:**
- Single OAuth flow
- User grants all permissions at once
- Simpler UX

**Cons:**
- Users must grant calendar access to use the app
- Can't make calendar optional

### Option 2: Separate Calendar Connection (Current Implementation)
**Pros:**
- Calendar is optional
- Users can connect/disconnect anytime
- Better privacy - only request when needed

**Cons:**
- Requires separate OAuth flow
- More complex implementation

## Current Implementation (Option 2)

The current implementation uses a separate OAuth flow for calendar:

1. User signs in with Supabase (gets basic profile access)
2. Later, user can optionally connect calendar from profile page
3. Separate OAuth flow requests only calendar.readonly scope
4. Tokens stored per-user in database

## Recommended: Switch to Option 1

For better UX, I recommend requesting calendar access during sign-in:

1. Update `AuthScreen.tsx` to request calendar scope
2. After sign-in, extract calendar tokens from Supabase session
3. Store tokens in `user_preferences` table
4. Remove separate OAuth flow

Would you like me to implement Option 1 (request calendar during sign-in)?

## Environment Variables

No additional environment variables needed! Your existing Supabase configuration handles OAuth:

```bash
# Already configured in Supabase
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-key
```

## Testing

1. Sign out and sign in again with Google
2. Grant calendar permissions when prompted
3. Navigate to profile page
4. Calendar should show as "Connected"

## Troubleshooting

### Calendar not connecting
- Verify Google Calendar API is enabled in Google Cloud Console
- Check that calendar scope is added to OAuth consent screen
- Ensure user granted calendar permissions during sign-in

### "Calendar not configured" error
- User needs to sign out and sign in again to grant calendar permissions
- Or use the separate "Connect" button in profile page

