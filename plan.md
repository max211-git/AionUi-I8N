---
name: aionui-plus-plan
description: Fork maintenance, downstream customization, and upstream sync plan for AionUI+
type: reference
---

# AionUI+ Fork Plan

## Statement of intent

AionUI+ should become a public, understandable, and reusable downstream of upstream AionUi, not a private patch set that happens to build.

The repository should support three downstream audiences without reverse-engineering hidden behavior:
- users who want to run AionUI+ as-is
- adopters who want to fork AionUI+ and keep their own opinions on top
- maintainers who need to merge future upstream release tags with limited manual conflict work

The north star is:
- upstream core stays close to upstream
- AionUI+ product behavior lives in explicit downstream policy/composition modules
- fork guarantees are enforced by contract tests
- branding, updater behavior, packaging identity, and docs are product surfaces, not scattered inline edits

## Immediate delivery goal

Current merge target:
- upstream release tag `v2.1.1`

Required outcome for the current cycle:
1. merge upstream tag `v2.1.1` into this fork
2. preserve all current AionUI+ product semantics and branding
3. validate with the required commands
4. push updated fork branches
5. build a fresh packaged macOS app
6. report the exact app path for testing/install

This plan adds one more requirement around that work:
- reduce the amount of custom merge surgery required for `v2.1.2`, `v2.2.0`, and later upstream tags

## Product semantics that are contract-level guarantees

These behaviors are part of the AionUI+ product contract and must not silently drift during upstream sync:

### Projects
- Projects are first-class containers above conversations
- Projects can contain chats, workspace chats, and teams
- Empty projects remain visible
- Projects are visible on first run
- The Projects `+` entry point remains visible even when the section is collapsed

### Teams
- Teams can be created without first creating a project
- Teams can be assigned into and out of projects
- Unassigned teams appear in a top-level Teams section
- The top-level Teams section remains visible even when empty

### Recents and grouping
- Recents only contains non-project items
- Project-owned items never leak into Recents
- Workspace grouping in the left sidebar only applies to explicit workspace chats
- Runtime/execution workspaces in the right inspector do not change left-sidebar grouping semantics

### Pinning and ordering
- Pinned projects stay above unpinned projects
- Pinned top-level teams stay above unpinned top-level teams
- Pinned teams within a project stay above unpinned teams in that same project
- Project drag-and-drop reorder is supported in the Projects section
- Reordering only happens within the pinned bucket or within the unpinned bucket

### Product identity
- Packaged branding remains `AionUI+`
- README/public docs remain fork-accurate
- About dialog attribution and enhancement summary remain fork-accurate
- Upstream update behavior must not overwrite or collapse fork identity

## What the current repo already tells us

Current customization hotspots are already visible in the codebase:

### Conversation and sidebar grouping
- `src/renderer/pages/conversation/GroupedHistory/utils/groupingHelpers.ts`
- `src/renderer/pages/conversation/GroupedHistory/index.tsx`
- `src/renderer/pages/conversation/GroupedHistory/hooks/useConversationListSync.ts`
- `src/renderer/hooks/context/ConversationHistoryContext.tsx`
- `tests/unit/renderer/groupingHelpers.test.ts`

### Team ownership and project assignment
- `src/process/team/TeamSessionService.ts`
- `src/process/bridge/teamBridge.ts`
- `src/renderer/pages/team/hooks/useTeamList.ts`
- `src/renderer/pages/team/hooks/useTeamSession.ts`

### Distribution, updater, and branding
- `package.json`
- `electron-builder.yml`
- `src/process/bridge/updateBridge.ts`
- `src/process/services/autoUpdaterService.ts`
- `src/renderer/components/settings/SettingsModal/contents/AboutModalContent.tsx`
- `scripts/build-with-builder.js`
- `scripts/prepare-release-assets.sh`

This is good news. The fork is not fully modular yet, but the behavior is already concentrated enough to extract real seam boundaries.

## Desired architecture shape

Treat the repo as:
- upstream core
- downstream product policy
- downstream composition surfaces
- downstream distribution surfaces

The main rule:
- product semantics should be encoded as named policies and registries, not hidden inside view components or ad hoc inline conditionals

## Proposed seam boundaries

### 1. Sidebar and navigation composition seam

Purpose:
- control what top-level sections exist
- control when they are shown
- keep first-run and empty-state visibility rules out of large UI components

Suggested target area:
- `src/renderer/features/navigation/`

Suggested modules:
- `sectionRegistry.ts`
- `sectionVisibilityPolicy.ts`
- `sectionOrdering.ts`
- `sectionTypes.ts`

Responsibilities to move behind this seam:
- Projects section exists even before content
- Projects `+` visibility when collapsed
- top-level Teams section visibility even when empty
- distinction between top-level Teams and project-owned Teams
- Recents visibility and ordering rules

Likely current integration points:
- `src/renderer/pages/conversation/GroupedHistory/index.tsx`
- `src/renderer/hooks/context/ConversationHistoryContext.tsx`

### 2. Conversation ownership and grouping seam

