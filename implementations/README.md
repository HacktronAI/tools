# Implementations

Pseudo-code specifications of how the **edit** capability is actually implemented
by each agent, derived by reading first-party source. These are the behavioral
contract behind the schema — the matching rules, error strings, and edge cases a
model was trained around — written so a faithful implementation can be built in
any language.

Scope is deliberately narrow: only the tools worth reimplementing portably.
Right now that's **file editing** (`str_replace`-style and `apply_patch`/V4A),
since that's the highest-value, highest-variance capability. Other tools
(read/write/bash/grep and all host-specific tools) are covered by their schemas
in `registry/` only.

- [`edit-str-replace.md`](edit-str-replace.md) — Claude Code `Edit`, grok `search_replace` (exact-string replacement)
- [`apply-patch.md`](apply-patch.md) — Codex `apply_patch`, Cursor `ApplyPatch` (V4A envelope diff)

Each file cites the source it was derived from. Pseudo-code, not runnable — the
input schemas and result/error strings live in `registry/`.
