# SelfieCaptureScreen Component

## Overview

The `SelfieCaptureScreen` component displays a live camera feed and allows users to capture a selfie for appearance analysis during the onboarding flow. It implements the Lumina Ethos design system with glassmorphic UI elements overlaid on the camera feed.

## Features

- **Live Camera Feed**: Displays real-time video from the user's camera with 3:4 aspect ratio
- **Selfie Capture**: Captures a single frame from the camera feed as a JPEG image
- **Image Preview**: Shows the captured image with "Use This" and "Retake" options
- **Dimension Validation**: Ensures captured images meet minimum resolution requirements (640x480)
- **File Size Validation**: Validates that captured images don't exceed 5MB
- **Error Handling**: Comprehensive error handling for camera access failures
- **Stream Cleanup**: Properly stops camera streams on unmount and after capture
- **Privacy Notice**: Displays security message to reassure users

## Props

```typescript
interface SelfieCaptureScreenProps {
  onCapture: (selfie: string) => void;  // Called when user confirms captured image
  onRecapture: () => void;               // Called when user clicks "Retake"
}
```

## Usage

```tsx
import { SelfieCaptureScreen } from "@/components/onboarding/SelfieCaptureScreen";

function OnboardingFlow() {
  const handleCapture = (selfie: string) => {
    // selfie is a base64-encoded JPEG string
    console.log("Captured selfie:", selfie);
    // Send to backend for analysis
  };

  const handleRecapture = () => {
    console.log("User wants to retake the selfie");
  };

  return (
    <SelfieCaptureScreen
      onCapture={handleCapture}
      onRecapture={handleRecapture}
    />
  );
}
```

## States

The component manages four internal states:

1. **ready**: Camera is active, showing "Start Initial Scan" button
2. **capturing**: Processing the capture (brief transition state)
3. **preview**: Showing captured image with "Use This" and "Retake" buttons
4. **error**: Camera access failed or capture error occurred

## Camera Configuration

The component requests camera access with the following constraints:

```typescript
{
  video: {
    width: { min: 640, ideal: 1280 },
    height: { min: 480, ideal: 720 },
    facingMode: "user"
  }
}
```

## Image Processing

### Capture Process

1. Reads current video frame dimensions
2. Calculates 3:4 aspect ratio crop (centered)
3. Draws cropped frame to canvas
4. Converts canvas to base64 JPEG with 85% quality
5. Validates file size (max 5MB)
6. Displays preview

### Aspect Ratio Handling

The component enforces a 3:4 (portrait) aspect ratio by cropping the video feed:

- If video is wider than 3:4, crops the width (centered)
- If video is taller than 3:4, crops the height (centered)

### Mirror Effect

Both the live video feed and preview image are horizontally flipped (`scaleX(-1)`) to provide a natural mirror experience for users.

## Error Handling

The component handles the following error scenarios:

| Error Type | User Message |
|------------|--------------|
| `NotAllowedError` | Camera access was denied. Please enable camera access to continue. |
| `NotFoundError` | No camera detected. Please connect a camera and try again. |
| `NotReadableError` | Your camera is being used by another application. Please close other apps and try again. |
| Low Resolution | Camera resolution too low. Minimum required: 640x480 |
| File Too Large | Image size exceeds maximum allowed (5MB) |
| Generic Error | Failed to access camera. Please check your browser settings and try again. |

## Cleanup

The component properly cleans up resources:

- **On unmount**: Stops all camera tracks
- **After "Use This"**: Stops all camera tracks before calling `onCapture`
- **On error**: Camera stream is already stopped by the browser

## Design System Integration

The component uses the Lumina Ethos design system:

- **Glassmorphic Card**: Translucent overlay with backdrop blur
- **Primary Button**: `.btn-primary` for "Start Initial Scan" and "Use This"
- **Secondary Button**: `.btn-secondary` for "Retake"
- **Color Variables**: Uses CSS custom properties from `globals.css`
- **Typography**: Noto Serif for headings, Inter for body text
- **Responsive**: Adapts to different screen sizes with max-width constraints

## Accessibility

- **ARIA Labels**: All buttons have descriptive `aria-label` attributes
- **Error Alerts**: Error messages use `role="alert"` for screen reader announcements
- **Keyboard Navigation**: All interactive elements are keyboard accessible
- **Focus Management**: Proper focus states for all buttons

## Requirements Validation

This component validates the following requirements from the spec:

- **3.1**: Displays "Start Initial Scan" button when camera feed is active ✓
- **3.2**: Captures single frame from camera feed on button tap ✓
- **3.3**: Encodes image as base64 JPEG with quality 85 ✓
- **3.4**: Displays preview with "Use This" and "Retake" buttons ✓
- **3.5**: Validates minimum dimensions (640x480) ✓

## Browser Compatibility

- **Chrome/Edge**: Full support
- **Safari**: Full support (requires HTTPS or localhost)
- **Firefox**: Full support
- **Mobile Safari**: Full support (requires HTTPS)
- **Mobile Chrome**: Full support

**Note**: Camera access requires HTTPS in production environments (localhost is exempt).

## Performance

- **Initial Load**: Camera initialization typically takes 500-1000ms
- **Capture Time**: Image capture and processing takes <100ms
- **Memory**: Properly releases camera stream to prevent memory leaks
- **File Size**: JPEG quality of 85% provides good balance between quality and size

## Testing

The component includes comprehensive unit tests covering:

- Camera initialization
- Selfie capture flow
- Preview and confirmation
- Retake functionality
- Error handling for all error types
- Stream cleanup on unmount
- Dimension validation
- Privacy notice display

Run tests with:
```bash
npm test -- SelfieCaptureScreen.test.tsx
```

## Related Components

- **CameraPermissionScreen**: Handles initial camera permission request
- **ScanProgressScreen**: Displays analysis progress after capture
- **OnboardingContext**: Manages onboarding state and flow

## Future Enhancements

Potential improvements for future iterations:

- Face detection validation before capture (using MediaPipe)
- Multiple capture attempts with automatic best-shot selection
- Real-time lighting quality feedback
- Countdown timer before capture
- Zoom/pan controls for framing
- Support for uploading existing photos as alternative to camera
