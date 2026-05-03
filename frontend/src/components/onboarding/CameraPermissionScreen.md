# CameraPermissionScreen Component

## Overview

The `CameraPermissionScreen` component handles browser camera permission requests during the onboarding flow. It provides a user-friendly interface for requesting camera access, handling different permission states, and displaying browser-specific instructions when permission is denied.

## Features

- **Permission State Management**: Handles 'prompt', 'granted', 'denied', and 'checking' states
- **Browser Detection**: Automatically detects the user's browser (Chrome, Safari, Firefox, Edge)
- **Browser-Specific Instructions**: Displays tailored instructions for enabling camera access
- **Error Handling**: Comprehensive error handling for various camera access failures
- **Retry Functionality**: Allows users to retry permission requests after denial
- **Accessibility**: Includes ARIA labels and semantic HTML
- **Privacy Notice**: Displays security information to build user trust

## Props

```typescript
interface CameraPermissionScreenProps {
  onPermissionGranted: () => void;  // Called when camera access is granted
  onPermissionDenied: () => void;   // Called when camera access is denied
}
```

## Usage

```tsx
import { CameraPermissionScreen } from "@/components/onboarding/CameraPermissionScreen";

function OnboardingFlow() {
  const handlePermissionGranted = () => {
    console.log("Camera access granted");
    // Proceed to next onboarding step
  };

  const handlePermissionDenied = () => {
    console.log("Camera access denied");
    // Handle denial (show error, log event, etc.)
  };

  return (
    <CameraPermissionScreen
      onPermissionGranted={handlePermissionGranted}
      onPermissionDenied={handlePermissionDenied}
    />
  );
}
```

## Permission States

### 1. Checking
Initial state while the component checks the current permission status.

**UI**: Loading spinner with "Checking camera permissions..." message

### 2. Prompt
Permission has not been requested yet, or the browser doesn't support permission queries.

**UI**: "Enable Camera" button

### 3. Granted
Camera access has been granted successfully.

**UI**: Success checkmark with "Camera access granted" message

**Behavior**: Automatically calls `onPermissionGranted()` callback

### 4. Denied
Camera access has been denied or an error occurred.

**UI**: 
- Error message explaining the issue
- Browser-specific instructions for enabling camera
- "Try Again" button

**Behavior**: Calls `onPermissionDenied()` callback

## Error Handling

The component handles various camera access errors:

| Error Type | Error Name | User Message |
|------------|-----------|--------------|
| Permission Denied | `NotAllowedError`, `PermissionDeniedError` | "Camera access was denied. Please enable camera access to continue." |
| No Camera Found | `NotFoundError`, `DevicesNotFoundError` | "No camera detected. Please connect a camera and try again." |
| Camera In Use | `NotReadableError`, `TrackStartError` | "Your camera is being used by another application. Please close other apps and try again." |
| Insufficient Resolution | `OverconstrainedError` | "Your camera doesn't meet the minimum requirements (640x480). Please try a different device." |
| Security Error | `SecurityError` | "Camera access is blocked due to security settings. Please check your browser settings." |
| Generic Error | Other | "Failed to access camera. Please check your browser settings and try again." |

## Browser-Specific Instructions

The component detects the user's browser and displays appropriate instructions:

### Chrome
1. Click the camera icon in the address bar
2. Select 'Allow' for camera access
3. Refresh the page if needed

### Safari
1. Go to Safari > Settings for This Website
2. Set Camera to 'Allow'
3. Refresh the page

### Firefox
1. Click the camera icon in the address bar
2. Select 'Allow' from the dropdown
3. Refresh the page if needed

### Edge
1. Click the camera icon in the address bar
2. Select 'Allow' for camera access
3. Refresh the page if needed

## Camera Requirements

The component requests camera access with the following constraints:

```javascript
{
  video: {
    width: { min: 640, ideal: 1280 },
    height: { min: 480, ideal: 720 },
    facingMode: "user"
  }
}
```

- **Minimum Resolution**: 640x480 pixels
- **Ideal Resolution**: 1280x720 pixels
- **Facing Mode**: User-facing camera (front camera on mobile devices)

## Design System

The component follows the Lumina Ethos design system:

- **Typography**: Noto Serif for headings, Inter for body text
- **Glassmorphism**: Translucent card with backdrop blur
- **Colors**: Uses CSS custom properties from `globals.css`
- **Responsive**: Adapts to different screen sizes
- **Touch-Friendly**: Minimum 44x44px touch targets

## Accessibility

- **ARIA Labels**: Buttons include descriptive `aria-label` attributes
- **Role Attributes**: Error messages use `role="alert"` for screen reader announcements
- **Keyboard Navigation**: Fully navigable using keyboard
- **Color Contrast**: Meets WCAG 2.1 AA standards
- **Focus Indicators**: Clear focus states for interactive elements

## Integration with OnboardingContext

This component is typically used within the onboarding flow and integrates with `OnboardingContext`:

```tsx
import { useOnboarding } from "@/contexts/OnboardingContext";
import { CameraPermissionScreen } from "@/components/onboarding/CameraPermissionScreen";

function OnboardingFlow() {
  const { state, advanceStep, setError } = useOnboarding();

  if (state.currentStep === "camera_permission") {
    return (
      <CameraPermissionScreen
        onPermissionGranted={() => {
          advanceStep(); // Move to 'selfie_capture' step
        }}
        onPermissionDenied={() => {
          setError({
            step: "camera_permission",
            message: "Camera access is required to continue",
            code: "CAMERA_DENIED",
            retryable: true,
          });
        }}
      />
    );
  }

  // ... other steps
}
```

## Testing

To test this component, you'll need to mock the browser APIs:

```typescript
// Mock navigator.mediaDevices
const mockGetUserMedia = jest.fn();
Object.defineProperty(global.navigator, "mediaDevices", {
  writable: true,
  value: {
    getUserMedia: mockGetUserMedia,
  },
});

// Mock navigator.permissions
const mockQuery = jest.fn();
Object.defineProperty(global.navigator, "permissions", {
  writable: true,
  value: {
    query: mockQuery,
  },
});

// Test permission granted
mockGetUserMedia.mockResolvedValue({
  getTracks: () => [{ stop: jest.fn() }],
});

// Test permission denied
const notAllowedError = new Error("Permission denied");
notAllowedError.name = "NotAllowedError";
mockGetUserMedia.mockRejectedValue(notAllowedError);
```

See `CameraPermissionScreen.test.tsx` for complete test examples.

## Requirements Validation

This component validates the following requirements from the spec:

- **Requirement 2.1**: Requests camera permission after authentication
- **Requirement 2.2**: Initializes camera feed when permission is granted
- **Requirement 2.4**: Displays error message when permission is denied
- **Requirement 2.5**: Provides browser-specific instructions for enabling camera
- **Requirement 2.6**: Displays retry button for re-requesting permission

## Future Enhancements

Potential improvements for future iterations:

1. **Permission Persistence**: Remember permission state across sessions
2. **Video Preview**: Show live camera preview before requesting permission
3. **Multiple Cameras**: Allow users to select from multiple cameras
4. **Animated Instructions**: Add visual animations to guide users
5. **Analytics**: Track permission denial rates by browser
6. **Fallback Options**: Provide alternative onboarding paths for users without cameras
