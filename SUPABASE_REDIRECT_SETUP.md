# Supabase Redirect URL Configuration

## Issue
Even with correct backend configuration, OAuth redirects to localhost because Supabase has a whitelist of allowed redirect URLs.

## Solution
Add the production frontend URL to Supabase's allowed redirect URLs.

## Steps

### 1. Go to Supabase Dashboard
Visit: https://supabase.com/dashboard/project/cemeenqljfaujlbgerys

### 2. Navigate to Authentication Settings
- Click on "Authentication" in the left sidebar
- Click on "URL Configuration"

### 3. Add Redirect URLs
In the "Redirect URLs" section, add:
```
https://mirra-ai-ten.vercel.app/auth/callback
```

**Important**: Make sure to also keep the existing URLs:
- `http://localhost:3000/auth/callback` (for local development)
- Any other URLs you're using

### 4. Save Changes
Click "Save" at the bottom of the page.

## Verification

After adding the redirect URL, test the OAuth flow:

1. Visit `https://mirra-ai-ten.vercel.app`
2. Click "Continue with Google"
3. Complete Google sign-in
4. Should redirect to `https://mirra-ai-ten.vercel.app/?auth_success=true&user_id=...`

## Current Configuration

### Backend Environment Variables (DigitalOcean)
```
FRONTEND_URL=https://mirra-ai-ten.vercel.app
SUPABASE_URL=https://cemeenqljfaujlbgerys.supabase.co
SUPABASE_KEY=<your-service-role-key>
```

### Frontend Environment Variables (Vercel)
```
NEXT_PUBLIC_API_URL=https://mirra-ai-j8erd.ondigitalocean.app
NEXT_PUBLIC_SUPABASE_URL=https://cemeenqljfaujlbgerys.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

## Troubleshooting

### Still redirecting to localhost?
1. **Check Supabase redirect URLs** - Make sure production URL is whitelisted
2. **Clear browser cache** - Hard refresh (Cmd+Shift+R)
3. **Check DigitalOcean env** - Verify FRONTEND_URL is set correctly
4. **Redeploy backend** - After changing env variables

### Getting "redirect_uri_mismatch" error?
This means the redirect URL is not whitelisted in Supabase. Follow steps above to add it.

### OAuth works locally but not in production?
Make sure both URLs are in Supabase redirect URLs:
- `http://localhost:3000/auth/callback` (local)
- `https://mirra-ai-ten.vercel.app/auth/callback` (production)
