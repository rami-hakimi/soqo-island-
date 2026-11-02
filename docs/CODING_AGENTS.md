# Coding agents on the island

Soqo Island can show what your coding agents are doing: **Claude Code** and **OpenAI Codex CLI**
sessions appear on the island's **Activity** tab, and the island tells you when a session
starts working, finishes, fails, or **needs your approval**. Everything is local and opt-in.

## What you see
| Event | On the island |
|---|---|
| Session starts (`SessionStart`) | listed as *Idle* |
| You send a prompt / a tool runs (`UserPromptSubmit`, `PreToolUse`, `PostToolUse`) | *Working*, with the current tool and its target (command, file, host) |
| The agent asks permission (`PermissionRequest`; Claude Code also `Notification: permission_prompt`) | **Needs you** — a prominent toast with a safe one-line summary of the request, the agent, the project and the time; the row moves to the top of the list; a short tone (switchable) |
| The agent asks a question / waits for input (`Notification: elicitation_dialog`, `agent_needs_input`) | *Needs you* |
| The turn ends (`Stop`) | *Finished* — a brief toast that takes no focus |
| The turn ends with an API error (`StopFailure`, Claude Code) | *Failed*, with the error class (`rate_limit`, `server_error`, …) |
| Idle for a minute (`Notification: idle_prompt`) / interrupted (`Interrupt`, Codex) | *Idle* |
| Session ends (`SessionEnd`) | removed from the list |

