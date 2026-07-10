# edit — V4A envelope diff (`apply_patch` family)

Covers **Codex `apply_patch`** and **Cursor `ApplyPatch`** — both take a single
freeform patch string in the V4A envelope format. Derived from:

- Codex `codex-rs/apply-patch/src/{parser.rs, seek_sequence.rs, lib.rs}` (authoritative — full algorithm)
- Cursor `ApplyPatch` (wire capture description; same envelope, one file section per call)

## Patch grammar

```
*** Begin Patch
( *** Add File: <path>      LF   (+<line> LF)+                         )
( *** Delete File: <path>   LF                                        )
( *** Update File: <path>   LF   (*** Move to: <path> LF)?  <chunk>+  )
*** End Patch

chunk        := ("@@" | "@@ " <context-header>) LF  <change-line>+  ("*** End of File" LF)?
change-line  := (" " | "-" | "+") <text> LF          # space=context, -=remove, +=add
```

Codex allows multiple file sections per patch; Cursor's prompt restricts to one
section per call. Paths must be relative.

## Parse

```
function parse_patch(text):
    lines = text.split("\n")
    require lines[0] == "*** Begin Patch" and last non-empty == "*** End Patch"
    hunks = []
    for each section:
        if "*** Add File: P":    hunks += AddFile(P, contents = the following '+' lines joined)
        if "*** Delete File: P": hunks += DeleteFile(P)
        if "*** Update File: P":
            move_to = optional following "*** Move to: Q"
            chunks = []
            for each "@@[ header]" group:
                chunks += UpdateChunk(
                    change_context = header or none,
                    old_lines = [context+removed lines, in order],
                    new_lines = [context+added lines, in order],
                    is_end_of_file = trailing "*** End of File" present)
            hunks += UpdateFile(P, move_to, chunks)
    return hunks
```

## Apply (the important part — fuzzy line matching)

Update chunks are located by **seeking the old-line sequence** in the file with
progressively looser matching. This is what lets slightly-stale context still apply.

```
function apply_update(content, chunks):
    lines = content.split("\n")
    cursor = 0
    for chunk in chunks:
        if chunk.change_context:                 # "@@ <header>" — advance to that line first
            cursor = index of first line at/after cursor matching header (same 3-pass laxity)
        start = seek_sequence(lines, chunk.old_lines, cursor, eof=chunk.is_end_of_file)
        if start == none: error "invalid patch — context not found"
        lines[start .. start+len(old_lines)] = chunk.new_lines
        cursor = start + len(new_lines)
    return lines.join("\n")   # preserve original trailing-newline state
```

### seek_sequence (3-pass, decreasing strictness)

```
function seek_sequence(lines, pattern, start, eof):
    if pattern is empty: return start
    if len(pattern) > len(lines): return none
    search_start = eof ? (len(lines) - len(pattern)) : start   # eof patterns match at file end

    # pass 1: exact equality
    for i in search_start .. len(lines)-len(pattern):
        if lines[i:i+len(pattern)] == pattern: return i
    # pass 2: ignore trailing whitespace (compare line.trimEnd())
    for i in ...: if all lines[i+k].trimEnd() == pattern[k].trimEnd(): return i
    # pass 3: ignore leading+trailing whitespace (compare line.trim())
    for i in ...: if all lines[i+k].trim() == pattern[k].trim(): return i
    return none
```

Add/Delete are direct: AddFile writes the collected `+` lines (error if the file
exists); DeleteFile removes it. `*** Move to:` renames after applying the update.

## Behavioral notes

- **Verify-before-write**: Codex parses and computes every file change (producing a
  unified diff + resulting content) *before* touching disk; any failure aborts the
  whole patch, so a multi-file patch never partially applies.
- **Freeform tool**: Codex sends `apply_patch` as a grammar-constrained custom tool
  (lark grammar), not a JSON function — the model emits the raw patch text.
- Error prefix (Codex): `apply_patch verification failed: {reason}`.

## Result

Codex returns the applied change summary (added/modified/deleted paths). The exact
success text is produced host-side; the load-bearing, model-trained parts are the
grammar and the `verification failed` error prefix above.
