/**
 * Supabase Storage Utilities
 * Handles file uploads, signed URLs, and thumbnail generation for closet items
 */

import { getSupabase } from "@/lib/supabase";
import { retryWithBackoff } from "@/lib/retry";

// ── Constants ──────────────────────────────────────
const STORAGE_BUCKET = "closet-items";
const SIGNED_URL_EXPIRY = 24 * 60 * 60; // 24 hours in seconds
const THUMBNAIL_SIZE = 300; // 300x300px
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const SUPPORTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

// ── Types ──────────────────────────────────────────
export interface UploadOptions {
  onProgress?: (progress: number) => void;
  generateThumbnail?: boolean;
}

export interface UploadResult {
  originalUrl: string;
  thumbnailUrl?: string;
  path: string;
}

export interface StorageError extends Error {
  code?: string;
  statusCode?: number;
}

// ── Validation ──────────────────────────────────────

/**
 * Validate file before upload
 * @throws {StorageError} If validation fails
 */
export function validateFile(file: File): void {
  if (!SUPPORTED_TYPES.includes(file.type)) {
    const error = new Error(
      "Unsupported file type. Please upload JPEG, PNG, or WebP images."
    ) as StorageError;
    error.code = "INVALID_FILE_TYPE";
    throw error;
  }

  if (file.size > MAX_FILE_SIZE) {
    const error = new Error(
      `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit.`
    ) as StorageError;
    error.code = "FILE_TOO_LARGE";
    throw error;
  }
}

// ── Upload Functions ──────────────────────────────────

/**
 * Upload a file to Supabase Storage with retry logic
 * 
 * @param file - File to upload
 * @param userId - User ID for folder organization
 * @param options - Upload options including progress callback
 * @returns Upload result with URLs and path
 * 
 * @example
 * ```typescript
 * const result = await uploadToStorage(file, userId, {
 *   onProgress: (progress) => console.log(`${progress}%`),
 *   generateThumbnail: true
 * });
 * console.log(result.originalUrl, result.thumbnailUrl);
 * ```
 */
export async function uploadToStorage(
  file: File,
  userId: string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const { onProgress, generateThumbnail = true } = options;

  // Validate file
  validateFile(file);

  // Get Supabase client
  const supabase = getSupabase();

  // Generate unique filename
  const fileExt = file.name.split(".").pop() || "jpg";
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(7);
  const itemId = `${timestamp}_${randomId}`;
  const fileName = `${userId}/${itemId}_original.${fileExt}`;

  // Report initial progress
  if (onProgress) {
    onProgress(10);
  }

  // Upload original file with retry logic
  const uploadOriginal = async () => {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      const storageError = new Error(error.message) as StorageError;
      storageError.code = error.name;
      throw storageError;
    }

    return data;
  };

  const uploadData = await retryWithBackoff(uploadOriginal, {
    maxRetries: 3,
    initialDelay: 1000,
    backoffFactor: 2,
    onRetry: (attempt, error) => {
      console.warn(`Upload retry attempt ${attempt}:`, error.message);
      if (onProgress) {
        onProgress(10 + attempt * 5);
      }
    },
  });

  // Report progress after original upload
  if (onProgress) {
    onProgress(50);
  }

  // Get public URL for original
  const {
    data: { publicUrl: originalUrl },
  } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(uploadData.path);

  let thumbnailUrl: string | undefined;

  // Generate and upload thumbnail if requested
  if (generateThumbnail) {
    try {
      const thumbnailFile = await createThumbnail(file, THUMBNAIL_SIZE);
      const thumbnailFileName = `${userId}/${itemId}_thumbnail.${fileExt}`;

      if (onProgress) {
        onProgress(60);
      }

      // Upload thumbnail with retry logic
      const uploadThumbnailFn = async () => {
        const { data, error } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(thumbnailFileName, thumbnailFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (error) {
          const storageError = new Error(error.message) as StorageError;
          storageError.code = error.name;
          throw storageError;
        }

        return data;
      };

      const thumbnailData = await retryWithBackoff(uploadThumbnailFn, {
        maxRetries: 3,
        initialDelay: 1000,
        backoffFactor: 2,
        onRetry: (attempt) => {
          console.warn(`Thumbnail upload retry attempt ${attempt}`);
          if (onProgress) {
            onProgress(60 + attempt * 5);
          }
        },
      });

      // Get public URL for thumbnail
      const {
        data: { publicUrl },
      } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(thumbnailData.path);
      thumbnailUrl = publicUrl;

      if (onProgress) {
        onProgress(90);
      }
    } catch (error) {
      // Log thumbnail generation error but don't fail the upload
      console.error("Thumbnail generation failed:", error);
      // Continue without thumbnail
    }
  }

  // Report completion
  if (onProgress) {
    onProgress(100);
  }

  return {
    originalUrl,
    thumbnailUrl,
    path: uploadData.path,
  };
}

// ── Signed URL Functions ──────────────────────────────

/**
 * Get a signed URL for a storage path
 * 
 * @param path - Storage path (e.g., "user_id/item_id_original.jpg")
 * @param expiresIn - Expiry time in seconds (default: 24 hours)
 * @returns Signed URL
 * 
 * @example
 * ```typescript
 * const signedUrl = await getSignedUrl("user123/item456_original.jpg");
 * const shortLivedUrl = await getSignedUrl("user123/item456_original.jpg", 3600); // 1 hour
 * ```
 */
