/**
 * Image validation utilities for Perfect Corp API requirements
 */

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  width?: number;
  height?: number;
  sizeKB?: number;
}

/**
 * Validate image dimensions and size before sending to Perfect Corp API
 * 
 * Requirements:
 * - SD Skin Analysis: Short side ≥ 480px
 * - HD Skin Analysis: Short side ≥ 1080px
 * - Max file size: 10MB
 * - Face must occupy >60% of image width
 */
export async function validateImage(
  imageData: string | Blob,
  minShortSide: number = 480
): Promise<ImageValidationResult> {
  return new Promise((resolve) => {
    const img = new Image();
    
    img.onload = () => {
      const width = img.width;
      const height = img.height;
      const shortSide = Math.min(width, height);
      
      // Check minimum dimensions
      if (shortSide < minShortSide) {
        resolve({
          valid: false,
          error: `Image too small. Minimum short side: ${minShortSide}px (got ${shortSide}px)`,
          width,
          height,
        });
        return;
      }
      
      // Check maximum dimensions (4096px long side)
      const longSide = Math.max(width, height);
      if (longSide > 4096) {
        resolve({
          valid: false,
          error: `Image too large. Maximum long side: 4096px (got ${longSide}px)`,
          width,
          height,
        });
        return;
      }
      
      // Estimate file size from base64 (if string)
      if (typeof imageData === 'string') {
        const base64Data = imageData.split(',')[1] || imageData;
        const sizeInBytes = (base64Data.length * 3) / 4;
        const sizeKB = sizeInBytes / 1024;
        
        // Check file size (< 10MB)
        if (sizeKB > 10240) {
          resolve({
            valid: false,
            error: `Image file too large. Maximum: 10MB (got ${(sizeKB / 1024).toFixed(1)}MB)`,
            width,
            height,
            sizeKB,
          });
          return;
        }
        
        resolve({
          valid: true,
          width,
          height,
          sizeKB,
        });
      } else {
        // Blob
        const sizeKB = imageData.size / 1024;
        
        if (sizeKB > 10240) {
          resolve({
            valid: false,
            error: `Image file too large. Maximum: 10MB (got ${(sizeKB / 1024).toFixed(1)}MB)`,
            width,
            height,
            sizeKB,
          });
          return;
        }
        
        resolve({
          valid: true,
          width,
          height,
          sizeKB,
        });
      }
    };
    
    img.onerror = () => {
      resolve({
        valid: false,
        error: 'Invalid image file',
      });
    };
    
    // Load image
    if (typeof imageData === 'string') {
      img.src = imageData;
    } else {
      img.src = URL.createObjectURL(imageData);
    }
  });
}

/**
 * Resize image to meet minimum dimensions if needed
 * Returns base64 data URL
 */
export async function resizeImageIfNeeded(
  imageData: string,
  minShortSide: number = 480
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      const width = img.width;
      const height = img.height;
      const shortSide = Math.min(width, height);
      
      // If already meets requirements, return as-is
      if (shortSide >= minShortSide) {
        resolve(imageData);
        return;
      }
      
      // Calculate scale to meet minimum
      const scale = minShortSide / shortSide;
      const newWidth = Math.round(width * scale);
      const newHeight = Math.round(height * scale);
      
      // Create canvas and resize
      const canvas = document.createElement('canvas');
      canvas.width = newWidth;
      canvas.height = newHeight;
      
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, newWidth, newHeight);
      
      // Convert to base64 with high quality
      const resizedBase64 = canvas.toDataURL('image/jpeg', 0.9);
      resolve(resizedBase64);
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = imageData;
  });
}
