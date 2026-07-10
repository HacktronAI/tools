# Agent Tools

Tool schemas each model family uses.

Coding agents give their models tools, and each shapes them differently. 
If you give a model a differently shaped tool than it was trained on, 
especially the edit tool, you risk performance degradation from schema errors. 
This repo collects those definitions as plain JSON, verbatim from each agent.


```
registry/<provider>/
  meta.json            provider, agent, version, source
  tools/<name>.json    { name, capability, description, parameters }
registry/mappings.json model-id → provider
implementations/       pseudo-code specs for the edit tools (str_replace, apply_patch)
spec/SOURCES.md        provenance, per provider
web/                   browsable UI (reads public/api.json)
```

Give the schema to your agent and ask them to build the tool to run. 
Added pseudo code for edit tool in implementations/