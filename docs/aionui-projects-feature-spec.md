# AionUi Projects Feature Specification

## First-Class Project Support Above Conversation Workspace Folders

## 1. Executive Summary

AionUi currently appears to support a **workspace folder / working directory** at the conversation level. That is useful for local execution, file access, and agent runtime context, but it does **not** provide a true organizational or project affinity model across multiple conversations.

This proposal introduces a new first-class concept: **Project**.

A **Project** is a persistent organizational and contextual container that can own many conversations. A project may optionally be tied to a root folder on disk, but its primary role is **grouping, context, continuity, discoverability, and workflow structure**.

This is intentionally distinct from the existing “workspace folder” concept.

### Core design principle

- **Workspace folder** = technical execution path / cwd / file root
- **Project** = product-level organizational container for conversations, context, and project identity

This preserves existing behavior while enabling a much richer multi-conversation workflow.

---

# 2. Problem Statement

## Current limitation

Today, a conversation can be attached to a workspace folder such as the local `AionUi` directory. That provides execution context, but it does not solve the user’s need to:

- group multiple related chats together
- maintain affinity between conversations around the same initiative
- represent a project in the UI
- create multiple chats under the same folder/project without repeatedly reselecting the same path
- attach shared instructions or metadata to a set of related chats
- manage project-scoped history and organization

## Missing user capability

The user wants something like:

- Project: `AionUi`
  - Chat: `Folder support exploration`
  - Chat: `UI proposal`
  - Chat: `Refactor notes`
  - Chat: `Testing strategy`

rather than isolated conversations that merely happen to share the same execution folder.

## Why workspace folders are insufficient

If the system only groups by identical folder path:

- the UX is brittle
- there is no independent project naming or metadata
- path normalization issues can create accidental duplicates
- there is no room for project-level instructions, pinning, or lifecycle
- a project without a local folder becomes impossible
- the abstraction remains implementation-driven rather than user-driven

---

# 3. Goals

## Primary goals

1. Introduce **Projects** as a first-class product concept.
2. Allow **multiple conversations to belong to one project**.
3. Preserve existing conversation-level workspace folder behavior.
4. Allow a project to define a **default root path / working directory**.
5. Make projects visible and manageable in the sidebar/navigation.
6. Enable creation of new conversations directly within a project.
7. Allow unassigned conversations to continue to work normally.
8. Support low-risk migration for a single-user install.

## Secondary goals

1. Enable future project-level instructions/context.
2. Enable future project-level artifacts/files/resources.
3. Enable future file-tree/project explorer features.
4. Enable future project switching, recent projects, pinning, and archiving.

---

# 4. Non-Goals for V1

These should **not** be required for the first implementation unless the codebase already makes them very easy:

1. Multi-root workspaces
2. Git-native project detection
3. Full file explorer/tree
4. Project templates
5. Team/shared/collaborative projects
6. Complex permissions model
7. Tags/labels as a second grouping system
8. Cross-project conversations
9. Multiple project membership for a single conversation
10. Smart auto-grouping based on similar paths

---

# 5. Product Model

## Existing model

Likely current mental model:

- Conversation
  - messages
  - title
  - optional workspace folder / cwd

## New model

Introduce:

- Project
  - name
  - optional root folder
  - optional instructions/description
  - list of conversations
  - metadata

Conversation gains:

- optional `projectId`

## Relationship model

- A conversation may belong to **zero or one** project in V1.
- A project may contain **many** conversations.
- A project may optionally define a `rootPath`.
- A conversation may still optionally override its own `workspacePath`.

## Resolution behavior

When determining effective working directory for a conversation:

1. If conversation has `workspacePath`, use it.
2. Else if conversation belongs to a project and project has `rootPath`, use that.
3. Else no workspace path is attached.

This preserves backwards compatibility and avoids forcing every project to be folder-backed.

---

# 6. Core User Stories

## Story 1: Create a project from a folder

As a user, I want to create a project by selecting a local folder so that I can group multiple related conversations around that folder.

