# Design Document: Complete Onboarding Flow

## Overview

The Complete Onboarding Flow transforms the current broken user experience into a comprehensive, production-ready onboarding system that takes users from first app launch to fully configured Mirra users in under 60 seconds. This design addresses 21 requirements spanning authentication, appearance analysis, context gathering, state management, and scalability.

### Design Goals

1. **Speed**: Complete onboarding in <60 seconds (happy path)
2. **Reliability**: Graceful error handling with automatic retry and fallback strategies
3. **Scalability**: Support 100-10K concurrent users with horizontal scaling
4. **Performance**: LCP <2s, FID <100ms, optimistic UI updates
5. **Security**: Encrypted data at rest, RLS policies, HTTPS-only communication
6. **Persistence**: Resume onboarding from any step, restore context on refresh
7. **Accessibility**: WCAG 2.1 AA compliance, keyboard navigation, screen reader support

### Key Technical Decisions

- **Authentication**: Supabase Auth with Google OAuth (existing infrastructure)
- **State Management**: React Context + useReducer with localStorage persistence
- **API Strategy**: Parallel execution for independent calls, request coalescing for dependent calls
- **Caching**: Redis for body model, closet items, and VTO results (1-hour TTL)
- **Error Recovery**: Exponential backoff, circuit breaker pattern, mock fallbacks
- **Scalability**: Connection pooling (10-100), horizontal autoscaling (2-10 replicas), CDN caching

## Architecture

### System Components


```mermaid
graph TB
    subgraph "Frontend (Next.js 15 + React 19)"
        A[OnboardingFlow Component]
        B[AuthScreen]
        C[CameraPermissionScreen]
        D[SelfieCapture Screen]
        E[ScanProgressScreen]
        F[CalendarPromptScreen]
        G[CompletionScreen]
        H[OnboardingContext]
        I[useOnboarding Hook]
    end
    
    subgraph "Backend (FastAPI)"
        J[/api/onboarding/init]
        K[/api/onboarding/analyze]
        L[/api/onboarding/seed-closet]
        M[/api/onboarding/complete]
        N[OnboardingService]
    end
    
    subgraph "External Services"
        O[Supabase Auth]
        P[Perfect Corp APIs]
        Q[Google Calendar OAuth]
        R[Supabase Storage]
    end
    
    subgraph "Data Layer"
        S[(Supabase Postgres)]
        T[(Redis Cache)]
    end
    
    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
    F --> G
    
    H --> I
    I --> J
    I --> K
    I --> L
    I --> M
    
    B --> O
    J --> O
    K --> P
    K --> R
    F --> Q
    L --> S
    M --> S
    
    N --> T
    N --> S
```

### Component Hierarchy


**Frontend Components:**

```
OnboardingFlow (Container)
├── OnboardingContext (State Management)
├── AuthScreen
│   └── GoogleOAuthButton
├── CameraPermissionScreen
│   ├── PermissionPrompt
│   └── PermissionInstructions
├── SelfieCapture Screen
│   ├── CameraPreview
│   ├── GlassmorphicCard
│   └── ScanButton
├── ScanProgressScreen
│   ├── RadialProgress
│   ├── AnalysisSteps
│   └── SecurityFooter
├── CalendarPromptScreen
│   ├── PromptMessage
│   ├── ConnectButton
│   └── SkipButton
└── CompletionScreen
    └── TransitionAnimation
```

**Backend Services:**

```
OnboardingService
├── AuthenticationHandler
├── AppearanceAnalyzer (Parallel Execution)
│   ├── SkinAnalysisTask
│   ├── SkinToneTask
│   └── FaceShapeTask
├── ClosetSeeder
└── StateManager
```

### Data Flow


```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant SA as Supabase Auth
    participant PC as Perfect Corp
    participant GC as Google Calendar
    participant DB as Supabase DB
    participant R as Redis
    
    U->>F: Open Mirra
    F->>SA: Check session
    alt No session
        F->>U: Show Google OAuth
        U->>SA: Authenticate
        SA->>F: Session token
        F->>DB: Create profile + preferences
    end
    
    F->>U: Request camera permission
    U->>F: Grant permission
    F->>F: Initialize camera feed
    
    U->>F: Tap "Start Initial Scan"
    F->>F: Capture selfie (base64)
    F->>B: POST /api/onboarding/analyze
    
    par Parallel Analysis
        B->>PC: Skin Analysis
        PC-->>B: Scores
        B->>PC: Skin Tone Detection
        PC-->>B: Undertone + hex
        B->>PC: Face Shape Analysis
        PC-->>B: Shape + symmetry
    end
    
    B->>DB: Insert body_model
    B->>DB: Insert skin_scans
    B->>R: Cache body_model (1h TTL)
    B-->>F: Analysis complete
    
    F->>U: Show personalized greeting
    F->>U: Prompt calendar connection
    
    alt Connect Calendar
        U->>GC: OAuth flow
        GC-->>F: Access token
        F->>DB: Store encrypted token
    else Skip
        F->>F: Continue
    end
    
    F->>B: POST /api/onboarding/seed-closet
    B->>DB: Insert 15 demo items
    B->>R: Cache closet items (1h TTL)
    B-->>F: Closet seeded
    
    F->>B: POST /api/onboarding/complete
    B->>DB: Set onboarded=true
    B-->>F: Success
    
    F->>F: Transition to Main Interface
```

## Components and Interfaces

### Frontend Components

#### 1. OnboardingFlow Container

**Purpose**: Orchestrates the entire onboarding sequence and manages step transitions.

**Props**: None (uses OnboardingContext)

**State Management**:
```typescript
interface OnboardingState {
  currentStep: OnboardingStep;
  user: User | null;
  selfie: string | null;
  analysisResults: AnalysisResults | null;
  calendarConnected: boolean;
  error: OnboardingError | null;
  isLoading: boolean;
}

type OnboardingStep = 
  | 'auth'
  | 'camera_permission'
  | 'selfie_capture'
  | 'analysis'
  | 'calendar_prompt'
  | 'completion';

interface AnalysisResults {
  skinScores: SkinScores;
  skinTone: SkinTone;
  faceShape: FaceShape;
}
```

**Key Methods**:
- `advanceStep()`: Move to next onboarding step
- `handleError(error: OnboardingError)`: Display error and provide retry
- `saveProgress()`: Persist current step to localStorage
- `resumeFromSavedStep()`: Load and resume from saved progress



#### 2. AuthScreen Component

**Purpose**: Handle Google OAuth authentication via Supabase Auth.

**Interface**:
```typescript
interface AuthScreenProps {
  onAuthComplete: (user: User) => void;
  onError: (error: Error) => void;
}

interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}
```

**Implementation Details**:
- Uses `@supabase/supabase-js` client
- Calls `supabase.auth.signInWithOAuth({ provider: 'google' })`
- Redirect URL: `${window.location.origin}/auth/callback`
- On success, creates profile and user_preferences rows via trigger
- Stores session token in Supabase Auth (7-day expiration)
- Displays loading spinner during OAuth redirect
- Error handling: Network errors, OAuth cancellation, invalid credentials

**Styling**: Glassmorphic card with Google logo, "Continue with Google" button

#### 3. CameraPermissionScreen Component

**Purpose**: Request and handle browser camera permission.

**Interface**:
```typescript
interface CameraPermissionScreenProps {
  onPermissionGranted: () => void;
  onPermissionDenied: () => void;
}
```

**Implementation Details**:
- Calls `navigator.mediaDevices.getUserMedia({ video: true })`
- Handles permission states: 'prompt', 'granted', 'denied'
- Provides browser-specific instructions for enabling camera
- Retry button to re-request permission
- Detects if camera is already in use by another app
- Minimum camera resolution: 640x480

**Error Messages**:
- Permission denied: "Camera access is required to analyze your appearance. Please enable camera access in your browser settings."
- Camera in use: "Your camera is being used by another application. Please close other apps and try again."
- No camera found: "No camera detected. Please connect a camera and try again."

#### 4. SelfieCaptureScreen Component

**Purpose**: Display live camera feed and capture selfie.

**Interface**:
```typescript
interface SelfieCaptureScreenProps {
  onCapture: (selfie: string) => void;
  onRecapture: () => void;
}
```

**Implementation Details**:
- Uses HTML5 `<video>` element for camera feed
- Aspect ratio: 3:4 (portrait)
- Capture method: `canvas.toDataURL('image/jpeg', 0.85)`
- Minimum dimensions: 640x480
- Maximum file size: 5MB
- Face detection: Optional pre-validation using MediaPipe Face Detection
- Shows preview after capture with "Use This" and "Retake" buttons

**Glassmorphic Card Overlay**:
```css
.glassmorphic-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 24px;
  padding: 32px;
  max-width: 400px;
}
```

#### 5. ScanProgressScreen Component

**Purpose**: Display real-time progress during parallel API analysis.

**Interface**:
```typescript
interface ScanProgressScreenProps {
  analysisStatus: AnalysisStatus;
  onComplete: (results: AnalysisResults) => void;
  onError: (error: Error) => void;
}

interface AnalysisStatus {
  skinAnalysis: TaskStatus;
  skinTone: TaskStatus;
  faceShape: TaskStatus;
  overallProgress: number; // 0-100
}

type TaskStatus = 'pending' | 'running' | 'complete' | 'error';
```

