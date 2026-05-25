# Upstream Sync Workflow

This repository tracks upstream `iOfficeAI/AionUi`, but it is not intended to be a loose patch pile.

Use this workflow for future upstream release tags such as `v2.1.2`, `v2.2.0`, and later.

## Goals

- consume official upstream tags, not arbitrary `upstream/main`
- preserve AionUI+ downstream semantics and branding
- keep merge conflict resolution localized to named seam modules
- produce a reviewable, reproducible sync commit sequence

## Recommended Branch Strategy

- keep `main` or the release branch in a releasable state
- create one sync branch per upstream tag
- keep upstream-sync commits separate from new feature work

Example branch name:

```bash
upgrade/upstream-v2.1.1
```

## Sync Checklist

1. Fetch upstream tags.

```bash
git fetch upstream --tags
```

2. Create or refresh the sync branch from the current fork base.

```bash
git checkout -b upgrade/upstream-vX.Y.Z
```

3. Merge or cherry-pick the exact upstream tag into the sync branch.

4. Resolve conflicts with these priorities:
- preserve upstream behavior in upstream-core areas unless the fork contract requires otherwise
- preserve AionUI+ semantics in named policy modules and product config surfaces
- do not silently reintroduce upstream release/update links into fork-only public surfaces

5. Run validation.

Required baseline:

```bash
bunx tsc --noEmit
bun run test tests/unit/renderer/groupingHelpers.test.ts
bun run test:contract
bun run i18n:types
node scripts/check-i18n.js
```

Recommended when sync touches adjacent areas:

```bash
bun run test
```

6. Build a packaged app and verify the artifact path before release.

## Contract Tests To Trust First

When upstream churn is high, the fastest confidence checks are the fork contracts:

- `tests/contract/forkSemantics.test.ts`
- `tests/contract/historyPolicy.test.ts`
- `tests/contract/projectOrderPolicy.test.ts`
- `tests/contract/sectionVisibility.test.ts`
- `tests/contract/GroupedHistorySidebar.dom.test.tsx`

If one of these fails after an upstream sync, fix the named seam instead of patching random UI call-sites first.

## Commit Hygiene

Prefer separate commits for:

1. upstream tag integration
2. downstream seam repairs
3. docs/readme/release-surface updates

That makes future archaeology and reverts much easier.