export async function getSignedUrl(
  path: string,
  expiresIn: number = SIGNED_URL_EXPIRY
): Promise<string> {
  const supabase = getSupabase();

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error) {
    const storageError = new Error(
      `Failed to generate signed URL: ${error.message}`
    ) as StorageError;
    storageError.code = error.name;
    throw storageError;
  }

  if (!data?.signedUrl) {
    throw new Error("No signed URL returned from storage");
  }

  return data.signedUrl;
}

/**
 * Get signed URLs for multiple paths in batch
 * 
 * @param paths - Array of storage paths
 * @param expiresIn - Expiry time in seconds (default: 24 hours)
 * @returns Array of signed URLs in the same order as paths
 */
export async function getSignedUrls(
  paths: string[],
  expiresIn: number = SIGNED_URL_EXPIRY
): Promise<string[]> {
  const supabase = getSupabase();

  const results = await Promise.allSettled(
    paths.map((path) =>
      supabase.storage.from(STORAGE_BUCKET).createSignedUrl(path, expiresIn)
    )
  );

  return results.map((result, index) => {
    if (result.status === "fulfilled" && result.value.data?.signedUrl) {
      return result.value.data.signedUrl;
    }
    console.error(`Failed to get signed URL for path ${paths[index]}`);
    return "";
  });
}

// ── Thumbnail Generation ──────────────────────────────

/**
 * Generate a thumbnail from an image file
 * 
 * @param file - Original image file
 * @param maxSize - Maximum width/height in pixels (default: 300)
 * @returns Thumbnail file
 * 
 * @example
 * ```typescript
 * const thumbnail = await generateThumbnail(originalFile, 300);
 * ```
 */
export async function generateThumbnail(
  file: File,
  maxSize: number = THUMBNAIL_SIZE
): Promise<File> {
  return createThumbnail(file, maxSize);
}

/**
 * Internal function to create a thumbnail from an image file
 */
async function createThumbnail(
  file: File,
  maxSize: number
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Failed to get canvas context"));
      return;
    }

    img.onload = () => {
      // Calculate dimensions maintaining aspect ratio
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
      }

      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;

      // Draw image on canvas
      ctx.drawImage(img, 0, 0, width, height);

      // Convert canvas to blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to generate thumbnail blob"));
            return;
          }

          // Create file from blob
          const thumbnailFile = new File(
            [blob],
            file.name.replace(/\.(jpg|jpeg|png|webp)$/i, "_thumbnail.$1"),
            { type: file.type }
          );

          resolve(thumbnailFile);
        },
        file.type,
        0.9 // Quality
      );
    };

    img.onerror = () => {
      reject(new Error("Failed to load image for thumbnail generation"));
    };

    // Load image from file
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        img.src = e.target.result as string;
      }
    };
    reader.onerror = () => {
      reject(new Error("Failed to read file for thumbnail generation"));
    };
    reader.readAsDataURL(file);
  });
}

// ── Delete Functions ──────────────────────────────────

/**
 * Delete a file from storage
 * 
 * @param path - Storage path to delete
 * @returns True if successful
 */
export async function deleteFile(path: string): Promise<boolean> {
  const supabase = getSupabase();

  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([path]);

  if (error) {
    console.error(`Failed to delete file ${path}:`, error);
    return false;
  }

  return true;
}

/**
 * Delete multiple files from storage
 * 
 * @param paths - Array of storage paths to delete
 * @returns Number of successfully deleted files
 */
export async function deleteFiles(paths: string[]): Promise<number> {
  const supabase = getSupabase();

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove(paths);

  if (error) {
    console.error("Failed to delete files:", error);
    return 0;
  }

  return data?.length || 0;
}

/**
 * Delete all files for a closet item (original + thumbnail)
 * 
 * @param userId - User ID
 * @param itemId - Item ID
 * @returns True if all files deleted successfully
 */
export async function deleteClosetItemFiles(
  userId: string,
  itemId: string
): Promise<boolean> {
  const paths = [
    `${userId}/${itemId}_original.jpg`,
    `${userId}/${itemId}_original.png`,
    `${userId}/${itemId}_original.webp`,
    `${userId}/${itemId}_thumbnail.jpg`,
    `${userId}/${itemId}_thumbnail.png`,
    `${userId}/${itemId}_thumbnail.webp`,
  ];

  const deletedCount = await deleteFiles(paths);
  return deletedCount > 0;
}

// ── Utility Functions ──────────────────────────────────

/**
 * Extract item ID from storage path
 * 
 * @param path - Storage path (e.g., "user123/item456_original.jpg")
 * @returns Item ID or null if not found
 */
export function extractItemIdFromPath(path: string): string | null {
  const match = path.match(/\/(\d+_[a-z0-9]+)_(?:original|thumbnail)\./);
  return match ? match[1] : null;
}

/**
 * Get storage path for an item
 * 
 * @param userId - User ID
 * @param itemId - Item ID
 * @param type - File type ("original" or "thumbnail")
 * @param extension - File extension (default: "jpg")
 * @returns Storage path
 */
export function getStoragePath(
  userId: string,
  itemId: string,
  type: "original" | "thumbnail" = "original",
  extension: string = "jpg"
): string {
  return `${userId}/${itemId}_${type}.${extension}`;
}

/**
 * Check if a file exists in storage
 * 
 * @param path - Storage path to check
 * @returns True if file exists
 */
export async function fileExists(path: string): Promise<boolean> {
  const supabase = getSupabase();

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .list(path.split("/")[0], {
      search: path.split("/")[1],
    });

  if (error) {
    return false;
  }

  return data && data.length > 0;
}
