# Downstream Architecture

This repository is maintained as a public downstream of upstream `iOfficeAI/AionUi`.

The goal is not to hide product differences in ad hoc patches. The goal is to keep the fork understandable, forkable, and easier to sync with future upstream tags.

## Target Shape

Treat the codebase as four layers:

1. **Upstream core**
   The upstream application logic that should remain as close to upstream as possible.
2. **Downstream policy**
   Explicit rules that define AionUI+ semantics, such as project containment, team placement, and history ordering.
3. **Downstream composition**
   UI wiring that chooses which sections exist, when they are shown, and how downstream policies surface in the app.
4. **Downstream distribution**
   Branding, packaging identity, release links, updater source policy, and public repository metadata.

## Current Downstream Seams

The current downstream work is intentionally concentrated in named modules:

- `src/common/config/product.ts`
  Central product identity and fork-vs-upstream link surfaces.
- `src/common/config/providerSelection.ts`
  Shared provider selection policy used by both renderer and process code.
- `src/renderer/pages/conversation/GroupedHistory/utils/historyPolicy.ts`
  Sidebar ownership and ordering rules.
- `src/renderer/pages/conversation/GroupedHistory/utils/projectOrderPolicy.ts`
  Project reorder rules, including the pinned-bucket guard.
- `src/renderer/pages/conversation/GroupedHistory/utils/sectionVisibility.ts`
  First-run and empty-state section visibility rules.

These seams are backed by contract tests under `tests/contract/`.

## Rules For Future Changes

- Keep upstream-compatible behavior in the original upstream-oriented modules when possible.
- Put AionUI+ semantic differences into named policy helpers instead of inline component conditionals.
- Prefer shared `src/common/` policy modules when both process and renderer need the same decision logic.
- Add or update contract tests whenever fork semantics change.
- Avoid mixing unrelated product experiments into upstream-sync commits.

## What Belongs In Contract Tests

At minimum, the fork should continue to guarantee:

- projects remain visible even when empty
- top-level Teams remains visible even when empty
- project-owned conversations do not leak into Recents
- team-owned conversations do not appear in the left sidebar
- pinned projects and teams sort ahead of unpinned peers
- project reorder stays within the pinned bucket or within the unpinned bucket
- fork identity and public repository links stay intentional

## Relationship To Upstream Sync

When a new upstream tag arrives, the maintenance goal should be:

1. integrate the upstream tag
2. repair named seam boundaries if upstream internals moved
3. rerun contract tests
4. only then broaden any refactor or product work

That workflow is documented in [upstream-sync.md](../contributing/upstream-sync.md).
