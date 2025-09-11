import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import { Config, DEFAULT_CONFIG } from '../types/config.js';
import {
  MCPToolResponse,
  JobResponse,
  JobStatusResponse,
  HealthResponse,
  AddAudioFromURLsRequest,
  AutoCaptionFromURLRequest,
  BatchRequest,
  CreateWebhookRequest,
  WebhookResponse,
  ConvertVideoRequest,
  type APIError
} from '../types/api.js';

export class VideoAPIClient {
  private client: AxiosInstance;
  private config: Config;

  constructor(config: Partial<Config> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    this.client = axios.create({
      baseURL: this.config.apiBaseURL,
      timeout: this.config.timeout,
      headers: {
        'User-Agent': this.config.userAgent,
        'Accept': 'application/json'
      }
    });

    // Add request interceptor for logging
    if (this.config.enableLogging) {
      this.client.interceptors.request.use(request => {
        console.log('[VideoAPI] Request:', request.method?.toUpperCase(), request.url);
        return request;
      });
    }

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      response => response,
      error => {
        if (this.config.enableLogging) {
          console.error('[VideoAPI] Error:', error.response?.status, error.response?.data);
        }
        return Promise.reject(error);
      }
    );
  }

  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= this.config.retries; attempt++) {
      try {
        // Add timeout wrapper to prevent hanging requests
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout during retry')), this.config.timeout);
        });
        
        return await Promise.race([operation(), timeoutPromise]);
      } catch (error: any) {
        lastError = error;
        
        // Don't retry for 4xx errors (except rate limits) or timeout errors
        if ((error.response?.status >= 400 && error.response?.status < 500 && error.response?.status !== 429) ||
            error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
          throw error;
        }

        if (attempt < this.config.retries) {
          const delay = Math.min(this.config.retryDelay * Math.pow(1.5, attempt), 30000); // Cap at 30s
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  private formatError(error: any): MCPToolResponse {
    if (error.response?.data?.error) {
      const apiError = error.response.data.error as APIError;
      const retryAfter = error.response.status === 429 ? 60 : undefined;
      return {
        success: false,
        error: apiError.code || 'API_ERROR',
        message: apiError.message || 'An API error occurred',
        suggestion: this.getSuggestionForError(apiError.code, error.response.status),
        retry_after: retryAfter
      };
    }

    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return {
        success: false,
        error: 'CONNECTION_ERROR',
        message: 'Cannot connect to the video API. Please check if the service is running.',
        suggestion: 'Try checking the API health status or contact support if the issue persists.'
      };
    }

    if (error.code === 'ECONNABORTED') {
      return {
        success: false,
        error: 'TIMEOUT_ERROR',
        message: 'Request timed out. Video processing may take longer than expected.',
        suggestion: 'Try increasing the timeout or check job status manually using the job ID.'
      };
    }

    return {
      success: false,
      error: 'UNKNOWN_ERROR',
      message: error.message || 'An unexpected error occurred',
      suggestion: 'Please try again or contact support if the issue persists.'
    };
  }

  private getSuggestionForError(errorCode?: string, status?: number): string {
    switch (errorCode) {
      case 'VALIDATION_ERROR':
        return 'Check your input parameters. Ensure URLs are valid and file formats are supported.';
      case 'RATE_LIMIT_EXCEEDED':
        return 'API rate limit reached. Wait a moment before trying again or consider using batch operations.';
      case 'FILE_TOO_LARGE':
        return 'File is too large. Maximum file size is 2GB on Railway. Consider compressing your video first.';
      case 'UNSUPPORTED_FORMAT':
        return 'File format not supported. Supported formats: MP4, WebM, AVI, MOV, MKV for video; MP3, WAV, AAC, FLAC for audio.';
      case 'INSUFFICIENT_CREDITS':
        return 'Not enough processing credits. Check your account balance or upgrade your plan.';
      default:
        if (status === 429) {
          return 'Rate limit exceeded. Wait 60 seconds before retrying.';
        }
        return 'Please verify your request parameters and try again.';
    }
  }

  // Health check
  async checkHealth(): Promise<MCPToolResponse<HealthResponse>> {
    try {
      const response = await this.withRetry(() => 
        this.client.get<HealthResponse>('/api/v1/health')
      );
      
      return {
        success: true,
        data: response.data,
        message: `API is ${response.data.status}. FFmpeg: ${response.data.ffmpeg_available ? 'available' : 'unavailable'}`
      };
    } catch (error: unknown) {
      return this.formatError(error);
    }
  }

  // URL-based processing methods
  async addAudioFromURLs(request: AddAudioFromURLsRequest): Promise<MCPToolResponse<JobResponse>> {
    try {
      const response = await this.withRetry(() =>
        this.client.post<JobResponse>('/api/v1/add-audio-from-urls', request, {
          headers: { 'Content-Type': 'application/json' }
        })
      );

      return {
        success: true,
        data: response.data,
        job_id: response.data.job_id,
        message: `Audio overlay job started. Job ID: ${response.data.job_id}`
      };
    } catch (error: unknown) {
      return this.formatError(error);
    }
  }

  async autoCaptionFromURL(request: AutoCaptionFromURLRequest): Promise<MCPToolResponse<JobResponse>> {
    try {
      const response = await this.withRetry(() =>
        this.client.post<JobResponse>('/api/v1/auto-caption-from-url', request, {
          headers: { 'Content-Type': 'application/json' }
        })
      );

      return {
        success: true,
        data: response.data,
        job_id: response.data.job_id,
        message: `Auto-caption job started. Job ID: ${response.data.job_id}`
      };
    } catch (error: unknown) {
      return this.formatError(error);
    }
  }

  // Job management methods
  async getJobStatus(jobId: string): Promise<MCPToolResponse<JobStatusResponse>> {
    try {
      const response = await this.withRetry(() =>
        this.client.get<JobStatusResponse>(`/api/v1/jobs/${jobId}`)
      );

      return {
        success: true,
        data: response.data,
        message: `Job ${jobId} is ${response.data.status}${response.data.progress ? ` (${response.data.progress}% complete)` : ''}`
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        return {
          success: false,
          error: 'JOB_NOT_FOUND',
          message: `Job ${jobId} not found. It may have been completed and cleaned up.`,
          suggestion: 'Check if you have the correct job ID or if the job has already been processed.'
        };
      }
      return this.formatError(error);
    }
  }

  async deleteJob(jobId: string): Promise<MCPToolResponse<{ message: string }>> {
    try {
      await this.withRetry(() =>
        this.client.delete(`/api/v1/jobs/${jobId}`)
      );

      return {
        success: true,
        data: { message: `Job ${jobId} deleted successfully` },
        message: `Job ${jobId} has been cancelled and removed`
      };
    } catch (error: unknown) {
      return this.formatError(error);
    }
  }

  async downloadFile(jobId: string): Promise<MCPToolResponse<{ data: Buffer; contentType: string }>> {
    try {
      const response = await this.withRetry(() =>
        this.client.get(`/api/v1/files/${jobId}`, {
          responseType: 'arraybuffer',
          timeout: 300000 // 5 minutes for downloads
        })
      );

      return {
        success: true,
        data: {
          data: Buffer.from(response.data),
          contentType: response.headers['content-type'] || 'video/mp4'
        },
        message: `File downloaded successfully (${Buffer.from(response.data).length} bytes)`
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        return {
          success: false,
          error: 'FILE_NOT_FOUND',
          message: 'Processed file not found. The job may not be completed or the file may have been cleaned up.',
          suggestion: 'Check the job status first. Files are typically cleaned up after a few hours.'
        };
      }
      return this.formatError(error);
    }
  }

  // File upload methods (for multipart form data)
  async convertVideo(videoFile: Buffer, filename: string, request: ConvertVideoRequest): Promise<MCPToolResponse<JobResponse>> {
    try {
      const form = new FormData();
      form.append('input_file', videoFile, { filename });
      form.append('output_format', request.output_format);
      if (request.quality) {
        form.append('quality', request.quality);
      }

      const response = await this.withRetry(() =>
        this.client.post<JobResponse>('/api/v1/convert', form, {
          headers: { ...form.getHeaders() },
          maxBodyLength: Infinity,
          maxContentLength: Infinity
        })
      );

      return {
        success: true,
        data: response.data,
        job_id: response.data.job_id,
        message: `Video conversion job started. Job ID: ${response.data.job_id}`
      };
    } catch (error: unknown) {
      return this.formatError(error);
    }
  }

  async getVideoInfo(videoFile: Buffer, filename: string): Promise<MCPToolResponse<any>> {
    try {
      const form = new FormData();
      form.append('video_file', videoFile, { filename });

      const response = await this.withRetry(() =>
        this.client.post('/api/v1/video-info', form, {
          headers: { ...form.getHeaders() }
        })
      );

      return {
        success: true,
        data: response.data,
        message: 'Video information extracted successfully'
      };
    } catch (error: unknown) {
      return this.formatError(error);
    }
  }

  // Batch processing
  async processBatch(request: BatchRequest): Promise<MCPToolResponse<any>> {
    try {
      const response = await this.withRetry(() =>
        this.client.post('/api/v1/batch', request, {
          headers: { 'Content-Type': 'application/json' }
        })
      );

      return {
        success: true,
        data: response.data,
        message: `Batch job started with ${request.operations.length} operations`
      };
    } catch (error: unknown) {
      return this.formatError(error);
    }
  }

  // Webhook management
  async createWebhook(request: CreateWebhookRequest): Promise<MCPToolResponse<WebhookResponse>> {
    try {
      const response = await this.withRetry(() =>
        this.client.post<WebhookResponse>('/api/v1/webhooks', request, {
          headers: { 'Content-Type': 'application/json' }
        })
      );

      return {
        success: true,
        data: response.data,
        message: `Webhook created with ID: ${response.data.id}`
      };
    } catch (error: unknown) {
      return this.formatError(error);
    }
  }

  async listWebhooks(): Promise<MCPToolResponse<{ webhooks: WebhookResponse[] }>> {
    try {
      const response = await this.withRetry(() =>
        this.client.get<{ webhooks: WebhookResponse[] }>('/api/v1/webhooks')
      );

      return {
        success: true,
        data: response.data,
        message: `Found ${response.data.webhooks.length} webhooks`
      };
    } catch (error: unknown) {
      return this.formatError(error);
    }
  }

  async deleteWebhook(webhookId: string): Promise<MCPToolResponse<{ message: string }>> {
    try {
      const response = await this.withRetry(() =>
        this.client.delete(`/api/v1/webhooks/${webhookId}`)
      );

      return {
        success: true,
        data: response.data,
        message: `Webhook ${webhookId} deleted successfully`
      };
    } catch (error: unknown) {
      return this.formatError(error);
    }
  }
}