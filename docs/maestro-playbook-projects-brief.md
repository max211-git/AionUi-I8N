# Maestro-Ready Playbook Brief

## AionUi First-Class Projects Feature

## 1. Mission

Design and implement first-class **Project** support in AionUi so users can organize multiple related conversations under a shared project container, while preserving the existing conversation-level workspace folder / working directory behavior used for local execution.

This brief is intended for Maestro orchestration with Codex/GPT-5.4 and should be used to create an execution playbook.

---

## 2. Product Intent

AionUi currently appears to support attaching a workspace folder or working directory to an individual conversation. That is useful for execution context, but it is not sufficient for organizational grouping.

The goal is to introduce a new abstraction:

- **Workspace folder / working directory** = technical execution context
- **Project** = organizational and contextual container for many conversations

A project should allow the user to:

- group conversations together
- start new chats inside a project
- optionally define a default root folder for all chats in the project
- preserve project affinity across sessions
- enable future project-level instructions and resources

---

## 3. Success Definition

This work is successful when the product can:

1. Create a project with or without a folder
2. Show projects in the sidebar
3. Create multiple conversations under the same project
4. Move existing conversations into a project
5. Use the project root folder as the default working directory when no conversation override exists
6. Preserve existing ungrouped conversations and current workspace behavior without breakage

---

## 4. Hard Constraints

1. This is an **additive** feature, not a breaking redesign.
2. Existing conversation-level workspace path behavior must continue to function.
3. A conversation belongs to **zero or one** project in V1.
4. A project may have **zero or one** root folder in V1.
5. A conversation-level explicit workspace override must always take precedence over the project root folder.
6. Existing conversations must remain ungrouped after migration.
7. No automatic migration from existing folders into projects.
8. Single-user migration only; current install is effectively a personal admin environment.

---

## 5. Deliverables

Maestro should orchestrate work that produces the following:

### Required deliverables

- implementation plan
- architecture notes
- code changes
- tests
- brief documentation or comments where useful

### Feature deliverables

- Project data model
- persistence for projects
- conversation `projectId` support
- project CRUD operations
- sidebar project grouping
- new chat in project flow
- move conversation to project flow
- optional project root folder support
- effective workspace path resolution
- safe project delete flow
- ungrouped conversations support

---

## 6. Source of Truth

Primary reference document:

- `docs/aionui-projects-feature-spec.md`

The playbook should derive implementation tasks directly from that spec and avoid inventing conflicting semantics.

---

## 7. Recommended Team / Role Decomposition

If Maestro supports parallel agent roles, use a structure similar to this:

### 1. Planner / Tech Lead

Responsibilities:

- inspect codebase architecture
- map persistence/state/UI layers
- identify insertion points
- produce implementation sequence
- flag risks and dependencies

### 2. Data / Persistence Engineer

Responsibilities:

- add Project model/types
- extend conversation schema with `projectId`
- implement storage CRUD
- design migration behavior
- implement helper selectors or repository logic

### 3. UI / Interaction Engineer

Responsibilities:

- sidebar grouping UI
- create/edit project modal(s)
- move conversation to project flow
- new chat in project affordances
- delete/archive dialogs and UX polish

### 4. App Logic / State Engineer

Responsibilities:

- state management updates
- project selectors
- effective workspace path inheritance logic
- action wiring between UI and persistence

### 5. QA / Test Engineer

Responsibilities:

- unit test plan
- integration test plan
- regression checks for existing workspace behavior
- verify deletion and override precedence

If fewer roles are used, combine them, but keep the separation of concerns in the plan.

---

## 8. Workstream Breakdown

## Workstream A: Codebase Reconnaissance

Objective:
Map how AionUi currently stores conversations, workspace folders, sidebar navigation state, and modal/dialog flows.

Tasks:

1. Identify conversation model/type definitions.
2. Identify where workspace folder / cwd is stored and resolved.
3. Identify persistence/storage mechanism.
4. Identify sidebar rendering path.
5. Identify create conversation flow.
6. Identify any existing folder picker or workspace selector components.
7. Identify tests around conversation organization and workspace behavior.