**Implementation Details**:
- Radial progress indicator (0-100%)
- Individual status for each analysis type
- Checkmark icon when task completes
- Estimated time remaining (based on average API latency)
- Security footer: "Your data is processed securely" with lock icon
- Updates every 500ms via polling or WebSocket
- Timeout: 30 seconds per API call
- Retry logic: 2 additional attempts on failure
- Fallback: Use mock data if all retries fail

**Progress Calculation**:
```typescript
const overallProgress = (
  (skinAnalysis === 'complete' ? 33 : 0) +
  (skinTone === 'complete' ? 33 : 0) +
  (faceShape === 'complete' ? 34 : 0)
);
```

#### 6. CalendarPromptScreen Component

**Purpose**: Prompt user to connect Google Calendar.

**Interface**:
```typescript
interface CalendarPromptScreenProps {
  onConnect: () => void;
  onSkip: () => void;
  onError: (error: Error) => void;
}
```

**Implementation Details**:
- Message: "Want to connect your calendar so I know what's coming up?"
- Two buttons: "Connect Calendar" (primary), "Skip for Now" (secondary)
- OAuth flow: Google Calendar API with scopes `calendar.readonly`
- Redirect URL: `${window.location.origin}/auth/calendar-callback`
- On success: Store encrypted token in user_preferences.google_calendar_token
- Validation: Fetch today's events to confirm connection
- Error handling: OAuth cancellation, invalid scopes, network errors

#### 7. CompletionScreen Component

**Purpose**: Display completion message and transition to main interface.

**Interface**:
```typescript
interface CompletionScreenProps {
  onComplete: () => void;
}
```

**Implementation Details**:
- Message: "Got it. Let's build your first look."
- Fade animation: 300ms transition
- Sets `profiles.onboarded = true` in database
- Clears `onboarding_step` from localStorage
- Preloads main interface components during animation
- Triggers initial context fetch (body model, closet items)

#### 8. ProfilePage Component

**Purpose**: Display user profile with skin status visualization, product tracking, and account management.

**Interface**:
```typescript
interface ProfilePageProps {
  user: User;
  bodyModel: BodyModel;
  skinScans: SkinScan[];
  products: SkincareProduct[];
  onUpdateProfile: (updates: Partial<Profile>) => Promise<void>;
  onAddProduct: (product: CreateProductRequest) => Promise<void>;
  onUpdateProduct: (id: string, updates: UpdateProductRequest) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
}
```

**Sub-Components**:

**8.1 SkinStatusDashboard**
- Display overall skin score with trend indicator (↑ improving, ↓ declining, → stable)
- Show individual metrics with radial charts or progress bars
- Color-code metrics: green (≥80), yellow (60-79), red (<60)
- Display date of most recent scan with "Scan Again" button

**8.2 SkinTrendChart**
- Line chart showing skin score trends over time
- Selectable time periods: 7, 30, 60, 90 days
- Clickable data points to view detailed scan information
- Product annotations showing when products were started/changed
- Responsive design for mobile and desktop

**8.3 ScanComparisonModal**
- Side-by-side selfie comparison
- Metric comparison table with percentage changes
- Highlight improvements in green, declines in red
- "Export Report" button to generate PDF

**8.4 ProductTrackingSection**
- List of active products with duration of use
- "Add Product" button to open product form
- Product cards showing: name, brand, category, days used
- Score change since product start date (for products used ≥14 days)
- "Mark as Stopped" button to set end_date
- Historical products list (collapsed by default)

**8.5 ProductFormModal**
- Form fields: product name, brand, category (dropdown), start date, notes
- Category options: cleanser, moisturizer, serum, toner, sunscreen, treatment, mask, exfoliant
- Validation: product name required, start date cannot be future
- Submit button creates new product via API

**8.6 SkinInsightsSection**
- AI-generated observations about skin trends
- Correlation highlights between products and improvements
- Example: "Your acne score improved 20% since starting Product X"
- Refresh button to regenerate insights

**8.7 PerfectCorpDetailsSection**
- Display skin tone: undertone, depth, hex color swatch, color season
- Display face shape: shape name, symmetry score, proportions
- Collapsible section with "View Details" toggle

**Implementation Details**:
- Fetch skin scans for selected time period on mount
- Calculate trend indicators by comparing latest scan to previous scan
- Generate product correlations by comparing scans before/after product start
- Cache skin trend data in React Query with 5-minute stale time
- Implement optimistic updates for product CRUD operations
- Export report generates PDF using jsPDF with charts and selfies

### Backend API Endpoints

#### POST /api/onboarding/init

**Purpose**: Initialize onboarding session after authentication.

**Request**:
```typescript
interface InitRequest {
  userId: string;
}
```

**Response**:
```typescript
interface InitResponse {
  success: boolean;
  profile: Profile;
  preferences: UserPreferences;
}
```

**Implementation**:
- Validates session token
- Fetches or creates profile and preferences
- Returns user data for frontend hydration
- Latency target: <100ms

#### POST /api/onboarding/analyze

**Purpose**: Execute parallel appearance analysis.

**Request**:
```typescript
interface AnalyzeRequest {
  userId: string;
  selfie: string; // base64 JPEG
}
```

**Response**:
```typescript
interface AnalyzeResponse {
  success: boolean;
  bodyModel: BodyModel;
  skinScan: SkinScan;
  greeting: string;
}

interface BodyModel {
  skinScores: {
    overall: number;
    moisture: number;
    acne: number;
    wrinkles: number;
    pores: number;
    dark_circles: number;
  };
  skinTone: {
    undertone: 'warm' | 'cool' | 'neutral';
    depth: 'light' | 'medium' | 'deep';
    hex: string;
    colorSeason: string;
  };
  faceShape: {
    shape: string;
    symmetryScore: number;
    proportions: Record<string, number>;
  };
}
```

**Implementation**:
- Decode base64 selfie to bytes
- Upload to Supabase Storage: `selfies/{user_id}/onboarding.jpg`
- Execute 3 Perfect Corp API calls in parallel using `asyncio.gather()`
- Store results in `body_model` table (upsert)
- Insert row in `skin_scans` table
- Cache body_model in Redis (1-hour TTL)
- Generate personalized greeting based on skin scores
- Latency target: <15 seconds (wall time for parallel execution)

**Parallel Execution Pattern**:
```python
async def analyze_appearance(user_id: str, selfie_bytes: bytes) -> AnalyzeResponse:
    # Upload selfie
    selfie_url = await upload_selfie(user_id, selfie_bytes)
    
    # Parallel API calls
    skin_analysis, skin_tone, face_shape = await asyncio.gather(
        perfectcorp.call_api('skin-analysis', selfie_bytes, {...}),
        perfectcorp.call_api('skin-tone', selfie_bytes),
        perfectcorp.call_api('face-attributes', selfie_bytes),
        return_exceptions=True
    )
    
    # Handle individual failures
    if isinstance(skin_analysis, Exception):
        skin_analysis = get_mock('skin-analysis')
        logger.error(f"Skin analysis failed: {skin_analysis}")
    
    # Store results
    body_model = await store_body_model(user_id, skin_analysis, skin_tone, face_shape)
    skin_scan = await store_skin_scan(user_id, skin_analysis)
    
    # Cache
    await cache.set(f"body_model:{user_id}", body_model, TTL.BODY_MODEL)
    
    # Generate greeting
    greeting = generate_greeting(skin_analysis)
    
    return AnalyzeResponse(success=True, bodyModel=body_model, skinScan=skin_scan, greeting=greeting)
```

#### POST /api/onboarding/seed-closet

**Purpose**: Pre-populate user's closet with 15 demo items.

**Request**:
```typescript
interface SeedClosetRequest {
  userId: string;
}
```

**Response**:
```typescript
interface SeedClosetResponse {
  success: boolean;
  itemCount: number;
}
```

**Implementation**:
- Fetch pre-defined demo items from `DEMO_CLOSET_ITEMS` constant
- Insert 15 items into `closet_items` table with user_id
- Items span categories: jacket (3), dress (2), top (3), bottom (3), shoes (2), accessory (2)
- Include variety of formality levels (0.2 - 0.9)
- Include variety of occasions (casual, business, date, formal)
- Cache closet items in Redis (1-hour TTL)
- Latency target: <1 second

**Demo Items Structure**:
```python
DEMO_CLOSET_ITEMS = [
    {
        "name": "Navy Wool Blazer",
        "category": "jacket",
        "subcategory": "blazer",
        "color": "navy",
        "color_hex": "#000080",
        "brand": "Theory",
        "price": 495.00,
        "occasions": ["business", "formal"],
        "seasons": ["fall", "winter", "spring"],
        "formality": 0.8,
        "image_url": "https://..."
    },
    # ... 14 more items
]
```

#### POST /api/onboarding/complete

**Purpose**: Mark onboarding as complete and finalize setup.

**Request**:
```typescript
interface CompleteRequest {
  userId: string;
  calendarConnected: boolean;
}
```

**Response**:
```typescript
interface CompleteResponse {
  success: boolean;
  profile: Profile;
}
```

**Implementation**:
- Update `profiles.onboarded = true`
- Update `user_preferences.calendar_connected` if applicable
- Trigger welcome notification (future feature)
- Latency target: <100ms

#### GET /api/profile/skin-scans

