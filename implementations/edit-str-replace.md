# edit — exact string replacement (`str_replace` family)

Covers **Claude Code `Edit`** and **grok `search_replace`** — same shape
(`{ file_path, old_string, new_string, replace_all }`) and essentially the same
algorithm. Derived from:

- `claude-code src/tools/FileEditTool/FileEditTool.ts:138-360` and `utils.ts:73-235`
- grok `search_replace` (wire capture; description states identical semantics)

## Input

```
file_path    absolute or workspace-relative path
old_string   exact text to find (empty ⇒ create new file)
new_string   replacement text (must differ from old_string)
replace_all  default false
```

## Algorithm

```
function edit(file_path, old_string, new_string, replace_all=false):
    # --- create-file shortcut (old_string empty) ---
    if old_string == "":
        if exists(file_path): error "Cannot create new file - file already exists."
        write(file_path, new_string)
        return "The file {file_path} has been updated successfully."

    if old_string == new_string:
        error "No changes to make: old_string and new_string are exactly the same."
    if not exists(file_path):
        error "File does not exist."

    content = read(file_path) with CRLF normalized to LF   # remember original EOL to restore on write

    # --- locate old_string, with a quote-normalization fallback ---
    actual = findActualString(content, old_string)
    if actual == null:
        error "String to replace not found in file.\nString: {old_string}"

    # --- uniqueness check (unless replace_all) ---
    matches = count_occurrences(content, actual)          # = content.split(actual).length - 1
    if matches > 1 and not replace_all:
        error "Found {matches} matches of the string to replace, but replace_all is false. \
               To replace all occurrences, set replace_all to true. To replace only one \
               occurrence, please provide more context to uniquely identify the instance.\nString: {old_string}"

    # --- apply ---
    replacement = preserveQuoteStyle(old_string, actual, new_string)
    new_content = applyReplace(content, actual, replacement, replace_all)
    write(file_path, restore_original_eol(new_content))
    return replace_all
        ? "The file {file_path} has been updated. All occurrences were successfully replaced."
        : "The file {file_path} has been updated successfully."
```

### findActualString (quote-tolerant match)

Exact match first; if that fails, retry with curly/smart quotes normalized to
ASCII, and if *that* matches, return the substring from the file at the matched
offset (so the real bytes are what get replaced).

```
function findActualString(content, search):
    if content contains search: return search
    nSearch = normalizeQuotes(search); nContent = normalizeQuotes(content)
    i = indexOf(nContent, nSearch)
    if i != -1: return content.substring(i, i + len(search))
    return null

# normalizeQuotes maps: ‘ ’ ‚ ‛ → '   “ ” „ ‟ → "   (U+2018.. / U+201C..)
```

### preserveQuoteStyle

If the match only succeeded after quote-normalization (file has curly quotes,
model sent straight ones), apply the file's curly style to `new_string` so
typography is preserved. Uses an open/close heuristic: a quote preceded by
start-of-string, whitespace, or `([{`—or an em/en dash—is an opening quote; an
apostrophe between two letters is treated as a contraction (`’`), not a quote.
If `old_string == actual` (no normalization happened), return `new_string`
unchanged.

### applyReplace (empty-new_string newline handling)

```
function applyReplace(content, search, replace, replace_all):
    if replace != "":
        return replace_all ? content.replaceAllLiteral(search, replace)
                           : content.replaceFirstLiteral(search, replace)
    # deletion: if search isn't newline-terminated but appears as `search\n`,
    # consume the trailing newline so a blank line isn't left behind
    if not search.endsWith("\n") and content contains (search + "\n"):
        search = search + "\n"
    return replace_all ? content.replaceAllLiteral(search, replace)
                       : content.replaceFirstLiteral(search, replace)
```
Use *literal* replacement (treat `$` etc. as literal, e.g. JS `replace(s, () => r)`).

## Error strings (exact — models are trained on these)

| Case | Message |
|------|---------|
| identical | `No changes to make: old_string and new_string are exactly the same.` |
| missing file | `File does not exist.` |
| create over existing | `Cannot create new file - file already exists.` |
| not found | `String to replace not found in file.\nString: {old_string}` |
| not unique | `Found {n} matches of the string to replace, but replace_all is false. …\nString: {old_string}` |

Claude Code additionally enforces read-before-edit and file-not-modified-since-read
guards (session-state concerns, omitted here as non-portable). grok documents the
same `line number + →` read-prefix caveat but the core match/replace is identical.
