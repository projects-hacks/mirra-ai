# Storage Utilities

Supabase Storage utilities for handling closet item uploads, signed URLs, and thumbnail generation.

## Features

- ✅ File upload with retry logic (3 attempts with exponential backoff)
- ✅ Automatic thumbnail generation (300x300px)
- ✅ Progress tracking callbacks
- ✅ Signed URL generation (24-hour expiry by default)
- ✅ File validation (type and size)
- ✅ User-specific folder organization
- ✅ Batch operations support
- ✅ TypeScript type safety

## Installation

The storage utilities are already integrated into the project. Simply import them:

```typescript
import { uploadToStorage, getSignedUrl, generateThumbnail } from '@/lib/storage';
```

## Storage Structure

Files are organized in Supabase Storage with the following structure:

```
Bucket: closet-items
├── {user_id}/
│   ├── {timestamp}_{random}_original.jpg
│   ├── {timestamp}_{random}_thumbnail.jpg
│   └── ...
```

## API Reference

### `uploadToStorage(file, userId, options?)`

Upload a file to Supabase Storage with automatic retry logic and optional thumbnail generation.

**Parameters:**
- `file: File` - The file to upload
- `userId: string` - User ID for folder organization
- `options?: UploadOptions` - Optional configuration
  - `onProgress?: (progress: number) => void` - Progress callback (0-100)
  - `generateThumbnail?: boolean` - Generate thumbnail (default: true)

**Returns:** `Promise<UploadResult>`
- `originalUrl: string` - Public URL of the original file
- `thumbnailUrl?: string` - Public URL of the thumbnail (if generated)
- `path: string` - Storage path

**Example:**
```typescript
const result = await uploadToStorage(file, userId, {
  onProgress: (progress) => console.log(`${progress}%`),
  generateThumbnail: true
});

console.log(result.originalUrl);
console.log(result.thumbnailUrl);
```

### `getSignedUrl(path, expiresIn?)`

Generate a signed URL for temporary access to a file.

**Parameters:**
- `path: string` - Storage path (e.g., "user123/item456_original.jpg")
- `expiresIn?: number` - Expiry time in seconds (default: 86400 = 24 hours)

**Returns:** `Promise<string>` - Signed URL

**Example:**
```typescript
const signedUrl = await getSignedUrl("user123/item456_original.jpg");
const shortLivedUrl = await getSignedUrl("user123/item456_original.jpg", 3600); // 1 hour
```

### `getSignedUrls(paths, expiresIn?)`

Generate signed URLs for multiple files in batch.

**Parameters:**
- `paths: string[]` - Array of storage paths
- `expiresIn?: number` - Expiry time in seconds (default: 86400)

**Returns:** `Promise<string[]>` - Array of signed URLs

**Example:**
```typescript
const urls = await getSignedUrls([
  "user123/item1_original.jpg",
  "user123/item2_original.jpg"
]);
```

### `generateThumbnail(file, maxSize?)`

Generate a thumbnail from an image file.

**Parameters:**
- `file: File` - Original image file
- `maxSize?: number` - Maximum width/height in pixels (default: 300)

**Returns:** `Promise<File>` - Thumbnail file

**Example:**
```typescript
const thumbnail = await generateThumbnail(originalFile, 300);
```

### `deleteFile(path)`

Delete a single file from storage.

**Parameters:**
- `path: string` - Storage path to delete

**Returns:** `Promise<boolean>` - True if successful

### `deleteFiles(paths)`

Delete multiple files from storage.

**Parameters:**
- `paths: string[]` - Array of storage paths to delete

**Returns:** `Promise<number>` - Number of successfully deleted files

### `deleteClosetItemFiles(userId, itemId)`

Delete all files for a closet item (original + thumbnail).

**Parameters:**
- `userId: string` - User ID
- `itemId: string` - Item ID

**Returns:** `Promise<boolean>` - True if any files were deleted

**Example:**
```typescript
await deleteClosetItemFiles("user123", "1234567_abc");
```