**Purpose**: Fetch skin scan history for trend visualization.

**Query Parameters**:
- `days`: Number of days to fetch (7, 30, 60, 90)

**Response**:
```typescript
interface SkinScansResponse {
  success: boolean;
  scans: SkinTrendData[];
}
```

**Implementation**:
- Query skin_scans table filtered by user_id and date range
- Order by created_at DESC
- Cache results in Redis with 5-minute TTL
- Latency target: <200ms

#### GET /api/profile/products

**Purpose**: Fetch user's skincare products.

**Query Parameters**:
- `active_only`: boolean (default: false) - if true, only return products with end_date = NULL

**Response**:
```typescript
interface ProductsResponse {
  success: boolean;
  products: SkincareProduct[];
}
```

**Implementation**:
- Query skincare_products table filtered by user_id
- Filter by end_date if active_only=true
- Order by start_date DESC
- Latency target: <100ms

#### POST /api/profile/products

**Purpose**: Create a new skincare product entry.

**Request**:
```typescript
interface CreateProductRequest {
  productName: string;
  brand?: string;
  category: ProductCategory;
  startDate: string; // ISO date
  notes?: string;
}
```

**Response**:
```typescript
interface CreateProductResponse {
  success: boolean;
  product: SkincareProduct;
}
```

**Implementation**:
- Validate product_name not empty
- Validate start_date not in future
- Insert into skincare_products table
- Return created product
- Latency target: <100ms

#### PATCH /api/profile/products/:id

**Purpose**: Update an existing skincare product.

**Request**:
```typescript
interface UpdateProductRequest {
  productName?: string;
  brand?: string;
  category?: ProductCategory;
  endDate?: string; // ISO date
  notes?: string;
}
```

**Response**:
```typescript
interface UpdateProductResponse {
  success: boolean;
  product: SkincareProduct;
}
```

**Implementation**:
- Validate user owns the product (RLS policy)
- Update only provided fields
- Update updated_at timestamp
- Return updated product
- Latency target: <100ms

#### DELETE /api/profile/products/:id

**Purpose**: Delete a skincare product entry.

**Response**:
```typescript
interface DeleteProductResponse {
  success: boolean;
}
```

**Implementation**:
- Validate user owns the product (RLS policy)
- Delete from skincare_products table
- Latency target: <100ms

#### GET /api/profile/product-correlations

**Purpose**: Calculate correlations between products and skin improvements.

**Response**:
```typescript
interface ProductCorrelationsResponse {
  success: boolean;
  correlations: ProductCorrelation[];
}
```

**Implementation**:
- Fetch all products for user
- For each product used ≥14 days:
  - Find skin scan closest to start_date (baseline)
  - Find most recent skin scan (current)
  - Calculate percentage change for each metric
  - Identify metrics with >10% improvement
- Return correlations sorted by score_change_since_start DESC
- Cache results in Redis with 1-hour TTL
- Latency target: <500ms

#### GET /api/profile/skin-insights

**Purpose**: Generate AI insights about skin trends and product correlations.

**Response**:
```typescript
interface SkinInsightsResponse {
  success: boolean;
  insights: SkinInsight[];
}
```

**Implementation**:
- Fetch last 30 days of skin scans
- Calculate trends for each metric
- Identify significant changes (>15% improvement or decline)
- Fetch product correlations
- Generate insights using template or AI
- Return up to 5 most relevant insights
- Cache results in Redis with 1-hour TTL
- Latency target: <1s

### State Management

#### OnboardingContext

**Purpose**: Centralized state management for onboarding flow.

**Implementation**:
```typescript
interface OnboardingContextValue {
  state: OnboardingState;
  dispatch: Dispatch<OnboardingAction>;
  
  // Actions
  startOnboarding: () => void;
  completeAuth: (user: User) => void;
  captureSelfie: (selfie: string) => void;
  startAnalysis: () => Promise<void>;
  connectCalendar: () => Promise<void>;
  skipCalendar: () => void;
  completeOnboarding: () => Promise<void>;
  
  // Utilities
  saveProgress: () => void;
  resumeProgress: () => void;
  retryCurrentStep: () => void;
}

type OnboardingAction =
  | { type: 'SET_STEP'; payload: OnboardingStep }
  | { type: 'SET_USER'; payload: User }
  | { type: 'SET_SELFIE'; payload: string }
  | { type: 'SET_ANALYSIS_RESULTS'; payload: AnalysisResults }
  | { type: 'SET_CALENDAR_CONNECTED'; payload: boolean }
  | { type: 'SET_ERROR'; payload: OnboardingError | null }
  | { type: 'SET_LOADING'; payload: boolean };
```

**Persistence Strategy**:
```typescript
// Save to localStorage after each step
const saveProgress = () => {
  localStorage.setItem('onboarding_progress', JSON.stringify({
    step: state.currentStep,
    userId: state.user?.id,
    selfie: state.selfie,
    timestamp: Date.now()
  }));
};

// Resume on mount
const resumeProgress = () => {
  const saved = localStorage.getItem('onboarding_progress');
  if (saved) {
    const { step, userId, selfie, timestamp } = JSON.parse(saved);
    
    // Expire after 24 hours
    if (Date.now() - timestamp > 86400000) {
      localStorage.removeItem('onboarding_progress');
      return;
    }
    
    dispatch({ type: 'SET_STEP', payload: step });
    if (selfie) dispatch({ type: 'SET_SELFIE', payload: selfie });
  }
};
```

## Data Models

### Database Schema Updates

#### profiles Table (Existing)

No changes required. Already has `onboarded` boolean field.

#### user_preferences Table (Existing)

No changes required. Already has `google_calendar_token` and `calendar_connected` fields.

#### body_model Table (Existing)

No changes required. Already has `skin_scores`, `skin_tone`, `face_shape` JSONB fields.

#### skin_scans Table (Existing)

No changes required. Already has `scores` JSONB field and `created_at` timestamp.

#### closet_items Table (Existing)

No changes required. Already has all required fields for demo items.

#### skincare_products Table (New)

**Purpose**: Track skincare products users are using to correlate with skin improvements.

**Schema**:
```sql
CREATE TABLE skincare_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  brand TEXT,
  category TEXT NOT NULL, -- cleanser, moisturizer, serum, toner, sunscreen, treatment, mask, exfoliant
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE, -- NULL if still using
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_skincare_products_user_id ON skincare_products(user_id);
CREATE INDEX idx_skincare_products_start_date ON skincare_products(start_date);
CREATE INDEX idx_skincare_products_end_date ON skincare_products(end_date);

-- Row Level Security
ALTER TABLE skincare_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own products"
  ON skincare_products FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own products"
  ON skincare_products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own products"
  ON skincare_products FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own products"
  ON skincare_products FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_skincare_products_updated_at
  BEFORE UPDATE ON skincare_products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Fields**:
- `id`: UUID primary key
- `user_id`: Foreign key to auth.users
- `product_name`: Name of the product (e.g., "CeraVe Hydrating Cleanser")
- `brand`: Brand name (e.g., "CeraVe")
- `category`: Product category (cleanser, moisturizer, serum, toner, sunscreen, treatment, mask, exfoliant)
- `start_date`: Date user started using the product
- `end_date`: Date user stopped using the product (NULL if still active)
- `notes`: Optional user notes about the product
- `created_at`: Timestamp of record creation
- `updated_at`: Timestamp of last update

### New Types and Interfaces

#### Frontend Types

```typescript
// types/onboarding.ts

export type OnboardingStep = 
  | 'auth'
  | 'camera_permission'
  | 'selfie_capture'
  | 'analysis'
  | 'calendar_prompt'
  | 'completion';

export interface OnboardingState {
  currentStep: OnboardingStep;
  user: User | null;
  selfie: string | null;
  analysisResults: AnalysisResults | null;
  calendarConnected: boolean;
  error: OnboardingError | null;
  isLoading: boolean;
}

export interface AnalysisResults {
  skinScores: SkinScores;
  skinTone: SkinTone;
  faceShape: FaceShape;
  greeting: string;
}

export interface SkinScores {
  overall: number;
  moisture: number;
  acne: number;
  wrinkles: number;
  pores: number;
  dark_circles: number;
}

export interface SkinTone {
  undertone: 'warm' | 'cool' | 'neutral';
  depth: 'light' | 'medium' | 'deep';
  hex: string;
  colorSeason: string;
}

export interface FaceShape {
  shape: string;
  symmetryScore: number;
  proportions: Record<string, number>;
}

export interface OnboardingError {
  step: OnboardingStep;
  message: string;
  code: string;
  retryable: boolean;
}

export interface AnalysisStatus {
  skinAnalysis: TaskStatus;
  skinTone: TaskStatus;
  faceShape: TaskStatus;
  overallProgress: number;
}

export type TaskStatus = 'pending' | 'running' | 'complete' | 'error';

// types/profile.ts

export type ProductCategory = 
  | 'cleanser'
  | 'moisturizer'
  | 'serum'
  | 'toner'
  | 'sunscreen'
  | 'treatment'
  | 'mask'
  | 'exfoliant';

