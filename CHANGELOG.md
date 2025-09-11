# Changelog

All notable changes to the Ken Video API MCP Server will be documented in this file.

## [1.0.0] - 2025-09-12

### Added
- Initial release of Ken Video API MCP Server
- Complete integration with Ken Video API (18 endpoints)
- URL-based video processing tools (perfect for n8n workflows)
- Intelligent job polling and status management
- Comprehensive error handling with LLM-friendly messages
- Automatic retry logic with exponential backoff
- File download capabilities for processed videos
- Webhook management for job notifications
- Batch processing support for multiple operations
- TypeScript support with full type definitions
- Railway production API integration

### Features
- **19 MCP tools** covering all video API capabilities
- **Smart job polling** with adaptive intervals
- **Error recovery** with helpful suggestions
- **Rate limit handling** with automatic backoff
- **Cross-platform compatibility** (Node.js 18+)
- **Production ready** for Railway deployment

### Optimizations
- **n8n workflow optimized** for AI video generation pipelines
- **Memory efficient** file handling
- **Connection pooling** for better performance
- **Intelligent backoff** for long-running operations
- **Clean error messages** for LLM understanding

### Supported Operations
- Audio overlay from URLs
- Automatic caption generation
- Video format conversion
- Silence removal
- Advanced video merging
- Transition effects
- Batch processing
- Webhook notifications
- Job management and tracking

### Documentation
- Comprehensive README with n8n examples
- TypeScript declarations for all APIs
- Error handling guide
- Configuration reference
- Troubleshooting guide