Purpose:
- make project/team/workspace/recents rules explicit and testable
- reduce future upstream merge pain in `groupingHelpers.ts`

Suggested target area:
- `src/renderer/features/historyPolicy/`

Suggested modules:
- `ownershipPolicy.ts`
- `recentsPolicy.ts`
- `workspaceGroupingPolicy.ts`
- `historySortPolicy.ts`
- `historyPolicyTypes.ts`

Responsibilities to move behind this seam:
- whether a conversation belongs in Recents
- whether a conversation belongs under a project
- whether a conversation belongs under a workspace group
- whether a conversation is hidden because it is team-owned
- latest-activity ordering rules

Likely current integration points:
- `src/renderer/pages/conversation/GroupedHistory/utils/groupingHelpers.ts`
- `src/renderer/pages/conversation/GroupedHistory/utils/sortOrderHelpers.ts`

### 3. Project and team ordering seam

Purpose:
- isolate pinning and reorder behavior from rendering and DnD plumbing
- make bucket rules explicit

Suggested target area:
- `src/renderer/features/orderPolicy/`

Suggested modules:
- `pinningPolicy.ts`
- `projectOrderPolicy.ts`
- `teamOrderPolicy.ts`
- `reorderGuards.ts`

Responsibilities to move behind this seam:
- pinned vs unpinned bucket sorting
- within-bucket reorder rules
- project card drag/drop acceptance rules
- top-level team sort behavior
- project team sort behavior

Likely current integration points:
- `GroupedHistory` DnD hooks/components
- team sidebar rendering hooks

### 4. Team/project domain seam

Purpose:
- make project assignment semantics durable across renderer and process changes
- keep storage/persistence behavior separate from UI composition behavior

Suggested target area:
- `src/common/domain/projectsTeams/` for shared types/rules
- `src/process/team/policies/` for process-side persistence/application

Suggested modules:
- `teamProjectAssignmentPolicy.ts`
- `teamVisibilityPolicy.ts`
- `projectContainerSemantics.ts`

Responsibilities to move behind this seam:
- assigning/removing `projectId`
- unassigned team semantics
- creation without project
- team conversation ownership expectations

Likely current integration points:
- `src/process/team/TeamSessionService.ts`
- `src/process/bridge/teamBridge.ts`

### 5. Product identity seam

Purpose:
- make AionUI+ branding and public-fork messaging replaceable
- avoid scattered brand strings during future merges

Suggested target area:
- `src/product/branding/`

Suggested modules:
- `productBrand.ts`
- `aboutContent.ts`
- `publicLinks.ts`
- `forkAttribution.ts`

Responsibilities to move behind this seam:
- app display name
- About dialog copy
- public links
- enhancement summary wording
- repo/wiki/release link targets

Likely current integration points:
- `package.json`
- `src/renderer/components/settings/SettingsModal/contents/AboutModalContent.tsx`
- README/public docs

### 6. Distribution and updater seam

Purpose:
- ensure source merges do not accidentally restore upstream binary distribution behavior
- make fork package identity and update policy explicit

Suggested target area:
- `src/product/distribution/`
- `src/process/updatePolicy/`

Suggested modules:
- `distributionConfig.ts`
- `updateSourcePolicy.ts`
- `releaseChannelPolicy.ts`
- `packagingIdentity.ts`

Responsibilities to move behind this seam:
- whether in-app updater is enabled at all
- what repo/release channel it points to
- how update assets are selected
- app id / product name / artifact naming / protocol naming policy

Likely current integration points:
- `src/process/bridge/updateBridge.ts`
- `src/process/services/autoUpdaterService.ts`
- `electron-builder.yml`
- `package.json`
- `scripts/prepare-release-assets.sh`

## Concrete refactor program

This should be done in stages, not as one large rewrite.

### Stage 0: merge-safe seam extraction

Goal:
- reduce conflict density before or during the `v2.1.1` merge without destabilizing the app

Do now or alongside the merge:
1. introduce named policy modules that wrap existing logic without changing behavior
2. move AionUI+ strings/links into a dedicated product-branding module
3. centralize updater/source-of-truth settings behind one configuration surface
4. add contract tests for the current fork semantics before significant reorganization

Success criteria:
- little or no user-visible behavior change
- same runtime behavior
- less custom logic living inline in upstream-owned components

### Stage 1: downstream layer extraction

Goal:
- reorganize the fork into explicit downstream policy/composition modules

Work:
1. split `groupingHelpers.ts` into policy-oriented units
2. isolate sidebar section composition from grouped history rendering
3. isolate reorder/pinning logic from DnD UI code
4. isolate team/project assignment semantics from process orchestration code

Success criteria:
- future upstream UI changes mostly touch adapter/integration points
- AionUI+ behavior remains mostly defined in downstream-owned modules

### Stage 2: public-fork docs and variant surface

Goal:
- make the repo understandable and adoptable by external users

Work:
1. add architecture docs that explain upstream core vs downstream layer
2. add customization docs that explain branding/navigation/policy changes
3. add upstream sync docs keyed to release tags
4. add a minimal variant system or manifest for product-level toggles