### Acceptance

- User can choose “Create Project”
- User can select a folder
- Project name defaults from folder name but is editable
- Project appears in sidebar
- New conversations created inside that project inherit the project root path by default

## Story 2: Create a project without a folder

As a user, I want to create a project that is not tied to a folder yet.

### Acceptance

- User can create a project with just a name
- Project appears in sidebar
- Project can later be assigned a root folder
- Conversations within it function normally even without a project root

## Story 3: Create a new conversation within a project

As a user, I want to start a chat inside a project so it stays grouped with related chats.

### Acceptance

- User can click “New Chat” on a project
- Conversation appears under that project in the sidebar
- If the project has a root path, conversation inherits it unless overridden

## Story 4: Assign an existing conversation to a project

As a user, I want to move an existing standalone conversation into a project.

### Acceptance

- User can assign an ungrouped conversation to a project
- Conversation moves into that project in the UI
- Existing conversation workspace path remains unchanged unless user explicitly changes it

## Story 5: View conversations grouped by project

As a user, I want the sidebar to show projects and their conversations so that related work is easier to find.

### Acceptance

- Sidebar has a project-grouped view
- Projects can be expanded/collapsed
- Conversations not assigned to a project remain visible under “Ungrouped” or equivalent

## Story 6: Edit project metadata

As a user, I want to rename a project, change its root folder, and add a description.

### Acceptance

- User can edit project name
- User can add/remove/change root folder
- User can add description/notes
- Changes persist

## Story 7: Delete or archive a project

As a user, I want to clean up projects I no longer need without losing chats unexpectedly.

### Acceptance

- User can archive a project or delete it
- If deleting, user must choose:
  - delete project only and keep conversations as ungrouped
  - or delete project and all conversations
- Destructive actions require confirmation

---

# 7. Proposed UX

## Sidebar Information Architecture

### Recommended structure

- Projects
  - Project A
    - Chat 1
    - Chat 2
  - Project B
    - Chat 3
- Ungrouped
  - Chat 4
  - Chat 5

### Sidebar behavior

- Projects are collapsible
- Active conversation highlights within its project
- Each project row supports actions:
  - New chat
  - Rename
  - Edit project
  - Archive/Delete
  - Set/change folder
- Optional project icon/color indicator

## Recommended UI actions

### Global actions

- New Project
- New Chat
- Search conversations/projects

### Project actions

- New Chat in Project
- Edit Project
- Change Folder
- Open Folder
- Archive Project
- Delete Project

### Conversation actions

- Move to Project
- Remove from Project
- Change workspace override
- Inherit project folder again

## Suggested modal/forms

### Create Project modal

Fields:

- Project Name
- Root Folder (optional)
- Description (optional)

Buttons:

- Create
- Cancel

### Edit Project modal

Fields:

- Project Name
- Root Folder
- Description
- Color/Icon (optional if easy)
- Archived toggle (optional)

Buttons:

- Save
- Cancel
- Delete Project

### Move Conversation modal

Fields:

- Select Project
- Optional checkbox:
  - Keep conversation workspace override
  - or inherit project root path

---

# 8. Data Model Specification

## Project entity

```ts
type Project = {
  id: string;
  name: string;
  rootPath?: string | null;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
};
```

## Conversation additions

```ts
type Conversation = {
  id: string;
  title: string;
  projectId?: string | null;
  workspacePath?: string | null; // likely already exists in some form
  // existing fields remain unchanged
};
```

## Derived behavior

```ts
function getEffectiveWorkspacePath(conversation, projectById) {
  if (conversation.workspacePath) return conversation.workspacePath;
  const project = conversation.projectId ? projectById[conversation.projectId] : null;
  if (project?.rootPath) return project.rootPath;
  return null;
}
```

## Optional future extension

```ts
type ProjectContext = {
  projectId: string;
  instructions?: string | null;
  notes?: string | null;
  pinnedConversationIds?: string[];
};
```

For V1, this may either live on `Project` or be omitted.

