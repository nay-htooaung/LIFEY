# DSN-001: IPC Bridge for Chat Sidecar
**Linked to:** `SPEC-001`

## 1. Architecture Map
* **Frontend Component:** `ChatInput.tsx`, `MessageList.tsx`
* **IPC Channel:** Tauri `invoke` and `listen` commands.
* **Rust Backend:** `chat_handler.rs`, wrapping the Claude Code SDK.

## 2. API / Data Contracts
**Payload (Frontend -> Backend):**
`{ "command": "send_message", "payload": { "text": "string" } }`

**Event Stream (Backend -> Frontend):**
`{ "event": "chat_token", "payload": { "chunk": "string", "is_done": boolean } }`

## 3. Implementation Steps (For Implementor Agent)
1.  Define the Rust struct for the incoming payload.
2.  Register a Tauri command `send_message` that spawns a non-blocking Tokio task.
3.  Implement the Claude SDK call within the Tokio task.
4.  Emit Tauri events `chat_token` as chunks arrive.
