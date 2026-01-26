# FlowForge

A modern project management tool built with Next.js 14 that integrates with GitHub and uses AI agents to automate task execution. FlowForge streamlines your development workflow by automatically creating pull requests, responding to code reviews, and managing your project lifecycle.

## Features

### Project Management
- **Kanban Boards** - Visual task management with drag-and-drop support
- **Sprint Planning** - Create and manage sprints with start/end dates and goals
- **Task Hierarchy** - Organize work with Epics, Stories, Tasks, Subtasks, and Bugs
- **Labels & Filters** - Categorize and filter tasks with custom labels
- **Story Points** - Estimate effort with story point tracking
- **Due Dates** - Set and track task deadlines
- **Assignees** - Assign tasks to team members

### GitHub Integration
- **Automatic PR Creation** - AI agents create pull requests based on task descriptions
- **Branch Management** - Automatic branch creation following naming conventions
- **Webhook Support** - Real-time updates from GitHub events
- **Code Review Handling** - AI responds to review comments and implements requested changes
- **Reviewer Assignment** - Automatically request reviews from configured team members

### AI-Powered Task Execution
- **Intelligent Code Generation** - AI generates implementation based on task requirements
- **Review Response Automation** - Automatically address code review feedback
- **Comment Analysis** - AI classifies PR comments as requiring code changes or discussion
- **Discussion Replies** - Generate contextual responses to PR discussions
- **Configurable AI Providers** - Support for both OpenAI and Anthropic APIs
- **Per-Project Settings** - Enable/disable AI features on a per-project basis

### Collaboration
- **@Mentions in Comments** - Tag team members in task comments
- **Notifications** - In-app and email notifications for key events
- **Team Management** - Invite members with role-based access (Owner, Admin, Member)

### User Experience
- **Dark/Light Theme** - System-aware theme with manual toggle
- **Responsive Design** - Works on desktop and mobile devices
- **Email Notifications** - Powered by Resend for reliable delivery

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | [Next.js 14](https://nextjs.org/) (App Router) |
| Language | [TypeScript](https://www.typescriptlang.org/) |
| Database | [PostgreSQL](https://www.postgresql.org/) |
| ORM | [Prisma](https://www.prisma.io/) |
| Authentication | [NextAuth.js](https://next-auth.js.org/) (GitHub OAuth) |
| Styling | [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) |
| Job Queue | [BullMQ](https://bullmq.io/) with Redis |
| Email | [Resend](https://resend.com/) |
| AI Providers | [OpenAI](https://openai.com/) / [Anthropic](https://www.anthropic.com/) |
| Drag & Drop | [@dnd-kit](https://dndkit.com/) |
| Testing | [Playwright](https://playwright.dev/) (E2E) |

## Getting Started

### Prerequisites

- **Node.js** 18.x or later
- **PostgreSQL** 14.x or later
- **Redis** 6.x or later (for job queues)
- **GitHub OAuth App** - Create one at [GitHub Developer Settings](https://github.com/settings/developers)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/CodeForContribute/flowforge.git
   cd flowforge
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your configuration (see [Environment Variables](#environment-variables) below).

4. **Set up the database**
   ```bash
   # Push the schema to your database
   npm run db:push

   # Or run migrations for production
   npm run db:migrate
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Start the background worker** (in a separate terminal)
   ```bash
   npm run worker
   ```

7. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/flowforge?schema=public"

# Redis (for BullMQ job queues)
REDIS_URL="redis://localhost:6379"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# GitHub OAuth App
# Create at https://github.com/settings/developers
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# GitHub Webhook Secret (optional, for webhook validation)
GITHUB_WEBHOOK_SECRET="your-webhook-secret"

# AI Providers (optional - users can provide their own keys in project settings)
OPENAI_API_KEY="your-openai-api-key"
ANTHROPIC_API_KEY="your-anthropic-api-key"

# Encryption key for storing user API keys securely
# Generate with: openssl rand -base64 32
ENCRYPTION_KEY="your-encryption-key"

# Email notifications (optional)
RESEND_API_KEY="your-resend-api-key"
FROM_EMAIL="FlowForge <notifications@yourdomain.com>"
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run worker` | Start background job worker |
| `npm run db:push` | Push Prisma schema to database |
| `npm run db:migrate` | Run database migrations |
| `npm run db:studio` | Open Prisma Studio |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run test:e2e:ui` | Run E2E tests with UI |

## Project Structure

```
flowforge/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── migrations/        # Database migrations
├── src/
│   ├── app/               # Next.js App Router pages
│   │   ├── (auth)/        # Authentication pages
│   │   ├── api/           # API routes
│   │   ├── dashboard/     # Dashboard page
│   │   ├── project/       # Project pages
│   │   └── settings/      # User settings pages
│   ├── components/
│   │   ├── common/        # Shared components (badges, etc.)
│   │   ├── layout/        # Layout components (Navbar, Sidebar)
│   │   ├── metrics/       # Analytics & metrics components
│   │   ├── projects/      # Project-related components
│   │   ├── providers/     # Context providers
│   │   ├── settings/      # Settings components
│   │   ├── sprints/       # Sprint management components
│   │   ├── tasks/         # Task & Kanban components
│   │   └── ui/            # shadcn/ui components
│   ├── lib/               # Utility functions & configurations
│   │   ├── auth.ts        # NextAuth configuration
│   │   ├── prisma.ts      # Prisma client
│   │   ├── queue.ts       # BullMQ queue setup
│   │   ├── redis.ts       # Redis connection
│   │   └── utils.ts       # Helper functions
│   ├── services/          # Business logic & external services
│   │   ├── agent.ts       # AI agent for code generation
│   │   ├── github.ts      # GitHub API integration
│   │   ├── execution.ts   # Task execution logic
│   │   └── notifications.ts # Notification & email service
│   ├── types/             # TypeScript type definitions
│   └── workers/           # Background job workers
│       └── agent-worker.ts # Task & review processing worker
├── e2e/                   # End-to-end tests
└── docs/                  # Documentation
```

## GitHub Webhook Setup

To enable real-time updates from GitHub (PR reviews, merges, etc.):

1. Go to your GitHub repository's Settings > Webhooks
2. Add a new webhook:
   - **Payload URL**: `https://your-domain.com/api/webhooks/github`
   - **Content type**: `application/json`
   - **Secret**: Your `GITHUB_WEBHOOK_SECRET` value
   - **Events**: Select "Pull requests" and "Pull request reviews"
3. Save the webhook

## Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Follow the existing code style
   - Add tests for new features
   - Update documentation as needed

4. **Run tests and linting**
   ```bash
   npm run lint
   npm run test:e2e
   ```

5. **Commit your changes**
   ```bash
   git commit -m "feat: add your feature description"
   ```

6. **Push and create a Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Built with [Next.js](https://nextjs.org/) and powered by AI.
