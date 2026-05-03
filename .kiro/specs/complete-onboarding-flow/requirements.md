# Requirements Document: Complete Onboarding Flow

## Introduction

The Complete Onboarding Flow transforms first-time users from app launch to fully configured Mirra users in under 60 seconds. This flow establishes the user's appearance profile through facial analysis, connects external context sources (Google Calendar), and pre-seeds their closet with demo items to enable immediate styling recommendations. The onboarding experience introduces users to Mirra's core value proposition: an AI appearance operator that sees your face, understands your day, and builds the right look.

## Glossary

- **Mirra_System**: The complete Mirra application including frontend, backend, and AI agent
- **Onboarding_Flow**: The first-time user experience from app launch to completion
- **Initial_Scan**: The parallel execution of three Perfect Corp APIs (Skin Analysis, Skin Tone Detection, Face Shape Analysis)
- **Body_Model**: The user's appearance profile stored in the body_model table (skin scores, tone, face shape, color palette)
- **Supabase_Auth**: The authentication system provided by Supabase for Google OAuth
- **Perfect_Corp_API**: The suite of 12+ appearance analysis and virtual try-on APIs
- **Calendar_Connection**: The Google Calendar OAuth flow for accessing user events
- **Closet_Seed**: The pre-population of 15 demo items in the closet_items table
- **Scan_Progress_UI**: The visual interface showing analysis progress during the Initial_Scan
- **Context_Data**: The complete set of user data including Body_Model, calendar token, and closet items
- **Main_Interface**: The primary Mirra conversation interface accessed after onboarding completion
- **Session_Token**: The authentication token stored after successful Google OAuth
- **Camera_Permission**: The browser permission required to access the device camera
- **Glassmorphic_Card**: The translucent UI card displayed over the camera feed during onboarding
- **Profiles_Table**: The Supabase table storing user profile information
- **Skin_Scans_Table**: The Supabase table storing time-series skin analysis data
- **User_Preferences_Table**: The Supabase table storing user preferences and settings

## Requirements

### Requirement 1: Google OAuth Authentication

**User Story:** As a first-time user, I want to authenticate with my Google account, so that I can securely access Mirra and connect my calendar.

#### Acceptance Criteria

1. WHEN the user opens Mirra for the first time, THE Mirra_System SHALL display the Google OAuth login screen
2. WHEN the user completes Google OAuth successfully, THE Supabase_Auth SHALL create a Session_Token
3. WHEN the Session_Token is created, THE Mirra_System SHALL create a new row in the Profiles_Table with the user's email and ID
4. WHEN the Session_Token is created, THE Mirra_System SHALL create a new row in the User_Preferences_Table with default values
5. IF Google OAuth fails or is cancelled, THEN THE Mirra_System SHALL display an error message and allow retry
6. WHEN Google OAuth completes successfully, THE Mirra_System SHALL store the Session_Token in browser local storage
7. THE Mirra_System SHALL validate the Session_Token before proceeding to the next onboarding step

### Requirement 2: Camera Permission Request

**User Story:** As a first-time user, I want to grant camera access, so that Mirra can capture my selfie for appearance analysis.

#### Acceptance Criteria

1. WHEN authentication completes successfully, THE Mirra_System SHALL request Camera_Permission from the browser
2. WHEN the user grants Camera_Permission, THE Mirra_System SHALL initialize the camera feed
3. WHEN the camera feed initializes, THE Mirra_System SHALL display the live camera preview with the Glassmorphic_Card overlay
4. IF the user denies Camera_Permission, THEN THE Mirra_System SHALL display an error message explaining that camera access is required
5. IF the user denies Camera_Permission, THEN THE Mirra_System SHALL provide instructions to enable camera access in browser settings
6. WHEN Camera_Permission is denied, THE Mirra_System SHALL display a retry button to re-request permission
7. THE Mirra_System SHALL validate that the camera feed is active before enabling the scan button

### Requirement 3: Selfie Capture

**User Story:** As a first-time user, I want to capture a selfie, so that Mirra can analyze my appearance profile.

#### Acceptance Criteria

