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
| Unit Testing | [Jest](https://jestjs.io/) + [ts-jest](https://kulshekhar.github.io/ts-jest/) |
| E2E Testing | [Playwright](https://playwright.dev/) |

## Getting Started

### Prerequisites

- **Node.js** 18.x or later
- **PostgreSQL** 14.x or later
- **Redis** 6.x or later (for job queues)
- **GitHub OAuth App** (see [GitHub OAuth Setup](#1-github-oauth-app) below)
- **ngrok** (for local webhook development) - [Install ngrok](https://ngrok.com/download)

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
   # Generate the Prisma client
   npx prisma generate

   # Push the schema to your database
   npm run db:push

   # Or run migrations for production
   npm run db:migrate
   ```

5. **Start Redis**
   ```bash
   # macOS (Homebrew)
   brew services start redis

   # Linux
   sudo systemctl start redis

   # Or using Docker
   docker run -d -p 6379:6379 redis
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Start the background worker** (in a separate terminal)
   ```bash
   npm run worker
   ```
   The worker processes background jobs including task execution, code review handling, PR comment analysis, and approval workflows.

8. **Set up ngrok for webhooks** (in a separate terminal)
   ```bash
   ngrok http 3000
   ```
   Copy the HTTPS forwarding URL (e.g., `https://abc123.ngrok-free.dev`) and use it as the webhook payload URL in GitHub (see [GitHub Webhook Setup](#github-webhook-setup)).

9. Open [http://localhost:3000](http://localhost:3000) in your browser.

### External Service Setup

#### 1. GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **"New OAuth App"**
3. Fill in the details:
   - **Application name**: `FlowForge` (or any name)
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. Click **"Register application"**
5. Copy the **Client ID** into your `.env` as `GITHUB_CLIENT_ID`
6. Click **"Generate a new client secret"**, copy it into your `.env` as `GITHUB_CLIENT_SECRET`

> **Important**: The callback URL must exactly match `http://localhost:<port>/api/auth/callback/github`. If you run the dev server on a different port (e.g., 3001), update both the callback URL in GitHub and `NEXTAUTH_URL` in your `.env`.

#### 2. PostgreSQL

You can use a local PostgreSQL instance or a cloud provider like [Neon](https://neon.tech):

```bash
# macOS (Homebrew)
brew install postgresql@14
brew services start postgresql@14

# Create the database
createdb flowforge
```

Your `DATABASE_URL` will be: `postgresql://postgres:postgres@localhost:5432/flowforge?schema=public`

#### 3. Redis

Redis is required for the BullMQ job queue system:

```bash
# macOS (Homebrew)
brew install redis
brew services start redis

# Verify it's running
redis-cli ping
# Should return: PONG
```

Your `REDIS_URL` will be: `redis://localhost:6379`

#### 4. AI Provider Keys (Optional)

Users can provide their own API keys per-project in the project settings. However, you can set default keys:

- **OpenAI**: Get a key at [platform.openai.com](https://platform.openai.com)
- **Anthropic**: Get a key at [console.anthropic.com](https://console.anthropic.com)

#### 5. Email Notifications (Optional)

For email notifications, sign up at [Resend](https://resend.com) and add your API key to `.env`.

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

# GitHub Webhook Secret
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

**Generating secrets:**

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate GITHUB_WEBHOOK_SECRET
openssl rand -hex 32

# Generate ENCRYPTION_KEY
openssl rand -base64 32
```

### GitHub Webhook Setup

GitHub webhooks allow FlowForge to respond in real-time to PR events (reviews, comments, merges).

#### For Local Development

1. **Start ngrok** to expose your local server:
   ```bash
   ngrok http 3000
   ```
2. Copy the HTTPS URL (e.g., `https://abc123.ngrok-free.dev`)

3. Go to your GitHub repository **Settings > Webhooks > Add webhook**

4. Configure the webhook:
   - **Payload URL**: `https://abc123.ngrok-free.dev/api/webhooks/github`
   - **Content type**: `application/json`
   - **Secret**: The same value as `GITHUB_WEBHOOK_SECRET` in your `.env`

5. Under **"Which events would you like to trigger this webhook?"**, select **"Let me select individual events"** and check:
   - **Pull requests** - PR opened, closed, merged
   - **Pull request reviews** - Review submitted (approved, changes requested)
   - **Pull request review comments** - Inline review comments
   - **Issue comments** - General PR comments (conversations)

6. Click **"Add webhook"**

> **Note**: The ngrok URL changes every time you restart ngrok (on the free plan). You'll need to update the webhook Payload URL each time.

#### For Production

Set the Payload URL to your production domain:
```
https://your-domain.com/api/webhooks/github
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run worker` | Start background job worker |
| `npm run worker:prod` | Start worker for production |
| `npm run db:push` | Push Prisma schema to database |
| `npm run db:migrate` | Run database migrations |
| `npm run db:studio` | Open Prisma Studio (database GUI) |
| `npm run db:seed:test` | Seed database with test data |
| `npm test` | Run unit tests (Jest) |
| `npm run test:watch` | Run unit tests in watch mode |
| `npm run test:coverage` | Run unit tests with coverage report |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run test:e2e:ui` | Run E2E tests with UI |
| `npm run test:e2e:headed` | Run E2E tests in headed browser |
| `npm run test:e2e:report` | Show Playwright test report |

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

## Troubleshooting

### OAuth "no access token provided" error
- Verify your GitHub OAuth App's **Authorization callback URL** exactly matches `http://localhost:<port>/api/auth/callback/github`
- Ensure `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in `.env` match your GitHub OAuth App
- Make sure `NEXTAUTH_URL` matches the port your dev server is running on

### Webhooks not triggering
- Ensure ngrok is running and the Payload URL in GitHub webhook settings matches your current ngrok URL
- Check that `GITHUB_WEBHOOK_SECRET` in `.env` matches the secret in GitHub webhook settings
- Verify the background worker is running (`npm run worker`)
- Check the **"Recent Deliveries"** tab in GitHub webhook settings for errors

### Worker not processing jobs
- Ensure Redis is running: `redis-cli ping` should return `PONG`
- Check that `REDIS_URL` in `.env` is correct
- Restart the worker: `npm run worker`

### Database connection issues
- Verify PostgreSQL is running: `pg_isready`
- Check that `DATABASE_URL` in `.env` is correct
- Run `npm run db:push` to sync the schema

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
   npm test
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
