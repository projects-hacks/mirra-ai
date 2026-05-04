# Google Calendar OAuth Setup

This guide explains how to set up Google Calendar integration for Mirra AI.

## Prerequisites

- Google Cloud Console account
- Access to your Mirra backend environment variables

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Calendar API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

## Step 2: Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type (or "Internal" if using Google Workspace)
3. Fill in the required fields:
   - **App name**: Mirra AI
   - **User support email**: Your email
   - **Developer contact**: Your email
4. Add scopes:
   - Click "Add or Remove Scopes"
   - Add: `https://www.googleapis.com/auth/calendar.readonly`
5. Add test users (for development):
   - Add your email and any test user emails
6. Save and continue

## Step 3: Create OAuth Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Choose "Web application"
4. Configure:
   - **Name**: Mirra Backend
   - **Authorized JavaScript origins**: 
     - `http://localhost:8000` (development)
     - Your production backend URL
   - **Authorized redirect URIs**:
     - `http://localhost:8000/api/calendar/oauth/callback` (development)
     - `https://your-backend.com/api/calendar/oauth/callback` (production)
5. Click "Create"
6. **Save the Client ID and Client Secret** - you'll need these!

## Step 4: Configure Environment Variables

Add these to your backend `.env` file:

```bash
# Google Calendar OAuth
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
```

## Step 5: Test the Integration

1. Start your backend server:
   ```bash
   cd backend
   uvicorn app.main:app --reload
   ```

2. Start your frontend:
   ```bash
   cd frontend
   npm run dev
   ```

3. Navigate to Profile page and click "Connect" under Google Calendar
4. You should be redirected to Google's OAuth consent screen
5. Grant calendar read permissions
6. You'll be redirected back to your profile with a success message

## User Flow

1. **User clicks "Connect"** → Redirected to Google OAuth
2. **User grants permissions** → Google redirects to backend callback
3. **Backend receives tokens** → Stores in database
4. **User redirected to profile** → Shows "Connected" status

## Security Notes

- OAuth tokens are stored encrypted in the database
- Only `calendar.readonly` scope is requested (read-only access)
- Tokens are user-specific and isolated
- Refresh tokens allow long-term access without re-authentication

## Troubleshooting

### "OAuth not configured" error
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in `.env`
- Restart the backend server after adding environment variables

### "Redirect URI mismatch" error
- Ensure the redirect URI in Google Cloud Console exactly matches your backend URL
- Check for trailing slashes and http vs https

### "Access denied" error
- Verify the user's email is added as a test user in OAuth consent screen
- Check that Google Calendar API is enabled for your project

### Calendar events not showing
- Verify the user has events in their Google Calendar
- Check Redis cache (events are cached for 5 minutes)
- Look at backend logs for API errors

## Production Deployment

For production:

1. Update OAuth consent screen to "Published" status
2. Add production redirect URI to Google Cloud Console
3. Update `CORS_ORIGIN` in backend config to match your frontend URL
4. Use HTTPS for all URLs
5. Consider implementing token refresh logic for long-lived sessions

## API Endpoints

- `GET /api/calendar/oauth/authorize?user_id={user_id}` - Initiate OAuth flow
- `GET /api/calendar/oauth/callback` - OAuth callback handler
- `POST /api/calendar/disconnect` - Disconnect calendar
- `GET /api/context/calendar` - Get today's events (requires authentication)