1. WHEN the camera feed is active, THE Mirra_System SHALL display a "Start Initial Scan" button on the Glassmorphic_Card
2. WHEN the user taps the "Start Initial Scan" button, THE Mirra_System SHALL capture a single frame from the camera feed
3. WHEN the selfie is captured, THE Mirra_System SHALL encode the image as a base64 JPEG with quality setting of 85
4. WHEN the selfie is captured, THE Mirra_System SHALL display the captured image as a preview on the Glassmorphic_Card
5. THE captured selfie SHALL have minimum dimensions of 640x480 pixels
6. WHEN the selfie is captured, THE Mirra_System SHALL store the image in Supabase Storage with the path format "selfies/{user_id}/onboarding.jpg"
7. IF the selfie capture fails, THEN THE Mirra_System SHALL display an error message and allow retry

### Requirement 4: Parallel Appearance Analysis

**User Story:** As a first-time user, I want my appearance analyzed quickly, so that I can start using Mirra without long wait times.

#### Acceptance Criteria

1. WHEN the selfie is captured, THE Mirra_System SHALL initiate three Perfect_Corp_API calls in parallel: Skin Analysis, Skin Tone Detection, and Face Shape Analysis
2. WHEN the parallel API calls are initiated, THE Mirra_System SHALL display the Scan_Progress_UI showing "Calibrating Mirra to your unique attributes"
3. WHILE the API calls are executing, THE Scan_Progress_UI SHALL display individual progress indicators for each analysis type
4. WHEN Skin Analysis completes, THE Mirra_System SHALL store the scores in the Body_Model skin_scores field as JSONB
5. WHEN Skin Tone Detection completes, THE Mirra_System SHALL store the undertone, depth, and hex values in the Body_Model skin_tone field as JSONB
6. WHEN Face Shape Analysis completes, THE Mirra_System SHALL store the shape, symmetry score, and proportions in the Body_Model face_shape field as JSONB
7. WHEN all three API calls complete, THE Mirra_System SHALL create a new row in the Skin_Scans_Table with the initial scan data
8. THE total wall time for all three parallel API calls SHALL NOT exceed 15 seconds
9. IF any API call fails, THEN THE Mirra_System SHALL retry that specific call up to 2 additional times
10. IF any API call fails after 3 attempts, THEN THE Mirra_System SHALL use mock data for that analysis and log the failure

### Requirement 5: Agent Greeting

**User Story:** As a first-time user, I want to receive a personalized greeting based on my skin analysis, so that I understand Mirra's capabilities.

#### Acceptance Criteria

1. WHEN all appearance analysis APIs complete successfully, THE Mirra_System SHALL generate a personalized greeting message using the skin scores
2. THE greeting message SHALL include the overall skin score as an integer between 0 and 100
3. THE greeting message SHALL mention the most significant skin concern if any score is below 70
4. WHEN the greeting message is generated, THE Mirra_System SHALL display it in the conversation interface
5. WHEN the greeting message is generated, THE Mirra_System SHALL play the message using text-to-speech with the aura-2-thalia-en voice
6. THE greeting message SHALL complete within 2 seconds of the final API call completion

### Requirement 6: Calendar Connection Prompt

**User Story:** As a first-time user, I want to connect my Google Calendar, so that Mirra can provide context-aware styling recommendations.

#### Acceptance Criteria

1. WHEN the agent greeting completes, THE Mirra_System SHALL display a prompt asking "Want to connect your calendar so I know what's coming up?"
2. WHEN the calendar prompt is displayed, THE Mirra_System SHALL show two buttons: "Connect Calendar" and "Skip for Now"
3. WHEN the user taps "Connect Calendar", THE Mirra_System SHALL initiate the Google Calendar OAuth flow
4. WHEN Google Calendar OAuth completes successfully, THE Mirra_System SHALL store the access token and refresh token in the User_Preferences_Table google_calendar_token field as encrypted JSONB
5. WHEN the calendar token is stored, THE Mirra_System SHALL set the calendar_connected field to true in the User_Preferences_Table
6. WHEN the user taps "Skip for Now", THE Mirra_System SHALL proceed to the next onboarding step without connecting the calendar
7. IF Google Calendar OAuth fails, THEN THE Mirra_System SHALL display an error message and allow retry or skip
8. WHEN Google Calendar OAuth completes successfully, THE Mirra_System SHALL fetch today's events to validate the connection

### Requirement 7: Closet Pre-Seeding

**User Story:** As a first-time user, I want my closet pre-populated with demo items, so that I can immediately experience Mirra's styling recommendations.

