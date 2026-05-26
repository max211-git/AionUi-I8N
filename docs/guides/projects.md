# Projects in AionUi

Projects help you keep related work together.

A project is a user-facing container for chats, workspace chats, and teams. It sits above individual conversations and keeps project-related work out of the general Recents list.

## What a project is

Use a project when you want to group work around the same goal, codebase, client, feature, or initiative.

A project can contain:

- regular chats
- workspace chats
- teams
- project assets and artifacts

A project may also have an optional project assets folder, but a project is **not** just a folder path. It is an organizational container in the app.

## How Projects differ from Chats, Workspace Chats, and Teams

### Regular chat

A regular chat behaves like the standard AionUi chat experience.

- It can exist with no project at all.
- It can still use an execution workspace behind the scenes.
- It appears in **Recents** when it is not assigned to a project.

### Workspace chat

A workspace chat is for work that is explicitly tied to a folder you chose.

- It is created with a selected workspace folder.
- Inside a project, it appears under **Workspace chats**.
- Outside a project, it is still treated as its own workspace-based chat.

### Team

A team is a multi-agent workflow that can also belong to a project.

- Teams can be created in a project.
- Teams can be moved between projects.
- Teams can also be removed from a project and exist independently.

### Project

A project is the parent container that organizes the items above.

- It stays in the **Projects** section of the sidebar.
- Its contents stay nested inside the project.
- It does not move into **Recents** when you add chats or teams to it.

## How Recents works

The **Recents** list is reserved for items that are **not** associated with a project.

This means:

- chats with no project appear in **Recents**
- project chats do **not** appear in **Recents**
- project workspace chats do **not** appear in **Recents**
- project teams stay inside their project

If you want work to stay grouped together, create it inside a project or move it into one.

## How workspace behavior works

Projects and workspaces are related, but they are not the same thing.

Important distinction:

- **Project** = organizational grouping
- **Workspace** = selected folder or runtime execution context

A normal chat may still have an execution workspace in the right-side inspector. That does **not** make it a workspace chat in the sidebar.

A chat appears under **Workspace chats** only when it was explicitly created as a workspace chat with a chosen folder.

## Create a project

To create a project:

1. In the sidebar, select **New Project**.
2. Enter a project name.
3. Optionally choose a project assets folder.
4. Save the project.

Your new project will appear in the **Projects** section.

## Create a chat inside a project

To create a regular chat in a project:

1. Open the project menu.
2. Select **New chat**.
3. Start the conversation as usual.

The chat will stay inside that project instead of appearing in Recents.

## Create a workspace chat inside a project

To create a workspace chat in a project:

1. Open the project menu.
2. Select **New workspace chat**.
3. Choose an assistant.
4. Choose a workspace folder.
5. Optionally edit the chat name.
6. Create the chat.

The chat name defaults to the selected folder name, but you can change it before creating the chat.

## Create or move a team into a project

You can place teams inside projects in two ways.

### Create a new team in a project

1. Open the project menu.
2. Select **New team**.
3. Configure the team.
4. Create it.

### Move an existing team into a project

1. Open the team menu.
2. Select **Move to project**.
3. Choose a destination project.
4. Confirm the move.

The team will move into the selected project and should refresh in the sidebar immediately.

## Remove a team from a project

To remove a team from a project:

1. Open the team menu.
2. Select **Remove from project** or choose the remove option from the project-move dialog.

The team will no longer belong to that project.

## Move a chat into or out of a project

Chats can also be moved between project and non-project areas.

- Use **Move to project** to place a chat into a project.
- Use **Remove from project** to return it to the general non-project area.

When removed from a project, the chat returns to **Recents**.

## Empty states you may see

Inside a project, you may see placeholders such as:

- **No workspace chats yet**
- **No teams assigned yet**

These simply mean the project exists, but nothing of that type has been added yet.

## Project Assets

Projects can optionally point at a project assets folder.

When a project has an assets folder:

- the sidebar shows an **Assets** section inside that project
- asset categories appear as nested child entries with item counts
- the section stays collapsed by default unless you left it expanded previously
- selecting a category opens the right-side asset inspector

Current asset categories include:

- Images
- Documents
- PDFs
- Code & Text
- Other files

### What you can do in the asset inspector

The asset inspector lets you:

- search and sort indexed assets
- refresh the asset index from the project folder
- preview supported files in-app
- attach assets to chat
- toggle whether an asset is available in chat context
- remove an asset from the project index

### Current preview behavior

Supported in-app preview paths include:

- images
- PDFs
- office-style document previews where supported by the existing preview stack
- code and text files
- video files such as `mp4`

For image categories, the inspector defaults to a grid view with thumbnails.

## Current scope

At this stage, Projects support:

- project creation and editing
- project chat containment
- project workspace chat containment
- project team containment
- project asset browsing from an optional project assets folder
- per-category asset counts and nested asset navigation
- attaching and context-enabling project assets from the inspector
- in-app preview for supported project assets, including video
- moving chats and teams into and out of projects
- keeping non-project chats in Recents

## Practical example

A project called `Website Redesign` might contain:

- a regular chat for planning
- a workspace chat tied to the website repository
- a team for research or implementation
- a project assets folder for screenshots, PDFs, reference docs, and video clips

That keeps everything related to the same initiative together in one place.
