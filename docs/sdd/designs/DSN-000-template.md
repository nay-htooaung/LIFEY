# DSN-<NNN>: <Short Title>

**Linked to:** `SPEC-<N>`

Design sections are numbered `1`, `2`, `3`, etc. uniquely within this file. When referencing from outside (another DSN, a test matrix, a conversation), use the qualified form `DSN-<NNN>:<section>` (e.g., `DSN-001:2` refers to section 2 of DSN-001).

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