Outputs:

- architecture map
- candidate files/modules to modify
- dependency/risk notes

Gate:
Do not begin large implementation until data flow and UI insertion points are understood.

---

## Workstream B: Domain Model and Persistence

Objective:
Introduce first-class persistent project entities.

Tasks:

1. Add `Project` type/model.
2. Add project storage/repository layer.
3. Add `projectId` to conversation model/schema.
4. Implement migration/default loading behavior.
5. Implement CRUD methods for projects.
6. Implement selectors/helpers for:
   - conversations by project
   - ungrouped conversations
   - effective workspace path

Outputs:

- stable domain model
- persistence support
- helper functions available to UI/state

Gate:
Persistence must be working before complex UI grouping proceeds.

---

## Workstream C: State and Business Logic

Objective:
Integrate projects into runtime app state.

Tasks:

1. Add project state loading.
2. Add project CRUD actions.
3. Add conversation assignment/removal actions.
4. Implement effective workspace resolution:
   - conversation override
   - else project root path
   - else none
5. Ensure existing flows are not broken for ungrouped conversations.

Outputs:

- state actions/selectors
- resolved execution context behavior

Gate:
Must confirm no regressions in legacy conversation behavior.

---

## Workstream D: Sidebar and Navigation UI

Objective:
Expose projects as a first-class navigation structure.

Tasks:

1. Add Projects section to sidebar.
2. Render project rows with expand/collapse.
3. Render conversations nested under projects.
4. Add Ungrouped section for conversations with no project.
5. Add project row actions if consistent with existing UX patterns.
6. Ensure active conversation highlighting still works.

Outputs:

- sidebar grouping UI
- ungrouped support

Gate:
Grouped navigation must remain performant and not destabilize current conversation list behavior.

---

## Workstream E: Project Management UX

Objective:
Provide usable CRUD interaction flows.

Tasks:

1. Create Project modal
2. Edit Project modal
3. Delete Project flow
4. Archive Project flow if easy and already supported semantically
5. Folder picker integration for project root folder
6. New Chat in Project action
7. Move Conversation to Project action
8. Remove Conversation from Project action

Outputs:

- complete project management UX

Gate:
Deletion behavior must be explicit and safe.

---

## Workstream F: Test Coverage and Regression Protection

Objective:
Prevent regressions and validate new behavior.

Tasks:

1. Add unit tests for effective workspace resolution.
2. Add tests for project CRUD persistence.
3. Add tests for conversation assignment/removal.
4. Add tests for delete-project behaviors.
5. Add sidebar rendering tests if the stack supports them.
6. Add integration tests for create project → create chat → restart → persistence.
7. Verify existing workspace-folder behavior remains intact.

Outputs:

- test suite updates
- regression notes

---

## 9. Required Product Decisions to Honor

The playbook must preserve these decisions:

1. Project is a first-class stored entity.
2. Project is not merely inferred from folder path.
3. Conversation belongs to at most one project in V1.
4. Projects may exist without folders.
5. Project root folder is a default working directory, not a forced override.
6. Existing conversations remain ungrouped after migration.
7. No automatic migration from existing conversation folders.
8. Deleting a project must require a user choice about what happens to its conversations.

---

## 10. Data Model Requirements

Minimum target model:

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

Conversation extension:

```ts
type Conversation = {
  id: string;
  title: string;
  projectId?: string | null;
  workspacePath?: string | null;
};
```

Resolution logic requirement:

```ts
if (conversation.workspacePath) {
  use conversation.workspacePath;
} else if (project?.rootPath) {
  use project.rootPath;
} else {
  use no workspace path;
}
```

---

## 11. UX Requirements

Minimum UX behavior:

1. User can create a project with name only.
2. User can create a project from folder selection.
3. Sidebar displays project groups and ungrouped conversations.
4. User can create a new conversation directly within a project.
5. User can move an existing conversation into a project.
6. User can edit project metadata.
7. User can delete a project with clear conversation handling choices.

