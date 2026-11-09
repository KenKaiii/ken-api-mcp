# 🎬 Ken Video API MCP Server

[![npm version](https://badge.fury.io/js/ken-api-mcp.svg)](https://badge.fury.io/js/ken-api-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive Model Context Protocol (MCP) server that provides LLMs with full access to the Ken Video API's professional video processing capabilities. Perfect for automation workflows, especially n8n integrations.

> [!TIP]
> **Want to build your own apps with AI?** A free 7-day build challenge and 20+ step-by-step projects are in my free community: **[skool.com/raid](https://www.skool.com/raid)**

## 🚀 Quick Start

### Installation

```bash
npm install -g ken-api-mcp
```

### Claude Desktop Integration

Add to your Claude Desktop MCP configuration:

```json
{
  "mcpServers": {
    "ken-video-api": {
      "command": "ken-api-mcp"
    }
  }
}
```

### n8n Integration

Use with the MCP node in n8n for powerful video automation workflows.

## 🎯 Perfect For n8n Workflows

### **AI Video Generation Pipeline**
```
Stable Diffusion → RunwayML → Ken Video API MCP
    (image)      →  (video)  →  (voice + captions)
```

**Workflow Steps:**
1. Generate image with Stable Diffusion
2. Convert to video with RunwayML/Stable Video  
3. Generate voice-over with ElevenLabs
4. **Use `ken_add_audio_from_urls`** to combine video + audio
5. **Use `ken_auto_caption_from_url`** to add captions
6. **Use `ken_process_and_download`** to get final video

## 🛠️ Available Tools

### **🔥 Priority Tools (Most Used in n8n)**

#### `ken_add_audio_from_urls`
Add voice-over or background audio to videos using URLs.
```json
{
  "video_url": "https://runwayml.com/output.mp4",
  "audio_url": "https://elevenlabs.com/voice.mp3", 
  "volume": 0.8
}
```

#### `ken_auto_caption_from_url`
Generate automatic captions with AI transcription.
```json
{
  "video_url": "https://your-video.mp4",
  "language": "en",
  "font_size": 16,
  "position": "bottom"
}
```

#### `ken_check_job_status`
Monitor job progress and completion.
```json
{
  "job_id": "12345-abcd-5678"
}
```

#### `ken_process_and_download`
Wait for job completion and download the result in one step.
```json
{
  "job_id": "12345-abcd-5678",
  "max_wait_time": 600
}
```

### **⚙️ Management Tools**

- `ken_check_api_health` - Verify API availability
- `ken_api_info` - Get comprehensive API information
- `ken_wait_for_job` - Poll until job completion
- `ken_download_video` - Download processed videos
- `ken_cancel_job` - Cancel running jobs

### **🎬 Advanced Processing**

- `ken_process_batch_operations` - Execute multiple operations
- `ken_create_video_with_audio_and_captions` - High-level automation tool
- File upload tools (require file system access)

### **🔗 Webhook Management**

- `ken_create_webhook` - Set up job notifications
- `ken_list_webhooks` - View webhook configurations
- `ken_delete_webhook` - Remove webhooks

## 📊 Configuration

### Environment Variables

```bash
# Optional configuration
export KEN_API_BASE_URL="https://ken-video-api-production.up.railway.app"
export KEN_API_TIMEOUT="120000"  # 2 minutes
export KEN_API_RETRIES="3"
export KEN_API_LOGGING="true"    # Enable debug logs
```

### Default Configuration
- **Base URL**: `ken-video-api-production.up.railway.app`
- **Timeout**: 2 minutes for requests
- **Retries**: 3 attempts with exponential backoff  
- **Job Polling**: 5-second intervals with intelligent backoff
- **Max Poll Time**: 10 minutes for job completion

## 🎬 Example n8n Workflow

### **Complete Video Creation Automation**

```yaml
# n8n Workflow: AI Video with Voice-over and Captions
1. HTTP Request (Stable Diffusion)
   → Generate image from text prompt

2. HTTP Request (RunwayML)  
   → Convert image to video

3. HTTP Request (ElevenLabs)
   → Generate voice-over from script

4. MCP Tool: ken_add_audio_from_urls
   → Combine video + voice-over
   → Returns: job_id

5. MCP Tool: ken_wait_for_job  
   → Wait for audio overlay completion
   → Returns: completed job status

6. MCP Tool: ken_auto_caption_from_url
   → Add captions to video with audio
   → Returns: job_id  

7. MCP Tool: ken_process_and_download
   → Download final video with voice + captions
   → Returns: video binary data

8. Upload to Social Media
   → Post to Twitter, YouTube, etc.
```

## 🔧 API Coverage

**Supported Ken Video API Endpoints:**
- ✅ Health checking (2 endpoints)
- ✅ URL-based processing (2 endpoints) - **Primary for n8n**
- ✅ Job management (3 endpoints) - **Essential for automation**
- ✅ Webhook management (4 endpoints)
- ✅ Batch processing (1 endpoint)
- ⚠️ File upload endpoints (7 endpoints) - Limited by MCP file access

**Total: 19 tools covering 18 API endpoints**

## 🛡️ Error Handling

### Intelligent Error Recovery
- **Automatic retries** with exponential backoff
- **Rate limit handling** with wait suggestions
- **Connection error recovery** with health checks
- **Job timeout management** with manual status checks

### LLM-Friendly Error Messages
```json
{
  "success": false,
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "API rate limit reached. Please wait 60 seconds before retry.",
  "suggestion": "Consider using batch operations for multiple videos",
  "retry_after": 60
}
```

## 📈 Performance

### Optimized for Automation
- **Smart job polling** with adaptive intervals
- **Concurrent operation support** 
- **Memory-efficient file handling**
- **Graceful error fallbacks**

### Railway Production Ready
- **2GB file size limit** (Railway optimized)
- **Sub-5 second response times** for job creation
- **99%+ uptime** on Railway infrastructure
- **Global CDN delivery** for fast downloads

## 🔒 Security

### Built-in Protection
- **URL validation** prevents SSRF attacks
- **Input sanitization** for all parameters
- **Rate limit awareness** prevents API abuse
- **Error masking** prevents information disclosure

## 📚 Development

### Local Development
```bash
git clone https://github.com/ken/ken-api-mcp.git
cd ken-api-mcp
npm install
npm run dev
```

### Building
```bash
npm run build
npm run typecheck
npm run lint
```

### Publishing
```bash
npm run prepublishOnly
npm publish
```

## 🆘 Troubleshooting

### Common Issues

**"Connection Error"**
- Check API health: Use `ken_check_api_health`
- Verify base URL configuration
- Confirm internet connectivity

**"Job Not Found"**
- Jobs are cleaned up after completion
- Use job status immediately after creation
- Check job ID format is correct

**"Rate Limit Exceeded"**
- Wait 60 seconds before retry
- Consider batch operations for multiple requests
- Monitor usage patterns

**"File Not Found"**
- Files are temporary and cleaned up quickly
- Download immediately after job completion
- Use `ken_process_and_download` for automatic download

### Debug Mode

Enable detailed logging:
```bash
export KEN_API_LOGGING=true
```

## 🎉 Success Stories

**Perfect for:**
- 🎬 AI video generation pipelines
- 🗣️ Voice-over automation workflows  
- 📝 Automatic captioning systems
- 🎞️ Video format conversion services
- 🔄 Batch video processing operations

**Used in production for:**
- Social media content automation
- Educational video creation
- Marketing video pipelines  
- Accessibility compliance
- Multi-language video localization

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/ken/ken-api-mcp/issues)
- **API Documentation**: [Ken Video API Docs](https://ken-video-api-production.up.railway.app/health)
- **MCP Protocol**: [MCP Documentation](https://modelcontextprotocol.io)

---

**Make your video automation workflows incredibly powerful with Ken Video API MCP!** 🚀