#### Acceptance Criteria

1. WHEN the calendar connection step completes (either connected or skipped), THE Mirra_System SHALL insert 15 demo items into the closet_items table
2. THE 15 demo items SHALL include at least 2 items from each category: jacket, dress, top, bottom, shoes
3. EACH demo item SHALL have the following fields populated: name, category, subcategory, color, color_hex, brand, price, image_url, occasions, seasons, formality
4. THE demo items SHALL include a navy blazer with formality score of 0.8 and occasions including "business"
5. THE demo items SHALL include at least 3 items suitable for casual occasions with formality scores below 0.4
6. WHEN the closet items are inserted, THE Mirra_System SHALL set the user_id field to the authenticated user's ID
7. THE closet seeding operation SHALL complete within 1 second
8. IF the closet seeding fails, THEN THE Mirra_System SHALL retry once and log the failure if the retry fails

### Requirement 8: Onboarding Completion

**User Story:** As a first-time user, I want to know when onboarding is complete, so that I can start using Mirra's main features.

#### Acceptance Criteria

1. WHEN the closet seeding completes successfully, THE Mirra_System SHALL display a completion message: "Got it. Let's build your first look."
2. WHEN the completion message is displayed, THE Mirra_System SHALL set the onboarded field to true in the Profiles_Table
3. WHEN the onboarded field is set to true, THE Mirra_System SHALL transition to the Main_Interface
4. THE transition to the Main_Interface SHALL include a fade animation lasting 300 milliseconds
5. WHEN the Main_Interface loads, THE Mirra_System SHALL display the camera feed with the conversation panel
6. THE total onboarding time from app launch to Main_Interface SHALL NOT exceed 60 seconds for the happy path

### Requirement 9: Progressive Loading States

**User Story:** As a first-time user, I want to see progress indicators during long operations, so that I know the app is working and not frozen.

#### Acceptance Criteria

1. WHILE the Initial_Scan is executing, THE Scan_Progress_UI SHALL display a radial progress indicator
2. THE radial progress indicator SHALL update every 500 milliseconds to show estimated completion percentage
3. WHILE the Initial_Scan is executing, THE Scan_Progress_UI SHALL display the text "Analyzing skin tone" when Skin Tone Detection is running
4. WHILE the Initial_Scan is executing, THE Scan_Progress_UI SHALL display the text "Analyzing skin texture" when Skin Analysis is running
5. WHILE the Initial_Scan is executing, THE Scan_Progress_UI SHALL display the text "Analyzing face shape" when Face Shape Analysis is running
6. WHEN any analysis completes, THE Scan_Progress_UI SHALL display a checkmark icon next to that analysis type
7. WHILE the closet is being seeded, THE Mirra_System SHALL display a loading message "Setting up your closet"
8. THE Scan_Progress_UI SHALL display the footer text "Your data is processed securely" with a lock icon

### Requirement 10: Error Recovery

**User Story:** As a first-time user, I want clear error messages and recovery options when something goes wrong, so that I can complete onboarding successfully.

#### Acceptance Criteria

1. IF any Perfect_Corp_API call fails after all retries, THEN THE Mirra_System SHALL display an error message: "We couldn't complete the analysis. Please try again."
2. WHEN an error message is displayed, THE Mirra_System SHALL provide a "Retry" button to restart the failed step
3. IF Supabase_Auth fails, THEN THE Mirra_System SHALL display an error message: "Authentication failed. Please check your connection and try again."
4. IF the camera feed fails to initialize, THEN THE Mirra_System SHALL display an error message: "Camera access failed. Please check your browser settings."
5. IF the closet seeding fails after retry, THEN THE Mirra_System SHALL proceed to the Main_Interface with an empty closet and log the failure
6. WHEN any error occurs, THE Mirra_System SHALL log the error details to the backend for debugging
7. IF the user closes the app during onboarding, THEN THE Mirra_System SHALL resume from the last completed step when the user returns

### Requirement 11: Data Privacy and Security

**User Story:** As a first-time user, I want my personal data handled securely, so that I can trust Mirra with my appearance information.

#### Acceptance Criteria