Success criteria:
- a new adopter can see where to change branding, navigation, semantics, and packaging without tracing arbitrary code paths

### Stage 3: long-term upstream sync discipline

Goal:
- make future updates procedural instead of heroic

Work:
1. preserve a clean upstream sync lane
2. keep custom work in isolated commits or topic branches
3. always merge official upstream tags, not arbitrary `main`
4. run contract tests before and after sync
5. ship only fork-built artifacts

## Contract tests to add or strengthen

The repo already has `test:contract`. Use it.

Add or expand tests under `tests/contract/` for the fork contract:

### Navigation and visibility contracts
- Projects section appears on first run
- Projects `+` stays visible when Projects is collapsed
- top-level Teams section appears even when no unassigned teams exist
- users can create a team without first creating a project

### Ownership and recents contracts
- project-owned chats never appear in Recents
- project-owned workspace chats never appear in Recents
- team-owned/project-owned conversations follow expected visibility rules
- unassigned top-level teams remain outside project containers

### Ordering contracts
- pinned projects render above unpinned projects
- pinned top-level teams render above unpinned top-level teams
- project reorder only works within pinned or within unpinned buckets
- team ordering inside a project preserves pinned-first semantics

### Distribution contracts
- packaged identity remains `AionUI+`
- updater policy does not point at upstream release behavior unless explicitly intended
- About dialog renders fork attribution/enhancement messaging

The existing `tests/unit/renderer/groupingHelpers.test.ts` is a good seed, but it is too implementation-local to be the whole safety net. Add contract-focused tests that describe product behavior in plain terms.

## Docs to add

For public launch, add these repo docs:

### `docs/ARCHITECTURE.md`
- explain upstream core vs AionUI+ downstream layer
- explain where product semantics live
- explain which modules are intended extension points

### `docs/CUSTOMIZATION.md`
- how to change branding
- how to change top-level sections
- how to change grouping/recents/pinning behavior
- how to change packaging/update policy

### `docs/UPSTREAM_SYNC.md`
- fetch upstream tags
- merge a specific upstream release tag
- run contract/unit/i18n/type validation
- resolve conflicts at seam modules first
- rebuild packaged artifacts

### `docs/FORK_SEMANTICS.md`
- canonical product guarantees
- intentional differences from upstream
- explicit non-goals

## Variant system recommendation

Do not over-engineer a plugin platform yet.

A small manifest-driven variant system is enough:
- one default variant: `aionui-plus`
- optionally one fallback variant: `upstream-like`

Possible future surface:
- `src/product/variant/currentVariant.ts`
- `src/product/variant/variantManifest.ts`

Variant-controlled decisions could include:
- branding strings and links
- updater enablement/source
- whether Projects/Teams custom navigation is enabled
- About dialog enhancement summary

This keeps AionUI+ opinionated by default while making downstream adoption much easier.

## Upstream sync workflow to standardize

Future updates should be release-driven:
1. fetch upstream tags
2. choose a specific upstream tag such as `v2.1.2` or `v2.2.0`
3. merge that tag into the fork branch
4. resolve conflicts by repairing seam modules first
5. run:
   - `bunx tsc --noEmit`
   - `bun run test tests/unit/renderer/groupingHelpers.test.ts`
   - `bun run test:contract`
   - `bun run i18n:types`
   - `node scripts/check-i18n.js`
6. build packaged app
7. validate that packaged identity and updater behavior still match fork policy
8. push the branch and publish fork artifacts

The operational rule:
- merge upstream source releases
- do not rely on upstream binary app updates for this fork

## Recommendations for the `v2.1.1` cycle specifically

For the current cycle, avoid a large architecture rewrite before the merge. The best sequence is:

1. add the first seam wrappers and contract tests
2. merge upstream tag `v2.1.1`
3. resolve conflicts while preserving current fork behavior
4. validate and package
5. after the merge is stable, continue the deeper seam extraction

This keeps scope controlled while still improving the next upgrade path.

## Proposed implementation order after planning approval

1. capture baseline behavior in contract tests
2. extract branding/update policy surfaces
3. extract history/grouping policy surfaces
4. extract section visibility/composition surfaces
5. extract reorder/pinning policy surfaces
6. document architecture/customization/upstream-sync workflow
7. perform the `v2.1.1` merge against the cleaner seam structure

## Guardrails

- Do not let upstream updater defaults overwrite fork distribution behavior
- Do not hide product semantics in JSX render branches when they can live in named policies
- Do not broaden scope into Codex-native model-lane redesign during the `v2.1.1` merge unless a conflict forces local repair
- Do not make public-fork adoption depend on tribal knowledge from chat history

## Return point

When continuing the work from this plan, start with:
- `tests/contract/` for fork guarantees
- `src/renderer/pages/conversation/GroupedHistory/utils/groupingHelpers.ts` for history-policy extraction
- `src/process/bridge/updateBridge.ts` and `src/process/services/autoUpdaterService.ts` for updater policy separation
- `src/renderer/components/settings/SettingsModal/contents/AboutModalContent.tsx` plus `package.json` and `electron-builder.yml` for branding/distribution centralization
