# Perfect Corp API Image Requirements

## Why These Errors Happen

Perfect Corp's AI models require high-quality images to work properly. The errors you're seeing are **validation errors from Perfect Corp**, not bugs in our code.

## Common Errors

### 1. `error_below_min_image_size`
**Cause:** Image resolution is too low
**Solution:** 
- Minimum: Long side should be at least 600px
- Recommended: 1200px or higher
- Maximum: 4096px (long side)
- File size: < 10MB

### 2. `error_face_angle_downward/upward/left/right`
**Cause:** Face is not looking straight at camera
**Solution:**
- Face the camera directly
- Keep head level (not tilted)
- We set `face_angle_strictness_level: "low"` (20° tolerance) but still need reasonable alignment

### 3. `error_src_face_too_small`
**Cause:** Face doesn't occupy enough of the image
**Solution:**
- Face must occupy **>60% of image width**
- Move closer to camera
- Use portrait/selfie mode, not full-body shots

### 4. `error_lighting_dark`
**Cause:** Image is too dark
**Solution:**
- Use good lighting (natural light is best)
- Avoid backlighting
- Face should be well-lit and clearly visible

## Frontend Image Capture Best Practices

### Recommended Settings

```typescript
// Camera constraints for getUserMedia
const constraints = {
  video: {
    width: { ideal: 1280, min: 640 },
    height: { ideal: 1280, min: 640 },
    facingMode: "user", // Front camera
    aspectRatio: 1, // Square for better face framing
  }
};

// Canvas capture settings
const canvas = document.createElement('canvas');
canvas.width = 1280;  // High enough quality
canvas.height = 1280;
ctx.drawImage(video, 0, 0, 1280, 1280);

// JPEG quality
const base64 = canvas.toDataURL('image/jpeg', 0.85); // 85% quality
```

### Image Validation Before Upload

```typescript
// Check image size before sending
function validateImageSize(base64: string): boolean {
  // Remove data URL prefix
  const base64Data = base64.split(',')[1];
  
  // Estimate file size (base64 is ~33% larger than binary)
  const sizeInBytes = (base64Data.length * 3) / 4;
  const sizeInKB = sizeInBytes / 1024;
  
  if (sizeInKB < 10) {
    console.warn(`Image too small: ${sizeInKB.toFixed(1)}KB`);
    return false;
  }
  
  if (sizeInKB > 10240) { // 10MB
    console.warn(`Image too large: ${sizeInKB.toFixed(1)}KB`);
    return false;
  }
  
  return true;
}

// Check image dimensions
function validateImageDimensions(img: HTMLImageElement): boolean {
  const minSize = 600;
  const maxSize = 4096;
  
  if (img.width < minSize || img.height < minSize) {
    console.warn(`Image too small: ${img.width}x${img.height}`);
    return false;
  }
  
  if (img.width > maxSize || img.height > maxSize) {
    console.warn(`Image too large: ${img.width}x${img.height}`);
    return false;
  }
  
  return true;
}
```

### User Guidance UI

Show these instructions to users:

```
📸 For best results:
✓ Face the camera directly
✓ Keep your face centered
✓ Ensure good lighting
✓ Fill the frame with your face
✓ Remove glasses (if possible)
✓ Keep a neutral expression
```

## Backend Validation

We now validate image size in `backend/app/models/onboarding.py`:

```python
# Warn if image seems too small (< 10KB base64 ≈ 7.5KB binary)
if len(v) < 13000:  # ~10KB base64
    logging.warning(
        f"Selfie may be too small: {len(v)} base64 chars ≈ {len(v) * 3 // 4 / 1024:.1f}KB"
    )
```

## Error Handling Flow

```
1. Frontend captures image
   ↓
2. Frontend validates dimensions & size
   ↓ (if valid)
3. Backend validates base64 format
   ↓
4. Backend decodes and uploads to Perfect Corp
   ↓
5. Perfect Corp validates image quality
   ↓ (if invalid)
6. Backend catches PerfectCorpAPIError
   ↓
7. Backend returns user-friendly message (HTTP 400)
   ↓
8. Frontend shows error + guidance to user
```

## Testing Image Quality

Use this test script to validate images before sending:

```bash
cd backend
python3 -c "
import base64
import sys

# Read base64 from stdin
base64_data = sys.stdin.read().strip()

# Remove data URL prefix if present
if base64_data.startswith('data:'):
    base64_data = base64_data.split(',')[1]

# Decode
image_bytes = base64.b64decode(base64_data)

# Check size
size_kb = len(image_bytes) / 1024
print(f'Image size: {size_kb:.1f}KB')

if size_kb < 10:
    print('⚠️  WARNING: Image too small (< 10KB)')
elif size_kb > 10240:
    print('⚠️  WARNING: Image too large (> 10MB)')
else:
    print('✓ Image size OK')

# Check dimensions (requires PIL)
try:
    from PIL import Image
    import io
    img = Image.open(io.BytesIO(image_bytes))
    print(f'Dimensions: {img.width}x{img.height}')
    
    if img.width < 600 or img.height < 600:
        print('⚠️  WARNING: Image resolution too low (< 600px)')
    elif img.width > 4096 or img.height > 4096:
        print('⚠️  WARNING: Image resolution too high (> 4096px)')
    else:
        print('✓ Image dimensions OK')
except ImportError:
    print('(Install Pillow to check dimensions: pip install Pillow)')
"
```

## Why We Can't Catch These Earlier

**We can't know these requirements will fail until we call the API** because:

1. **Face detection** - We don't have face detection on our backend
2. **Face size calculation** - Requires AI to determine if face is >60% of width
3. **Lighting analysis** - Requires image processing to detect darkness
4. **Face angle detection** - Requires facial landmark detection

Perfect Corp's API does all this validation, so we only know after calling them.

## What We CAN Do

✅ **Validate image size** - Check file size before upload (we do this now)
✅ **Validate dimensions** - Check resolution in frontend before capture
✅ **User guidance** - Show clear instructions for taking selfies
✅ **Better error messages** - Return user-friendly messages (we do this now)
✅ **Retry with guidance** - Let user retake photo with specific feedback

## Recommended Frontend Flow

```typescript
async function captureSelfie() {
  try {
    // 1. Capture from camera
    const base64 = await captureFromCamera();
    
    // 2. Validate locally
    if (!validateImageSize(base64)) {
      showError("Image quality too low. Please try again with better lighting.");
      return;
    }
    
    // 3. Send to backend
    const response = await api.post('/api/onboarding/analyze', {
      user_id,
      selfie: base64
    });
    
    // 4. Success!
    handleSuccess(response.data);
    
  } catch (error) {
    // 5. Show user-friendly error
    if (error.response?.status === 400) {
      // Perfect Corp validation error - show specific guidance
      showError(error.response.data.detail);
    } else if (error.response?.status === 422) {
      // Pydantic validation error - image format issue
      showError("Invalid image format. Please try again.");
    } else {
      // Other errors
      showError("Something went wrong. Please try again.");
    }
  }
}
```

## Summary

**These errors are EXPECTED and NORMAL** - they're Perfect Corp's way of ensuring high-quality analysis. We can't prevent them entirely, but we can:

1. ✅ Guide users to take better photos
2. ✅ Validate what we can before calling API
3. ✅ Return clear, actionable error messages
4. ✅ Let users retry with specific guidance

The goal is to **minimize** these errors through good UX, not eliminate them (which is impossible without our own face detection AI).
