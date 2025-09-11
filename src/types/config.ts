import { z } from 'zod';

export const ConfigSchema = z.object({
  apiBaseURL: z.string().url().default('https://ken-video-api-production.up.railway.app'),
  timeout: z.number().min(5000).max(300000).default(120000), // 2 minutes default
  retries: z.number().min(0).max(10).default(3),
  retryDelay: z.number().min(1000).max(30000).default(5000), // 5 seconds
  pollInterval: z.number().min(1000).max(60000).default(5000), // 5 seconds
  maxPollTime: z.number().min(30000).max(1800000).default(600000), // 10 minutes
  enableLogging: z.boolean().default(false),
  userAgent: z.string().default('ken-api-mcp/1.0.0')
});

export type Config = z.infer<typeof ConfigSchema>;

export const DEFAULT_CONFIG: Config = {
  apiBaseURL: 'https://ken-video-api-production.up.railway.app',
  timeout: 120000,
  retries: 3,
  retryDelay: 5000,
  pollInterval: 5000,
  maxPollTime: 600000,
  enableLogging: false,
  userAgent: 'ken-api-mcp/1.0.0'
};