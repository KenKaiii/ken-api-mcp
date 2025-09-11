import { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import { VideoAPIClient } from '../services/video-api.js';
import { JobManager } from '../services/job-manager.js';
import { AddAudioFromURLsSchema, AutoCaptionFromURLSchema } from '../types/api.js';

export class URLProcessingTools {
  constructor(
    private apiClient: VideoAPIClient,
    private jobManager: JobManager
  ) {}

  getTools(): Tool[] {
    return [
      {
        name: 'ken_add_audio_from_urls',
        description: 'Add voice-over or background audio to a video using URLs. Perfect for n8n workflows where you have video from RunwayML and audio from ElevenLabs. Returns immediately with a job ID - use ken_wait_for_job to get the result.',
        inputSchema: {
          type: 'object',
          properties: {
            video_url: {
              type: 'string',
              format: 'uri',
              description: 'URL to the source video file (MP4, WebM, AVI, MOV, MKV)'
            },
            audio_url: {
              type: 'string', 
              format: 'uri',
              description: 'URL to the audio file to overlay (MP3, WAV, AAC, FLAC)'
            },
            volume: {
              type: 'number',
              minimum: 0,
              maximum: 2.0,
              default: 0.8,
              description: 'Audio volume level (0.0 = mute, 1.0 = original, 2.0 = double volume). Default 0.8 works well for voice-overs.'
            },
            offset: {
              type: 'number',
              minimum: 0,
              default: 0,
              description: 'Audio start offset in seconds. Use 0 to start audio from beginning of video.'
            },
            wait_for_completion: {
              type: 'boolean',
              default: true,
              description: 'Whether to wait for job completion and return the result. Set false to just start the job.'
            }
          },
          required: ['video_url', 'audio_url']
        }
      },
      {
        name: 'ken_auto_caption_from_url',
        description: 'Generate automatic captions for a video using AI transcription. Great for adding accessibility and engagement to AI-generated videos. Uses OpenAI Whisper for accurate speech-to-text.',
        inputSchema: {
          type: 'object',
          properties: {
            video_url: {
              type: 'string',
              format: 'uri', 
              description: 'URL to the video file to caption'
            },
            language: {
              type: 'string',
              default: 'en',
              description: 'Language code for transcription (en, es, fr, de, etc.). Use "auto" for automatic detection.'
            },
            font_size: {
              type: 'number',
              minimum: 8,
              maximum: 72,
              default: 16,
              description: 'Caption font size in pixels. 16 works well for most videos.'
            },
            font_color: {
              type: 'string',
              default: 'white',
              description: 'Caption text color (white, black, yellow, red, etc.)'
            },
            background_color: {
              type: 'string',
              description: 'Optional background color for better readability (black, transparent, etc.)'
            },
            position: {
              type: 'string',
              enum: ['top', 'center', 'bottom'],
              default: 'bottom',
              description: 'Caption position on screen'
            },
            word_highlight: {
              type: 'boolean',
              default: false,
              description: 'Enable word-by-word highlighting as the audio plays'
            },
            wait_for_completion: {
              type: 'boolean',
              default: true,
              description: 'Whether to wait for job completion and return the result'
            }
          },
          required: ['video_url']
        }
      }
    ];
  }

  async callTool(name: string, args: any): Promise<CallToolResult> {
    try {
      switch (name) {
        case 'ken_add_audio_from_urls':
          return await this.handleAddAudioFromURLs(args);
        case 'ken_auto_caption_from_url':
          return await this.handleAutoCaptionFromURL(args);
        default:
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: 'UNKNOWN_TOOL',
                message: `Unknown tool: ${name}`,
                suggestion: 'Available tools: ken_add_audio_from_urls, ken_auto_caption_from_url'
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
            message: error instanceof Error ? error.message : 'Unknown error occurred',
            suggestion: 'Please check your input parameters and try again.'
          }, null, 2)
        }]
      };
    }
  }

  private async handleAddAudioFromURLs(args: any): Promise<CallToolResult> {
    // Validate input
    const validation = AddAudioFromURLsSchema.safeParse(args);
    if (!validation.success) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'Invalid input parameters',
            details: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
            suggestion: 'Check that video_url and audio_url are valid URLs, and volume is between 0-2.0'
          }, null, 2)
        }]
      };
    }

    const request = validation.data;
    const waitForCompletion = args.wait_for_completion !== false;

    // Start the job
    const jobResponse = await this.apiClient.addAudioFromURLs(request);
    
    if (!jobResponse.success) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(jobResponse, null, 2)
        }]
      };
    }

    const jobId = jobResponse.job_id!;

    // If not waiting, return job ID immediately
    if (!waitForCompletion) {
      return {
        content: [{
          type: 'text', 
          text: JSON.stringify({
            success: true,
            job_id: jobId,
            message: 'Audio overlay job started successfully',
            note: 'Use ken_wait_for_job or ken_check_job_status to monitor progress'
          }, null, 2)
        }]
      };
    }

    // Wait for completion and get result
    const completionResponse = await this.jobManager.pollJobUntilComplete(jobId, {
      onProgress: (status) => {
        if (args.verbose) {
          console.log(`Job ${jobId} progress: ${status.progress}%`);
        }
      }
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(completionResponse, null, 2)
      }]
    };
  }

  private async handleAutoCaptionFromURL(args: any): Promise<CallToolResult> {
    // Validate input
    const validation = AutoCaptionFromURLSchema.safeParse(args);
    if (!validation.success) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: 'VALIDATION_ERROR', 
            message: 'Invalid input parameters',
            details: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
            suggestion: 'Ensure video_url is a valid URL and optional parameters are within valid ranges'
          }, null, 2)
        }]
      };
    }

    const request = validation.data;
    const waitForCompletion = args.wait_for_completion !== false;

    // Start the job
    const jobResponse = await this.apiClient.autoCaptionFromURL(request);
    
    if (!jobResponse.success) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(jobResponse, null, 2)
        }]
      };
    }

    const jobId = jobResponse.job_id!;

    // If not waiting, return job ID immediately
    if (!waitForCompletion) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            job_id: jobId,
            message: 'Auto-caption job started successfully',
            note: 'Use ken_wait_for_job or ken_check_job_status to monitor progress'
          }, null, 2)
        }]
      };
    }

    // Wait for completion and get result
    const completionResponse = await this.jobManager.pollJobUntilComplete(jobId, {
      onProgress: (status) => {
        if (args.verbose) {
          console.log(`Job ${jobId} progress: ${status.progress}%`);
        }
      }
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(completionResponse, null, 2)
      }]
    };
  }
}