---

# 9. Persistence Requirements

The exact implementation depends on the existing AionUi persistence layer, but the system needs:

1. persistent storage of projects
2. conversation-to-project linkage
3. migration support for existing conversations
4. stable ordering if the UI supports custom ordering
5. path normalization when storing root folders

## Minimum persistence responsibilities

- Save/load projects list
- Save/load `conversation.projectId`
- Maintain project metadata on app restart
- Preserve existing conversation workspace paths unchanged

## Path handling

Normalize stored root paths to reduce duplicate-project issues:

- expand relative paths if they can occur
- normalize slashes/separators
- resolve dot segments
- optionally resolve symlinks if that is already standard elsewhere in the app

Do not overcomplicate V1, but avoid naive path duplication.

---

# 10. Migration Strategy

## Important context

There is only one current user: the product owner/admin. No multi-user migration complexity is necessary.

## Migration goals

- zero-risk to existing conversations
- preserve all current behavior
- no forced conversion

## V1 migration plan

1. Add new projects storage.
2. Add nullable `projectId` to conversations.
3. Existing conversations remain `projectId = null`.
4. Existing conversation-level workspace paths remain untouched.
5. Optionally add convenience actions:
   - “Create project from this conversation’s folder”
   - “Assign this conversation to project”

## No automatic migration required

Because there is only one existing user and because path-based grouping may be semantically wrong, do **not** auto-create projects from existing conversation folders unless explicitly requested.

---

# 11. Backward Compatibility Principles

1. Existing conversations continue to function unchanged.
2. Existing workspace-folder behavior remains intact.
3. New project support is additive.
4. Project root path only acts as a default, not a forced override.
5. UI must continue to support ungrouped conversations.

---

# 12. Architecture Guidance

This section is written to guide Maestro/Codex even without a full code map.

## Likely layers requiring change

### 1. Domain/data layer

Needs:

- `Project` type/model
- storage CRUD for projects
- storage extension for `conversation.projectId`

### 2. Application/state layer

Needs:

- project list state
- project CRUD actions
- selectors for:
  - conversations by project
  - ungrouped conversations
  - effective workspace path

### 3. UI layer

Needs:

- sidebar grouping by project
- create/edit project modals
- assign/move conversation actions
- new chat within project action
- project settings/editor

### 4. Conversation creation flow

Needs:

- ability to create a conversation inside a chosen project
- inheritance of project root path if no explicit override chosen

### 5. IPC/backend if applicable

If workspace folder selection currently goes through main process/electron IPC:

- reuse folder picker for project root selection
- do not duplicate folder-picking logic

---

# 13. Recommended Implementation Strategy

## Phase 1: Data and state foundations

Implement:

- Project type
- project persistence
- `projectId` on conversations
- selectors and helper methods

No UI refactor yet beyond basic scaffolding if desired.

## Phase 2: Basic project management UI

Implement:

- Create Project modal
- Edit Project modal
- Delete/Archive project
- Sidebar project sections
- New chat in project
- Move conversation to project

## Phase 3: Workspace path inheritance

Implement:

- project root path selection
- effective workspace path resolution
- conversation override preservation

## Phase 4: UX polish

Implement:

- collapse/expand projects
- project sorting
- recent projects
- ungrouped section polish
- confirmation dialogs

## Phase 5: Future enhancements

Optional:

- project instructions
- file tree
- project search
- pinning
- drag-and-drop reorder/move

---

# 14. Functional Requirements

## FR-1 Project CRUD

System shall support creating, reading, updating, and deleting projects.

## FR-2 Optional project root path

System shall allow a project to have zero or one root folder path.

## FR-3 Conversation project association

System shall allow a conversation to belong to zero or one project.

## FR-4 Effective workspace resolution

System shall resolve conversation workspace path using:

1. conversation override
2. project root path
3. none

## FR-5 Grouped navigation

System shall display conversations grouped under projects in the sidebar.

## FR-6 Ungrouped support