Each row shows the agent, the project (the last folder of the session's working directory),
the state, the time, and the terminal application the session runs in. **Clicking a row (or the
toast) brings that terminal window to the front** when the helper could identify it
(Windows Terminal, VS Code, Cursor, a console window…). Nothing is typed there.

### Approvals are given in the terminal, never on the island
The island only **shows** that an approval is pending. It never answers it, never runs the
command, and never changes the agent's permission settings. Both agents offer a hook that
*could* return an allow/deny decision; Soqo Island deliberately does not use it (see
"Future" below). The row clears by itself once the agent reports that the tool ran, the turn
ended, or you sent the next prompt.

### Several sessions at once
Each `(agent, session id)` is one row. Repeated reports of the same event within 1.5 s, and the
`Notification` that follows a `PermissionRequest` for the same request, are folded into one.
Finished sessions leave the list after 30 minutes, silent ones after 2 hours; the list holds
32 sessions at most.

## Setting it up
1. Settings › Connections › **Coding Agents** › *Show coding agents on the island*.
2. **Connect** Claude Code and/or Codex CLI. A dialog shows which file will be edited and the
   exact command that is added; nothing happens before you confirm.
3. Codex only: start `codex`, run `/hooks` once and **trust** the Soqo Island hooks (Codex
   requires a review of every new or changed hook; until then it prints a startup warning and
   skips them). Claude Code applies the change at once.

### What Connect writes
- Claude Code: `%USERPROFILE%\.claude\settings.json` (or `$CLAUDE_CONFIG_DIR\settings.json`),
  key `hooks`. Events: `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`,
  `PostToolUseFailure`, `PermissionRequest`, `Notification` (matcher
  `permission_prompt|idle_prompt|elicitation_dialog|elicitation_url_dialog|agent_needs_input`),
  `Stop`, `StopFailure`, `SessionEnd`. All but `SessionEnd` are `async: true` with a 5 s
  timeout, so the agent never waits for the island.
- Codex CLI: `%USERPROFILE%\.codex\hooks.json` (or `$CODEX_HOME\hooks.json`). Events:
  `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `PermissionRequest`,
  `Stop`, `Interrupt`, `SessionEnd`.
- Every entry runs `"<install>\helper\soqo-helper.exe" hook claude` (or `hook codex`) and is
  recognised by exactly that command, so:
  - **Connect** replaces older Soqo entries (a moved installation) and never touches other
    hooks or settings; the file keeps its indentation and line endings;
  - a **backup** `settings.json.soqo-backup-YYYYMMDD-HHMMSS` is written next to the file
    before every change (the five newest are kept; "Show file" opens the folder);
  - **Disconnect** removes exactly Soqo's entries and nothing else;
  - project-level files (`.claude/settings.json`, `<repo>/.codex/hooks.json`) are never read
    or written;
  - a file that does not parse as JSON is reported in Settings and never overwritten.
- Codex's legacy `notify` setting in `config.toml` is left alone (it allows one program only,
  and some installations already use it).

## How it works (architecture)
```
Claude Code / Codex ──hook──▶ soqo-helper.exe hook <agent>
                                 │ reads the hook JSON from stdin, keeps a whitelist of fields,
                                 │ finds the terminal window via its own parent-process chain
                                 ▼
            \\.\pipe\soqo-island-agents-<hash>   (named pipe, token in agents-bridge.json)
                                 │
                       src/main/agents.js  ──▶ island (Activity tab, toasts) / Focus Mode view
```
- **Transport**: a Windows named pipe created by the island while the feature is on. Its name
  and a random 256-bit token are written to `%APPDATA%\soqo-island\agents-bridge.json`
  (user profile ACL). A message without the token is dropped; messages are one JSON line, at
  most 256 KB, one per connection, 3 s per connection, 32 connections at a time. No HTTP
  service, no network port.
- **Data minimisation in the hook** (`helper/Agents.cs`): only `session_id`,
  `hook_event_name`, `cwd`, `tool_name`, `tool_use_id`, `notification_type`, `message`,
  `reason`, `error`, `permission_mode` and, from `tool_input`, the single field a human judges a
  request by (`command`, `file_path`, `url`, `pattern`, `query`, `description`, `skill`), each
  cut at 400 characters. Prompts, replies, file contents, transcripts and `transcript_path`
  never leave the hook process. The island cuts the summary again at 160 characters, strips
  control characters, and keeps everything in memory only.
- **Validation in main** (`src/shared/agent-events.js`): session ids must be identifiers
  (≤ 128 chars of `[A-Za-z0-9_.:-]`), event names must be known, every string is bounded.
  A payload is data about a session; nothing in it is ever executed. "Open terminal" sends
  `focus <hwnd>` to the bridge helper, which activates an existing window and nothing else.
- **Terminal identification**: the hook walks its parent processes (`soqo-helper ← bash ←
  claude ← pwsh ← WindowsTerminal`) and picks the nearest ancestor that owns a visible
  top-level window; otherwise its own console window. The window handle and the terminal's
  name travel with the event. Limitation: with several tabs in one terminal window the window
  comes to the front, not the specific tab.
- **Hide command details** (Settings) replaces the summary by the tool's name alone.
- **Focus Mode**: the island is hidden while the full-screen view is in front, so nothing
  interrupts it unless *Also in Focus Mode* is on; then an approval request shows a small
  banner on the view with an *Open terminal* button.
- **Do not disturb / focus sessions**: completion toasts stay quiet while Windows is in
  do-not-disturb or a focus session runs; approval requests are always shown (that is what the
  feature is for).

## Testing it
- Unit tests: `test/agent-events.test.js` (parsing, validation, hostile payloads, dedup,
  multiple sessions, pruning), `test/agent-config.test.js` (hook entries, idempotence,
  disconnect restores the file), `test/agents-bridge.test.js` (token check over the real pipe,
  refused dialog changes nothing, backups, broken files).
- By hand: with the island running and an agent connected, start `claude` (or `codex`) in a
  terminal and ask it to run a shell command that needs approval. The island shows *Needs you*
  with the command; approve in the terminal; the row turns *Working* and then *Finished*.

## Future (not implemented)
- **Approve / deny from the island.** Claude Code's `PermissionRequest` hook and Codex's
  `PermissionRequest` hook can both return
  `{"hookSpecificOutput":{"hookEventName":"PermissionRequest","decision":{"behavior":"allow"|"deny"}}}`
  when the hook process stays open until the user decides (up to the hook's timeout). A later
  version could keep the hook attached to the island over the pipe and answer from the card,
  with the terminal dialog still able to answer first. It needs a dedicated review: what the
  terminal shows while a hook holds the request, timeouts, "always allow" rules
  (`permission_suggestions` / `updatedPermissions`), and a confirmation step on the island.
  Until that is built and tested against the real agents, approvals stay read-only here.
- Tab-level focusing in Windows Terminal (UI Automation on the tab strip).
- Codex daemon mode (`codex app-server`) exposes thread status and pending approvals over a
  local socket; not used.
