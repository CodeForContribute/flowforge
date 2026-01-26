# FlowForge Feature Roadmap

> Features inspired by Jira best practices. Work on these after current platform is robust and stable.

---

## High Priority (Maximum Value, Reasonable Effort)

- [x] **@Mentions in Comments** - Tag users with @username to notify them directly
  - Complexity: Low
  - Value: Direct attention to specific people, creates accountability

- [ ] **Watchers** - Subscribe to tasks without being assigned
  - Complexity: Low
  - Value: Stakeholders can stay informed without cluttering assignment

- [ ] **Issue Linking** - Create relationships (blocks, relates to, duplicates, clones)
  - Complexity: Medium
  - Value: Essential for dependency tracking beyond parent-child hierarchy

- [x] **WIP Limits** - Maximum work-in-progress limits per Kanban column
  - Complexity: Low
  - Value: Core Kanban practice to improve flow and reduce context switching

- [ ] **Saved Filters** - Save and name filter queries for quick access
  - Complexity: Low
  - Value: Reduce repetitive filter setup, share useful views with team

- [ ] **Sprint Burndown Chart** - Visual chart showing remaining work vs ideal burn rate
  - Complexity: Medium
  - Value: Real-time visibility into sprint progress and early warning for scope issues

- [ ] **Activity History/Audit Log** - Complete log of all changes with timestamps
  - Complexity: Medium
  - Value: Accountability, debugging decisions, understanding context

- [ ] **Time Tracking** - Log work hours, original vs actual estimates, remaining time
  - Complexity: Medium
  - Value: Capacity planning, billing, understanding velocity beyond story points

