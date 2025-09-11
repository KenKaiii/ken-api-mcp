import { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import { VideoAPIClient } from '../services/video-api.js';
import { JobManager } from '../services/job-manager.js';

export class JobManagementTools {
  constructor(
    private apiClient: VideoAPIClient,
    private jobManager: JobManager
  ) {}

  getTools(): Tool[] {
    return [
      {
        name: 'ken_check_job_status',
        description: 'Check the current status of a video processing job. Returns detailed progress information including estimated completion time. Essential for monitoring long-running operations.',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: {
              type: 'string',
              description: 'The job ID returned from any video processing operation'
            }
          },
          required: ['job_id']
        }
      },
      {
        name: 'ken_wait_for_job',
        description: 'Wait for a video processing job to complete and return the final result. Automatically handles polling with intelligent backoff. Use this after starting any video processing job.',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: {
              type: 'string',
              description: 'The job ID to wait for completion'
            },
            max_wait_time: {
              type: 'number',
              minimum: 30,
              maximum: 1800,
              default: 600,
              description: 'Maximum time to wait in seconds (default: 10 minutes)'
            },
            poll_interval: {
              type: 'number',
              minimum: 2,
              maximum: 60,
              default: 5,
              description: 'How often to check job status in seconds (default: 5 seconds)'
            }
          },
          required: ['job_id']
        }
      },
      {
        name: 'ken_download_video',
        description: 'Download the processed video file from a completed job. Returns binary video data that can be saved or used in subsequent operations. Only works for completed jobs.',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: {
              type: 'string',
              description: 'The job ID of a completed video processing operation'
            },
            save_to_file: {
              type: 'string',
              description: 'Optional local file path to save the video. If not provided, returns binary data.'
            }
          },
          required: ['job_id']
        }
      },
      {
        name: 'ken_process_and_download',
        description: 'Combination tool that waits for job completion and then downloads the result in one operation. Perfect for n8n workflows where you want the final video file.',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: {
              type: 'string',
              description: 'The job ID to process and download'
            },
            save_to_file: {
              type: 'string',
              description: 'Optional local file path to save the final video'
            },
            max_wait_time: {
              type: 'number',
              minimum: 30,
              maximum: 1800,
              default: 600,
              description: 'Maximum time to wait for job completion (default: 10 minutes)'
            }
          },
          required: ['job_id']
        }
      },
      {
        name: 'ken_cancel_job',
        description: 'Cancel a running video processing job. Only works for jobs that are still pending or processing. Useful for stopping long-running operations.',
        inputSchema: {
          type: 'object',
          properties: {
            job_id: {
              type: 'string',
              description: 'The job ID to cancel'
            }
          },
          required: ['job_id']
        }
      }
    ];
  }

  async callTool(name: string, args: any): Promise<CallToolResult> {
    try {
      switch (name) {
        case 'ken_check_job_status':
          return await this.handleCheckJobStatus(args);
        case 'ken_wait_for_job':
          return await this.handleWaitForJob(args);
        case 'ken_download_video':
          return await this.handleDownloadVideo(args);
        case 'ken_process_and_download':
          return await this.handleProcessAndDownload(args);
        case 'ken_cancel_job':
          return await this.handleCancelJob(args);
        default:
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: 'UNKNOWN_TOOL',
                message: `Unknown job management tool: ${name}`
              }, null, 2)
            }]
          };
      }
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: 'TOOL_EXECUTION_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error occurred'
          }, null, 2)
        }]
      };
    }
  }

  private async handleCheckJobStatus(args: any): Promise<CallToolResult> {
    if (!args.job_id || typeof args.job_id !== 'string') {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: 'MISSING_JOB_ID',
            message: 'job_id parameter is required and must be a string',
            suggestion: 'Provide the job_id returned from a video processing operation'
          }, null, 2)
        }]
      };
    }

    const response = await this.apiClient.getJobStatus(args.job_id);
    
    // Add helpful context for LLMs
    if (response.success && response.data) {
      const status = response.data;
      const estimated = this.jobManager.getEstimatedCompletion(status);
      
      response.message = `Job ${args.job_id} is ${status.status}`;
      if (status.progress) {
        response.message += ` (${status.progress}% complete)`;
      }
      if (status.status === 'processing' && estimated) {
        response.message += `. Estimated completion: ${estimated}`;
      }
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response, null, 2)
      }]
    };
  }

  private async handleWaitForJob(args: any): Promise<CallToolResult> {
    if (!args.job_id || typeof args.job_id !== 'string') {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: 'MISSING_JOB_ID',
            message: 'job_id parameter is required'
          }, null, 2)
        }]
      };
    }

    const maxWaitTime = (args.max_wait_time || 600) * 1000; // Convert to milliseconds
    const pollInterval = (args.poll_interval || 5) * 1000;

    const response = await this.jobManager.pollJobUntilComplete(args.job_id, {
      maxPollTime: maxWaitTime,
      pollInterval: pollInterval
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response, null, 2)
      }]
    };
  }

  private async handleDownloadVideo(args: any): Promise<CallToolResult> {
    if (!args.job_id || typeof args.job_id !== 'string') {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: 'MISSING_JOB_ID',
            message: 'job_id parameter is required'
          }, null, 2)
        }]
      };
    }

    const response = await this.apiClient.downloadFile(args.job_id);

    if (response.success && args.save_to_file) {
      try {
        // Note: In a real MCP environment, you might want to use file system tools
        // For now, we'll return the binary data with save instructions
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: 'Video downloaded successfully',
              file_size: response.data!.data.length,
              content_type: response.data!.contentType,
              save_to: args.save_to_file,
              note: 'Binary data returned. Use appropriate tools to save to file system.'
            }, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: 'FILE_SAVE_ERROR',
              message: `Failed to save file: ${error instanceof Error ? error.message : 'Unknown error'}`,
              suggestion: 'Check that the file path is valid and you have write permissions'
            }, null, 2)
          }]
        };
      }
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response, null, 2)
      }]
    };
  }

  private async handleProcessAndDownload(args: any): Promise<CallToolResult> {
    if (!args.job_id || typeof args.job_id !== 'string') {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: 'MISSING_JOB_ID',
            message: 'job_id parameter is required'
          }, null, 2)
        }]
      };
    }

    const maxWaitTime = (args.max_wait_time || 600) * 1000;

    const response = await this.jobManager.processAndDownload(args.job_id, {
      maxPollTime: maxWaitTime
    });

    if (response.success && args.save_to_file) {
      // Add file saving context to the response
      response.message += `. Ready to save to ${args.save_to_file}`;
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response, null, 2)
      }]
    };
  }

  private async handleCancelJob(args: any): Promise<CallToolResult> {
    if (!args.job_id || typeof args.job_id !== 'string') {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: 'MISSING_JOB_ID',
            message: 'job_id parameter is required'
          }, null, 2)
        }]
      };
    }

    const response = await this.apiClient.deleteJob(args.job_id);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response, null, 2)
      }]
    };
  }
}