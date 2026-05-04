"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getSupabase } from "@/lib/supabase";
import { uploadToStorage as uploadFile } from "@/lib/storage";

interface PhotoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: (imageUrl: string, metadata: ExtractedMetadata) => void;
}

interface ExtractedMetadata {
  category?: string;
  subcategory?: string;
  color?: string;
  color_hex?: string;
  brand?: string;
  occasions?: string[];
  confidence?: number;
}

type CaptureMode = "camera" | "upload" | null;

/**
 * Photo Upload Modal Component
 * Enables users to capture or upload closet item photos
 * Supports camera capture, file upload, drag-and-drop, and validation
 */
export default function PhotoUploadModal({
  isOpen,
  onClose,
  onUploadComplete,
}: Readonly<PhotoUploadModalProps>) {
  const [captureMode, setCaptureMode] = useState<CaptureMode>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Supported file types
  const SUPPORTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  // Cleanup on unmount or close
  useEffect(() => {
    if (!isOpen) {
      cleanup();
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  // Cleanup function
  const cleanup = useCallback(() => {
    // Stop camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    // Revoke preview URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    // Reset state
    setCaptureMode(null);
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    setUploadProgress(0);
    setIsUploading(false);
  }, [previewUrl]);

  // Handle close
  const handleClose = useCallback(() => {
    cleanup();
    onClose();
  }, [cleanup, onClose]);

  // Validate file
  const validateFile = useCallback((file: File): string | null => {
    if (!SUPPORTED_TYPES.includes(file.type)) {
      return "Please upload a JPEG, PNG, or WebP image";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "File size must be less than 10MB";
    }
    return null;
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback(
    (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      setSelectedFile(file);
      setError(null);

      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setCaptureMode("upload");
    },
    [validateFile]
  );

  // Handle file input change
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  // Handle drag events
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  // Start camera capture
  const handleCameraCapture = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCaptureMode("camera");
    } catch (err) {
      console.error("Camera access error:", err);
      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          setError("Camera access denied. Please enable camera permissions in your browser.");
        } else if (err.name === "NotFoundError") {
          setError("No camera found on this device.");
        } else {
          setError("Failed to access camera. Please try again.");
        }
      }
    }
  }, []);

  // Capture photo from camera
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    // Set canvas dimensions to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `closet-item-${Date.now()}.jpg`, {
            type: "image/jpeg",
          });
          handleFileSelect(file);

          // Stop camera stream
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
          }
        }
      },
      "image/jpeg",
      0.9
    );
  }, [handleFileSelect]);



  // Extract metadata using AI
  const extractMetadata = useCallback(async (imageUrl: string): Promise<ExtractedMetadata> => {
    try {
      const response = await fetch("/api/closet/extract-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });

      if (!response.ok) {
        throw new Error("Failed to extract metadata");
      }

      const data = await response.json();
      return data.metadata || {};
    } catch (err) {
      console.error("Metadata extraction error:", err);
      // Return empty metadata on error - user can fill manually
      return {};
    }
  }, []);

  // Handle upload
  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Get user ID
      const supabase = getSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not authenticated");
      }

      // Upload to storage with progress tracking
      const result = await uploadFile(selectedFile, user.id, {
        onProgress: setUploadProgress,
        generateThumbnail: true,
      });

      // Extract metadata
      const metadata = await extractMetadata(result.originalUrl);

      // Call completion handler
      onUploadComplete(result.originalUrl, metadata);

      // Close modal
      handleClose();
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, extractMetadata, onUploadComplete, handleClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        handleClose();
      }
    },
    [handleClose]
  );

  if (!isOpen) return null;

  return (
    <dialog
      open
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: "rgba(0, 0, 0, 0.4)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
      onClick={handleBackdropClick}
      aria-modal="true"
      aria-labelledby="photo-upload-modal-title"
    >
      <div
        ref={modalRef}
        className="glass-card w-full max-w-lg animate-slide-up"
        style={{
          animation: "slide-up 0.3s ease-in-out",
          maxHeight: "90vh",
          overflow: "auto",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2
            id="photo-upload-modal-title"
            className="font-serif text-xl font-semibold"
            style={{ color: "var(--on-surface)" }}
          >
            Add Closet Item
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-black/5 transition-colors"
            aria-label="Close modal"
            style={{ minWidth: "44px", minHeight: "44px" }}
            disabled={isUploading}
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div
            className="mb-4 p-3 rounded-lg border"
            style={{
              background: "rgba(186, 26, 26, 0.1)",
              borderColor: "var(--error)",
              color: "var(--error)",
            }}
            role="alert"
          >
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-[20px]">error</span>
              <p className="text-sm flex-1">{error}</p>
            </div>
          </div>
        )}

        {/* Mode Selection */}
        {!captureMode && !selectedFile && (
          <div className="space-y-4">
            {/* Camera Capture Button */}
            <button
              onClick={handleCameraCapture}
              className="w-full p-6 rounded-lg border-2 border-dashed transition-all hover:scale-[1.02]"
              style={{
                borderColor: "var(--outline-variant)",
                background: "var(--surface)",
              }}
            >
              <div className="flex flex-col items-center gap-3">
                <span
                  className="material-symbols-outlined text-[48px]"
                  style={{ color: "var(--primary)" }}
                >
                  photo_camera
                </span>
                <div>
                  <p
                    className="font-sans font-semibold text-base"
                    style={{ color: "var(--on-surface)" }}
                  >
                    Take Photo
                  </p>
                  <p
                    className="text-sm mt-1"
                    style={{ color: "var(--on-surface-variant)" }}
                  >
                    Use your camera to capture an item
                  </p>
                </div>
              </div>
            </button>

            {/* File Upload Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className="w-full p-6 rounded-lg border-2 border-dashed transition-all hover:scale-[1.02]"
              style={{
                borderColor: isDragging ? "var(--primary)" : "var(--outline-variant)",
                background: isDragging ? "rgba(0, 1, 1, 0.05)" : "var(--surface)",
              }}
            >
              <div className="flex flex-col items-center gap-3">
                <span
                  className="material-symbols-outlined text-[48px]"
                  style={{ color: "var(--primary)" }}
                >
                  upload_file
                </span>
                <div>
                  <p
                    className="font-sans font-semibold text-base"
                    style={{ color: "var(--on-surface)" }}
                  >
                    Upload Photo
                  </p>
                  <p
                    className="text-sm mt-1"
                    style={{ color: "var(--on-surface-variant)" }}
                  >
                    Choose a file or drag and drop
                  </p>
                  <p
                    className="text-xs mt-1"
                    style={{ color: "var(--on-surface-muted)" }}
                  >
                    JPEG, PNG, or WebP • Max 10MB
                  </p>
                </div>
              </div>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileInputChange}
              className="hidden"
              aria-label="Upload photo file"
            />
          </div>
        )}

        {/* Camera View */}
        {captureMode === "camera" && !selectedFile && (
          <div className="space-y-4">
            <div
              className="relative rounded-lg overflow-hidden"
              style={{ background: "var(--surface-container)" }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full aspect-[3/4] object-cover"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (streamRef.current) {
                    streamRef.current.getTracks().forEach((track) => track.stop());
                    streamRef.current = null;
                  }
                  setCaptureMode(null);
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button onClick={capturePhoto} className="btn-primary flex-1">
                <span className="material-symbols-outlined text-[20px]">photo_camera</span>
                Capture
              </button>
            </div>
          </div>
        )}

        {/* Preview and Upload */}
        {selectedFile && previewUrl && (
          <div className="space-y-4">
            <div
              className="relative rounded-lg overflow-hidden"
              style={{ background: "var(--surface-container)" }}
            >
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full aspect-[3/4] object-contain"
              />
            </div>

            {/* File Info */}
            <div
              className="p-3 rounded-lg"
              style={{ background: "var(--surface-container)" }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={{ color: "var(--on-surface-variant)" }}
                >
                  image
                </span>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium truncate"
                    style={{ color: "var(--on-surface)" }}
                  >
                    {selectedFile.name}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "var(--on-surface-variant)" }}
                  >
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            </div>

            {/* Upload Progress */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span style={{ color: "var(--on-surface-variant)" }}>
                    Uploading...
                  </span>
                  <span
                    className="font-semibold"
                    style={{ color: "var(--primary)" }}
                  >
                    {uploadProgress}%
                  </span>
                </div>
                <div
                  className="h-2 rounded-full overflow-hidden"
                  style={{ background: "var(--surface-container-high)" }}
                >
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${uploadProgress}%`,
                      background: "var(--primary)",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedFile(null);
                  if (previewUrl) {
                    URL.revokeObjectURL(previewUrl);
                  }
                  setPreviewUrl(null);
                  setCaptureMode(null);
                }}
                className="btn-secondary flex-1"
                disabled={isUploading}
              >
                Change Photo
              </button>
              <button
                onClick={handleUpload}
                className="btn-primary flex-1"
                disabled={isUploading}
              >
                {isUploading ? "Uploading..." : "Upload & Continue"}
              </button>
            </div>
          </div>
        )}

        {/* Hidden canvas for camera capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </dialog>
  );
}