System shall support conversations with no project assignment.

## FR-7 New conversation in project

System shall allow creating a new conversation scoped to a project.

## FR-8 Edit project metadata

System shall allow editing project name and root path at minimum.

## FR-9 Safe deletion

System shall require confirmation before deleting a project and provide clear handling for its conversations.

## FR-10 Persistence

System shall persist projects and conversation-project relationships across restarts.

---

# 15. Acceptance Criteria

## AC-1 Create folder-backed project

Given a user creates a project from a folder,
when the project is saved,
then it appears in the sidebar with the selected root path.

## AC-2 New chat inherits project path

Given a project has root path `/repo/app`,
when the user creates a new conversation inside that project,
then the conversation’s effective workspace path is `/repo/app` unless explicitly overridden.

## AC-3 Existing conversations unchanged

Given an existing conversation with no project,
when the app is upgraded,
then the conversation remains accessible and behaves as before.

## AC-4 Override precedence

Given a conversation belongs to a project with root path `/repo/a`,
and the conversation has workspace override `/repo/b`,
when the conversation runs locally,
then `/repo/b` is used.

## AC-5 Move conversation into project

Given an ungrouped conversation,
when the user assigns it to a project,
then it appears under that project in the sidebar.

## AC-6 Delete project safely

Given a project containing conversations,
when the user deletes it,
then the UI must prompt whether to keep conversations as ungrouped or delete them.

---

# 16. UX Edge Cases

1. **Project with no folder**
   - valid
   - conversations still work
   - effective workspace may be null

2. **Project folder deleted on disk**
   - project remains
   - UI should show path missing/unavailable state
   - conversation still exists

3. **Conversation override differs from project root**
   - valid
   - UI should make this visible if feasible

4. **Two projects with same root path**
   - allow in V1 or warn?
   - recommendation: allow, but optionally warn
   - do not block unless product wants strict uniqueness

5. **Deleting a root folder externally**
   - do not delete project automatically

6. **Renaming project**
   - no effect on path or conversations other than display

7. **Removing conversation from project**
   - conversation becomes ungrouped
   - existing workspace override remains

---

# 17. Risks and Mitigations

## Risk 1: Confusing Project vs Workspace terminology

### Mitigation

Be explicit in code and UI:

- “Project” for organization
- “Working folder” or “Workspace path” for execution context

Avoid calling both simply “workspace.”

## Risk 2: Overloading folder grouping into project semantics

### Mitigation

Use a real Project entity, not inferred grouping only.

## Risk 3: Hidden inheritance causing user confusion

### Mitigation

Show whether conversation is:

- inheriting project root
- or using an override

## Risk 4: Large sidebar refactor

### Mitigation

Implement basic grouped rendering first, keep existing conversation rendering logic where possible.

## Risk 5: Destructive deletion confusion

### Mitigation

Project deletion must clearly explain what happens to contained conversations.

---

# 18. Suggested Terms and Labels

## Preferred UI terms

- Project
- New Project
- Project Settings
- Root Folder
- Working Folder
- Ungrouped Conversations
- New Chat in Project
- Move to Project

## Avoid if possible

- Calling the project itself a “workspace” if workspace already means folder/cwd
- Calling folder attachment “project” unless it truly is one

---

# 19. Suggested Internal Naming

These names are recommendations for implementation planning.

## Types

- `Project`
- `ProjectId`
- `ProjectStore`
- `ProjectRepository`
- `Conversation.projectId`

## Helpers

- `getEffectiveWorkspacePath`
- `groupConversationsByProject`
- `createProjectFromFolder`
- `moveConversationToProject`

## UI components

- `ProjectSidebarSection`
- `ProjectList`
- `ProjectItem`
- `CreateProjectModal`
- `EditProjectModal`
- `MoveConversationToProjectModal`

---

# 20. Testing Strategy

## Unit tests

1. project creation persistence
2. conversation assignment to project
3. effective workspace path resolution
4. project rename/edit
5. delete project with keep-conversations behavior
6. delete project with delete-conversations behavior

