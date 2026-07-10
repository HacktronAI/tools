# Provenance

Every tool in `registry/` was collected from a first-party source on 2026-07-10 —
by capturing an agent's real request or by building/reading its source. Nothing is
paraphrased. The registry is pruned to genuine coding tools (file ops, shell,
search, todo, plan, subagent, web, question); vendor plumbing (scheduler, media,
notifications, MCP passthroughs, etc.) is excluded.

## anthropic — Claude Code (20 tools)
Wire capture of the request Claude Code sends, cross-checked against the shipped
binary (`~/.local/share/claude/versions/2.1.206`). Verbatim. Read output uses the
compact `line-number + tab` prefix (confirmed in the binary; older builds used a
padded `→` arrow).

## openai — Codex CLI (12 tools)
Built from source: a test calling `create_tools_json_for_responses_api` (the exact
serializer `client.rs` uses) dumped the wire JSON. Verbatim. The set is
model-config dependent — the union across configs is kept, so both `apply_patch`
and the unified-exec pair (`exec_command`/`write_stdin`) appear.

## google — gemini-cli (default-legacy 14, gemini-3 14)
Built from source: imported the CLI's own `getToolSet(modelId)` and dumped the
resolved `FunctionDeclaration`s — exactly what it sends. Verbatim. Two model
families (`default-legacy`, `gemini-3`) kept as separate variants.

## xai — grok CLI (13 tools)
Verbatim from a captured wire request (grok CLI → xAI API). Names, schemas, and
descriptions are official. Grok's `search_replace` and `read_file` descriptions
closely mirror Claude Code's.

## cursor — cursor-agent / Composer 2.5 (14 tools)
Verbatim from a captured wire request. Composer 2.5's tool set uses capitalized
names (`Shell`, `ApplyPatch`, `ReadFile`, `rg`, …). Earlier cursor-agent builds
sent only protobuf tool enums with descriptions injected server-side; Composer 2.5
sends full definitions on the wire.

Raw captures and extraction scripts are kept locally (gitignored).
