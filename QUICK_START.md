# 🚀 Quick Start Guide

## Installation & Setup (2 minutes)

### 1. Install the MCP Server
```bash
npm install -g ken-api-mcp
```

### 2. Test the Connection
```bash
# Check if the server starts
ken-api-mcp --help

# Test with Claude Desktop or any MCP client
```

### 3. Add to Claude Desktop
Edit your MCP configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "ken-video-api": {
      "command": "ken-api-mcp"
    }
  }
}
```

## 🎬 Your First Video Processing

### Example: Add Voice-over to AI Video

1. **Generate your video** (RunwayML, Stable Video, etc.)
2. **Generate voice-over** (ElevenLabs, etc.) 
3. **Use the MCP tools:**

```
Ask Claude: "Use ken_add_audio_from_urls to add voice-over to my video"

Parameters:
- video_url: "https://your-video-hosting.com/ai-generated.mp4"
- audio_url: "https://your-audio-hosting.com/voice-over.mp3"
- volume: 0.8
```

Claude will:
- ✅ Start the audio overlay job
- ✅ Poll for completion automatically  
- ✅ Provide the final video with voice-over
- ✅ Handle any errors gracefully

### Example: Complete AI Video Pipeline

```
Ask Claude: 
"I have a video at [URL] and want to:
1. Add voice-over from [AUDIO_URL] 
2. Generate automatic captions
3. Download the final result

Please handle the complete workflow."
```

Claude will use multiple MCP tools automatically:
1. `ken_add_audio_from_urls` - Add voice-over
2. `ken_wait_for_job` - Wait for audio completion  
3. `ken_auto_caption_from_url` - Add captions to the video with audio
4. `ken_process_and_download` - Get the final video

## 🛠️ Available Tools Quick Reference

**Essential Tools:**
- `ken_add_audio_from_urls` - Add voice-over to videos
- `ken_auto_caption_from_url` - Generate captions
- `ken_check_job_status` - Monitor progress
- `ken_process_and_download` - Get final results

**Management Tools:**
- `ken_check_api_health` - Test API connection
- `ken_api_info` - Get API capabilities
- `ken_wait_for_job` - Wait for completion

**Advanced Tools:**
- `ken_process_batch_operations` - Multiple operations
- `ken_create_video_with_audio_and_captions` - Full workflow
- `ken_create_webhook` - Notifications

## 🎯 Perfect for n8n

The MCP tools are designed to work seamlessly in n8n automation workflows:

1. **n8n MCP Node** → `ken_add_audio_from_urls`
2. **n8n MCP Node** → `ken_auto_caption_from_url`  
3. **n8n MCP Node** → `ken_process_and_download`
4. **n8n HTTP Node** → Upload final video

## 🆘 Troubleshooting

**Issue: "Cannot connect to API"**
→ Use `ken_check_api_health` to verify the Railway API is running

**Issue: "Job not found"**
→ Jobs are cleaned up quickly - use job status immediately after creation

**Issue: "Rate limit exceeded"** 
→ Wait 60 seconds or use batch operations for multiple requests

## 🎉 Ready to Process Videos!

Your Ken Video API MCP server is now ready for professional video automation workflows! 

Start by asking Claude to check API health, then begin processing your videos with voice-overs and captions.