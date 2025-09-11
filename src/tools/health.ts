import { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import { VideoAPIClient } from '../services/video-api.js';

export class HealthTools {
  constructor(private apiClient: VideoAPIClient) {}

  getTools(): Tool[] {
    return [
      {
        name: 'ken_check_api_health',
        description: 'Check if the Ken Video API is running and available. Verifies FFmpeg installation, OpenAI configuration, and overall service health. Use this before starting video processing operations.',
        inputSchema: {
          type: 'object',
          properties: {
            detailed: {
              type: 'boolean',
              default: false,
              description: 'Return detailed health information including uptime and version'
            }
          }
        }
      },
      {
        name: 'ken_api_info',
        description: 'Get comprehensive information about the Ken Video API including version, capabilities, supported formats, and current service status.',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ];
  }

  async callTool(name: string, args: any): Promise<CallToolResult> {
    try {
      switch (name) {
        case 'ken_check_api_health':
          return await this.handleCheckHealth(args);
        case 'ken_api_info':
          return await this.handleAPIInfo(args);
        default:
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: 'UNKNOWN_TOOL',
                message: `Unknown health tool: ${name}`
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

  private async handleCheckHealth(args: any): Promise<CallToolResult> {
    const response = await this.apiClient.checkHealth();
    
    if (response.success && args.detailed) {
      const health = response.data!;
      response.message = `
🟢 API Status: ${health.status}
🎬 Service: ${health.service} v${health.version}
⏰ Uptime: ${health.uptime}
🔧 FFmpeg: ${health.ffmpeg_available ? '✅ Available' : '❌ Not Available'}
🤖 OpenAI: ${health.openai_configured ? '✅ Configured' : '❌ Not Configured'}
📡 Timestamp: ${health.timestamp}
      `.trim();
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response, null, 2)
      }]
    };
  }

  private async handleAPIInfo(_args: any): Promise<CallToolResult> {
    const healthResponse = await this.apiClient.checkHealth();
    
    const apiInfo = {
      success: true,
      service_name: 'Ken Video API',
      description: 'Professional video processing API with FFmpeg and AI capabilities',
      version: healthResponse.data?.version || 'unknown',
      status: healthResponse.data?.status || 'unknown',
      capabilities: {
        video_processing: {
          format_conversion: ['mp4', 'webm', 'avi', 'mov', 'mkv'],
          audio_overlay: true,
          silence_removal: true,
          automatic_captions: true,
          video_merging: ['side_by_side', 'vertical_stack', 'grid', 'picture_in_picture', 'concatenation'],
          transitions: ['fade', 'swipe', 'slide', 'wipe'],
          batch_processing: true
        },
        ai_features: {
          speech_to_text: healthResponse.data?.openai_configured || false,
          auto_captions: healthResponse.data?.openai_configured || false,
          word_highlighting: true
        },
        input_methods: {
          file_upload: true,
          url_processing: true,
          batch_operations: true
        },
        output_features: {
          job_tracking: true,
          progress_monitoring: true,
          webhook_notifications: true,
          file_downloads: true
        }
      },
      supported_formats: {
        video_input: ['mp4', 'webm', 'avi', 'mov', 'mkv', 'flv'],
        audio_input: ['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a'],
        video_output: ['mp4', 'webm', 'avi', 'mov', 'mkv'],
        audio_output: ['mp3', 'wav', 'aac']
      },
      limits: {
        max_file_size: '2GB (Railway deployment)',
        max_concurrent_jobs: 2,
        job_retention: '12 hours',
        file_retention: '1 hour'
      },
      endpoints: {
        total: 18,
        working: 17,
        success_rate: '94.4%'
      },
      deployment: {
        platform: 'Railway',
        environment: 'Production',
        base_url: healthResponse.data ? 'ken-video-api-production.up.railway.app' : 'unknown'
      }
    };

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(apiInfo, null, 2)
      }]
    };
  }
}