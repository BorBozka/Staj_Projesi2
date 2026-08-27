# START_HERE.md

# Codex Startup Instructions

This package is the authoritative project context for the Visitor Management System.

## Put these files in the repository

Expected structure:

```text
repo/
├─ AGENTS.md
├─ PHASE_1_CODEX_PROMPT.md
└─ docs/
   ├─ PRODUCT_SPEC.md
   ├─ UI_SPEC.md
   ├─ TECH_STACK.md
   └─ DEVELOPMENT_PLAN.md
```

## First Codex Task

After placing the files in the repository, open the repository in Codex and send:

> Read `AGENTS.md` and all referenced project documentation. Then execute the instructions in `PHASE_1_CODEX_PROMPT.md`. Implement only Phase 1 and stop for review when complete.

The chat/discovery conversation may be supplied as secondary context if desired, but the repository documentation is authoritative.

## Review Rule

After Phase 1:

1. inspect the interface,
2. show it to the stakeholder,
3. collect changes,
4. ask Codex to correct Phase 1,
5. approve it explicitly,
6. only then proceed to Phase 2.

Do not ask Codex to implement the entire application at once.
