import { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import { VideoAPIClient } from '../services/video-api.js';
import { JobManager } from '../services/job-manager.js';

export class FileProcessingTools {
  constructor(
    private apiClient: VideoAPIClient,
    private jobManager: JobManager
  ) {}

  getTools(): Tool[] {
    return [
      {
        name: 'ken_convert_video_format',
        description: 'Convert a video file to a different format. Supports MP4, WebM, AVI, MOV, and MKV output formats with quality control. Requires file upload capability.',
        inputSchema: {
          type: 'object',
          properties: {
            video_file_path: {
              type: 'string',
              description: 'Local path to the video file to convert'
            },
            output_format: {
              type: 'string',
              enum: ['mp4', 'webm', 'avi', 'mov', 'mkv'],
              description: 'Target video format'
            },
            quality: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'ultra'],
              default: 'medium',
              description: 'Output quality level (higher quality = larger file size)'
            },
            wait_for_completion: {
              type: 'boolean',
              default: true,
              description: 'Whether to wait for conversion completion'
            }
          },
          required: ['video_file_path', 'output_format']
        }
      },
      {
        name: 'ken_get_video_info',
        description: 'Extract detailed metadata from a video file including duration, resolution, codec, bitrate, and frame rate. Useful for understanding video properties before processing.',
        inputSchema: {
          type: 'object',
          properties: {
            video_file_path: {
              type: 'string',
              description: 'Local path to the video file to analyze'
            }
          },
          required: ['video_file_path']
        }
      },
      {
        name: 'ken_remove_silence',
        description: 'Automatically detect and remove silent segments from a video. Great for cleaning up recordings and reducing file size while maintaining content quality.',
        inputSchema: {
          type: 'object',
          properties: {
            video_file_path: {
              type: 'string', 
              description: 'Local path to the video file'
            },
            silence_threshold: {
              type: 'number',
              minimum: -60,
              maximum: 0,
              default: -30,
              description: 'Silence detection threshold in dB (-30 is a good default, lower values = more sensitive)'
            },
            min_silence_duration: {
              type: 'number',
              minimum: 0.1,
              maximum: 10,
              default: 0.5,
              description: 'Minimum silence duration to remove (in seconds)'
            },
            wait_for_completion: {
              type: 'boolean',
              default: true,
              description: 'Whether to wait for processing completion'
            }
          },
          required: ['video_file_path']
        }
      },
      {
        name: 'ken_add_audio_to_video',
        description: 'Add audio track or voice-over to a video file with precise volume and timing control. Requires both video and audio files to be uploaded.',
        inputSchema: {
          type: 'object',
          properties: {
            video_file_path: {
              type: 'string',
              description: 'Local path to the video file'
            },
            audio_file_path: {
              type: 'string', 
              description: 'Local path to the audio file to overlay'
            },
            volume: {
              type: 'number',
              minimum: 0,
              maximum: 2.0,
              default: 0.8,
              description: 'Audio volume level (0.8 is good for voice-overs)'
            },
            offset: {
              type: 'number',
              minimum: 0,
              default: 0,
              description: 'Audio start time offset in seconds'
            },
            wait_for_completion: {
              type: 'boolean',
              default: true,
              description: 'Whether to wait for processing completion'
            }
          },
          required: ['video_file_path', 'audio_file_path']
        }
      },
      {
        name: 'ken_auto_caption_video',
        description: 'Generate automatic captions for an uploaded video using AI speech recognition. Creates professional-looking subtitles with customizable styling.',
        inputSchema: {
          type: 'object',
          properties: {
            video_file_path: {
              type: 'string',
              description: 'Local path to the video file to caption'
            },
            language: {
              type: 'string', 
              default: 'en',
              description: 'Language code for transcription (en, es, fr, de, etc.)'
            },
            font_size: {
              type: 'number',
              minimum: 8,
              maximum: 72,
              default: 16,
              description: 'Caption font size'
            },
            font_color: {
              type: 'string',
              default: 'white',
              description: 'Caption text color'
            },
            position: {
              type: 'string',
              enum: ['top', 'center', 'bottom'],
              default: 'bottom',
              description: 'Caption position'
            },
            wait_for_completion: {
              type: 'boolean',
              default: true,
              description: 'Whether to wait for processing completion'
            }
          },
          required: ['video_file_path']
        }
      },
      {
        name: 'ken_merge_videos',
        description: 'Merge multiple videos with advanced layouts including side-by-side, grid, picture-in-picture, or concatenation. Perfect for creating comparison videos or compilations.',
        inputSchema: {
          type: 'object',
          properties: {
            video_file_paths: {
              type: 'array',
              items: { type: 'string' },
              minItems: 2,
              description: 'Array of local paths to video files to merge (minimum 2 files)'
            },
            layout: {
              type: 'string',
              enum: ['side_by_side', 'vertical_stack', 'grid', 'pip', 'concat'],
              default: 'concat',
              description: 'How to arrange the videos (concat = one after another, side_by_side = next to each other)'
            },
            transition_type: {
              type: 'string',
              enum: ['fade', 'dissolve', 'slide'],
              description: 'Transition effect between videos (only for concat mode)'
            },
            transition_duration: {
              type: 'number',
              minimum: 0.1,
              maximum: 5.0,
              default: 1.0,
              description: 'Transition duration in seconds'
            },
            wait_for_completion: {
              type: 'boolean',
              default: true,
              description: 'Whether to wait for processing completion'
            }
          },
          required: ['video_file_paths']
        }
      }
    ];
  }

  async callTool(name: string, args: any): Promise<CallToolResult> {
    try {
      switch (name) {
        case 'ken_convert_video_format':
          return await this.handleConvertVideo(args);
        case 'ken_get_video_info':
          return await this.handleGetVideoInfo(args);
        case 'ken_remove_silence':
          return await this.handleRemoveSilence(args);
        case 'ken_add_audio_to_video':
          return await this.handleAddAudioToVideo(args);
        case 'ken_auto_caption_video':
          return await this.handleAutoCaptionVideo(args);
        case 'ken_merge_videos':
          return await this.handleMergeVideos(args);
        default:
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: 'UNKNOWN_TOOL',
                message: `Unknown file processing tool: ${name}`
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

  private async handleConvertVideo(args: any): Promise<CallToolResult> {
    if (!args.video_file_path) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: 'MISSING_FILE_PATH',
            message: 'video_file_path parameter is required',
            suggestion: 'Provide the local path to the video file you want to convert'
          }, null, 2)
        }]
      };
    }

    try {
      // Note: In a real implementation, you would read the file from the file system
      // For this MCP, we'll provide guidance on how the tool should be used
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: 'FILE_UPLOAD_NOT_IMPLEMENTED',
            message: 'File upload tools require file system access not available in this MCP version',
            suggestion: 'Use ken_add_audio_from_urls or ken_auto_caption_from_url for URL-based processing instead',
            alternative: 'Upload your video to a temporary hosting service and use the URL-based endpoints'
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: 'FILE_READ_ERROR',
            message: `Failed to read video file: ${error instanceof Error ? error.message : 'Unknown error'}`,
            suggestion: 'Check that the file path is correct and the file exists'
          }, null, 2)
        }]
      };
    }
  }

  private async handleGetVideoInfo(_args: any): Promise<CallToolResult> {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: 'FILE_UPLOAD_NOT_IMPLEMENTED',
          message: 'File upload tools require file system access not available in this MCP version',
          suggestion: 'Upload your video to a temporary hosting service and use URL-based endpoints for processing'
        }, null, 2)
      }]
    };
  }

  private async handleRemoveSilence(_args: any): Promise<CallToolResult> {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: 'FILE_UPLOAD_NOT_IMPLEMENTED',
          message: 'File upload tools require file system access not available in this MCP version',
          suggestion: 'For silence removal, consider using URL-based processing by uploading to temporary storage first'
        }, null, 2)
      }]
    };
  }

  private async handleAddAudioToVideo(_args: any): Promise<CallToolResult> {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: 'FILE_UPLOAD_NOT_IMPLEMENTED',
          message: 'File upload tools require file system access. Use ken_add_audio_from_urls instead.',
          suggestion: 'Upload both video and audio files to temporary hosting and use ken_add_audio_from_urls',
          recommended_tool: 'ken_add_audio_from_urls'
        }, null, 2)
      }]
    };
  }

  private async handleAutoCaptionVideo(_args: any): Promise<CallToolResult> {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: 'FILE_UPLOAD_NOT_IMPLEMENTED',
          message: 'File upload tools require file system access. Use ken_auto_caption_from_url instead.',
          suggestion: 'Upload your video file to temporary hosting and use ken_auto_caption_from_url',
          recommended_tool: 'ken_auto_caption_from_url'
        }, null, 2)
      }]
    };
  }

  private async handleMergeVideos(_args: any): Promise<CallToolResult> {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: 'FILE_UPLOAD_NOT_IMPLEMENTED',
          message: 'File upload tools require file system access not available in this MCP version',
          suggestion: 'For video merging, upload files to temporary hosting and use batch operations'
        }, null, 2)
      }]
    };
  }
}