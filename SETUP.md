# Uzbek Exam Chatbot Setup Guide

## Prerequisites

1. **OpenRouter API Key**
   - Sign up at https://openrouter.ai
   - Get your API key from the dashboard
   - Add funds or use free models

## Environment Setup

### 1. Backend Environment (Convex)

Navigate to the Convex dashboard and add the following environment variables:

```bash
# In Convex Dashboard > Settings > Environment Variables
OPENROUTER_API_KEY=your_openrouter_api_key_here
SITE_URL=http://localhost:3000  # or your production URL
```

Or use the Convex CLI:

```bash
cd packages/backend
bunx convex env set OPENROUTER_API_KEY your_openrouter_api_key_here
bunx convex env set SITE_URL http://localhost:3000
```

### 2. Running the Application

```bash
# Install dependencies
bun install

# Start development servers
bun run dev

# Or start individual services:
# Terminal 1 - Convex Backend
cd packages/backend
bunx convex dev

# Terminal 2 - Next.js Frontend
cd apps/web
bun run dev
```

## Features

### Chat Interface

- **Uzbek-only**: All interactions are in Uzbek language
- **Thread Management**: Create and manage multiple conversation threads
- **Persistent History**: All conversations are saved and retrievable
- **Token Usage Tracking**: Monitor API usage for each message

### Exam Helper Specialization

- Step-by-step problem solving
- Key concept explanations
- Common mistake warnings
- Final answer verification

## API Endpoints

The backend exposes HTTP endpoints for external integrations:

### Create Thread

```bash
POST /api/threads
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "title": "Matematika savollari"
}
```

### Send Message

```bash
POST /api/threads/:threadId/messages
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "content": "Kvadrat tenglamani qanday yechish mumkin?"
}
```

### Get Messages

```bash
GET /api/threads/:threadId/messages
Authorization: Bearer <JWT_TOKEN>
```

## Configuration

### Model Selection

Default model: `meta-llama/llama-3.2-3b-instruct:free`

To change the model, update `DEFAULT_MODEL` in `/packages/backend/convex/chat.ts`

Popular alternatives:

- `openai/gpt-4o-mini` - More capable but costs money
- `anthropic/claude-3.5-haiku` - Fast and efficient
- `google/gemini-2.0-flash-thinking-exp:free` - Free with reasoning

### Rate Limiting

Currently not implemented. To add rate limiting:

1. Track usage in `usageEvents` table
2. Check limits before API calls
3. Return friendly error messages

## Troubleshooting

### "Failed to resolve import from \_generated/api"

Run `bunx convex dev` in the backend directory to generate types.

### "OpenRouter API key not configured"

Add the `OPENROUTER_API_KEY` environment variable in Convex dashboard.

### Messages not in Uzbek

The system enforces Uzbek-only responses. If you see other languages, check:

1. System prompt in `openrouter.ts`
2. Language detection function `isLikelyUzbek()`

## Development Notes

- The chat interface auto-creates threads on first message
- Thread titles are auto-generated from the first user message
- Assistant responses are validated for Uzbek language
- Failed validations trigger a retry with stronger instructions
