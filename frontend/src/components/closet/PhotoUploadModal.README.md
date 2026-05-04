# PhotoUploadModal Component

## Overview

The `PhotoUploadModal` component enables users to add items to their digital closet by capturing photos with their device camera or uploading image files. It includes comprehensive validation, drag-and-drop support, upload progress tracking, and AI-powered metadata extraction.

## Features

✅ **Camera Capture**: Access device camera to take photos of closet items  
✅ **File Upload**: Upload JPEG, PNG, or WebP images from device  
✅ **Drag & Drop**: Drag and drop files directly onto the upload area  
✅ **File Validation**: Validates file type and size (<10MB)  
✅ **Upload Progress**: Visual progress indicator during upload  
✅ **Error Handling**: Graceful handling of camera permissions and upload errors  
✅ **AI Metadata Extraction**: Automatically extracts category, color, brand, and occasions  
✅ **Responsive Design**: Works seamlessly on mobile and desktop  
✅ **Accessibility**: Full keyboard navigation and ARIA labels  

## Requirements Validated

This component validates the following requirements from the spec:

- **Requirement 2.1**: Present options to capture a photo or upload from device ✅
- **Requirement 2.2**: Support image capture via device camera ✅
- **Requirement 2.3**: Support image file upload (JPEG, PNG, WebP formats) ✅
- **Requirement 2.6**: Validate that uploaded images are under 10MB in size ✅
- **Requirement 2.7**: Display an error message and allow retry if upload fails ✅

## Usage

### Basic Example

```tsx
import { useState } from "react";
import PhotoUploadModal from "@/components/closet/PhotoUploadModal";

function ClosetPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleUploadComplete = (imageUrl: string, metadata: ExtractedMetadata) => {
    console.log("Uploaded image:", imageUrl);
    console.log("Extracted metadata:", metadata);
    
    // Create closet item with the uploaded image and metadata
    // ...
  };

  return (
    <>
      <button onClick={() => setIsModalOpen(true)}>
        Add Item
      </button>

      <PhotoUploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUploadComplete={handleUploadComplete}
      />
    </>
  );
}
```

### With Metadata Form

```tsx
import { useState } from "react";
import PhotoUploadModal from "@/components/closet/PhotoUploadModal";
import MetadataForm from "@/components/closet/MetadataForm";

function ClosetPage() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isMetadataFormOpen, setIsMetadataFormOpen] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [extractedMetadata, setExtractedMetadata] = useState<any>(null);

  const handleUploadComplete = (imageUrl: string, metadata: ExtractedMetadata) => {
    setUploadedImage(imageUrl);
    setExtractedMetadata(metadata);
    setIsUploadModalOpen(false);
    setIsMetadataFormOpen(true);
  };

  const handleMetadataSubmit = async (finalMetadata: any) => {
    // Create closet item with final metadata
    const response = await fetch("/api/closet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...finalMetadata,
        imageUrl: uploadedImage,
      }),
    });
    
    if (response.ok) {
      setIsMetadataFormOpen(false);
      // Refresh closet items
    }
  };

  return (
    <>
      <PhotoUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadComplete={handleUploadComplete}
      />

      <MetadataForm
        isOpen={isMetadataFormOpen}
        imageUrl={uploadedImage}
        initialMetadata={extractedMetadata}
        onSubmit={handleMetadataSubmit}
        onCancel={() => setIsMetadataFormOpen(false)}
      />
    </>
  );
}
```

## Props

### `PhotoUploadModalProps`

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | `boolean` | Yes | Controls modal visibility |
| `onClose` | `() => void` | Yes | Called when modal is closed |
| `onUploadComplete` | `(imageUrl: string, metadata: ExtractedMetadata) => void` | Yes | Called when upload and metadata extraction complete |

### `ExtractedMetadata`

```typescript
interface ExtractedMetadata {
  category?: string;        // e.g., "Tops", "Bottoms", "Shoes"
  subcategory?: string;     // e.g., "T-Shirt", "Jeans", "Sneakers"
  color?: string;           // e.g., "Blue", "Red", "Black"
  color_hex?: string;       // e.g., "#0000FF"
  brand?: string;           // e.g., "Nike", "Zara"
  occasions?: string[];     // e.g., ["Casual", "Work"]
  confidence?: number;      // AI confidence score (0-1)
}
```