- [ ] **Resolution Field** - Track why task was closed (Fixed, Won't Fix, Duplicate, etc.)
  - Complexity: Low
  - Value: Better insight into task outcomes and reporting on resolution patterns

- [ ] **Components** - Group tasks by component/module (Frontend, Backend, API, etc.)
  - Complexity: Low
  - Value: Better organization and enables component-based filtering/reporting

---

## Medium Priority (Good Value)

- [ ] **Custom Dashboards** - Personalized dashboards with configurable widgets
  - Complexity: High
  - Value: Each user/team can have their optimal information display

- [ ] **Automation Rules Engine** - Visual rule builder (When X happens, if Y, then do Z)
  - Complexity: High
  - Value: Eliminate repetitive work, ensure consistency, speed up workflows

- [ ] **Velocity Chart** - Track story points completed per sprint over time
  - Complexity: Medium
  - Value: Essential for sprint planning and predicting delivery timelines

- [ ] **Cumulative Flow Diagram** - Issue counts in each status over time
  - Complexity: Medium
  - Value: Identify bottlenecks, WIP issues, and flow efficiency

- [ ] **Swimlanes on Boards** - Horizontal groupings by assignee, epic, or custom query
  - Complexity: Medium
  - Value: Visual organization of board cards for better scannability

- [ ] **Board Column Configuration** - Customize columns, limits, constraints per board
  - Complexity: Medium
  - Value: Match board to team's actual workflow

- [ ] **Slack Integration** - Create issues from Slack, notifications in channels
  - Complexity: Medium
  - Value: Meet developers where they already communicate

- [ ] **Advanced Query Language (JQL equivalent)** - Structured query language for complex searches
  - Complexity: High
  - Value: Power users can create precise, complex queries

- [ ] **Bulk Operations** - Perform operations on multiple issues at once
  - Complexity: Medium
  - Value: Massive time savings for maintenance tasks

- [ ] **File Attachments** - Attach files, screenshots, documents to tasks
  - Complexity: Medium
  - Value: Keep all relevant materials with the task

---

## Lower Priority (Nice to Have)

- [ ] **Custom Fields** - Add custom fields to tasks (text, number, date, dropdown, etc.)
  - Complexity: High
  - Value: Capture data specific to organization's needs

- [ ] **Workflow Designer** - Visual builder for custom workflows with states/transitions
  - Complexity: High
  - Value: Model exact business processes

- [ ] **Mobile App** - Native iOS/Android apps
  - Complexity: High
  - Value: Stay connected away from desk

- [ ] **Timeline/Roadmap View** - Gantt-style timeline with dependencies
  - Complexity: High
  - Value: Long-term planning and deadline visualization

- [ ] **IDE Plugins** - View and update tasks from VS Code, IntelliJ
  - Complexity: High
  - Value: Developers stay in their IDE

- [ ] **SLA Tracking** - Define and track Service Level Agreements
  - Complexity: High
  - Value: Critical for support teams and customer-facing work

---

## Additional Features to Consider

### Board Views
- [ ] Scrum Board - Sprint-focused board separate from Kanban
- [ ] List View - Spreadsheet-style with inline editing
- [ ] Calendar View - Tasks displayed on calendar by due date
- [ ] Quick Filters - One-click saved filter buttons on boards
- [ ] Card Colors - Color-code by priority/label/assignee
- [ ] Card Layout Customization - Choose which fields appear on cards

### Sprint & Backlog
- [ ] Sprint Retrospective Integration - Built-in retro board linked to sprints
- [ ] Backlog Refinement Tools - Estimation poker, bulk editing, story splitting
- [ ] Release/Version Management - Track what ships when, release notes
- [ ] Sprint Capacity Planning - Set team capacity and track against planned work
- [ ] Epic Progress Tracking - Auto-calculated completion percentage from children

### Collaboration
- [ ] Rich Text Editor - Tables, code blocks, images, checklists
- [ ] Reactions to Comments - Emoji reactions like Slack/GitHub
- [ ] Private Comments - Comments visible only to specific roles
- [ ] Request Participants - Add consulted people who aren't assignee

### Reporting
- [ ] Control Chart - Cycle time with statistical analysis
- [ ] Sprint Report - Comprehensive sprint summary
- [ ] Created vs Resolved Chart - Rate comparison over time
- [ ] Time in Status Report - How long tasks spend in each status
- [ ] Workload Report - Team member workload distribution
- [ ] Report Export - CSV, PDF, Google Sheets/Excel

### Search & Filtering
- [ ] Filter Subscriptions - Periodic email digests of filter results
- [ ] Recent Activity Search - Search by recent changes
- [ ] Text Search with Highlighting - Full-text search across all fields
- [ ] Search Autocomplete - Suggestions as you type

### Integrations
- [ ] Confluence/Docs Integration - Link documentation to tasks
- [ ] CI/CD Integration - Link builds, deployments, test results
- [ ] Webhooks (Outgoing) - Send events to external systems
- [ ] Zapier/Make Integration - No-code automation platforms
- [ ] Email Integration - Create/reply via email

### Notifications
- [ ] Email Digest Mode - Batch notifications into periodic digests
- [ ] Push Notifications - Browser/mobile push for real-time alerts
- [ ] Smart Notifications - AI-powered relevance scoring
- [ ] Do Not Disturb Mode - Suppress notifications during focus time
- [ ] Notification Templates - Customize email content and format

### Customization
- [ ] Field Configurations - Required, hidden, read-only per context
- [ ] Workflow Schemes - Different workflows for different task types
- [ ] Screen Schemes - Different fields per create/edit/view context
- [ ] Notification Schemes - Configure notifications per project
- [ ] Permission Schemes - Fine-grained access control
- [ ] Issue Security Levels - Control task visibility
- [ ] Project Templates - Create projects from preset templates
- [ ] Task Templates - Create tasks from templates with preset fields

---

## Current Platform - Existing Features

Already implemented in FlowForge:
- [x] Basic task management (CRUD)
- [x] Kanban board with drag-and-drop
- [x] Sprint management
- [x] Task hierarchy (Epic > Story > Task > Subtask > Bug)
- [x] Labels
- [x] Priority levels (Low, Medium, High, Urgent)
- [x] Story points
- [x] Due dates
- [x] Assignees
- [x] GitHub PR integration
- [x] AI-powered code generation
- [x] AI-powered PR review response
- [x] AI-powered comment handling
- [x] Notification preferences (email)
- [x] Notification bell with real-time updates
- [x] Dark/Light theme
- [x] Project settings
- [x] Team members management
- [x] User preferences
- [x] @Mentions in comments
- [x] WIP Limits for Kanban columns

---

*Last updated: January 2026*
