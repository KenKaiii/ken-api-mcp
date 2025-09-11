import { z } from 'zod';

// Job status constants
export const JobStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing', 
  COMPLETED: 'completed',
  FAILED: 'failed'
} as const;

export type JobStatusType = typeof JobStatus[keyof typeof JobStatus];

// Base API response types
export const APIErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.string().optional(),
  context: z.record(z.any()).optional()
});

export type APIError = z.infer<typeof APIErrorSchema>;

export const JobResponseSchema = z.object({
  job_id: z.string(),
  status: z.string(),
  message: z.string().optional(),
  result_path: z.string().optional()
});

export type JobResponse = z.infer<typeof JobResponseSchema>;

export const JobStatusResponseSchema = z.object({
  id: z.string(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  progress: z.number(),
  operation: z.string(),
  start_time: z.string().optional(),
  end_time: z.string().optional(), 
  duration: z.string().optional(),
  result_path: z.string().optional(),
  error: z.string().optional(),
  can_be_cancelled: z.boolean().optional(),
  eta: z.string().optional()
});

export type JobStatusResponse = z.infer<typeof JobStatusResponseSchema>;

// Health check response
export const HealthResponseSchema = z.object({
  service: z.string(),
  status: z.string(),
  version: z.string(),
  timestamp: z.string(),
  uptime: z.string(),
  ffmpeg_available: z.boolean(),
  openai_configured: z.boolean()
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

// URL-based processing requests
export const AddAudioFromURLsSchema = z.object({
  video_url: z.string().url(),
  audio_url: z.string().url(),
  volume: z.number().min(0).max(2.0).default(0.8),
  offset: z.number().min(0).default(0)
});

export type AddAudioFromURLsRequest = z.infer<typeof AddAudioFromURLsSchema>;

export const AutoCaptionFromURLSchema = z.object({
  video_url: z.string().url(),
  language: z.string().default('en'),
  font_size: z.number().min(8).max(72).default(16),
  font_color: z.string().default('white'),
  background_color: z.string().optional(),
  position: z.enum(['top', 'center', 'bottom']).default('bottom'),
  word_highlight: z.boolean().default(false)
});

export type AutoCaptionFromURLRequest = z.infer<typeof AutoCaptionFromURLSchema>;

// File-based processing requests
export const ConvertVideoSchema = z.object({
  output_format: z.enum(['mp4', 'webm', 'avi', 'mov', 'mkv']),
  quality: z.enum(['low', 'medium', 'high', 'ultra']).default('medium')
});

export type ConvertVideoRequest = z.infer<typeof ConvertVideoSchema>;

export const RemoveSilenceSchema = z.object({
  threshold: z.number().min(-60).max(0).default(-30),
  duration: z.number().min(0.1).max(10).default(0.5)
});

export type RemoveSilenceRequest = z.infer<typeof RemoveSilenceSchema>;

export const AddAudioSchema = z.object({
  volume: z.number().min(0).max(2.0).default(0.8),
  offset: z.number().min(0).default(0)
});

export type AddAudioRequest = z.infer<typeof AddAudioSchema>;

export const AutoCaptionSchema = z.object({
  language: z.string().default('en'),
  font_size: z.number().min(8).max(72).default(16),
  font_color: z.string().default('white'),
  position: z.enum(['top', 'center', 'bottom']).default('bottom')
});

export type AutoCaptionRequest = z.infer<typeof AutoCaptionSchema>;

export const AdvancedMergeSchema = z.object({
  layout: z.enum(['side_by_side', 'vertical_stack', 'grid', 'pip', 'concat']).default('concat'),
  transition_type: z.enum(['fade', 'dissolve', 'slide']).optional(),
  transition_duration: z.number().min(0.1).max(5.0).default(1.0).optional()
});

export type AdvancedMergeRequest = z.infer<typeof AdvancedMergeSchema>;

export const TransitionsSchema = z.object({
  transition_type: z.enum(['swipe_left', 'swipe_right', 'swipe_up', 'swipe_down', 'fade']),
  duration: z.number().min(0.1).max(5.0).default(1.0),
  direction: z.enum(['left', 'right', 'up', 'down']).optional()
});

export type TransitionsRequest = z.infer<typeof TransitionsSchema>;

// Batch processing
export const BatchOperationSchema = z.object({
  type: z.enum([
    'convert',
    'add-audio',
    'remove-silence',
    'auto-caption',
    'advanced-merge',
    'transitions',
    'add-audio-from-urls',
    'auto-caption-from-url'
  ]),
  parameters: z.record(z.any())
});

export const BatchRequestSchema = z.object({
  operations: z.array(BatchOperationSchema).min(1).max(10)
});

export type BatchRequest = z.infer<typeof BatchRequestSchema>;

// Webhook management
export const CreateWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.enum(['job.completed', 'job.failed', 'job.started'])).min(1)
});

export type CreateWebhookRequest = z.infer<typeof CreateWebhookSchema>;

export const WebhookResponseSchema = z.object({
  id: z.string(),
  url: z.string(),
  events: z.array(z.string()),
  created_at: z.string(),
  delivery_count: z.number(),
  failure_count: z.number(),
  active: z.boolean()
});

export type WebhookResponse = z.infer<typeof WebhookResponseSchema>;

// MCP tool response types
export interface MCPToolResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  suggestion?: string;
  retry_after?: number;
  job_id?: string;
}

// Error response type for failed operations
export interface MCPErrorResponse {
  success: false;
  error?: string;
  message?: string;
  suggestion?: string;
  retry_after?: number;
}

// Configuration types
export interface VideoAPIConfig {
  baseURL: string;
  timeout: number;
  retries: number;
  retryDelay: number;
  pollInterval: number;
  maxPollTime: number;
}