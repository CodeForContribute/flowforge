# FlowForge - AI-Powered SDLC Automation Platform

FlowForge is a web application that automates the entire software development lifecycle using AI agents. Create tasks (Jira-like), configure repository and AI agent settings, generate implementation prompts, and let the AI agent create branches, write code, raise PRs, handle review comments iteratively, and auto-merge upon approval — all while syncing status back to the task.

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Next.js API Routes + Server Actions
- **Database**: PostgreSQL + Prisma ORM
- **Queue**: BullMQ + Redis (for async agent jobs)
- **Auth**: NextAuth.js with GitHub OAuth
- **Git Integration**: GitHub App (OAuth + Webhooks)
- **AI**: Anthropic Claude API (claude-sonnet-4-20250514)
- **Deployment**: Docker Compose (self-hosted)

## Features

- **Task Management**: Kanban board with drag-and-drop, task creation and editing
- **GitHub Integration**: Connect repositories, create branches, open PRs automatically
- **AI Code Generation**: Generate implementation code from task descriptions using Claude
- **Automated PR Workflow**: Create PRs, request reviewers, respond to review comments
- **Webhook Integration**: Real-time updates from GitHub for PR reviews and merges
- **Execution Tracking**: Detailed logs of every AI agent action

## Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- GitHub account with OAuth App configured
- Anthropic API key

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd flowforge
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Required environment variables:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/flowforge?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-here-generate-with-openssl-rand-base64-32"

# GitHub OAuth App
# Create one at https://github.com/settings/developers
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# GitHub Webhook Secret
# Set this in your GitHub webhook settings
GITHUB_WEBHOOK_SECRET="your-webhook-secret-here"

# Anthropic API
# Get your key at https://console.anthropic.com
ANTHROPIC_API_KEY="your-anthropic-api-key"
```

### 4. Set up the database

Start PostgreSQL and Redis (or use Docker):

```bash
docker-compose up -d db redis
```

Run database migrations:

```bash
npm run db:migrate
```

### 5. Start the development server

```bash
npm run dev
```

### 6. Start the worker (in a separate terminal)

```bash
npm run worker
```

Open [http://localhost:3000](http://localhost:3000) to access the application.

## GitHub OAuth App Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the details:
   - **Application name**: FlowForge (or your preferred name)
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. Copy the Client ID and Client Secret to your `.env` file

## GitHub Webhook Setup

For the automated PR review handling to work:

1. Go to your GitHub repository settings
2. Navigate to Webhooks → Add webhook
3. Set the Payload URL to: `https://your-domain.com/api/webhooks/github`
4. Set Content type to: `application/json`
5. Set the Secret to match your `GITHUB_WEBHOOK_SECRET`
6. Select events: Pull requests, Pull request reviews, Pull request review comments

## Project Structure

```
flowforge/
├── prisma/
│   └── schema.prisma           # Database schema
├── src/
│   ├── app/
│   │   ├── (auth)/             # Authentication pages
│   │   ├── api/                # API routes
│   │   ├── dashboard/          # Dashboard pages
│   │   └── project/            # Project and task pages
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── layout/             # Layout components
│   │   ├── projects/           # Project components
│   │   ├── tasks/              # Task components
│   │   └── common/             # Shared components
│   ├── lib/
│   │   ├── prisma.ts           # Prisma client
│   │   ├── auth.ts             # NextAuth config
│   │   ├── redis.ts            # Redis client
│   │   ├── queue.ts            # BullMQ queues
│   │   └── utils.ts            # Utilities
│   ├── services/
│   │   ├── github.ts           # GitHub API operations
│   │   ├── agent.ts            # AI agent operations
│   │   ├── prompt-generator.ts # Prompt generation
│   │   └── execution.ts        # Execution orchestration
│   ├── workers/
│   │   └── agent-worker.ts     # BullMQ worker
│   └── types/
│       └── index.ts            # TypeScript types
├── docker-compose.yml
├── Dockerfile
└── .env.example
```

## How It Works

### Task Execution Flow

1. **Create a Task**: Define what you want to build with a detailed description
2. **Generate Prompt**: Click "Generate Prompt" to create an AI-ready implementation prompt
3. **Execute**: Start the execution to trigger the AI agent workflow:
   - Creates a new branch from the default branch
   - Generates code using Claude AI
   - Commits the generated files
   - Creates a pull request
   - Requests reviewers (if configured)
4. **Review Handling**: When reviewers request changes:
   - GitHub webhook notifies FlowForge
   - AI agent generates fixes based on review comments
   - Commits fixes and replies to reviewers
5. **Merge**: When the PR is approved:
   - AI agent merges the PR (squash and merge)
   - Task status is updated to MERGED

### Task Statuses

| Status | Description |
|--------|-------------|
| BACKLOG | Task is in the backlog |
| TODO | Task is ready to work on |
| IN_PROGRESS | Task execution is in progress |
| GENERATING | AI is generating code |
| PR_OPEN | Pull request has been created |
| IN_REVIEW | PR is being reviewed |
| CHANGES_REQUESTED | Reviewer requested changes |
| APPROVED | PR has been approved |
| MERGED | PR has been merged |
| CLOSED | Task was closed |

## Docker Deployment

For production deployment using Docker:

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

The Docker setup includes:
- `app`: Next.js application (port 3000)
- `worker`: BullMQ worker for async jobs
- `db`: PostgreSQL database (port 5432)
- `redis`: Redis for job queues (port 6379)

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run worker` | Start the BullMQ worker |
| `npm run db:push` | Push schema changes to database |
| `npm run db:migrate` | Run database migrations |
| `npm run db:studio` | Open Prisma Studio |
| `npm run lint` | Run ESLint |

## Security Considerations

- GitHub access tokens are stored in the database (consider encryption for production)
- Webhook signatures are verified using HMAC-SHA256
- All API endpoints require authentication
- User can only access their own projects and tasks

## Notes

- Branch naming convention: `feature/task-{taskId}-{slugified-title}`
- PR title format: `[FlowForge] {Task Title}`
- All automated commits include a FlowForge identifier
- System comments in tasks provide an audit trail of all automated actions

## License

MIT