## Integration tests

1. create project from folder and new chat within it
2. move existing conversation into project
3. app restart persists project structure
4. conversation override supersedes project root

## UI tests

1. sidebar renders grouped projects
2. collapse/expand behavior
3. create/edit/delete project modal flows
4. ungrouped conversations remain visible

## Manual tests

1. create project with folder
2. create project without folder
3. assign multiple chats to same project
4. override one conversation folder within project
5. remove project root and verify graceful behavior
6. delete project and retain conversations

---

# 21. Suggested Rollout Plan

## V1

- Project CRUD
- conversation.projectId
- sidebar grouping
- project root folder
- new chat in project
- move conversation to project
- ungrouped conversations
- safe deletion

## V1.1

- project description
- project color/icon
- recent projects
- project sorting/pinning

## V2

- project instructions/context
- project-level notes/resources
- file explorer/tree
- drag-and-drop conversation movement
- archived projects view

---

# 22. Explicit Product Decisions

These are recommended firm decisions for Maestro to encode.

1. **A conversation belongs to at most one project in V1.**
2. **Projects are first-class stored entities, not inferred only from folder paths.**
3. **Projects may exist without a root folder.**
4. **Project root folder is the default working directory, not a forced override.**
5. **Existing conversations remain ungrouped by default after migration.**
6. **No automatic migration from existing workspace folders into projects.**
7. **Project deletion requires explicit choice about what happens to conversations.**
8. **The user is the only current account, so migration can remain simple and local.**

---

# 23. Maestro Playbook Input Summary

Use this as a condensed directive for Maestro.

## Objective

Add first-class **Project** support to AionUi so multiple conversations can be organized under a shared project container, distinct from the existing conversation-level workspace folder / working directory feature.

## Key constraints

- Preserve existing workspace-folder behavior
- Additive, non-breaking implementation
- Single-user migration only
- No auto-conversion of existing conversations
- Conversation may belong to zero or one project
- Project may optionally define a root folder
- Conversation explicit workspace override always wins over project root

## V1 deliverables

- Project data model and persistence
- `projectId` on conversations
- CRUD UI for projects
- Sidebar grouped by project
- New chat in project
- Move conversation to project
- Optional project root folder
- Safe delete flow
- Ungrouped conversations section
- Tests for path resolution and project assignment

## Definition of done

User can create a project, create multiple conversations inside it, see them grouped in the UI, and rely on the project root folder as default execution context without breaking existing conversation-level workspace behavior.

---

# 24. Prompt Block for Maestro / Codex

You can paste the following directly into Maestro as a seed instruction:

```text
Build first-class Project support in AionUi.

Important product distinction:
- Existing workspace folder / working directory support is a conversation-level execution context.
- New Project support must be a first-class organizational container above conversations.

Requirements:
1. Add a persistent Project entity with fields:
   - id
   - name
   - optional rootPath
   - optional description
   - optional color/icon if easy
   - createdAt
   - updatedAt
   - optional archivedAt

2. Extend Conversation with optional projectId.

3. Effective workspace path resolution:
   - conversation.workspacePath override wins
   - else use project.rootPath if present
   - else null

4. UI:
   - Sidebar grouped by project
   - Ungrouped conversations section
   - Create Project modal
   - Edit Project modal
   - New Chat in Project action
   - Move conversation to project action

5. Behavior:
   - Projects may exist without a root folder
   - Existing conversations remain ungrouped after migration
   - No automatic migration from existing conversation folders to projects
   - Safe delete flow for projects:
     a) delete project only and keep conversations as ungrouped
     b) delete project and all contained conversations

6. Maintain backward compatibility:
   - Existing workspace-folder behavior must continue unchanged
   - Project root folder is only a default, not a forced override

7. Deliverables:
   - implementation plan
   - code changes
   - tests
   - documentation/comments where useful

Prioritize V1 simplicity and correctness over advanced features like multi-root workspaces, tags, or file explorers.
```