1. WHEN the selfie is stored in Supabase Storage, THE Mirra_System SHALL encrypt the image at rest
2. WHEN the Google Calendar token is stored, THE Mirra_System SHALL encrypt the token in the User_Preferences_Table
3. THE Mirra_System SHALL NOT store voice transcripts from the onboarding conversation
4. WHEN the Body_Model is created, THE Mirra_System SHALL apply Row Level Security policies to restrict access to the authenticated user only
5. WHEN the Skin_Scans_Table row is created, THE Mirra_System SHALL apply Row Level Security policies to restrict access to the authenticated user only
6. THE Mirra_System SHALL transmit all API calls over HTTPS with TLS 1.2 or higher
7. WHEN the user completes onboarding, THE Mirra_System SHALL display a privacy notice explaining data usage

### Requirement 12: Onboarding State Persistence

**User Story:** As a first-time user, I want my onboarding progress saved, so that I don't have to restart if I close the app.

#### Acceptance Criteria

1. WHEN the user completes authentication, THE Mirra_System SHALL store an onboarding_step field in browser local storage with value "authenticated"
2. WHEN the selfie is captured, THE Mirra_System SHALL update the onboarding_step field to "selfie_captured"
3. WHEN the Initial_Scan completes, THE Mirra_System SHALL update the onboarding_step field to "scan_complete"
4. WHEN the calendar connection step completes, THE Mirra_System SHALL update the onboarding_step field to "calendar_complete"
5. WHEN the user reopens the app during onboarding, THE Mirra_System SHALL read the onboarding_step field and resume from that step
6. WHEN onboarding completes successfully, THE Mirra_System SHALL remove the onboarding_step field from local storage
7. THE onboarding_step field SHALL be cleared if the user explicitly logs out

### Requirement 13: Responsive Design

**User Story:** As a first-time user on a mobile device, I want the onboarding interface to work well on my screen size, so that I can complete onboarding comfortably.

#### Acceptance Criteria

1. THE Glassmorphic_Card SHALL have a maximum width of 400 pixels on screens wider than 768 pixels
2. THE Glassmorphic_Card SHALL have a width of 90% of the viewport on screens narrower than 768 pixels
3. THE camera feed SHALL maintain a 3:4 aspect ratio on all screen sizes
4. THE "Start Initial Scan" button SHALL have a minimum touch target size of 44x44 pixels
5. THE Scan_Progress_UI text SHALL have a minimum font size of 16 pixels for readability
6. THE onboarding interface SHALL support both portrait and landscape orientations
7. WHEN the device orientation changes, THE Mirra_System SHALL adjust the layout without losing onboarding progress

### Requirement 14: Performance Optimization

**User Story:** As a first-time user, I want the onboarding experience to be fast and responsive, so that I can start using Mirra quickly.

#### Acceptance Criteria

1. THE Mirra_System SHALL preload the Glassmorphic_Card assets during app initialization
2. THE Mirra_System SHALL compress the captured selfie to reduce upload time while maintaining quality above 85
3. WHEN the parallel API calls are initiated, THE Mirra_System SHALL use HTTP/2 multiplexing to reduce latency
4. THE Mirra_System SHALL cache the demo closet items in the backend to reduce database query time
5. THE Mirra_System SHALL lazy-load the Main_Interface components while onboarding is in progress
6. THE Scan_Progress_UI animations SHALL run at 60 frames per second without dropping frames
7. THE total JavaScript bundle size for the onboarding flow SHALL NOT exceed 200 kilobytes gzipped

### Requirement 15: Accessibility

**User Story:** As a first-time user with accessibility needs, I want the onboarding interface to be usable with assistive technologies, so that I can complete onboarding independently.

#### Acceptance Criteria

1. THE "Start Initial Scan" button SHALL have an aria-label attribute with value "Start initial appearance scan"
2. THE Scan_Progress_UI SHALL announce progress updates to screen readers using aria-live regions
3. THE error messages SHALL have role="alert" to ensure immediate announcement to screen readers
4. THE Glassmorphic_Card SHALL have sufficient color contrast (minimum 4.5:1) between text and background
5. THE onboarding interface SHALL be fully navigable using keyboard only (Tab, Enter, Escape keys)
6. THE camera permission prompt SHALL have clear focus indicators when navigated via keyboard
7. THE Mirra_System SHALL support text scaling up to 200% without breaking the layout

### Requirement 16: Profile Management