export interface SkincareProduct {
  id: string;
  userId: string;
  productName: string;
  brand?: string;
  category: ProductCategory;
  startDate: string; // ISO date string
  endDate?: string; // ISO date string, null if still using
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SkinTrendData {
  date: string; // ISO date string
  overall: number;
  moisture: number;
  acne: number;
  wrinkles: number;
  pores: number;
  dark_circles: number;
  scanId: string;
}

export interface ProductCorrelation {
  productId: string;
  productName: string;
  brand?: string;
  startDate: string;
  daysUsed: number;
  scoreChangeSinceStart: number; // percentage change
  affectedMetrics: {
    metric: keyof SkinScores;
    change: number; // percentage change
  }[];
}

export interface SkinInsight {
  id: string;
  type: 'improvement' | 'decline' | 'stable' | 'product_correlation';
  message: string;
  metrics: (keyof SkinScores)[];
  productIds?: string[]; // if type is 'product_correlation'
  generatedAt: string;
}
```

#### Backend Models

```python
# app/models/onboarding.py

from pydantic import BaseModel
from typing import Literal

class InitRequest(BaseModel):
    user_id: str

class AnalyzeRequest(BaseModel):
    user_id: str
    selfie: str  # base64

class SeedClosetRequest(BaseModel):
    user_id: str

class CompleteRequest(BaseModel):
    user_id: str
    calendar_connected: bool

class SkinScores(BaseModel):
    overall: int
    moisture: int
    acne: int
    wrinkles: int
    pores: int
    dark_circles: int

class SkinTone(BaseModel):
    undertone: Literal['warm', 'cool', 'neutral']
    depth: Literal['light', 'medium', 'deep']
    hex: str
    color_season: str

class FaceShape(BaseModel):
    shape: str
    symmetry_score: float
    proportions: dict[str, float]

class BodyModel(BaseModel):
    skin_scores: SkinScores
    skin_tone: SkinTone
    face_shape: FaceShape

class AnalyzeResponse(BaseModel):
    success: bool
    body_model: BodyModel
    greeting: str

# app/models/profile.py

from pydantic import BaseModel
from typing import Optional, Literal
from datetime import date

ProductCategory = Literal[
    'cleanser',
    'moisturizer', 
    'serum',
    'toner',
    'sunscreen',
    'treatment',
    'mask',
    'exfoliant'
]

class SkincareProduct(BaseModel):
    id: str
    user_id: str
    product_name: str
    brand: Optional[str] = None
    category: ProductCategory
    start_date: date
    end_date: Optional[date] = None
    notes: Optional[str] = None
    created_at: str
    updated_at: str

class CreateProductRequest(BaseModel):
    product_name: str
    brand: Optional[str] = None
    category: ProductCategory
    start_date: date
    notes: Optional[str] = None

class UpdateProductRequest(BaseModel):
    product_name: Optional[str] = None
    brand: Optional[str] = None
    category: Optional[ProductCategory] = None
    end_date: Optional[date] = None
    notes: Optional[str] = None

class SkinTrendData(BaseModel):
    date: str
    overall: int
    moisture: int
    acne: int
    wrinkles: int
    pores: int
    dark_circles: int
    scan_id: str

class ProductCorrelation(BaseModel):
    product_id: str
    product_name: str
    brand: Optional[str] = None
    start_date: date
    days_used: int
    score_change_since_start: float
    affected_metrics: list[dict[str, any]]

class SkinInsight(BaseModel):
    id: str
    type: Literal['improvement', 'decline', 'stable', 'product_correlation']
    message: str
    metrics: list[str]
    product_ids: Optional[list[str]] = None
    generated_at: str
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all 21 requirements with 100+ acceptance criteria, I identified the following testable properties. Many requirements focus on infrastructure configuration, UI rendering, and external service integration, which are better suited for integration tests and example-based tests rather than property-based testing.

**Key Observations:**
- Requirements 1-8 (core onboarding flow) contain several universal properties
- Requirements 9-15 (UI, performance, accessibility) are primarily example-based tests
- Requirements 16-18 (profile, auth, persistence) contain state management properties
- Requirements 19-21 (scalability, latency, reliability) are integration/smoke tests

**Redundancy Elimination:**
- Profile and preferences creation (1.3, 1.4) can be combined into a single property about user initialization
- Token storage and validation (1.6, 1.7) can be combined into a token lifecycle property
- API result storage (4.4, 4.5, 4.6) can be combined into a single property about analysis result persistence
- Demo item constraints (7.2, 7.3) can be combined into a single property about closet seeding correctness

### Property 1: User Initialization Completeness

*For any* successful Google OAuth response with valid user credentials, the system SHALL create both a profile row and a user_preferences row with all required default values populated.

**Validates: Requirements 1.3, 1.4**

**Test Strategy**: Generate random OAuth responses with varying email formats and user IDs, verify both tables are populated with correct defaults (budget_min=0, budget_max=500, currency='USD', style_preference='balanced', etc.)

### Property 2: Session Token Lifecycle

*For any* valid session token, the system SHALL store it in browser localStorage, validate it before each onboarding step transition, and correctly handle expiration by attempting refresh before redirecting to login.

**Validates: Requirements 1.6, 1.7, 17.1, 17.3, 17.4**

**Test Strategy**: Generate random tokens with varying expiration times, verify storage, validation, and refresh behavior

### Property 3: Selfie Encoding Round-Trip

*For any* captured image, encoding to base64 JPEG at quality 85 and then decoding SHALL preserve the image dimensions and produce a valid JPEG with quality within acceptable tolerance (±5%).

**Validates: Requirements 3.3, 3.5**

**Test Strategy**: Generate random images of various sizes (including edge cases like 640x480, 1920x1080, 4K), verify round-trip encoding preserves dimensions and quality

### Property 4: Selfie Storage Path Format

*For any* user ID and captured selfie, the storage path SHALL follow the format `selfies/{user_id}/onboarding.jpg` where user_id is a valid UUID.

**Validates: Requirements 3.6**

**Test Strategy**: Generate random user IDs (valid UUIDs and edge cases), verify path construction follows format

### Property 5: Parallel Analysis Initiation

*For any* captured selfie, the analysis endpoint SHALL initiate exactly three Perfect Corp API calls (skin-analysis, skin-tone, face-attributes) in parallel using asyncio.gather().

**Validates: Requirements 4.1**

**Test Strategy**: Generate random selfies, mock Perfect Corp API, verify three calls are initiated simultaneously (not sequentially)

### Property 6: Analysis Result Persistence

*For any* set of analysis results from Perfect Corp APIs (skin scores, skin tone, face shape), the system SHALL store all results in the body_model table with correct JSONB structure and create a corresponding skin_scans row.

**Validates: Requirements 4.4, 4.5, 4.6, 4.7**

**Test Strategy**: Generate random API responses with varying score ranges and values, verify database storage with correct field mapping

### Property 7: Greeting Generation Completeness

*For any* skin analysis results, the generated greeting SHALL include the overall skin score as an integer between 0 and 100, and SHALL mention the most significant concern if any score is below 70.

**Validates: Requirements 5.1, 5.2, 5.3**

**Test Strategy**: Generate random skin scores (including edge cases: all perfect, all poor, mixed), verify greeting contains score and appropriate concern mention

### Property 8: Closet Seeding Correctness

*For any* user completing the calendar step, the closet seeding operation SHALL insert exactly 15 demo items with at least 2 items from each of the 5 main categories (jacket, dress, top, bottom, shoes), and each item SHALL have all required fields populated (name, category, color, color_hex, brand, price, occasions, seasons, formality).

**Validates: Requirements 7.1, 7.2, 7.3**

**Test Strategy**: Generate random users, verify 15 items inserted, verify category distribution (≥2 per category), verify all required fields present and valid

### Property 9: Onboarding State Persistence Round-Trip

*For any* onboarding state (current step, user ID, selfie, timestamp), saving to localStorage and then loading SHALL restore the exact same state, and states older than 24 hours SHALL be automatically expired and cleared.

**Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 18.1-18.6**

**Test Strategy**: Generate random onboarding states at various steps, verify save/load round-trip, verify expiration logic for old states

### Property 10: Context Restoration Completeness

*For any* authenticated user refreshing the page, the system SHALL restore conversation history (up to 50 messages), last captured selfie, body model data, closet items, and VTO result if present, within 500ms on a 4G connection.

**Validates: Requirements 18.1, 18.2, 18.3, 18.4, 18.5, 18.11**

**Test Strategy**: Generate random app states with varying amounts of data, verify restoration completeness and timing (mock 4G latency)

### Property 11: Token Validation Consistency

*For any* API request to the backend, if the session token is invalid or expired, the backend SHALL return a 401 Unauthorized response, and the frontend SHALL redirect to the login screen.

**Validates: Requirements 17.10, 17.11, 17.12**

**Test Strategy**: Generate random tokens (valid, expired, malformed), verify backend validation and frontend redirect behavior

### Property 12: Cross-Tab Authentication Sync

*For any* authentication state change (login, logout, token refresh) in one browser tab, all other open tabs SHALL sync to the same state within 1 second using BroadcastChannel API.

**Validates: Requirements 17.14**

**Test Strategy**: Simulate multi-tab scenarios with random auth state changes, verify sync timing and consistency

### Property 13: Calendar Token Encryption

*For any* Google Calendar OAuth token stored in user_preferences.google_calendar_token, the token SHALL be encrypted at rest and SHALL be decryptable to the original token value.

**Validates: Requirements 6.4, 11.2**

**Test Strategy**: Generate random OAuth tokens, verify encryption round-trip, verify encrypted value differs from plaintext

### Property 14: Profile Update Idempotence

*For any* profile or preferences update operation, applying the same update twice SHALL result in the same final state as applying it once (idempotent).

**Validates: Requirements 16.5**

**Test Strategy**: Generate random profile updates, apply twice, verify final state matches single application

### Property 15: Error Retry Exponential Backoff

*For any* failed API call with retry enabled, the system SHALL retry with exponential backoff delays (1s, 2s, 4s, 8s, 16s) up to the maximum retry count, and SHALL not exceed the maximum delay.

**Validates: Requirements 21.1, 21.3, 21.5**

**Test Strategy**: Generate random API failures, verify retry timing follows exponential backoff pattern



## Error Handling

### Error Classification

**Recoverable Errors** (automatic retry):
- Network timeouts
- Temporary API failures (5xx errors)
- Database connection pool exhaustion
- Redis connection failures

**User-Recoverable Errors** (show retry button):
- Camera permission denied
- OAuth cancellation
- Selfie capture failure
- API quota exceeded

**Fatal Errors** (redirect to error page):
- Invalid authentication state
- Database schema mismatch
- Critical service unavailable (Supabase down)

### Error Handling Patterns

#### 1. Exponential Backoff Retry

**Use Case**: Network requests, API calls, database queries

**Implementation**:
```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}
```

**Applied To**:
- Perfect Corp API calls (3 retries, 1s base delay)
- Supabase queries (3 retries, 500ms base delay)
- WebSocket reconnection (5 retries, 1s base delay)

#### 2. Circuit Breaker Pattern

**Use Case**: Prevent cascading failures from external services

**Implementation**:
```python
class CircuitBreaker:
    def __init__(self, failure_threshold: float = 0.5, timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.failures = 0
        self.successes = 0
        self.last_failure_time = None
        self.state = 'closed'  # closed, open, half-open
    
    async def call(self, fn):
        if self.state == 'open':
            if time.time() - self.last_failure_time > self.timeout:
                self.state = 'half-open'
            else:
                raise CircuitBreakerOpenError()
        
        try:
            result = await fn()
            self.on_success()
            return result
        except Exception as e:
            self.on_failure()
            raise e
    
    def on_success(self):
        self.successes += 1
        if self.state == 'half-open':
            self.state = 'closed'
            self.failures = 0
    
    def on_failure(self):
        self.failures += 1
        self.last_failure_time = time.time()
        
        total = self.failures + self.successes
        if total >= 10 and self.failures / total >= self.failure_threshold:
            self.state = 'open'
```

**Applied To**:
- Perfect Corp API calls (50% failure threshold, 60s timeout)
- Google Calendar API (50% failure threshold, 60s timeout)

#### 3. Graceful Degradation

**Use Case**: Continue operation with reduced functionality when services fail

**Strategy**:
- Perfect Corp API fails → Use mock data + log error
- Google Calendar API fails → Skip calendar context
- Redis fails → Fall back to in-memory cache
- Supabase Storage fails → Store selfie in base64 in database (temporary)

**Implementation**:
```typescript
async function analyzeAppearance(selfie: string): Promise<AnalysisResults> {
  try {
    return await api.post('/api/onboarding/analyze', { selfie });
  } catch (error) {
    if (error.code === 'PERFECT_CORP_UNAVAILABLE') {
      // Use mock data but mark as degraded
      return {
        ...getMockAnalysisResults(),
        _degraded: true,
        _error: 'Analysis service temporarily unavailable'
      };
    }
    throw error;
  }
}
```

#### 4. Optimistic UI Updates

**Use Case**: Improve perceived performance by updating UI before server confirmation

**Implementation**:
```typescript
async function captureSelfie(imageData: string) {
  // Optimistically update UI
  dispatch({ type: 'SET_SELFIE', payload: imageData });
  dispatch({ type: 'SET_STEP', payload: 'analysis' });
  
  try {
    // Upload in background
    await uploadSelfie(imageData);
  } catch (error) {
    // Rollback on failure
    dispatch({ type: 'SET_SELFIE', payload: null });
    dispatch({ type: 'SET_STEP', payload: 'selfie_capture' });
    dispatch({ type: 'SET_ERROR', payload: error });
  }
}
```

**Applied To**:
- Selfie capture and upload
- Profile updates
- Calendar connection
- Onboarding step transitions

#### 5. Error Boundary Pattern

**Use Case**: Catch React component errors and display fallback UI

**Implementation**:
```typescript
class OnboardingErrorBoundary extends React.Component<Props, State> {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logError('OnboardingError', { error, errorInfo });
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          onRetry={() => this.setState({ hasError: false, error: null })}
        />
      );
    }
    return this.props.children;
  }
}
```

### Error Messages

**User-Facing Error Messages** (clear, actionable, non-technical):

| Error Code | Message | Action |
|------------|---------|--------|
| AUTH_FAILED | "We couldn't sign you in. Please check your connection and try again." | Retry button |
| CAMERA_DENIED | "Camera access is required to analyze your appearance. Please enable camera access in your browser settings." | Settings link + Retry |
| CAMERA_IN_USE | "Your camera is being used by another application. Please close other apps and try again." | Retry button |
| CAPTURE_FAILED | "We couldn't capture your selfie. Please try again." | Retry button |
| ANALYSIS_TIMEOUT | "Analysis is taking longer than expected. Please try again." | Retry button |
| ANALYSIS_FAILED | "We couldn't complete the analysis. Please try again." | Retry button |
| CALENDAR_OAUTH_FAILED | "We couldn't connect your calendar. You can skip this step and connect later." | Retry + Skip buttons |
| NETWORK_ERROR | "Please check your internet connection and try again." | Retry button |
| UNKNOWN_ERROR | "Something went wrong. Please try again or contact support." | Retry button + Support link |

**Developer Error Logging** (detailed, structured):

```typescript
interface ErrorLog {
  timestamp: number;
  userId?: string;
  step: OnboardingStep;
  errorCode: string;
  errorMessage: string;
  stackTrace?: string;
  context: {
    userAgent: string;
    viewport: { width: number; height: number };
    network: string; // '4g', 'wifi', etc.
    retryCount: number;
  };
}
```

### Error Recovery Flows

#### Camera Permission Denied Flow

```mermaid
graph TD
    A[Request Camera Permission] --> B{Permission Granted?}
    B -->|Yes| C[Initialize Camera]
    B -->|No| D[Show Error Message]
    D --> E[Show Browser-Specific Instructions]
    E --> F[Show Retry Button]
    F --> A
    D --> G[Log Error]
```

#### API Failure Flow

```mermaid
graph TD
    A[Call Perfect Corp API] --> B{Success?}
    B -->|Yes| C[Store Results]
    B -->|No| D{Retry Count < 3?}
    D -->|Yes| E[Wait with Exponential Backoff]
    E --> A
    D -->|No| F{Circuit Breaker Open?}
    F -->|Yes| G[Return Mock Data]
    F -->|No| H[Open Circuit Breaker]
    H --> G
    G --> I[Log Error]
    I --> C
```

#### Network Disconnection Flow

```mermaid
graph TD
    A[Detect Network Offline] --> B[Show Offline Banner]
    B --> C[Pause API Calls]
    C --> D[Wait for Network Online]
    D --> E[Hide Offline Banner]
    E --> F[Retry Failed Requests]
    F --> G[Resume Normal Operation]
```

## Testing Strategy

### Testing Approach

This feature requires a **dual testing approach** combining property-based tests for universal correctness properties and example-based tests for specific scenarios, UI behavior, and integration points.

**Testing Pyramid**:
```
        /\
       /  \  E2E Tests (5%)
      /    \  - Full onboarding flow
     /------\  - Cross-browser compatibility
    /        \
   / Integration \ (25%)
  /    Tests      \  - API integration
 /                 \  - Database operations
/-------------------\  - External services
/                     \
/   Unit + Property    \ (70%)
/        Tests          \  - Component logic
/                       \  - State management
/                        \  - Data transformations
---------------------------
```

### Property-Based Testing

**Library**: `fast-check` (TypeScript/JavaScript)

**Configuration**:
- Minimum 100 iterations per property test
- Seed for reproducibility: `Date.now()`
- Shrinking enabled for minimal failing examples
- Timeout: 30 seconds per property

**Property Test Structure**:
```typescript
import fc from 'fast-check';

describe('Feature: complete-onboarding-flow, Property 1: User Initialization Completeness', () => {
  it('should create profile and preferences for any valid OAuth response', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          email: fc.emailAddress(),
          user_metadata: fc.record({
            full_name: fc.string({ minLength: 1, maxLength: 100 }),
            avatar_url: fc.webUrl()
          })
        }),
        async (oauthResponse) => {
          // Arrange
          const supabase = createTestClient();
          
          // Act
          await handleNewUser(oauthResponse);
          
          // Assert
          const profile = await supabase
            .from('profiles')
            .select('*')
            .eq('id', oauthResponse.id)
            .single();
          
          const preferences = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', oauthResponse.id)
            .single();
          
          expect(profile.data).toBeDefined();
          expect(profile.data.email).toBe(oauthResponse.email);
          
          expect(preferences.data).toBeDefined();
          expect(preferences.data.budget_min).toBe(0);
          expect(preferences.data.budget_max).toBe(500);
          expect(preferences.data.currency).toBe('USD');
          expect(preferences.data.style_preference).toBe('balanced');
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

**Custom Generators**:
```typescript
// Arbitrary for onboarding state
const arbOnboardingState = fc.record({
  currentStep: fc.constantFrom('auth', 'camera_permission', 'selfie_capture', 'analysis', 'calendar_prompt', 'completion'),
  user: fc.option(fc.record({
    id: fc.uuid(),
    email: fc.emailAddress(),
    displayName: fc.string({ minLength: 1, maxLength: 50 })
  })),
  selfie: fc.option(fc.base64String()),
  timestamp: fc.integer({ min: Date.now() - 86400000, max: Date.now() })
});

// Arbitrary for skin analysis results
const arbSkinScores = fc.record({
  overall: fc.integer({ min: 0, max: 100 }),
  moisture: fc.integer({ min: 0, max: 100 }),
  acne: fc.integer({ min: 0, max: 100 }),
  wrinkles: fc.integer({ min: 0, max: 100 }),
  pores: fc.integer({ min: 0, max: 100 }),
  dark_circles: fc.integer({ min: 0, max: 100 })
});

// Arbitrary for demo closet items
const arbClosetItem = fc.record({
  name: fc.string({ minLength: 5, maxLength: 50 }),
  category: fc.constantFrom('jacket', 'dress', 'top', 'bottom', 'shoes'),
  color: fc.string({ minLength: 3, maxLength: 20 }),
  color_hex: fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => `#${s}`),
  brand: fc.string({ minLength: 2, maxLength: 30 }),
  price: fc.float({ min: 10, max: 1000 }),
  formality: fc.float({ min: 0, max: 1 }),
  occasions: fc.array(fc.constantFrom('casual', 'business', 'formal', 'date'), { minLength: 1, maxLength: 3 }),
  seasons: fc.array(fc.constantFrom('spring', 'summer', 'fall', 'winter'), { minLength: 1, maxLength: 4 })
});
```

### Unit Testing

**Library**: Jest + React Testing Library

**Coverage Target**: 80% line coverage, 70% branch coverage

**Unit Test Categories**:

1. **Component Tests** (example-based):
   - AuthScreen renders OAuth button
   - CameraPermissionScreen shows instructions when denied
   - SelfieCapture Screen displays preview after capture
   - ScanProgressScreen updates progress indicators
   - CalendarPromptScreen shows connect and skip buttons
   - CompletionScreen triggers transition animation

2. **Hook Tests** (example-based + property-based):
   - `useOnboarding` state transitions
   - `useOnboarding` error handling
   - `useOnboarding` progress persistence (property: save/load round-trip)

3. **Utility Function Tests** (property-based):
   - Image encoding/decoding (property: round-trip)
   - Path formatting (property: format correctness)
   - Token validation (property: validation consistency)
   - Retry logic (property: exponential backoff)

**Example Unit Test**:
```typescript
describe('SelfieCapture Screen', () => {
  it('should display preview after capture', async () => {
    const onCapture = jest.fn();
    const { getByRole, getByAltText } = render(
      <SelfieCaptureScreen onCapture={onCapture} />
    );
    
    const captureButton = getByRole('button', { name: /start initial scan/i });
    fireEvent.click(captureButton);
    
    await waitFor(() => {
      expect(getByAltText(/selfie preview/i)).toBeInTheDocument();
    });
  });
  
  it('should call onCapture with base64 JPEG', async () => {
    const onCapture = jest.fn();
    const { getByRole } = render(
      <SelfieCaptureScreen onCapture={onCapture} />
    );
    
    const captureButton = getByRole('button', { name: /start initial scan/i });
    fireEvent.click(captureButton);
    
    await waitFor(() => {
      expect(onCapture).toHaveBeenCalledWith(
        expect.stringMatching(/^data:image\/jpeg;base64,/)
      );
    });
  });
});
```

### Integration Testing

**Library**: Playwright (E2E), Supertest (API)

**Integration Test Categories**:

1. **API Integration Tests**:
   - POST /api/onboarding/init creates profile and preferences
   - POST /api/onboarding/analyze calls Perfect Corp APIs in parallel
   - POST /api/onboarding/analyze stores results in database
   - POST /api/onboarding/seed-closet inserts 15 items
   - POST /api/onboarding/complete sets onboarded=true

2. **Database Integration Tests**:
   - Profile creation trigger on auth.users insert
   - Row Level Security policies enforce user isolation
   - Timestamps auto-update on row modification

3. **External Service Integration Tests**:
   - Supabase Auth OAuth flow (mocked)
   - Perfect Corp API calls (mocked with realistic latency)
   - Google Calendar OAuth flow (mocked)
   - Supabase Storage upload (mocked)

**Example Integration Test**:
```typescript
describe('POST /api/onboarding/analyze', () => {
  it('should execute parallel analysis and store results', async () => {
    const selfie = await fs.readFile('test/fixtures/selfie.jpg', 'base64');
    const userId = 'test-user-123';
    
    const response = await request(app)
      .post('/api/onboarding/analyze')
      .send({ userId, selfie })
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(response.body.bodyModel).toBeDefined();
    expect(response.body.bodyModel.skinScores.overall).toBeGreaterThanOrEqual(0);
    expect(response.body.bodyModel.skinScores.overall).toBeLessThanOrEqual(100);
    
    // Verify database storage
    const { data: bodyModel } = await supabase
      .from('body_model')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    expect(bodyModel).toBeDefined();
    expect(bodyModel.skin_scores).toEqual(response.body.bodyModel.skinScores);
    
    // Verify cache
    const cached = await cache.get(`body_model:${userId}`);
    expect(cached).toEqual(bodyModel);
  });
  
  it('should complete within 15 seconds', async () => {
    const selfie = await fs.readFile('test/fixtures/selfie.jpg', 'base64');
    const userId = 'test-user-123';
    
    const startTime = Date.now();
    
    await request(app)
      .post('/api/onboarding/analyze')
      .send({ userId, selfie })
      .expect(200);
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(15000);
  });
});
```

### End-to-End Testing

**Library**: Playwright

**E2E Test Scenarios**:

1. **Happy Path**: Complete onboarding flow from auth to completion
2. **Camera Denied**: Handle camera permission denial and retry
3. **API Failure**: Handle Perfect Corp API failure with mock fallback
4. **Calendar Skip**: Complete onboarding without calendar connection
5. **Resume Progress**: Close app mid-onboarding and resume from saved step
6. **Refresh Persistence**: Refresh page and restore context
7. **Cross-Browser**: Test on Chrome, Firefox, Safari

**Example E2E Test**:
```typescript
test('complete onboarding flow (happy path)', async ({ page }) => {
  // Navigate to app
  await page.goto('http://localhost:3000');
  
  // Auth screen
  await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
  await page.getByRole('button', { name: /continue with google/i }).click();
  
  // Mock OAuth (intercept redirect)
  await page.route('**/auth/callback*', route => {
    route.fulfill({
      status: 200,
      body: JSON.stringify({ access_token: 'mock-token' })
    });
  });
  
  // Camera permission (grant automatically in test)
  await page.context().grantPermissions(['camera']);
  
  // Selfie capture
  await expect(page.getByRole('button', { name: /start initial scan/i })).toBeVisible();
  await page.getByRole('button', { name: /start initial scan/i }).click();
  
  // Analysis progress
  await expect(page.getByText(/calibrating mirra/i)).toBeVisible();
  await expect(page.getByText(/analyzing skin tone/i)).toBeVisible();
  
  // Wait for completion (max 20 seconds)
  await expect(page.getByText(/your skin's looking/i)).toBeVisible({ timeout: 20000 });
  
  // Calendar prompt
  await expect(page.getByText(/connect your calendar/i)).toBeVisible();
  await page.getByRole('button', { name: /skip for now/i }).click();
  
  // Completion
  await expect(page.getByText(/let's build your first look/i)).toBeVisible();
  
  // Verify transition to main interface
  await expect(page.getByRole('button', { name: /voice orb/i })).toBeVisible({ timeout: 5000 });
});
```

### Performance Testing

**Tools**: Lighthouse CI, WebPageTest

**Performance Metrics**:
- Largest Contentful Paint (LCP): <2s
- First Input Delay (FID): <100ms
- Cumulative Layout Shift (CLS): <0.1
- Time to Interactive (TTI): <3s
- Total Blocking Time (TBT): <300ms

**Load Testing**:
- Tool: k6
- Scenarios:
  - 100 concurrent users completing onboarding
  - 1000 concurrent users completing onboarding
  - Sustained load: 50 users/minute for 1 hour

**Example Load Test**:
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests < 2s
    http_req_failed: ['rate<0.01'],    // <1% failure rate
  },
};

export default function () {
  // Simulate onboarding flow
  const userId = `test-user-${__VU}-${__ITER}`;
  const selfie = open('selfie.jpg', 'b');
  
  // Init
  http.post('http://localhost:8000/api/onboarding/init', JSON.stringify({ userId }));
  
  // Analyze
  const analyzeRes = http.post('http://localhost:8000/api/onboarding/analyze', JSON.stringify({
    userId,
    selfie: selfie.toString('base64')
  }));
  check(analyzeRes, { 'analyze status 200': (r) => r.status === 200 });
  
  // Seed closet
  http.post('http://localhost:8000/api/onboarding/seed-closet', JSON.stringify({ userId }));
  
  // Complete
  http.post('http://localhost:8000/api/onboarding/complete', JSON.stringify({ userId, calendarConnected: false }));
  
  sleep(1);
}
```

### Accessibility Testing

**Tools**: axe-core, NVDA, VoiceOver

**Accessibility Checklist**:
- [ ] All interactive elements have accessible names (aria-label)
- [ ] Keyboard navigation works for all screens (Tab, Enter, Escape)
- [ ] Focus indicators are visible (outline, ring)
- [ ] Color contrast meets WCAG AA (4.5:1 for text)
- [ ] Screen reader announces progress updates (aria-live)
- [ ] Error messages have role="alert"
- [ ] Form inputs have associated labels
- [ ] Images have alt text
- [ ] Text scales to 200% without breaking layout

**Example Accessibility Test**:
```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('Accessibility', () => {
  it('should have no accessibility violations on AuthScreen', async () => {
    const { container } = render(<AuthScreen onAuthComplete={jest.fn()} onError={jest.fn()} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
  
  it('should announce progress updates to screen readers', async () => {
    const { getByRole } = render(<ScanProgressScreen analysisStatus={mockStatus} />);
    const liveRegion = getByRole('status');
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
  });
});
```

### Test Data Management

**Strategy**: Use factories and fixtures for consistent test data

**Factories**:
```typescript
// test/factories/user.factory.ts
export const createUser = (overrides?: Partial<User>): User => ({
  id: faker.datatype.uuid(),
  email: faker.internet.email(),
  displayName: faker.name.fullName(),
  avatarUrl: faker.image.avatar(),
  ...overrides
});

// test/factories/analysis.factory.ts
export const createAnalysisResults = (overrides?: Partial<AnalysisResults>): AnalysisResults => ({
  skinScores: {
    overall: faker.datatype.number({ min: 0, max: 100 }),
    moisture: faker.datatype.number({ min: 0, max: 100 }),
    acne: faker.datatype.number({ min: 0, max: 100 }),
    wrinkles: faker.datatype.number({ min: 0, max: 100 }),
    pores: faker.datatype.number({ min: 0, max: 100 }),
    dark_circles: faker.datatype.number({ min: 0, max: 100 })
  },
  skinTone: {
    undertone: faker.helpers.arrayElement(['warm', 'cool', 'neutral']),
    depth: faker.helpers.arrayElement(['light', 'medium', 'deep']),
    hex: faker.internet.color(),
    colorSeason: faker.helpers.arrayElement(['spring', 'summer', 'fall', 'winter'])
  },
  faceShape: {
    shape: faker.helpers.arrayElement(['oval', 'round', 'square', 'heart']),
    symmetryScore: faker.datatype.float({ min: 0, max: 1 }),
    proportions: {}
  },
  greeting: faker.lorem.sentence(),
  ...overrides
});
```

**Fixtures**:
```
test/fixtures/
├── selfies/
│   ├── valid-640x480.jpg
│   ├── valid-1920x1080.jpg
│   ├── invalid-too-small.jpg
│   └── invalid-corrupted.jpg
├── api-responses/
│   ├── skin-analysis-success.json
│   ├── skin-tone-success.json
│   ├── face-shape-success.json
│   └── api-error-timeout.json
└── database/
    ├── user-profile.json
    ├── user-preferences.json
    └── demo-closet-items.json
```

### CI/CD Integration

**Pipeline Stages**:
1. **Lint**: ESLint, Prettier, TypeScript type checking
2. **Unit Tests**: Jest (70% of tests, ~2 minutes)
3. **Property Tests**: fast-check (15 properties, ~5 minutes)
4. **Integration Tests**: Supertest + Playwright (25% of tests, ~5 minutes)
5. **E2E Tests**: Playwright (5% of tests, ~10 minutes)
6. **Performance Tests**: Lighthouse CI (LCP, FID, CLS checks)
7. **Accessibility Tests**: axe-core (WCAG AA compliance)

**GitHub Actions Workflow**:
```yaml
name: Complete Onboarding Flow Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Lint
        run: npm run lint
      
      - name: Type check
        run: npm run type-check
      
      - name: Unit tests
        run: npm run test:unit
      
      - name: Property tests
        run: npm run test:property
      
      - name: Integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
          REDIS_URL: redis://localhost:6379
      
      - name: E2E tests
        run: npm run test:e2e
      
      - name: Performance tests
        run: npm run test:performance
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### Test Maintenance

**Best Practices**:
1. **Keep tests independent**: Each test should set up and tear down its own data
2. **Use descriptive test names**: Follow "Feature: X, Property Y: Z" format for property tests
3. **Mock external services**: Use MSW for API mocking, avoid hitting real services in tests
4. **Parallelize tests**: Run unit tests in parallel, run E2E tests sequentially
5. **Monitor test flakiness**: Track and fix flaky tests immediately
6. **Update tests with code**: When changing implementation, update tests in the same PR
7. **Review test coverage**: Aim for 80% line coverage, focus on critical paths

**Test Naming Convention**:
```typescript
// Property tests
describe('Feature: complete-onboarding-flow, Property 1: User Initialization Completeness', () => {
  it('should create profile and preferences for any valid OAuth response', async () => {
    // ...
  });
});

// Unit tests
describe('SelfieCaptureScreen', () => {
  it('should display preview after capture', async () => {
    // ...
  });
});

// Integration tests
describe('POST /api/onboarding/analyze', () => {
  it('should execute parallel analysis and store results', async () => {
    // ...
  });
});

// E2E tests
test('complete onboarding flow (happy path)', async ({ page }) => {
  // ...
});
```



## Implementation Notes

### Phase 1: Core Onboarding Flow (Week 1)

**Priority**: High
**Dependencies**: None

**Tasks**:
1. Create OnboardingFlow container component
2. Implement OnboardingContext with useReducer
3. Build AuthScreen with Supabase Auth integration
4. Build CameraPermissionScreen with error handling
5. Build SelfieCaptureScreen with preview
6. Implement localStorage persistence for progress
7. Add error boundaries and error handling

**Deliverables**:
- Working auth → camera → selfie flow
- Progress persistence across page refreshes
- Error handling with retry buttons

### Phase 2: Appearance Analysis (Week 2)

**Priority**: High
**Dependencies**: Phase 1

**Tasks**:
1. Create POST /api/onboarding/analyze endpoint
2. Implement parallel Perfect Corp API calls
3. Build ScanProgressScreen with real-time updates
4. Implement body_model and skin_scans storage
5. Add Redis caching for body_model
6. Implement greeting generation logic
7. Add circuit breaker for API failures

**Deliverables**:
- Parallel analysis completing in <15 seconds
- Real-time progress UI
- Graceful fallback to mock data on API failure

### Phase 3: Calendar & Closet (Week 3)

**Priority**: Medium
**Dependencies**: Phase 2

**Tasks**:
1. Build CalendarPromptScreen
2. Implement Google Calendar OAuth flow
3. Create POST /api/onboarding/seed-closet endpoint
4. Define DEMO_CLOSET_ITEMS constant
5. Implement closet seeding with category distribution
6. Add Redis caching for closet items
7. Build CompletionScreen with transition animation

**Deliverables**:
- Calendar connection with skip option
- 15 demo items seeded across categories
- Smooth transition to main interface

### Phase 4: Profile & Auth Management (Week 4)

**Priority**: Medium
**Dependencies**: Phase 3

**Tasks**:
1. Build profile page UI
2. Implement profile editing
3. Add calendar disconnect functionality
4. Implement token refresh logic
5. Add cross-tab auth sync with BroadcastChannel
6. Build logout flow with cleanup
7. Add session validation middleware

**Deliverables**:
- Profile management page
- Token lifecycle management
- Cross-tab authentication sync

### Phase 5: Context Persistence (Week 5)

**Priority**: Medium
**Dependencies**: Phase 4

**Tasks**:
1. Implement context restoration on refresh
2. Add hydration strategy for critical data
3. Implement conversation history persistence (50 messages max)
4. Add VTO result restoration
5. Implement WebSocket reconnection after refresh
6. Add loading states during hydration
7. Handle missing context gracefully

**Deliverables**:
- Full context restoration on refresh
- <500ms hydration time
- Graceful handling of missing data

### Phase 6: Scalability & Performance (Week 6)

**Priority**: Low
**Dependencies**: Phase 5

**Tasks**:
1. Implement connection pooling (10-100 connections)
2. Add rate limiting (100 req/min per user)
3. Implement request coalescing
4. Add CDN caching for Supabase Storage
5. Implement code splitting and lazy loading
6. Add service worker for static asset caching
7. Optimize bundle size (<200KB gzipped)

**Deliverables**:
- Support for 100-1K concurrent users
- LCP <2s, FID <100ms
- Horizontal autoscaling ready

### Phase 7: Testing & Documentation (Week 7)

**Priority**: High
**Dependencies**: All phases

**Tasks**:
1. Write 15 property-based tests (100 iterations each)
2. Write unit tests for all components (80% coverage)
3. Write integration tests for all API endpoints
4. Write E2E tests for 7 scenarios
5. Run performance tests with Lighthouse CI
6. Run accessibility tests with axe-core
7. Document API contracts and component interfaces

**Deliverables**:
- 80% test coverage
- All property tests passing
- WCAG AA compliance
- Complete API documentation

### Development Environment Setup

**Prerequisites**:
- Node.js 20+
- Python 3.11+
- PostgreSQL 15+ (via Supabase)
- Redis 7+

**Environment Variables**:
```bash
# Frontend (.env.local)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
NEXT_PUBLIC_API_URL=http://localhost:8000

# Backend (.env)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=xxx
DATABASE_URL=postgresql://postgres:xxx@db.xxx.supabase.co:5432/postgres
REDIS_URL=redis://localhost:6379/0
PERFECT_CORP_API_KEY=xxx
GOOGLE_AI_STUDIO_KEY=xxx
GOOGLE_CALENDAR_CREDENTIALS={"client_id":"xxx","client_secret":"xxx"}
USE_MOCKS=true
```

**Local Development**:
```bash
# Start Redis
docker run -d -p 6379:6379 redis:7

# Start backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Start frontend
cd frontend
npm install
npm run dev
```

**Database Setup**:
```bash
# Run schema
psql $DATABASE_URL < backend/supabase/schema.sql

# Run seed data (optional)
psql $DATABASE_URL < backend/supabase/seed.sql
```

### Deployment Strategy

**Infrastructure**:
- Frontend: Vercel (Next.js optimized)
- Backend: Linode Kubernetes (2-10 replicas)
- Database: Supabase (managed PostgreSQL)
- Cache: Redis Cloud (managed Redis)
- Storage: Supabase Storage (CDN-backed)

**Deployment Pipeline**:
```mermaid
graph LR
    A[Git Push] --> B[GitHub Actions]
    B --> C[Run Tests]
    C --> D{Tests Pass?}
    D -->|No| E[Fail Build]
    D -->|Yes| F[Build Docker Image]
    F --> G[Push to Registry]
    G --> H[Deploy to Staging]
    H --> I[Run E2E Tests]
    I --> J{E2E Pass?}
    J -->|No| K[Rollback]
    J -->|Yes| L[Deploy to Production]
    L --> M[Health Check]
    M --> N{Healthy?}
    N -->|No| K
    N -->|Yes| O[Complete]
```

**Rollback Strategy**:
- Keep last 3 deployments available
- Automated rollback on health check failure
- Manual rollback via kubectl or Vercel dashboard
- Database migrations are forward-only (no rollback)

### Monitoring & Observability

**Metrics to Track**:
- Onboarding completion rate (target: >90%)
- Average onboarding time (target: <60s)
- Step drop-off rates (identify friction points)
- API latency (p50, p95, p99)
- Error rates by step and error code
- Cache hit rates (Redis)
- Database connection pool utilization

**Logging**:
- Structured JSON logs with correlation IDs
- Log levels: DEBUG, INFO, WARN, ERROR
- Centralized logging with Sentry or Datadog
- User privacy: Never log PII or selfie data

**Alerts**:
- Onboarding completion rate drops below 80%
- API latency p95 exceeds 2 seconds
- Error rate exceeds 5%
- Database connection pool >90% utilized
- Redis cache hit rate <70%

**Dashboards**:
- Onboarding funnel (step-by-step conversion)
- API performance (latency, throughput, errors)
- Infrastructure health (CPU, memory, disk)
- User metrics (daily active users, retention)

### Security Considerations

**Authentication**:
- Supabase Auth with Google OAuth (industry standard)
- Session tokens with 7-day expiration
- Automatic token refresh 5 minutes before expiration
- Secure token storage (httpOnly cookies preferred over localStorage)

**Data Protection**:
- Selfies encrypted at rest in Supabase Storage
- Calendar tokens encrypted in database (AES-256)
- Row Level Security policies on all tables
- HTTPS-only communication (TLS 1.2+)

**API Security**:
- Rate limiting (100 req/min per user)
- CORS whitelist (production domains only)
- Input validation on all endpoints
- SQL injection prevention (parameterized queries)
- XSS prevention (React auto-escaping)

**Privacy**:
- Voice data never stored (session-only)
- Selfies can be deleted by user anytime
- Data retention: 365 days (configurable)
- GDPR compliance: Right to access, delete, export

### Performance Optimization Checklist

**Frontend**:
- [ ] Code splitting (React.lazy for onboarding screens)
- [ ] Image optimization (WebP format, lazy loading)
- [ ] Font optimization (preload, font-display: swap)
- [ ] Bundle size <200KB gzipped
- [ ] Service worker for static assets
- [ ] Prefetch critical resources
- [ ] Debounce user inputs
- [ ] Virtualize long lists (if applicable)

**Backend**:
- [ ] Connection pooling (10-100 connections)
- [ ] Redis caching (1-hour TTL for body_model, closet)
- [ ] Database indexing (user_id, created_at)
- [ ] Parallel API execution (asyncio.gather)
- [ ] Request coalescing (batch similar requests)
- [ ] Response compression (gzip)
- [ ] CDN for static assets
- [ ] Horizontal autoscaling (2-10 replicas)

**Database**:
- [ ] Indexes on frequently queried columns
- [ ] Materialized views for complex queries (if needed)
- [ ] Connection pooling via PgBouncer
- [ ] Query optimization (EXPLAIN ANALYZE)
- [ ] Partitioning for large tables (if needed)

### Known Limitations & Future Improvements

**Current Limitations**:
1. **Single Selfie**: Only one selfie per user during onboarding (no retake after completion)
2. **Demo Closet**: Pre-defined items, not personalized to user
3. **Calendar Events**: Read-only access, no event creation
4. **Offline Support**: Limited offline functionality (only cached data)
5. **Multi-Language**: English only (no i18n)

**Future Improvements**:
1. **Selfie Gallery**: Allow multiple selfies with different lighting/angles
2. **Smart Closet Seeding**: Personalize demo items based on skin tone and preferences
3. **Calendar Integration**: Two-way sync, event creation, outfit reminders
4. **Offline Mode**: Full offline support with sync when online
5. **Internationalization**: Support for Spanish, French, Mandarin
6. **Progressive Web App**: Install as native app, push notifications
7. **Onboarding Personalization**: A/B test different flows, optimize conversion
8. **Social Onboarding**: Import closet from Instagram, Pinterest
9. **Voice Onboarding**: Complete onboarding via voice commands
10. **AR Try-On**: Real-time AR try-on during onboarding

### Success Metrics

**Primary Metrics**:
- **Onboarding Completion Rate**: >90% (users who start complete successfully)
- **Average Onboarding Time**: <60 seconds (happy path)
- **User Retention**: >70% return within 7 days

**Secondary Metrics**:
- **Calendar Connection Rate**: >50% (users who connect calendar)
- **Error Rate**: <5% (errors per onboarding attempt)
- **API Latency**: p95 <15 seconds (parallel analysis)
- **Page Load Time**: LCP <2 seconds

**Quality Metrics**:
- **Test Coverage**: >80% line coverage
- **Property Test Pass Rate**: 100% (all 15 properties)
- **Accessibility Score**: 100 (Lighthouse)
- **Performance Score**: >90 (Lighthouse)

### Glossary

- **Onboarding Flow**: The first-time user experience from app launch to completion
- **Initial Scan**: Parallel execution of three Perfect Corp APIs (Skin Analysis, Skin Tone, Face Shape)
- **Body Model**: User's appearance profile stored in body_model table
- **Glassmorphic Card**: Translucent UI card with backdrop blur effect
- **Session Token**: Authentication token stored after Google OAuth
- **Context Data**: Complete user data (body model, calendar token, closet items)
- **Hydration**: Process of restoring app state from database/cache on page load
- **Circuit Breaker**: Pattern to prevent cascading failures from external services
- **Exponential Backoff**: Retry strategy with increasing delays (1s, 2s, 4s, 8s, 16s)
- **Optimistic UI**: Update UI before server confirmation for perceived performance
- **Property-Based Testing**: Testing universal properties across many generated inputs
- **Row Level Security (RLS)**: Database-level access control per user

## Summary

This design document provides a comprehensive technical blueprint for implementing the Complete Onboarding Flow feature. The design addresses all 21 requirements with 100+ acceptance criteria, covering authentication, appearance analysis, context gathering, state management, scalability, and reliability.

**Key Design Decisions**:
1. **Parallel API Execution**: Three Perfect Corp APIs run simultaneously to achieve <15s analysis time
2. **Progressive State Persistence**: Save progress after each step to enable resume on app close
3. **Graceful Degradation**: Use mock data when APIs fail to maintain user experience
4. **Dual Testing Approach**: Property-based tests for universal correctness + example-based tests for specific scenarios
5. **Scalability-First Architecture**: Connection pooling, Redis caching, horizontal autoscaling from day one

**Implementation Roadmap**:
- **Week 1-3**: Core onboarding flow (auth, camera, selfie, analysis, calendar, closet)
- **Week 4-5**: Profile management and context persistence
- **Week 6**: Scalability and performance optimization
- **Week 7**: Comprehensive testing and documentation

**Success Criteria**:
- >90% onboarding completion rate
- <60 seconds average onboarding time
- >80% test coverage with all property tests passing
- LCP <2s, FID <100ms
- WCAG AA accessibility compliance

This design is ready for implementation and provides clear guidance for developers, testers, and stakeholders.