Recommended UX labels:

- Project
- New Project
- Project Settings
- Root Folder
- Working Folder
- Ungrouped Conversations
- New Chat in Project
- Move to Project

Avoid terminology collisions between project and workspace.

---

## 12. Explicit Non-Goals for V1

The playbook should avoid expanding into these unless trivial:

1. Multi-root project support
2. Full file tree/explorer
3. Git-driven project auto-detection
4. Shared/team projects
5. Tags as a second grouping system
6. Multiple project membership per conversation
7. Automatic project creation from current folders
8. Broad redesign of unrelated navigation

---

## 13. Key Risks Maestro Should Manage

### Risk: Terminology confusion

Mitigation:
Keep project and workspace semantics distinct in code and UI.

### Risk: Overly invasive refactor

Mitigation:
Implement additive grouping around existing conversation systems.

### Risk: Hidden inheritance confusion

Mitigation:
Make the effective workspace logic explicit in code and ideally visible in UI.

### Risk: Deletion ambiguity

Mitigation:
Require explicit user choice on project deletion.

### Risk: Regression in existing conversation behavior

Mitigation:
Protect with tests and ensure ungrouped conversations remain first-class.

---

## 14. Definition of Done

The implementation is done when all of the following are true:

1. Projects can be created, edited, and deleted.
2. Projects persist across app restarts.
3. Conversations can be assigned to and removed from projects.
4. Sidebar shows grouped projects and ungrouped conversations.
5. New chats can be created directly inside projects.
6. Project root folder acts as default working directory when no conversation override exists.
7. Existing conversation-level workspace behavior still works.
8. Safe deletion behavior is implemented.
9. Tests cover core project behavior and regression-sensitive path resolution.

---

## 15. Suggested Execution Order

1. Recon architecture and persistence model
2. Implement Project domain model and storage
3. Add `projectId` to conversations
4. Implement selectors and effective workspace path logic
5. Add sidebar grouping
6. Add create/edit/delete project flows
7. Add move/create conversation project flows
8. Add tests and regression checks
9. Polish UX and documentation

---

## 16. Suggested Checkpoints for Maestro

### Checkpoint 1: Architecture review complete

Artifacts:

- identified storage files/modules
- identified UI insertion points
- identified migration path

### Checkpoint 2: Data model landed

Artifacts:

- Project type/model
- persistence support
- conversation project linkage

### Checkpoint 3: State logic landed

Artifacts:

- selectors/actions
- path inheritance logic
- no-regression confirmation

### Checkpoint 4: UI MVP landed

Artifacts:

- sidebar grouping
- project create/edit flows
- move conversation flow

### Checkpoint 5: Regression-safe delivery

Artifacts:

- tests
- manual validation notes
- definition of done satisfied

---

## 17. Suggested Prompt to Start Maestro

```text
Create a playbook to add first-class Project support to AionUi.

Use docs/aionui-projects-feature-spec.md as the source of truth.

Important distinction:
- Existing workspace folder / working directory support is conversation-level execution context.
- New Project support must be a first-class organizational layer above conversations.

Required outcomes:
- persistent Project entity
- optional project root folder
- conversation.projectId support
- effective workspace path precedence:
  1) conversation workspace override
  2) project root path
  3) none
- sidebar grouping by project
- ungrouped conversations section
- create/edit/delete project flows
- new chat in project
- move conversation to project
- safe delete handling for project conversations
- regression protection for existing workspace-folder behavior

Constraints:
- additive and non-breaking
- no auto-migration from existing folders to projects
- conversation belongs to zero or one project in V1
- projects may exist without folders
- single-user migration only

Produce a phased implementation plan, identify target files/modules, execute code changes, and add tests.
```

---

## 18. Final Note to Maestro

Prioritize correctness of product semantics over speed of implementation. The crucial requirement is preserving the distinction between:

- project as organizational container
- workspace/working directory as execution context

Do not collapse them into one concept.