**User Story:** As a user, I want to view and edit my profile information, so that I can keep my appearance data and preferences up to date.

#### Acceptance Criteria

1. WHEN the user navigates to the profile page, THE Mirra_System SHALL display the user's email, display name, and profile photo from Google OAuth
2. WHEN the profile page loads, THE Mirra_System SHALL display the user's latest Body_Model data including skin scores, undertone, and face shape
3. WHEN the profile page loads, THE Mirra_System SHALL display the user's skin trend chart showing the last 30 days of skin scans
4. WHEN the user taps "Edit Profile", THE Mirra_System SHALL allow editing of display name, preferred currency, and budget range
5. WHEN the user saves profile changes, THE Mirra_System SHALL update the Profiles_Table and User_Preferences_Table
6. WHEN the profile page loads, THE Mirra_System SHALL display the calendar connection status with options to connect or disconnect
7. WHEN the user disconnects the calendar, THE Mirra_System SHALL revoke the Google Calendar OAuth token and clear the google_calendar_token field
8. WHEN the profile page loads, THE Mirra_System SHALL display closet statistics: total items, most worn category, cost-per-wear average
9. WHEN the user taps "View Closet", THE Mirra_System SHALL navigate to the closet management page
10. WHEN the user taps "Skin History", THE Mirra_System SHALL navigate to the skin intelligence history page
11. THE profile page SHALL display a "Log Out" button in the top-right corner
12. THE profile page SHALL be accessible via the bottom navigation bar with a "person" icon
13. WHEN the profile page loads, THE Mirra_System SHALL display a Skin Status Dashboard with overall skin score and trend indicator (↑ improving, ↓ declining, → stable)
14. THE Skin Status Dashboard SHALL display individual metrics with visual progress bars or radial charts for: moisture, acne, wrinkles, pores, dark_circles
15. EACH skin metric SHALL be color-coded: green (score ≥80), yellow (score 60-79), red (score <60)
16. WHEN the profile page loads, THE Mirra_System SHALL display a line chart showing skin score trends over selectable time periods: 7 days, 30 days, 60 days, 90 days
17. THE skin trend chart SHALL allow users to tap on specific data points to view detailed scan information from that date
18. WHEN the user taps a data point on the trend chart, THE Mirra_System SHALL display a modal with the selfie from that scan and detailed metrics
19. THE profile page SHALL display a "Compare Scans" feature allowing users to select two scan dates for before/after comparison
20. WHEN comparing scans, THE Mirra_System SHALL display side-by-side selfies and metric comparisons with percentage changes
21. THE profile page SHALL display Perfect Corp analysis details including: skin tone (undertone, depth, hex color, color season), face shape (shape name, symmetry score, proportions)
22. THE Mirra_System SHALL provide an "Export Report" button that generates a downloadable PDF with skin analysis history and trends
23. THE profile page SHALL display a "Product Tracking" section where users can log skincare products they are using
24. WHEN the user adds a product, THE Mirra_System SHALL store: product name, brand, category (cleanser, moisturizer, serum, etc.), start date, and optional notes
25. THE Product Tracking section SHALL display active products with duration of use (e.g., "Using for 14 days")
26. THE Mirra_System SHALL correlate product usage with skin improvements by displaying annotations on the skin trend chart when products were started or changed
27. WHEN a product has been used for at least 14 days, THE Mirra_System SHALL calculate and display the skin score change since product start date
28. THE profile page SHALL display product recommendations based on current skin concerns (e.g., "Your acne score is 65. Consider products with salicylic acid.")
29. THE Mirra_System SHALL allow users to mark products as "stopped using" with an end date, maintaining historical product tracking
30. THE profile page SHALL display a "Skin Insights" section with AI-generated observations about skin trends (e.g., "Your moisture levels improved 15% in the last 2 weeks")
31. THE Skin Insights section SHALL highlight correlations between product usage and skin improvements (e.g., "Acne score improved 20% since starting Product X")
32. THE profile page SHALL display the date and time of the most recent skin scan with a "Scan Again" button to capture a new analysis

### Requirement 17: Authentication State Management

**User Story:** As a user, I want my login state to persist across sessions and sync properly, so that I don't have to re-authenticate unnecessarily.

#### Acceptance Criteria

