# Deepgram Voice Agent Reference (for Agent Context)

## Overview
Deepgram Voice Agent API provides real-time conversational AI via WebSocket.
It handles STT (Speech-to-Text) + LLM (Think) + TTS (Text-to-Speech) in one connection.

## WebSocket Endpoint
```
wss://api.deepgram.com/v1/agent/converse
```

## Auth
- Header: `Authorization: Token YOUR_DEEPGRAM_API_KEY`
- Get key: https://console.deepgram.com/signup

## Architecture for Mirra
We use Deepgram as a **WebSocket proxy through our backend**:
```
Browser Mic → Backend WS → Deepgram Agent WS
                                ↓
                          STT (nova-3)
                                ↓
                          LLM (gpt-4o via open_ai provider)
                                ↓
                          TTS (aura-2-thalia-en)
                                ↓
Backend WS → Browser Speaker
```

## Settings Message (sent after WS connect)
```json
{
  "type": "Settings",
  "audio": {
    "input": { "encoding": "linear16", "sample_rate": 24000 },
    "output": { "encoding": "linear16", "sample_rate": 24000, "container": "wav" }
  },
  "agent": {
    "language": "en",
    "listen": {
      "provider": { "type": "deepgram", "model": "nova-3" }
    },
    "think": {
      "provider": { "type": "open_ai", "model": "gpt-4o" },
      "prompt": "You are Mirra, a personal appearance operator..."
    },
    "speak": {
      "provider": { "type": "deepgram", "model": "aura-2-thalia-en" }
    },
    "greeting": "Hi! I'm Mirra. Let me scan your face real quick..."
  }
}
```

## Key Events (Server → Client)
| Event | When | Use |
|---|---|---|
| `Welcome` | Connection established | Init UI |
| `SettingsApplied` | Config accepted | Ready to stream |
| `UserStartedSpeaking` | User mic detected | Show mic active |
| `ConversationText` | Transcript available | Display transcript |
| `AgentThinking` | LLM processing | Show thinking state |
| `AgentAudioDone` | TTS finished | Safe to render VTO |
| `FunctionCallRequest` | Agent wants to call a tool | Execute Perfect Corp API |

## Key Events (Client → Server)
| Event | When | Use |
|---|---|---|
| `Settings` | After connect | Configure agent |
| Binary audio | Continuous | Stream mic audio |
| `KeepAlive` | Every 5s | Prevent timeout |
| `UpdatePrompt` | Dynamic | Update agent context |
| `InjectAgentMessage` | After VTO result | Tell agent what happened |
| `FunctionCallResponse` | After tool execution | Return results to agent |

## Function Calling (Critical for Mirra)
Deepgram Voice Agent supports function calling — the agent can invoke tools mid-conversation.

Define functions in Settings:
```json
{
  "agent": {
    "think": {
      "functions": [
        {
          "name": "analyze_skin",
          "description": "Analyze the user's skin condition",
          "parameters": { "type": "object", "properties": {} }
        },
        {
          "name": "try_on_makeup",
          "description": "Apply virtual makeup to the user's face",
          "parameters": {
            "type": "object",
            "properties": {
              "lip_color": { "type": "string" },
              "eye_style": { "type": "string" }
            }
          }
        }
      ]
    }
  }
}
```

When agent decides to call a function:
1. Server sends `FunctionCallRequest` with function name + args
2. Our backend executes the Perfect Corp API
3. We send `FunctionCallResponse` with the result
4. Agent continues conversation with the result context

## Choreography Rules for Mirra
1. Voice speaks during static visual states
2. VTO renders while voice pauses (after `AgentAudioDone`)
3. Never trigger re-render while agent is speaking
4. Use `InjectAgentMessage` to inform agent of VTO results

## Usage & Pricing
- Usage = WebSocket connection time
- 1 hour connection = 1 hour usage
- $200 hackathon credit should cover ~100+ hours

## JS SDK (Browser)
```bash
npm install @deepgram/sdk
```

## Key Implementation Note
For browser-based voice: use Web Audio API to capture mic → send linear16 PCM over WebSocket to our backend → backend proxies to Deepgram. Return audio chunks from Deepgram to browser for playback.
