/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AlertCircle, Camera, ImageIcon, Upload, X } from "lucide-react";
import { getApiUrl } from "@/lib/constants";
import { getSupabase } from "@/lib/supabase";
import { uploadToStorage as uploadFile } from "@/lib/storage";

interface PhotoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: (imageUrl: string, metadata: ExtractedMetadata) => void;
}

interface ExtractedMetadata {
  category: string;
  subcategory?: string;
  primary_color: string;
  color_hex: string;
  secondary_colors?: string[];
  brand?: string;
  material?: string;
  pattern?: string;
  formality?: number;
  occasions?: string[];
  seasons?: string[];
  confidence_scores?: Record<string, number>;
}

type CaptureMode = "camera" | "upload" | null;
const SUPPORTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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

  // Cleanup on unmount or close, and lock scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      const timeoutId = window.setTimeout(() => {
        cleanup();
      }, 0);
      document.body.style.overflow = '';
      return () => {
        window.clearTimeout(timeoutId);
      };
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, cleanup]);

  // Handle close
  const handleClose = useCallback(() => {
    cleanup();
    onClose();
  }, [cleanup, onClose]);

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
  }, [handleClose, isOpen]);

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
    const context = canvas.getContext("2d", { willReadFrequently: true });

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
      const response = await fetch(getApiUrl("/api/closet/extract-metadata"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });

      if (!response.ok) {
        throw new Error("Failed to extract metadata");
      }

      const data = await response.json();
      return data.metadata || {
        category: '',
        primary_color: '',
        color_hex: '#000000'
      };
    } catch (err) {
      console.error("Metadata extraction error:", err);
      // Return empty metadata on error - user can fill manually
      return {
        category: '',
        primary_color: '',
        color_hex: '#000000'
      };
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-md"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="photo-upload-modal-title"
    >
      <div
        ref={modalRef}
        className="glass-card max-h-[90dvh] w-full max-w-xl overflow-auto rounded-[1.5rem] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-6"
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
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-colors hover:bg-white/10"
            aria-label="Close modal"
            disabled={isUploading}
          >
            <X size={18} aria-hidden="true" />
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
              <AlertCircle size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
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
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left transition-all hover:-translate-y-0.5 hover:bg-white/[0.07]"
              style={{
                color: "var(--on-surface)",
              }}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary)]/15 text-[var(--primary)]">
                  <Camera size={24} aria-hidden="true" />
                </div>
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
              className="w-full rounded-2xl border border-dashed p-5 text-left transition-all hover:-translate-y-0.5 hover:bg-white/[0.07]"
              style={{
                borderColor: isDragging ? "var(--primary)" : "var(--outline-variant)",
                background: isDragging ? "rgba(0, 1, 1, 0.05)" : "var(--surface)",
                color: "var(--on-surface)",
              }}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary)]/15 text-[var(--primary)]">
                  <Upload size={24} aria-hidden="true" />
                </div>
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
                <Camera size={18} aria-hidden="true" />
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
                <ImageIcon size={18} aria-hidden="true" style={{ color: "var(--on-surface-variant)" }} />
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
    </div>
  );
}