1. WHEN the user completes Google OAuth, THE Mirra_System SHALL store the Session_Token in Supabase Auth with a 7-day expiration
2. WHEN the user opens the app with a valid Session_Token, THE Mirra_System SHALL skip the login screen and load the Main_Interface
3. WHEN the Session_Token expires, THE Mirra_System SHALL attempt to refresh the token using the refresh token
4. IF the token refresh succeeds, THEN THE Mirra_System SHALL update the Session_Token and continue the session
5. IF the token refresh fails, THEN THE Mirra_System SHALL redirect the user to the login screen
6. WHEN the user taps "Log Out", THE Mirra_System SHALL revoke the Session_Token in Supabase Auth
7. WHEN the user logs out, THE Mirra_System SHALL clear all local storage data including onboarding_step and cached user data
8. WHEN the user logs out, THE Mirra_System SHALL disconnect any active WebSocket connections
9. WHEN the user logs out, THE Mirra_System SHALL redirect to the login screen with a confirmation message "You've been logged out"
10. THE Mirra_System SHALL validate the Session_Token on every API request to the backend
11. IF the Session_Token is invalid, THEN THE backend SHALL return a 401 Unauthorized response
12. WHEN the frontend receives a 401 response, THE Mirra_System SHALL redirect the user to the login screen
13. THE Mirra_System SHALL implement token refresh logic that runs 5 minutes before token expiration
14. WHEN multiple tabs are open, THE Mirra_System SHALL sync authentication state across tabs using the BroadcastChannel API

### Requirement 18: Context Persistence on Refresh

**User Story:** As a user, I want my conversation context and UI state to persist when I refresh the page, so that I don't lose my progress.

#### Acceptance Criteria

1. WHEN the user refreshes the page, THE Mirra_System SHALL restore the conversation history from the messages array in AppState
2. WHEN the user refreshes the page, THE Mirra_System SHALL restore the last captured selfie from Supabase Storage
3. WHEN the user refreshes the page, THE Mirra_System SHALL restore the Body_Model data from the body_model table
4. WHEN the user refreshes the page, THE Mirra_System SHALL restore the closet items from the closet_items table
5. WHEN the user refreshes the page, THE Mirra_System SHALL restore the VTO result if one was displayed before refresh
6. WHEN the user refreshes the page, THE Mirra_System SHALL restore the feature menu visibility state from local storage
7. WHEN the user refreshes the page, THE Mirra_System SHALL NOT restore the WebSocket connection automatically
8. WHEN the user taps the voice orb after refresh, THE Mirra_System SHALL reconnect the WebSocket with the restored selfie
9. THE Mirra_System SHALL store the conversation history in local storage with a maximum of 50 messages
10. WHEN the conversation history exceeds 50 messages, THE Mirra_System SHALL remove the oldest messages from local storage
11. THE Mirra_System SHALL implement a hydration strategy that loads critical data (Body_Model, selfie) before rendering the Main_Interface
12. THE hydration process SHALL complete within 500 milliseconds on a 4G connection
13. IF the hydration fails, THEN THE Mirra_System SHALL display a "Restore Session" button to retry
14. WHEN the user explicitly clears browser data, THE Mirra_System SHALL handle the missing context gracefully by prompting for a new selfie

### Requirement 19: Scalability Architecture

**User Story:** As a system administrator, I want the application to scale efficiently under load, so that it can support thousands of concurrent users.

#### Acceptance Criteria

1. THE backend SHALL implement connection pooling for Supabase Postgres with a minimum pool size of 10 and maximum of 100
2. THE backend SHALL implement Redis caching for Body_Model data with a TTL of 1 hour
3. THE backend SHALL implement Redis caching for closet items with a TTL of 1 hour
4. WHEN a user's Body_Model is updated, THE Mirra_System SHALL invalidate the Redis cache for that user
5. THE backend SHALL implement rate limiting of 100 requests per minute per user for API endpoints
6. THE backend SHALL implement rate limiting of 10 requests per minute per user for Perfect Corp API calls
7. IF a user exceeds the rate limit, THEN THE backend SHALL return a 429 Too Many Requests response with a Retry-After header
8. THE backend SHALL implement horizontal scaling with a minimum of 2 replicas and maximum of 10 replicas
9. THE Kubernetes deployment SHALL use CPU-based autoscaling with a target of 70% CPU utilization
10. THE backend SHALL implement health check endpoints at /health and /ready for Kubernetes liveness and readiness probes
11. THE backend SHALL implement graceful shutdown that waits up to 30 seconds for active requests to complete
12. THE Supabase Storage SHALL use CDN caching for selfie images with a TTL of 24 hours
13. THE frontend SHALL implement code splitting to reduce initial bundle size below 200KB gzipped
14. THE frontend SHALL lazy-load the profile page, closet page, and skin history page components
15. THE Mirra_System SHALL implement database indexing on user_id, created_at, and category fields for fast queries

