---
name: task-manager
description: Autonomous prioritization and updating of dashboard tasks in the PDS workflow
---

# Task Manager Skill

This skill outlines the specific steps for autonomously prioritizing and updating PDS dashboard tasks, such as Global Tasks and User Tasks (Document Reviews).

## 1. Data Retrieval and Parsing
The application relies on `localStorage` (`rbp_projects`) with potential Supabase fallbacks for managing projects and assigned tasks.
- **Source of Truth**: `localStorage.getItem('rbp_projects')`.
- **Task Identification**: 
  - A **Global Task** represents a whole project (e.g., `id`, `alternateId`).
  - A **User Task** represents a specific document requirement inside a project (e.g., `docCode` mapped via `docAssignments`, `docStatuses`, `docDeadlines`).

## 2. Autonomous Prioritization Logic
Tasks should be dynamically prioritized based on the active user's role and time constraints:

### Role-Based Context
Always determine the active user via `localStorage.getItem('currentUser')`.
- **Admin / Section Chief**: Prioritize unassigned projects. Focus on setting the `assignedTo` (Unit Head) and overall project `deadline`.
- **Unit Head**: Filter projects where `assignedTo === currentUser.name`. Prioritize assigning specific documents (`docAssignments`) to regular members.
- **Regular Member**: Filter assigned documents where `docAssignments[docCode] === currentUser.name`.

### Time & Status Prioritization Matrix
1. **Critical/Immediate (Due Today)**: 
   - `deadline === today`
   - Status is `Returned` (requires correction).
   - Status is `Draft` or `Pending` (uninitiated work).
2. **Upcoming (Actionable)**: 
   - `deadline > today`
   - Status is `Drafting` or `Preparation`.
3. **Low Priority / Review**: 
   - Tasks waiting on others (e.g., `Submitted`, `Under Review`).
   - `Approved` tasks.

## 3. Specific Steps for Autonomous Updating
When a task needs to be updated autonomously, follow this procedural workflow to ensure state consistency.

### A. Updating a Global Task (Project Level)
1. Fetch existing projects: `const data = JSON.parse(localStorage.getItem('rbp_projects') || '[]')`.
2. Find the target project by `id` or `alternateId`.
3. Mutate the relevant project-level fields:
   - `assignedTo`: Reassign Lead Unit Head.
   - `deadline`: Modify timeline.
   - `status`: Update to `PROPOSED`, `Drafting`, etc.
4. Save the mutated array: `localStorage.setItem('rbp_projects', JSON.stringify(data))`.
5. *(Optional)* Mirror the update to Supabase `projects` table if `process.env.NEXT_PUBLIC_SUPABASE_URL` is configured.

### B. Updating a User Task (Sub-Document Level)
1. Fetch existing projects as above.
2. Find the parent project containing the document.
3. Target the specific document using its `docCode` (e.g., `'PR'`, `'DUPA'`).
4. Ensure target nested objects exist (`docStatuses`, `docCorrections`, `uploadedDocs`), then mutate:
   - **Submission**: `uploadedDocs[docCode] = true`, `docStatuses[docCode] = 'Submitted'`.
   - **Approval**: `docStatuses[docCode] = 'Approved'`.
   - **Return/Correction**: `docStatuses[docCode] = 'Returned'`, `docCorrections[docCode] = (docCorrections[docCode] || 0) + 1`.
5. Save the mutated project array back to `localStorage`.

## 4. Handling Task Feedback Loops
- **Returned Tasks**: When autonomously transitioning a document to `Returned`, always pair it with an increment in `docCorrections`. This ensures the custom `View Correction` URL (`/dashboard/view-correction/...`) generates properly on the member's dashboard.
- **Annotations**: If a document has feedback, manage `pds_annotations_${id}_${docCode}` in `localStorage` to reflect drawn toolpaths or textual feedback.