## File Validation

The component validates uploaded files against the following criteria:

- **Supported formats**: JPEG, PNG, WebP
- **Maximum file size**: 10MB
- **Error messages**:
  - "Please upload a JPEG, PNG, or WebP image" (invalid format)
  - "File size must be less than 10MB" (file too large)

## Camera Permissions

The component handles camera permission errors gracefully:

- **NotAllowedError**: "Camera access denied. Please enable camera permissions in your browser."
- **NotFoundError**: "No camera found on this device."
- **Other errors**: "Failed to access camera. Please try again."

## Upload Flow

1. User opens modal
2. User selects capture mode (camera or upload)
3. **Camera mode**:
   - Request camera permissions
   - Show live camera preview
   - User captures photo
   - Photo is converted to JPEG file
4. **Upload mode**:
   - User selects file or drags & drops
   - File is validated
   - Preview is shown
5. User confirms upload
6. File is uploaded to Supabase Storage (with progress indicator)
7. AI metadata extraction is triggered
8. `onUploadComplete` callback is called with image URL and metadata
9. Modal closes

## Storage Structure

Images are uploaded to Supabase Storage with the following structure:

```
Bucket: closet-items
├── {user_id}/
│   ├── {timestamp}_{random}.jpg
│   ├── {timestamp}_{random}.png
│   └── ...
```

## Styling

The component uses the Mirra design system:

- **Glass morphism**: `glass-card` class for modal background
- **Design tokens**: CSS variables (`var(--primary)`, `var(--surface)`, etc.)
- **Material Symbols**: Icons from Material Symbols Outlined
- **Animations**: `slide-up` animation on modal open
- **Responsive**: Mobile-first design with touch-friendly tap targets (44x44px minimum)

## Accessibility

- ✅ ARIA labels on all interactive elements
- ✅ Keyboard navigation (Tab, Shift+Tab, Escape)
- ✅ Focus trap within modal
- ✅ Screen reader announcements for errors
- ✅ Semantic HTML (`<dialog>` element)
- ✅ Touch-friendly tap targets (minimum 44x44px)

## Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

**Note**: Camera capture requires `navigator.mediaDevices.getUserMedia()` support.

## Dependencies

- `@supabase/supabase-js`: For file upload to Supabase Storage
- `react`: Core React library
- Material Symbols Outlined: For icons (loaded via CDN in layout)

## Backend Integration

The component expects the following backend endpoint:

### POST `/api/closet/extract-metadata`

**Request:**
```json
{
  "imageUrl": "https://example.com/image.jpg"
}
```

**Response:**
```json
{
  "metadata": {
    "category": "Tops",
    "subcategory": "T-Shirt",
    "color": "Blue",
    "color_hex": "#0000FF",
    "brand": "Nike",
    "occasions": ["Casual", "Athletic"],
    "confidence": 0.95
  }
}
```

## Testing

The component includes comprehensive unit tests covering:

- ✅ Rendering and visibility
- ✅ File validation (type and size)
- ✅ Drag and drop functionality
- ✅ Camera permission errors
- ✅ Upload flow and progress
- ✅ Metadata extraction
- ✅ Error handling

Run tests with:
```bash
npm test -- PhotoUploadModal.test.tsx
```

## Future Enhancements

- [ ] Image cropping and rotation
- [ ] Multiple file upload (batch)
- [ ] Image compression before upload
- [ ] Offline support with queue
- [ ] Video capture for 360° item views
- [ ] Background removal for cleaner item images

## Related Components

- `MetadataForm`: Form for reviewing and editing extracted metadata
- `ClosetGrid`: Grid display of closet items
- `ClosetItemCard`: Individual item card component

## Support

For issues or questions, please refer to:
- Design document: `.kiro/specs/complete-closet-experience/design.md`
- Requirements: `.kiro/specs/complete-closet-experience/requirements.md`
- Tasks: `.kiro/specs/complete-closet-experience/tasks.md`
