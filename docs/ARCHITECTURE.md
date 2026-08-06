# EVIDO architecture

## Proposed folder structure

```text
src/
  app/                  # App Router pages, layouts, route handlers
    (auth)/             # login, registration, invitation, password flows
    (app)/              # authenticated organization-scoped product
    api/                 # webhooks, uploads and integration endpoints
  components/           # shared UI and application shell
  features/             # projects, tasks, evidence, reviews, attendance, inventory
  lib/                  # auth, database, authorization, storage, validation, i18n
  server/               # server actions, repositories and domain services
prisma/                 # schema, migrations and seed data
docs/                   # architecture and product rules
```

Each feature owns its schemas, server actions, queries, UI and tests. Database access is only allowed through organization-scoped repositories. Files use signed URLs and retain immutable versions after submission.

## Entity relationships

- Organization has branches, departments, memberships, roles, projects, tasks and settings.
- User joins an Organization through OrganizationMember; memberships receive one or more Roles through UserRole.
- Role has many Permissions through RolePermission.
- Project has members, milestones and tasks. Task has assignees, dependencies, checklist items and evidence requirements.
- EvidenceRequirement has submitted TaskEvidence versions. TaskSubmission snapshots the evidence set being reviewed.
- A submission has ordered TaskReviews and TaskApprovals; successful final approval transitions the task to Completed.
- Attendance owns work sessions and timesheets. LeaveRequest owns ordered LeaveApprovals.
- Warehouse owns inventory stock. Every quantity change is an immutable StockMovement.
- AuditLog references the actor and entity but does not cascade-delete history.

## Permission matrix

| Capability | Employee | Team lead | Manager | HR | Executive | Admin |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| View assigned work / submit evidence | Own | Team | Team | Read | All | All |
| Create and assign tasks | — | Team | Yes | — | Yes | Yes |
| Review submissions | — | Level 1 | Yes | — | Yes | Yes |
| Final approve | — | — | Configured | — | Yes | Yes |
| Manage projects | — | — | Yes | — | Yes | Yes |
| Manage employees / leave | Own | Team | Team | Yes | Read | Yes |
| Attendance / timesheets | Own | Team | Team | Yes | Read | Yes |
| Inventory operations | Assigned | Assigned | Yes | — | Read | Yes |
| Reports | Own | Team | Team | HR | All | All |
| Roles, settings, audit | — | — | — | Limited | Read | Yes |

Authorization is enforced on the server with both `organizationId` scope and explicit permission checks.

## Task state transitions

```text
DRAFT -> ASSIGNED -> IN_PROGRESS -> SUBMITTED -> UNDER_REVIEW
                         |              |               |
                         v              v               v
                      BLOCKED       OVERDUE       CHANGES_REQUIRED
                                                        |
                                                        v
                                                   IN_PROGRESS

UNDER_REVIEW -> APPROVED -> COMPLETED
UNDER_REVIEW -> REJECTED
Any non-final state -> CANCELLED (authorized roles only)
```

- Submission is rejected by validation until all mandatory evidence exists.
- Evidence becomes immutable within a submitted version; corrections create a new version.
- `APPROVED` advances to the next approval step. Only the last approval creates `COMPLETED`.
- Rejection and requested changes require a reason and generate notifications and audit records.
- Historical submission, review, approval and activity records are never silently deleted.

## Implementation plan

1. Foundation: tokens, responsive shell, Prisma, auth boundary, organization context and RBAC.
2. Core workflow: projects, task lifecycle, evidence upload, review/approval, comments and notifications.
3. Workforce: employee directory, attendance, work sessions, timesheets and leave reassignment.
4. Operations: catalog, warehouses, scan flows, movements, counts and three-way matching.
5. Intelligence: configurable scoring, dashboards, risks, reports and exports.

The current implementation establishes the visual system, responsive application shell, Mongolian-first navigation, interactive dashboard sections, and normalized Phase 1 data foundation.
