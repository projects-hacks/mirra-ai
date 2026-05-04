# Camera Kit SDK Integration Fix

## Issue Summary

The Perfect Corp Camera Kit SDK v2.4 was failing to load with a 404 error on the production domain `mirra-ai-ten.vercel.app`.

## Root Causes Identified

### 1. ✅ FIXED: Incorrect Global Object Name
**Problem**: The implementation was looking for `window.YMKCameraKit`, but the SDK creates `window.YMK`.

**Solution**: Updated `useCameraKit.ts` to use the correct global name `window.YMK` as per the official documentation.

**Changes Made**:
- Renamed interface from `YMKCameraKit` to `YMKCameraKitSDK` (internal type)
- Updated all `window.YMKCameraKit` references to `window.YMK`
- Removed conflicting `window.YMK` declaration from `useCamera.ts`
- Deprecated Camera Kit usage in `useCamera.ts` (now uses native camera only)

**Commit**: `55c1a79` - "fix: correct Camera Kit SDK global name from YMKCameraKit to YMK"

### 2. ⚠️ PENDING: Domain Whitelisting Required
**Problem**: The SDK is returning a 404 error when loading from:
```
https://plugins-media.makeupar.com/v2.4-camera-kit/sdk.js
```

**Root Cause**: According to Perfect Corp documentation, domains must be registered in the Perfect Corp Console before the SDK will serve resources.

**Action Required**: 
1. Log in to Perfect Corp Console
2. Navigate to domain management settings
3. Add `mirra-ai-ten.vercel.app` to the whitelist
4. Also add any other domains you're using (e.g., `localhost`, staging domains)

## SDK Documentation Reference

### Correct CDN URL
```html
<script src="https://plugins-media.makeupar.com/v2.4-camera-kit/sdk.js"></script>
```

### Global Object
The SDK creates `window.YMK` (not `window.YMKCameraKit`)

### Initialization Pattern
```javascript
window.YMKAsyncInit = function() {
  YMK.init({
    faceDetectionMode: 'skin', // or 'makeup'
    imageFormat: 'base64',     // or 'blob'
    language: 'enu'
  });
  
  YMK.addEventListener('faceDetectionCaptured', function(result) {
    const capturedImage = result.images[0].image;
    console.log("Image ready:", capturedImage);
  });
};
```

### Required Mount Point
```html
<div id="YMK-module"></div>
```

## Implementation Status

### ✅ Completed
- [x] Fixed global object name (`window.YMK`)
- [x] Removed type conflicts between `useCamera.ts` and `useCameraKit.ts`
- [x] TypeScript build passes successfully
- [x] Changes committed and pushed to main branch
- [x] Updated Memory MCP with fix details

### ⚠️ Blocked - Requires User Action
- [ ] Register `mirra-ai-ten.vercel.app` in Perfect Corp Console
- [ ] Verify SDK loads successfully after whitelisting
- [ ] Test face detection and capture flow end-to-end

## Testing Checklist (After Domain Whitelisting)

1. **SDK Loading**
   - [ ] SDK script loads without 404 error
   - [ ] `window.YMK` object is available
   - [ ] `YMKAsyncInit` callback is triggered

2. **Camera Initialization**
   - [ ] Camera permission is requested
   - [ ] Camera feed displays in `#YMK-module` div
   - [ ] Face detection frame appears

3. **Face Detection**
   - [ ] Face alignment guidance works
   - [ ] Lighting validation works
   - [ ] Face size validation (60%+ of frame) works
   - [ ] Automatic capture triggers when conditions are met

4. **Image Capture**
   - [ ] `faceDetectionCaptured` event fires
   - [ ] Base64 image is returned
   - [ ] Image dimensions are correct (640x480 minimum)
   - [ ] Image quality is acceptable (JPEG 0.85)

5. **Error Handling**
   - [ ] Camera permission denied is handled gracefully
   - [ ] SDK load failure shows appropriate error
   - [ ] Face detection failures are handled

## Additional Requirements

### HTTPS Required
The Camera Kit SDK requires HTTPS to access camera hardware. Ensure all environments use HTTPS:
- ✅ Production: `https://mirra-ai-ten.vercel.app`
- ✅ Staging: Should use HTTPS
- ⚠️ Local: Use `https://localhost` or ngrok for testing

### Face Requirements
- Face must occupy **at least 60% of image width**
- Face must be within alignment frame
- Adequate lighting required
- Single face detection (no multiple faces)

## Next Steps

1. **Immediate**: Register domain in Perfect Corp Console
2. **After Whitelisting**: Test SDK loading and face detection
3. **If Issues Persist**: Check browser console for detailed error messages
4. **Future**: Migrate main app (`useCamera.ts`) to use new Camera Kit SDK

## Files Modified

- `frontend/src/hooks/useCameraKit.ts` - Fixed global name, updated all references
- `frontend/src/hooks/useCamera.ts` - Removed conflicting declaration, deprecated Camera Kit usage
- `.kiro/project-memory.jsonl` - Updated with fix details and known issues

## References

- Perfect Corp Camera Kit SDK v2.4 Documentation
- Official CDN: `https://plugins-media.makeupar.com/v2.4-camera-kit/sdk.js`
- Global Object: `window.YMK`
- Required Mount Point: `<div id="YMK-module"></div>`