### `getStoragePath(userId, itemId, type?, extension?)`

Generate a storage path for an item.

**Parameters:**
- `userId: string` - User ID
- `itemId: string` - Item ID
- `type?: "original" | "thumbnail"` - File type (default: "original")
- `extension?: string` - File extension (default: "jpg")

**Returns:** `string` - Storage path

**Example:**
```typescript
const path = getStoragePath("user123", "item456", "original", "jpg");
// Returns: "user123/item456_original.jpg"
```

### `extractItemIdFromPath(path)`

Extract item ID from a storage path.

**Parameters:**
- `path: string` - Storage path

**Returns:** `string | null` - Item ID or null if not found

**Example:**
```typescript
const itemId = extractItemIdFromPath("user123/1234567_abc_original.jpg");
// Returns: "1234567_abc"
```

### `fileExists(path)`

Check if a file exists in storage.

**Parameters:**
- `path: string` - Storage path to check

**Returns:** `Promise<boolean>` - True if file exists

## File Validation

Files are automatically validated before upload:

- **Supported formats:** JPEG, PNG, WebP
- **Maximum size:** 10MB
- **Validation errors:** Throw `StorageError` with error codes:
  - `INVALID_FILE_TYPE` - Unsupported file format
  - `FILE_TOO_LARGE` - File exceeds size limit

## Retry Logic

Upload operations automatically retry up to 3 times with exponential backoff:

- **Attempt 1:** Immediate
- **Attempt 2:** 1 second delay
- **Attempt 3:** 2 seconds delay
- **Attempt 4:** 4 seconds delay

Progress callbacks are updated during retry attempts.

## Error Handling

All functions throw `StorageError` on failure:

```typescript
try {
  const result = await uploadToStorage(file, userId);
} catch (error) {
  if (error instanceof Error) {
    console.error('Upload failed:', error.message);
    
    // Check error code if available
    const storageError = error as StorageError;
    if (storageError.code === 'INVALID_FILE_TYPE') {
      // Handle invalid file type
    }
  }
}
```

## Integration with PhotoUploadModal

The storage utilities are already integrated into the `PhotoUploadModal` component:

```typescript
import { uploadToStorage } from '@/lib/storage';

// Inside component
const result = await uploadFile(selectedFile, user.id, {
  onProgress: setUploadProgress,
  generateThumbnail: true,
});
```

## Requirements Validation

This implementation satisfies the following requirements from the spec:

### Requirement 2.4: Photo Upload System
- ✅ User-specific bucket organization
- ✅ Unique filename generation
- ✅ File validation (type and size)
- ✅ Progress tracking support
- ✅ Error handling with retry logic

### Requirement 2.5: Storage Policies
- ✅ Users upload to their own folder (`{user_id}/`)
- ✅ Signed URLs with 24-hour expiry
- ✅ Automatic thumbnail generation (300x300px)
- ✅ Retry logic with exponential backoff (3 attempts)

## Testing

Unit tests are provided in `storage.test.ts`:

```bash
npm test storage.test.ts
```

Tests cover:
- File validation
- Upload with progress tracking
- Signed URL generation
- Thumbnail generation
- File deletion
- Path utilities

## Performance Considerations

- **Thumbnail generation:** Happens client-side using Canvas API
- **Parallel uploads:** Original and thumbnail are uploaded sequentially to avoid overwhelming the connection
- **Progress tracking:** Provides real-time feedback to users
- **Retry logic:** Handles transient network failures automatically

## Security

- **User isolation:** Files are organized by user ID
- **Signed URLs:** Temporary access with configurable expiry
- **File validation:** Prevents upload of malicious files
- **Size limits:** Prevents abuse with 10MB limit

## Future Enhancements

Potential improvements for future iterations:

- [ ] Server-side thumbnail generation using Supabase transforms
- [ ] Image optimization (compression, format conversion)
- [ ] Batch upload support
- [ ] Upload resumption for large files
- [ ] CDN integration for faster delivery
- [ ] Image metadata extraction (EXIF data)
