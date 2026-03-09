# {{APP_NAME}} — AI Pipeline

Document your AI pipeline architecture here.

## Models Used
- NVIDIA NIMs for chat completions
- NVIDIA Stable Diffusion for image generation

## Prompt Flow
1. System prompt sets behavior/format
2. User prompt provides input
3. Response parsed as JSON or plain text
4. Logged to `aiLogs` table automatically
