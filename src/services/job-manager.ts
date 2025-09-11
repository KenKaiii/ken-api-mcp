import { VideoAPIClient } from './video-api.js';
import { MCPToolResponse, JobStatusResponse } from '../types/api.js';
import { Config } from '../types/config.js';

export interface JobPollOptions {
  maxPollTime?: number;
  pollInterval?: number;
  onProgress?: (status: JobStatusResponse) => void;
}

export class JobManager {
  private activePollingOperations = new Map<string, { abortController: AbortController; timeoutId: ReturnType<typeof setTimeout> }>();

  constructor(
    private apiClient: VideoAPIClient,
    private config: Config
  ) {}

  /**
   * Poll a job until completion with intelligent backoff and proper cleanup
   */
  async pollJobUntilComplete(
    jobId: string,
    options: JobPollOptions = {}
  ): Promise<MCPToolResponse<JobStatusResponse>> {
    const maxPollTime = options.maxPollTime || this.config.maxPollTime;
    const initialInterval = options.pollInterval || this.config.pollInterval;
    
    // Setup cleanup tracking
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, maxPollTime);
    
    this.activePollingOperations.set(jobId, { abortController, timeoutId });
    
    const startTime = Date.now();
    let pollInterval = initialInterval;
    let consecutiveChecks = 0;

    try {
      while (Date.now() - startTime < maxPollTime && !abortController.signal.aborted) {
        try {
          const statusResponse = await this.apiClient.getJobStatus(jobId);
          
          if (!statusResponse.success) {
            this.cleanupPolling(jobId);
            return statusResponse;
          }

          const jobStatus = statusResponse.data!;
          consecutiveChecks++;

          // Call progress callback if provided
          if (options.onProgress) {
            options.onProgress(jobStatus);
          }

          // Job completed successfully
          if (jobStatus.status === 'completed') {
            this.cleanupPolling(jobId);
            return {
              success: true,
              data: jobStatus,
              message: `Job completed successfully in ${jobStatus.duration || 'unknown time'}. Result: ${jobStatus.result_path || 'no file'}`
            };
          }

          // Job failed
          if (jobStatus.status === 'failed') {
            this.cleanupPolling(jobId);
            return {
              success: false,
              error: 'JOB_FAILED',
              message: `Job failed: ${jobStatus.error || 'Unknown error'}`,
              suggestion: 'Check your input parameters and try again. For URL-based operations, ensure URLs are accessible.'
            };
          }

          // Job still processing - intelligent backoff
          if (jobStatus.status === 'processing' || jobStatus.status === 'pending') {
            // Increase polling interval for long-running jobs
            if (consecutiveChecks > 10) {
              pollInterval = Math.min(pollInterval * 1.5, 30000); // Max 30 seconds
            }

            // Use ETA if available
            if (jobStatus.eta) {
              const etaMs = this.parseETA(jobStatus.eta);
              pollInterval = Math.min(Math.max(etaMs / 3, 2000), 15000);
            }

            await this.sleep(pollInterval);
            continue;
          }

          // Unknown status
          this.cleanupPolling(jobId);
          return {
            success: false,
            error: 'UNKNOWN_JOB_STATUS',
            message: `Job has unknown status: ${jobStatus.status}`,
            suggestion: 'Please try checking the job status manually or contact support.'
          };

        } catch (error) {
          // If polling fails, return a formatted error response
          this.cleanupPolling(jobId);
          return {
            success: false,
            error: 'POLLING_ERROR',
            message: error instanceof Error ? error.message : 'Unknown polling error occurred',
            suggestion: 'Check your network connection and API availability'
          };
        }
      }

      // Check if aborted
      if (abortController.signal.aborted) {
        this.cleanupPolling(jobId);
        return {
          success: false,
          error: 'POLLING_ABORTED',
          message: 'Job polling was aborted',
          suggestion: 'Operation was cancelled or timed out'
        };
      }

      // Timeout reached
      this.cleanupPolling(jobId);
      return {
        success: false,
        error: 'POLLING_TIMEOUT',
        message: `Job polling timed out after ${Math.round((Date.now() - startTime) / 1000)} seconds`,
        suggestion: `Job may still be processing. Check status manually with job ID: ${jobId}`
      };
    } catch (error) {
      this.cleanupPolling(jobId);
      return {
        success: false,
        error: 'POLLING_ERROR',
        message: error instanceof Error ? error.message : 'Polling operation failed',
        suggestion: 'Check your network connection and API availability'
      };
    }
  }

  /**
   * Wait for job completion and then download the result
   */
  async processAndDownload(
    jobId: string,
    options: JobPollOptions = {}
  ): Promise<MCPToolResponse<{ jobStatus: JobStatusResponse; fileData: Buffer; contentType: string }>> {
    // First poll until completion
    const completionResponse = await this.pollJobUntilComplete(jobId, options);
    
    if (!completionResponse.success) {
      return {
        success: false,
        error: completionResponse.error,
        message: completionResponse.message,
        suggestion: completionResponse.suggestion
      };
    }

    const jobStatus = completionResponse.data!;

    // Then download the file
    const downloadResponse = await this.apiClient.downloadFile(jobId);
    
    if (!downloadResponse.success) {
      return {
        success: false,
        error: downloadResponse.error,
        message: downloadResponse.message,
        suggestion: downloadResponse.suggestion
      };
    }

    return {
      success: true,
      data: {
        jobStatus,
        fileData: downloadResponse.data!.data,
        contentType: downloadResponse.data!.contentType
      },
      message: `Job completed and file downloaded successfully (${downloadResponse.data!.data.length} bytes)`
    };
  }

  /**
   * Get estimated completion time based on job type and current progress
   */
  getEstimatedCompletion(jobStatus: JobStatusResponse): string {
    const progress = jobStatus.progress || 0;
    const operation = jobStatus.operation || '';
    
    // Base estimates in seconds
    let baseEstimate = 30;
    
    if (operation.includes('auto-caption')) {
      baseEstimate = 15; // Caption generation is fast
    } else if (operation.includes('advanced merge')) {
      baseEstimate = 45; // Merging takes longer
    } else if (operation.includes('convert')) {
      baseEstimate = 20;
    }

    // Adjust based on progress
    if (progress > 0) {
      const remainingProgress = 100 - progress;
      const estimatedSeconds = Math.round((baseEstimate * remainingProgress) / 100);
      return `${estimatedSeconds} seconds`;
    }

    return `${baseEstimate} seconds`;
  }

  private parseETA(eta: string): number {
    // Parse ETA strings like "30s", "2m", "1h" to milliseconds
    const match = eta.match(/(\d+)([smh])/);
    if (!match) {
      return 30000; // Default 30 seconds
    }
    
    const [, value, unit] = match;
    const num = parseInt(value || '30');
    
    switch (unit) {
      case 's': return num * 1000;
      case 'm': return num * 60 * 1000;
      case 'h': return num * 60 * 60 * 1000;
      default: return 30000;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clean up polling resources to prevent memory leaks
   */
  private cleanupPolling(jobId: string): void {
    const operation = this.activePollingOperations.get(jobId);
    if (operation) {
      clearTimeout(operation.timeoutId);
      operation.abortController.abort();
      this.activePollingOperations.delete(jobId);
    }
  }

  /**
   * Cancel all active polling operations (useful for cleanup)
   */
  public cancelAllPolling(): void {
    for (const [jobId] of this.activePollingOperations) {
      this.cleanupPolling(jobId);
    }
  }
}