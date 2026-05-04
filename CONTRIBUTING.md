# Contributing to FlowForge

First off — thanks for taking the time to contribute! 🎉

FlowForge is an AI-powered project management tool that automates the software development lifecycle. We welcome contributions of every kind: features, bug fixes, docs, tests, design feedback, or even just opening an issue to start a discussion.

## Table of contents

- [Code of conduct](#code-of-conduct)
- [Ways to contribute](#ways-to-contribute)
- [Getting started](#getting-started)
- [Development workflow](#development-workflow)
- [Branching & commits](#branching--commits)
- [Pull requests](#pull-requests)
- [Testing](#testing)
- [Coding style](#coding-style)
- [Reporting bugs](#reporting-bugs)
- [Suggesting features](#suggesting-features)
- [Questions?](#questions)

## Code of conduct

Be kind, be patient, and assume good intent. Harassment or disrespectful behavior of any kind is not tolerated. If something feels off, please open an issue or reach out to the maintainers.

## Ways to contribute

You don't need to write code to help. All of these are valuable:

- 🐛 **Report a bug** — open an issue with reproduction steps.
- ✨ **Suggest a feature** — open an issue describing the problem and the proposed solution.
- 📝 **Improve documentation** — README, code comments, examples, this file.
- 🧪 **Add tests** — coverage for under-tested areas is always welcome.
- 🎨 **Design feedback** — UX or UI improvements via issues or PRs.
- 💻 **Write code** — pick up an open issue or propose a new one.

If you're new and don't know where to start, look for issues tagged [`good first issue`](https://github.com/CodeForContribute/flowforge/labels/good%20first%20issue) or [`help wanted`](https://github.com/CodeForContribute/flowforge/labels/help%20wanted).

## Getting started

### Prerequisites

- **Node.js** ≥ 18
- **PostgreSQL** (local or via Docker)
- **Redis** (local or via Docker)
- A **GitHub OAuth App** for sign-in (see `.env.example`)
- *(Optional)* OpenAI or Anthropic API key for AI features

### Local setup

```bash
# 1. Fork the repo on GitHub, then clone your fork
git clone https://github.com/<your-username>/flowforge.git
cd flowforge

# 2. Add the upstream remote
git remote add upstream https://github.com/CodeForContribute/flowforge.git

# 3. Install dependencies
npm install

# 4. Copy env file and fill in values
cp .env.example .env

# 5. Start Postgres + Redis (easiest path: docker-compose)
docker-compose up -d db redis

# 6. Run migrations
npm run db:migrate

# 7. Start the dev server
npm run dev
```

The app should now be running at <http://localhost:3000>.

To run the AI agent worker in a separate terminal:

```bash
npm run worker
```

## Development workflow

1. **Sync your fork** with upstream before starting:
   ```bash
   git checkout develop
   git pull upstream develop
   ```
2. **Create a feature branch** off `develop` (see [Branching](#branching--commits)).
3. **Make your changes** with tests where it makes sense.
4. **Run linter and tests** locally before pushing.
5. **Push and open a PR** against `develop`.

## Branching & commits

### Branches

- `main` — production-ready, deployed code.
- `develop` — integration branch. **Open all PRs against `develop`.**
- Feature branches: `feature/<short-description>` or `FLOW-<n>-<short-description>`
- Bug fixes: `fix/<short-description>`
- Docs: `docs/<short-description>`

### Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add sprint burndown chart
fix: prevent duplicate webhook events
docs: clarify env setup in README
test: add unit tests for kanban dnd
chore: bump prisma to 5.22
```

Keep commits focused and atomic. Squash noisy commits before opening a PR.

## Pull requests

1. Open the PR against **`develop`**.
2. Use a clear title (Conventional-Commit style is great).
3. Fill in the PR template:
   - **What** changed
   - **Why** it changed
   - **How** to test it
   - Linked issue (e.g., `Closes #42`)
4. Make sure CI is green:
   - ✅ Lint
   - ✅ Unit tests (`npm test`)
   - ✅ E2E tests (`npm run test:e2e`)
   - ✅ Gitleaks (no committed secrets)
5. Be responsive to review feedback. We aim to review PRs within a few days.

Small, focused PRs are easier to review and ship faster than large ones. If your change is big, consider splitting it.

## Testing

We take tests seriously — current coverage is **80%+** and we'd like to keep it that way.

```bash
npm test                  # Unit tests (Jest)
npm run test:watch        # Unit tests in watch mode
npm run test:coverage     # Coverage report
npm run test:e2e          # End-to-end tests (Playwright)
npm run test:e2e:ui       # Playwright in UI mode
```

- Add tests for new behavior. Bug fixes should include a regression test.
- Don't mock the database in integration tests — use the real (test) DB.
- Keep tests fast and deterministic. Avoid `setTimeout`-based waits.

## Coding style

- **Language:** TypeScript everywhere. No new `.js` files.
- **Linting:** `npm run lint` — please fix warnings before pushing.
- **Formatting:** follow the existing style; we don't ship a formatter config to fight, but consistency matters.
- **Types over `any`:** if you reach for `any`, leave a `// TODO` and explain why.
- **Comments:** explain *why*, not *what*. Well-named identifiers tell you what.
- **Error handling:** validate at boundaries (API routes, external calls). Trust internal code.

## Reporting bugs

When opening a bug issue, include:

1. **What you expected** to happen.
2. **What actually happened** (errors, screenshots, logs).
3. **Steps to reproduce** — minimal and ordered.
4. **Environment** — OS, Node version, browser, anything relevant.

## Suggesting features

When opening a feature request:

1. **The problem** you're trying to solve (not the solution).
2. **Why** it matters / who it helps.
3. **Proposed solution(s)** — open to alternatives.
4. **Out of scope** — anything explicitly *not* part of this proposal.

## Questions?

- 💬 Open a [GitHub Discussion](https://github.com/CodeForContribute/flowforge/discussions) for open-ended questions.
- 🐛 Open an [issue](https://github.com/CodeForContribute/flowforge/issues) for bugs and feature requests.

Thanks again for contributing — every PR, issue, and idea makes FlowForge better. 🚀
