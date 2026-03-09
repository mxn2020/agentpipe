export interface ModelInfo {
    id: string
    name: string
    provider: 'nvidia' | 'openai' | 'anthropic' | 'xai' | 'google' | 'meta' | 'mistral' | 'stability'
    description: string
    contextWindow: number
    features: ('vision' | 'tools' | 'json' | 'video' | 'audio')[]
}

export const TEXT_MODELS: ModelInfo[] = [
    // Standard Llama series
    { id: 'meta/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', provider: 'meta', description: 'Strong general purpose', contextWindow: 128000, features: ['tools', 'json'] },
    { id: 'meta/llama-3.1-8b-instruct', name: 'Llama 3.1 8B', provider: 'meta', description: 'Fast, efficient operations', contextWindow: 128000, features: ['tools', 'json'] },
    // Advanced Llama 3.3
    { id: 'meta/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', provider: 'meta', description: 'Advanced reasoning and coding', contextWindow: 128000, features: ['tools', 'json'] },
    // DeepSeek & Reasoning
    { id: 'deepseek-ai/deepseek-r1', name: 'DeepSeek R1', provider: 'mistral', description: 'Advanced Deep Learning Reasoning', contextWindow: 128000, features: ['tools', 'json'] },
    { id: 'deepseek-ai/deepseek-coder-6.7b', name: 'DeepSeek Coder 6.7B', provider: 'mistral', description: 'Code-specific reasoning and generation', contextWindow: 16000, features: ['tools'] },
    // Mistral family
    { id: 'mistralai/mistral-large-2-instruct', name: 'Mistral Large 2', provider: 'mistral', description: 'Advanced reasoning and multilingual', contextWindow: 128000, features: ['tools', 'json'] },
    { id: 'mistralai/mistral-nemo-12b-instruct', name: 'Mistral Nemo 12B', provider: 'mistral', description: 'Fast, strong reasoning', contextWindow: 128000, features: ['tools', 'json'] },
    { id: 'mistralai/mathstral-7b-v0.1', name: 'Mathstral 7B', provider: 'mistral', description: 'Math and scientific reasoning', contextWindow: 32000, features: [] },
    // Microsoft Phi
    { id: 'microsoft/phi-3-mini-4k-instruct', name: 'Phi-3 Mini', provider: 'openai', description: 'High-performance small model', contextWindow: 4000, features: [] },
    { id: 'microsoft/phi-3-medium-4k-instruct', name: 'Phi-3 Medium', provider: 'openai', description: 'Strong reasoning on smaller footprint', contextWindow: 4000, features: [] },
    // Google Gemma
    { id: 'google/gemma-2-9b-it', name: 'Gemma 2 9B', provider: 'google', description: 'Google open weights capable model', contextWindow: 8000, features: [] },
    { id: 'google/gemma-2-27b-it', name: 'Gemma 2 27B', provider: 'google', description: 'Google open weights advanced model', contextWindow: 8000, features: [] },
    // NVIDIA Nemotron & General 
    { id: 'nvidia/nemotron-4-340b-instruct', name: 'Nemotron-4 340B', provider: 'nvidia', description: 'Massive scale reasoning and generation', contextWindow: 4096, features: ['tools', 'json'] },
    { id: 'nvidia/llama-3.1-nemotron-70b-instruct', name: 'Llama 3.1 Nemotron 70B', provider: 'nvidia', description: 'NVIDIA customized Llama 3.1', contextWindow: 128000, features: ['tools', 'json'] },
    // Multilingual & others
    { id: '01-ai/yi-large', name: 'Yi Large', provider: 'xai', description: 'Strong bilingual (EN/ZH) reasoning', contextWindow: 32000, features: [] },
    { id: 'rakuten/rakutenai-7b-chat', name: 'RakutenAI 7B', provider: 'xai', description: 'Japanese reasoning', contextWindow: 8000, features: [] }
]

export const VISION_MODELS: ModelInfo[] = [
    { id: 'meta/llama-3.2-90b-vision-instruct', name: 'Llama 3.2 90B Vision', provider: 'meta', description: 'State of the art multimodal reasoning', contextWindow: 128000, features: ['vision'] },
    { id: 'meta/llama-3.2-11b-vision-instruct', name: 'Llama 3.2 11B Vision', provider: 'meta', description: 'Fast multimodal reasoning', contextWindow: 128000, features: ['vision'] },
    { id: 'nvidia/neva-22b', name: 'Neva 22B', provider: 'nvidia', description: 'Visual QA and understanding', contextWindow: 4096, features: ['vision'] },
    { id: 'microsoft/phi-3-vision-128k-instruct', name: 'Phi-3 Vision', provider: 'openai', description: 'Small footprint multimodal', contextWindow: 128000, features: ['vision'] },
]

export const IMAGE_MODELS: ModelInfo[] = [
    { id: 'stabilityai/stable-diffusion-xl-base-1.0', name: 'SDXL 1.0', provider: 'stability', description: 'High-quality image generation', contextWindow: 0, features: [] },
    { id: 'stabilityai/sdxl-turbo', name: 'SDXL Turbo', provider: 'stability', description: 'Real-time image generation', contextWindow: 0, features: [] },
]

export const AUDIO_MODELS: ModelInfo[] = [
    { id: 'nvidia/parakeet-rnnt-1.1b', name: 'Parakeet RNNT ASR', provider: 'nvidia', description: 'English Automatic Speech Recognition', contextWindow: 0, features: ['audio'] },
    { id: 'nvidia/parakeet-ctc-1.1b', name: 'Parakeet CTC ASR', provider: 'nvidia', description: 'Fast English ASR', contextWindow: 0, features: ['audio'] },
    { id: 'nvidia/canary-1b', name: 'Canary Multilingual ASR', provider: 'nvidia', description: 'Multilingual speech recognition', contextWindow: 0, features: ['audio'] },
]

export const VIDEO_MODELS: ModelInfo[] = [
    { id: 'nvidia/cosmos-nemotron-34b', name: 'Cosmos Nemotron 34B', provider: 'nvidia', description: 'Video to Text Analysis', contextWindow: 0, features: ['video'] }
]
