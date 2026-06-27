# SPEC-001: Sidecar Chat Interface Communication

## 1. Metadata
* **Author:** [Human]
* **Status:** Draft -> Ready for Design -> Implemented
* **Granularity Check:** One single context boundary? [x] Yes.

## 2. The 5W1H Intent
* **Who:** The local user.
* **What:** Send a text prompt from the UI to the Claude SDK sidecar and receive a streamed response.
* **Where:** Across the frontend-to-backend IPC bridge.
* **When:** Initiated by the user pressing "Enter" or clicking "Send".
* **Why:** To provide an isolated, local chat experience without locking the main application thread.

## 3. Acceptance Criteria (Given-When-Then)
* **Given** the Tauri app and Rust sidecar are running,
* **When** the user submits a message,
* **Then** the UI displays an optimistic loading state, and tokens stream into the chat view as they are received from the sidecar.

## 4. Out of Scope (Guardrails)
* Do NOT implement message history persistence in this spec (that will be SPEC-002).
* Do NOT implement UI styling beyond basic functional layout.
