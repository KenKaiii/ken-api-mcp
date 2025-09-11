#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { VideoAPIClient } from './services/video-api.js';
import { JobManager } from './services/job-manager.js';
import { URLProcessingTools } from './tools/url-processing.js';
import { JobManagementTools } from './tools/job-management.js';
import { HealthTools } from './tools/health.js';
import { FileProcessingTools } from './tools/file-processing.js';
import { BatchTools } from './tools/batch.js';
import { WebhookTools } from './tools/webhooks.js';
import { DEFAULT_CONFIG, ConfigSchema } from './types/config.js';

export class KenVideoAPIMCPServer {
  private server: Server;
  private apiClient: VideoAPIClient;
  private jobManager: JobManager;
  private urlTools: URLProcessingTools;
  private jobTools: JobManagementTools;
  private healthTools: HealthTools;
  private fileTools: FileProcessingTools;
  private batchTools: BatchTools;
  private webhookTools: WebhookTools;

  constructor() {
    // Initialize server
    this.server = new Server(
      {
        name: 'ken-video-api',
        version: '1.0.0',
        description: 'MCP server for Ken Video API - comprehensive video processing capabilities for LLMs'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    // Load configuration from environment
    const config = ConfigSchema.parse({
      ...DEFAULT_CONFIG,
      apiBaseURL: process.env.KEN_API_BASE_URL || DEFAULT_CONFIG.apiBaseURL,
      timeout: process.env.KEN_API_TIMEOUT ? parseInt(process.env.KEN_API_TIMEOUT) : DEFAULT_CONFIG.timeout,
      enableLogging: process.env.KEN_API_LOGGING === 'true',
      retries: process.env.KEN_API_RETRIES ? parseInt(process.env.KEN_API_RETRIES) : DEFAULT_CONFIG.retries
    });

    // Initialize services
    this.apiClient = new VideoAPIClient(config);
    this.jobManager = new JobManager(this.apiClient, config);
    
    // Initialize tool handlers
    this.urlTools = new URLProcessingTools(this.apiClient, this.jobManager);
    this.jobTools = new JobManagementTools(this.apiClient, this.jobManager);
    this.healthTools = new HealthTools(this.apiClient);
    this.fileTools = new FileProcessingTools(this.apiClient, this.jobManager);
    this.batchTools = new BatchTools(this.apiClient, this.jobManager);
    this.webhookTools = new WebhookTools(this.apiClient);

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const allTools = [
        ...this.healthTools.getTools(),
        ...this.urlTools.getTools(),
        ...this.jobTools.getTools(),
        ...this.fileTools.getTools(),
        ...this.batchTools.getTools(),
        ...this.webhookTools.getTools()
      ];

      return {
        tools: allTools
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        // Route to appropriate tool handler
        if (name.startsWith('ken_check_api') || name.startsWith('ken_api_info')) {
          return await this.healthTools.callTool(name, args);
        } else if (name.includes('_from_url') || name.includes('_urls')) {
          return await this.urlTools.callTool(name, args);
        } else if (name.includes('job') || name.includes('download') || name.includes('cancel') || name.includes('wait') || name.includes('process_and_download')) {
          return await this.jobTools.callTool(name, args);
        } else if (name.includes('webhook')) {
          return await this.webhookTools.callTool(name, args);
        } else if (name.includes('batch') || name.includes('create_video_with_audio_and_captions')) {
          return await this.batchTools.callTool(name, args);
        } else if (name.includes('convert') || name.includes('video_info') || name.includes('remove_silence') || name.includes('add_audio_to_video') || name.includes('auto_caption_video') || name.includes('merge_videos')) {
          return await this.fileTools.callTool(name, args);
        } else {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: 'UNKNOWN_TOOL',
                message: `Tool '${name}' not found`,
                suggestion: 'Use ken_api_info to see all available tools and their descriptions',
                available_tools: [
                  'ken_check_api_health',
                  'ken_api_info',
                  'ken_add_audio_from_urls', 
                  'ken_auto_caption_from_url',
                  'ken_check_job_status',
                  'ken_wait_for_job',
                  'ken_download_video',
                  'ken_process_and_download',
                  'ken_cancel_job'
                ]
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
              error: 'INTERNAL_ERROR',
              message: error instanceof Error ? error.message : 'An internal error occurred',
              suggestion: 'Please try again or contact support if the issue persists'
            }, null, 2)
          }]
        };
      }
    });

    // Error handling
    this.server.onerror = (error) => {
      console.error('[MCP Server Error]:', error);
    };

    // Graceful shutdown handling
    process.on('SIGINT', async () => {
      console.error('[Ken Video API MCP] Shutting down gracefully...');
      try {
        // Cancel all active polling operations to prevent memory leaks
        this.jobManager.cancelAllPolling();
        // Close the MCP server
        await this.server.close();
        console.error('[Ken Video API MCP] Server closed successfully');
        process.exit(0);
      } catch (error) {
        console.error('[Ken Video API MCP] Error during shutdown:', error);
        process.exit(1);
      }
    });

    process.on('SIGTERM', async () => {
      console.error('[Ken Video API MCP] Received SIGTERM, shutting down...');
      try {
        this.jobManager.cancelAllPolling();
        await this.server.close();
        process.exit(0);
      } catch (error) {
        console.error('[Ken Video API MCP] Error during SIGTERM shutdown:', error);
        process.exit(1);
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    if (process.env.KEN_API_LOGGING === 'true') {
      console.error('[Ken Video API MCP] Server started successfully');
      console.error('[Ken Video API MCP] Available tools:');
      console.error('[Ken Video API MCP] - Health: ken_check_api_health, ken_api_info');
      console.error('[Ken Video API MCP] - URL Processing: ken_add_audio_from_urls, ken_auto_caption_from_url');
      console.error('[Ken Video API MCP] - Job Management: ken_check_job_status, ken_wait_for_job, ken_download_video');
      console.error('[Ken Video API MCP] - Utilities: ken_process_and_download, ken_cancel_job');
    }
  }
}

// Export configuration types for programmatic use
export { ConfigSchema, type Config } from './types/config.js';
export { VideoAPIClient } from './services/video-api.js';
export { JobManager } from './services/job-manager.js';

// Start the server
export async function main() {
  const server = new KenVideoAPIMCPServer();
  await server.run();
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('[Ken Video API MCP] Failed to start server:', error);
    process.exit(1);
  });
}