### Requirement 20: Latency Optimization

**User Story:** As a user, I want the application to respond quickly to my actions, so that I have a smooth and responsive experience.

#### Acceptance Criteria

1. THE Main_Interface SHALL load within 2 seconds on a 4G connection (LCP < 2s)
2. THE voice orb SHALL respond to tap within 100 milliseconds (FID < 100ms)
3. THE conversation messages SHALL render within 50 milliseconds of receiving data (CLS < 0.1)
4. THE backend API endpoints SHALL respond within 200 milliseconds for non-VTO requests (p95 latency)
5. THE Perfect Corp VTO API calls SHALL complete within 15 seconds (p95 latency)
6. THE Mirra_System SHALL implement optimistic UI updates for user actions (e.g., sending messages, tapping buttons)
7. WHEN the user sends a voice message, THE Mirra_System SHALL display the message immediately before receiving STT confirmation
8. WHEN the user taps a feature button, THE Mirra_System SHALL show a loading state immediately before the API call completes
9. THE backend SHALL implement request coalescing to batch multiple API calls for the same user within 100ms
10. THE backend SHALL implement parallel execution for independent API calls (e.g., calendar + weather)
11. THE Mirra_System SHALL preload the next likely API call based on conversation context (e.g., preload VTO when user mentions trying on clothes)
12. THE Mirra_System SHALL implement service worker caching for static assets with a cache-first strategy
13. THE Mirra_System SHALL implement prefetching for critical resources (fonts, icons) during app initialization
14. THE WebSocket connection SHALL use binary frames for audio data to reduce overhead
15. THE backend SHALL implement connection keep-alive with 30-second ping intervals to prevent connection drops

### Requirement 21: Reliability and Error Handling

**User Story:** As a user, I want the application to handle errors gracefully and recover automatically, so that I can continue using Mirra without interruptions.

#### Acceptance Criteria

1. WHEN the WebSocket connection drops, THE Mirra_System SHALL attempt to reconnect with exponential backoff (1s, 2s, 4s, 8s, 16s)
2. THE Mirra_System SHALL limit WebSocket reconnection attempts to 5 before displaying an error message
3. WHEN a Perfect Corp API call times out after 30 seconds, THE Mirra_System SHALL retry the call once
4. IF the retry fails, THEN THE Mirra_System SHALL return a mock result and log the failure to the backend
5. WHEN the Supabase connection fails, THE Mirra_System SHALL retry the query with exponential backoff up to 3 times
6. IF all Supabase retries fail, THEN THE Mirra_System SHALL display an error message "We're having trouble connecting. Please check your internet."
7. WHEN the Google Calendar API returns a 401 Unauthorized, THE Mirra_System SHALL attempt to refresh the OAuth token
8. IF the token refresh fails, THEN THE Mirra_System SHALL prompt the user to reconnect their calendar
9. THE backend SHALL implement circuit breaker pattern for Perfect Corp API calls with a failure threshold of 50% over 10 requests
10. WHEN the circuit breaker opens, THE Mirra_System SHALL return mock results for 60 seconds before attempting real API calls again
11. THE backend SHALL implement request timeout of 30 seconds for all external API calls
12. THE backend SHALL log all errors to a centralized logging service (e.g., Sentry) with user context and stack traces
13. THE Mirra_System SHALL implement error boundaries in React to catch and display component errors without crashing the app
14. WHEN an error boundary catches an error, THE Mirra_System SHALL display a "Something went wrong" message with a "Reload" button
15. THE backend SHALL implement database transaction rollback for multi-step operations (e.g., onboarding) to maintain data consistency
16. THE Mirra_System SHALL implement offline detection and display a banner "You're offline" when the network is unavailable
17. WHEN the network reconnects, THE Mirra_System SHALL automatically retry failed requests and sync pending changes
