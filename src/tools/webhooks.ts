import { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import { VideoAPIClient } from '../services/video-api.js';
import { CreateWebhookSchema } from '../types/api.js';

export class WebhookTools {
  constructor(private apiClient: VideoAPIClient) {}

  getTools(): Tool[] {
    return [
      {
        name: 'ken_create_webhook',
        description: 'Create a webhook to receive notifications when video processing jobs complete or fail. Perfect for n8n workflows that need to react to job completion automatically.',
        inputSchema: {
          type: 'object',
          properties: {
            webhook_url: {
              type: 'string',
              format: 'uri',
              description: 'URL where webhook notifications will be sent (must be accessible from the internet)'
            },
            events: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['job.completed', 'job.failed', 'job.started']
              },
              minItems: 1,
              description: 'Array of events to subscribe to. Most useful: job.completed, job.failed'
            }
          },
          required: ['webhook_url', 'events']
        }
      },
      {
        name: 'ken_list_webhooks',
        description: 'List all configured webhooks and their status. Shows delivery counts, failure rates, and webhook activity.',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'ken_get_webhook',
        description: 'Get detailed information about a specific webhook including delivery statistics and configuration.',
        inputSchema: {
          type: 'object',
          properties: {
            webhook_id: {
              type: 'string',
              description: 'The webhook ID to retrieve information for'
            }
          },
          required: ['webhook_id']
        }
      },
      {
        name: 'ken_delete_webhook',
        description: 'Delete a webhook configuration. The webhook will stop receiving notifications immediately.',
        inputSchema: {
          type: 'object',
          properties: {
            webhook_id: {
              type: 'string',
              description: 'The webhook ID to delete'
            }
          },
          required: ['webhook_id']
        }
      }
    ];
  }

  async callTool(name: string, args: any): Promise<CallToolResult> {
    try {
      switch (name) {
        case 'ken_create_webhook':
          return await this.handleCreateWebhook(args);
        case 'ken_list_webhooks':
          return await this.handleListWebhooks(args);
        case 'ken_get_webhook':
          return await this.handleGetWebhook(args);
        case 'ken_delete_webhook':
          return await this.handleDeleteWebhook(args);
        default:
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: 'UNKNOWN_TOOL',
                message: `Unknown webhook tool: ${name}`
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

  private async handleCreateWebhook(args: any): Promise<CallToolResult> {
    const validation = CreateWebhookSchema.safeParse({
      url: args.webhook_url,
      events: args.events
    });

    if (!validation.success) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'Invalid webhook configuration',
            details: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
            suggestion: 'Ensure webhook_url is a valid URL and events is an array of valid event types'
          }, null, 2)
        }]
      };
    }

    const response = await this.apiClient.createWebhook(validation.data);

    if (response.success) {
      response.message = `Webhook created successfully. ID: ${response.data!.id}. Will notify ${args.webhook_url} for events: ${args.events.join(', ')}`;
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response, null, 2)
      }]
    };
  }

  private async handleListWebhooks(_args: any): Promise<CallToolResult> {
    const response = await this.apiClient.listWebhooks();

    if (response.success && response.data) {
      const webhooks = response.data.webhooks;
      response.message = `Found ${webhooks.length} webhook${webhooks.length !== 1 ? 's' : ''}`;
      
      if (webhooks.length > 0) {
        response.message += '. Details: ' + webhooks.map(w => 
          `${w.id.substring(0, 8)}... -> ${w.url} (${w.events.join(', ')}) [${w.active ? 'active' : 'inactive'}]`
        ).join('; ');
      }
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response, null, 2)
      }]
    };
  }

  private async handleGetWebhook(args: any): Promise<CallToolResult> {
    if (!args.webhook_id || typeof args.webhook_id !== 'string') {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: 'MISSING_WEBHOOK_ID',
            message: 'webhook_id parameter is required',
            suggestion: 'Use ken_list_webhooks to see available webhook IDs'
          }, null, 2)
        }]
      };
    }

    // The API client doesn't have a getWebhook method, so we'll need to implement it
    // For now, return a helpful error
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: 'NOT_IMPLEMENTED',
          message: 'Get specific webhook functionality not implemented yet',
          suggestion: 'Use ken_list_webhooks to see all webhooks'
        }, null, 2)
      }]
    };
  }

  private async handleDeleteWebhook(args: any): Promise<CallToolResult> {
    if (!args.webhook_id || typeof args.webhook_id !== 'string') {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: 'MISSING_WEBHOOK_ID',
            message: 'webhook_id parameter is required',
            suggestion: 'Use ken_list_webhooks to see available webhook IDs'
          }, null, 2)
        }]
      };
    }

    const response = await this.apiClient.deleteWebhook(args.webhook_id);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response, null, 2)
      }]
    };
  }
}