# Project Containment Semantics

This note records the current containment rules for Projects, Recents, workspace chats, and teams.

## Core rules

### Projects are persistent containers

Projects always remain in the **Projects** section of the sidebar.

A project does **not** disappear from the Projects area when it gains chats, workspace chats, or teams.

### Recents is only for non-project items

The **Recents** list should only contain conversations that do **not** have a `projectId`.

Project-owned conversations must remain inside their project container and must not also appear in Recents.

### Workspace grouping is explicit

A conversation should only be grouped as a workspace chat in the left sidebar when:

- `conversation.extra.customWorkspace === true`

Do **not** infer workspace-chat grouping from the mere presence of an execution workspace.

### Normal chats can still have execution workspaces

A normal chat may still have a runtime or temp execution workspace.

That workspace may appear in the right-side workspace inspector, but it must **not** cause the conversation to move into workspace-grouped navigation in the left sidebar.

### Teams can belong to projects

Teams may have a `projectId` and should then render inside that project's **Teams** subsection.

Teams without a `projectId` remain unassigned.

## Expected sidebar behavior

### Project section

The Projects section should show every project, including:

- empty projects
- projects with only chats
- projects with only workspace chats
- projects with only teams
- projects with a mix of all three

### Recents section

The Recents section should show only:

- regular chats with no `projectId`
- workspace chats with no `projectId`

It should not show project-owned conversations.

## Failure modes to avoid

These are known regressions and should be guarded against:

1. A project disappears from Projects after its first chat or team is added.
2. A project-owned conversation also appears in Recents.
3. A normal chat gets grouped as a workspace chat just because it has an execution workspace.
4. A project with only teams and no conversations crashes grouped history rendering.
5. Team moves between projects require a manual reload before the sidebar refreshes.

## Code paths currently enforcing this

Primary grouped history logic:

- `src/renderer/pages/conversation/GroupedHistory/utils/groupingHelpers.ts`

Related UI and action flows:

- `src/renderer/pages/conversation/GroupedHistory/index.tsx`
- `src/renderer/pages/conversation/GroupedHistory/ConversationRow.tsx`
- `src/renderer/components/layout/Sider/TeamSiderSection.tsx`

## Test coverage

Targeted regression coverage exists in:

- `tests/unit/renderer/groupingHelpers.test.ts`

These tests cover:

- project conversations excluded from Recents
- empty projects remaining visible
- team-only projects not crashing
- workspace grouping only when `customWorkspace === true`
