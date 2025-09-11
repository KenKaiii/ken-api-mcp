import { z } from 'zod';

// Common validation schemas
export const URLSchema = z.string().url({
  message: "Must be a valid URL starting with http:// or https://"
});

export const JobIDSchema = z.string().min(1, {
  message: "Job ID cannot be empty"
});

export const FilePathSchema = z.string().min(1, {
  message: "File path cannot be empty"
});

// Video format validation
export const VideoFormatSchema = z.enum(['mp4', 'webm', 'avi', 'mov', 'mkv'], {
  errorMap: () => ({ message: "Supported video formats: MP4, WebM, AVI, MOV, MKV" })
});

export const AudioFormatSchema = z.enum(['mp3', 'wav', 'aac', 'flac', 'ogg'], {
  errorMap: () => ({ message: "Supported audio formats: MP3, WAV, AAC, FLAC, OGG" })
});

// Quality validation
export const QualitySchema = z.enum(['low', 'medium', 'high', 'ultra'], {
  errorMap: () => ({ message: "Quality must be: low, medium, high, or ultra" })
});

// Volume validation with helpful messages
export const VolumeSchema = z.number()
  .min(0, { message: "Volume cannot be negative" })
  .max(2.0, { message: "Maximum volume is 2.0 (double the original)" })
  .default(0.8);

// Duration validation
export const DurationSchema = z.number()
  .min(0.1, { message: "Duration must be at least 0.1 seconds" })
  .max(5.0, { message: "Maximum duration is 5.0 seconds" });

// Language code validation
export const LanguageSchema = z.string()
  .min(2, { message: "Language code must be at least 2 characters (e.g., 'en', 'es', 'fr')" })
  .max(5, { message: "Language code too long" })
  .default('en');

// Font validation
export const FontSizeSchema = z.number()
  .min(8, { message: "Minimum font size is 8 pixels" })
  .max(72, { message: "Maximum font size is 72 pixels" })
  .default(16);

export const ColorSchema = z.string()
  .min(1, { message: "Color cannot be empty" })
  .refine(
    (color) => /^(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|[a-zA-Z]+)$/.test(color),
    { message: "Color must be a valid name (white, black, red) or hex code (#ffffff, #fff)" }
  );

// Position validation
export const PositionSchema = z.enum(['top', 'center', 'bottom'], {
  errorMap: () => ({ message: "Position must be: top, center, or bottom" })
});

// Layout validation for merging
export const LayoutSchema = z.enum(['side_by_side', 'vertical_stack', 'grid', 'pip', 'concat'], {
  errorMap: () => ({ message: "Layout must be: side_by_side, vertical_stack, grid, pip, or concat" })
});

// Transition validation
export const TransitionTypeSchema = z.enum(['fade', 'dissolve', 'slide', 'swipe_left', 'swipe_right', 'swipe_up', 'swipe_down'], {
  errorMap: () => ({ message: "Transition type must be: fade, dissolve, slide, swipe_left, swipe_right, swipe_up, or swipe_down" })
});

// Utility functions for validation
export function validateAndParseURL(url: string): { success: boolean; error?: string; data?: string } {
  try {
    const result = URLSchema.parse(url);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: error.errors[0]?.message || "Invalid URL format" 
      };
    }
    return { 
      success: false, 
      error: "URL validation failed" 
    };
  }
}

export function validateJobID(jobId: string): { success: boolean; error?: string; data?: string } {
  try {
    const result = JobIDSchema.parse(jobId);
    return { success: true, data: result };
  } catch {
    return { 
      success: false, 
      error: "Job ID must be a non-empty string" 
    };
  }
}

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9\-_.]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 100); // Limit length
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) {
    return '0 Bytes';
  }
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.round(seconds % 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

// Error message templates for LLMs
export const ERROR_MESSAGES = {
  INVALID_URL: "Please provide a valid URL starting with http:// or https://",
  MISSING_JOB_ID: "Job ID is required. This should be the job_id returned from a video processing operation.",
  FILE_NOT_FOUND: "Could not find the specified file. Please check the file path and ensure the file exists.",
  RATE_LIMIT: "API rate limit exceeded. Please wait a moment before trying again.",
  CONNECTION_ERROR: "Cannot connect to the Ken Video API. Please check your internet connection and API availability.",
  PROCESSING_FAILED: "Video processing failed. This might be due to unsupported file format, corrupted file, or processing limitations.",
  JOB_TIMEOUT: "Job processing timed out. The operation might still be running - check job status manually.",
  INSUFFICIENT_RESOURCES: "Processing requires more resources than currently available. Try with smaller files or simpler operations."
};