# FlowForge - AI-Powered SDLC Automation Platform

FlowForge is a web application that automates the entire software development lifecycle using AI agents. It simplifies task management, code generation, and workflow automation for improved productivity in software development.

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
- **GitHub Integration**: Connect repositories, create branches, and open PRs automatically
- **AI Code Generation**: Generate implementation code from task descriptions using Claude
- **Automated PR Workflow**: Create PRs, request reviewers, respond to review comments
- **Webhook Integration**: Real-time updates from GitHub for PR reviews and merges
- **Execution Tracking**: Detailed logs of every AI agent action

## Prerequisites

Ensure you have the following software installed:

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

Your `.env` file should include:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/flowforge?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-here-generate-with-openssl-rand-base64-32"

# GitHub OAuth App
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# GitHub Webhook Secret
GITHUB_WEBHOOK_SECRET="your-webhook-secret-here"

# Anthropic API
ANTHROPIC_API_KEY="your-anthropic-api-key"
```

### 4. Set up the database

Start PostgreSQL and Redis (or use Docker):

```bash
docker-compose up -d db redis
```

Apply Prisma migrations:

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

Visit [http://localhost:3000](http://localhost:3000) to access the application.

## GitHub OAuth App Setup

1. Navigate to [GitHub Developer Settings](https://github.com/settings/developers).
2. Register a new OAuth application.
   - Set the **Homepage URL** to `http://localhost:3000`.
   - Set the **Authorization Callback URL** to `http://localhost:3000/api/auth/callback/github`.
3. Use the Client ID and Client Secret in your `.env` file.

## Contribution

To contribute to FlowForge:

- Fork the repository
- Create a feature branch (`git checkout -b feature-branch`)
- Commit your changes
- Push the branch (`git push origin feature-branch`)
- Create a Pull Request

## License

FlowForge is licensed under the MIT License.
