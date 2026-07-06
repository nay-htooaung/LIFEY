# TST-001: IPC Chat Communication Matrix
**Linked to:** `DSN-001`

## 1. Decision Table: Command Handling

| ID | Condition (Input) | Expected State | Output / Event Emitted |
| :--- | :--- | :--- | :--- |
| TC-01 | Valid text string provided | Sidecar accepts payload | Emits `chat_token` events |
| TC-02 | Empty text string provided | Rejects immediately | Returns Error: "Message cannot be empty" |
| TC-03 | Claude API timeout | Graceful failure | Returns Error: "Sidecar timeout" |

## 2. Concrete Unit Tests Required
* **`test_payload_deserialization`**: Assert that JSON payloads map correctly to the Rust struct.
* **`test_empty_message_rejection`**: Assert that an empty string triggers an immediate failure without hitting the Claude SDK.

## 3. Implementation Directive
Implementor Agent: Write code in `chat_handler.rs` to satisfy TC-01 through TC-03. Stop when tests are green.
