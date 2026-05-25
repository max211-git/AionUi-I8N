# Customizing AionUI+

AionUI+ is meant to be a reusable downstream, not just a one-off fork.

This guide is for adopters who want to fork this repository and apply their own product opinions without reverse-engineering every sidebar condition.

## What To Customize First

### Product identity

Start with:

- `src/common/config/product.ts`
- `package.json`
- `electron-builder.yml`

These surfaces define:

- packaged app name
- app id / executable name
- public repository links
- upstream release source for update metadata

### Sidebar and history semantics

These files define the current fork-specific conversation model:

- `src/renderer/pages/conversation/GroupedHistory/utils/historyPolicy.ts`
- `src/renderer/pages/conversation/GroupedHistory/utils/projectOrderPolicy.ts`
- `src/renderer/pages/conversation/GroupedHistory/utils/sectionVisibility.ts`

If you want different containment rules, start there first.

### Provider fallback behavior

Shared provider fallback and selection logic lives in:

- `src/common/config/providerSelection.ts`

This prevents renderer and process code from drifting apart when choosing model providers.

## How To Add A New Fork Opinion Safely

1. Add a named policy helper in the appropriate seam module.
2. Route the UI or process integration point through that helper.
3. Add or update contract tests in `tests/contract/`.
4. Only then update docs or README copy.

## What Not To Do

- do not bury fork semantics in JSX conditionals across multiple files
- do not duplicate the same selection logic in renderer and process code
- do not mix upstream-sync work with unrelated feature experiments in the same commit

## Recommended Reading

- [Downstream architecture](../architecture/downstream-architecture.md)
- [Upstream sync workflow](../contributing/upstream-sync.md)
