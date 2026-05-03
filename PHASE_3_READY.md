# Phase 3: Calendar & Closet - Ready to Implement

## Current Status

✅ **Phase 1 & 2 Complete**
- Authentication with client-side OAuth (PKCE flow fixed)
- Camera permission and selfie capture
- Appearance analysis with Perfect Corp APIs
- Scan progress and greeting screens
- All builds passing

✅ **OAuth PKCE Issue Resolved**
- Switched from `@supabase/ssr` to `@supabase/supabase-js`
- PKCE code verifier now stored in localStorage
- Automatic session detection configured
- Production deployment ready

## Phase 3 Tasks

### Task 12: Calendar Connection
- [x] 12.1 CalendarPromptScreen component created
- [ ] 12.2 Google Calendar OAuth flow
- [ ] 12.3 Calendar token encryption property test
- [ ] 12.4 Calendar connection error handling

### Task 13: Closet Seeding
- [ ] 13.1 Define 15 demo closet items
- [ ] 13.2 Create POST /api/onboarding/seed-closet endpoint
- [ ] 13.3 Closet seeding correctness property test

### Task 14: Completion Screen
- [ ] 14.1 Create CompletionScreen component
- [ ] 14.2 Create POST /api/onboarding/complete endpoint
- [ ] 14.3 Transition to main interface

### Task 15: Checkpoint

## Next Steps

1. **Test OAuth in Production** (Recommended)
   - Visit https://mirra-ai-ten.vercel.app
   - Click "Continue with Google"
   - Verify OAuth flow completes successfully
   - Check that session persists after page refresh

2. **Implement Calendar OAuth** (Task 12.2)
   - Set up Google Calendar API credentials
   - Implement OAuth flow for calendar.readonly scope
   - Store encrypted tokens in user_preferences
   - Fetch today's events to validate connection

3. **Implement Closet Seeding** (Task 13)
   - Create demo_closet.py with 15 curated items
   - Implement seed-closet endpoint
   - Test closet item insertion

4. **Complete Onboarding Flow** (Task 14)
   - Create completion screen with fade animation
   - Mark user as onboarded
   - Transition to main interface

## Environment Variables Needed

### Google Calendar API
```env
# Backend
GOOGLE_CALENDAR_CLIENT_ID=your-client-id
GOOGLE_CALENDAR_CLIENT_SECRET=your-client-secret

# Frontend
NEXT_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID=your-client-id
```

## Testing Checklist

- [ ] OAuth flow works in production
- [ ] Session persists after page refresh
- [ ] Calendar connection flow works
- [ ] Closet seeding creates 15 items
- [ ] Completion screen transitions smoothly
- [ ] User marked as onboarded in database

## Known Issues

None currently. OAuth PKCE issue has been resolved.

## Deployment Status

- **Frontend**: https://mirra-ai-ten.vercel.app (deployed)
- **Backend**: https://mirra-ai-j8erd.ondigitalocean.app (deployed)
- **Database**: Supabase (configured)
- **OAuth**: Google OAuth configured in Supabase

## Ready to Proceed

Phase 3 implementation can begin. All prerequisites are met and the codebase is stable.
