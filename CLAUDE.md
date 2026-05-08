# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Langfuse is an open-source LLM observability platform that helps developers debug, analyze, and optimize AI applications. This is a monorepo containing the main web application, worker service, shared utilities, and enterprise features.

**Version**: 2.65.1 (v2 architecture - production ready)
**Future**: v3 architecture with worker service and ClickHouse is in development

## Common Development Commands

### Quick Start
```bash
# Full development setup (install deps, start db, seed, run dev)
pnpm run dx

# Alternative full setup with forced db reset
pnpm run dx-f

# Clean everything (node_modules, build files)
pnpm run nuke
```

### Infrastructure
```bash
# Start development databases (PostgreSQL + Redis)
pnpm run infra:dev:up

# Stop development databases
pnpm run infra:dev:down
```

### Database Operations
```bash
# Generate Prisma client and run migrations
pnpm run db:migrate

# Apply schema changes without migration (dev only)
pnpm run db:push

# Reset database and reapply all migrations
pnpm run db:reset

# Seed database with example data
pnpm run db:seed:examples

# Deploy migrations to production
pnpm run db:deploy
```

### Development
```bash
# Install dependencies
pnpm install

# Run development servers (web + worker)
pnpm run dev

# Build all packages
pnpm run build

# Start production servers
pnpm run start
```

### Testing
```bash
# Run all tests
pnpm run test

# Run tests for specific package
pnpm --filter=web test
pnpm --filter=worker test

# Run tests in watch mode (web)
pnpm --filter=web test:watch

# Run E2E tests (web)
pnpm --filter=web test:e2e
```

### Code Quality
```bash
# Lint all packages
pnpm run lint

# Lint and fix issues
pnpm run lint:fix
```

## Architecture Overview

### v2 Architecture (Current Production)
- **Web Service**: Next.js 14 with Pages Router, tRPC for type-safe APIs
- **Database**: PostgreSQL as primary database, Redis for caching/sessions
- **Authentication**: NextAuth.js with project-based access control
- **UI**: React with Tailwind CSS and shadcn/ui components

### v3 Architecture (In Development)
- **Web Service**: Real-time operations and user interface
- **Worker Service**: Background processing with BullMQ queues
- **ClickHouse**: Planned addition for analytics workloads
- **Separation of Concerns**: Real-time vs async processing

### Monorepo Structure
```
langfuse/
├── web/                    # Main Next.js application (v2)
├── worker/                 # Background processing service (v3, experimental)
├── packages/
│   ├── shared/             # Shared utilities, database models, types
│   ├── config-eslint/      # ESLint configurations
│   └── config-typescript/  # TypeScript configurations
├── ee/                     # Enterprise features (closed source)
└── scripts/               # Build and utility scripts
```

## Key Architectural Patterns

### Feature-Based Organization
The web application is organized by features in `web/src/features/`:
- Each feature contains its own components, hooks, and server-side tRPC routers
- Features are self-contained with clear boundaries
- Examples: `public-api`, `prompts`, `projects`, `rbac`, `ingest`

### Database Architecture
- **PostgreSQL**: Primary transactional database using Prisma ORM
- **Multi-tenancy**: All data is scoped by `projectId` for isolation
- **Key Models**: Users, Projects, Traces, Observations, Scores, Prompts, Datasets
- **Migrations**: Managed through Prisma in `packages/shared/prisma/`
- **Redis**: Caching, sessions, and background job queues

### API Structure
- **tRPC**: Type-safe internal APIs used by the frontend
- **Public API**: REST endpoints at `/public/api/ingestion` for SDK integration
- **Authentication**: Three-tier system (public, protected, project-protected)
- **API Keys**: Encrypted with SALT, scoped to projects

### Authentication & Authorization
- **NextAuth.js**: Handles user authentication and sessions
- **Project-Based Access**: Users belong to projects with specific roles
- **RBAC**: Role-based access control defined in `features/rbac/`
- **API Keys**: Separate system for programmatic access

## Important Configuration Files

### Environment Setup
- `.env.dev.example`: Template for environment variables
- Key variables: `DATABASE_URL`, `NEXTAUTH_SECRET`, `SALT`, `REDIS_*`

### Build Configuration
- `turbo.json`: Monorepo build pipeline configuration
- `pnpm-workspace.yaml`: Defines workspace packages
- `next.config.mjs`: Next.js configuration with CSP headers and Sentry

### Database
- `packages/shared/prisma/schema.prisma`: Complete database schema
- `packages/shared/prisma/database.svg`: Visual database diagram

## Development Workflow

### Making Changes
1. Create feature branch from main
2. Run `pnpm run infra:dev:up` to start databases
3. Copy `.env.dev.example` to `.env` and configure
4. Run `pnpm install` to install dependencies
5. Run `pnpm run db:migrate` to apply schema changes
6. Make changes
7. Run `pnpm run test` to verify
8. Submit PR for review

### Database Changes
- All database changes must be made via Prisma migrations
- Use `pnpm --filter=shared run db:migrate -- --name migration_name`
- Schema is in `packages/shared/prisma/schema.prisma`
- Shared package contains all database-related code

### Testing Strategy
- **Unit Tests**: Jest for API and business logic
- **E2E Tests**: Playwright for user interface testing
- **Worker Tests**: Vitest for background processing
- Tests are run in CI/CD pipeline

### Code Quality Standards
- **TypeScript**: Strict mode enabled across all packages
- **ESLint**: Shared configuration with custom rules
- **Prettier**: Code formatting with consistent style
- **Conventional Commits**: Git commit message format

## Technology Stack

### Frontend
- **Next.js 14**: React framework with Pages Router
- **React 18**: UI library
- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: Component library built on Radix UI
- **tRPC**: Type-safe API calls
- **React Query**: Server state management

### Backend
- **Node.js 20**: Runtime environment
- **Prisma**: Database ORM and migration tool
- **NextAuth.js**: Authentication solution
- **PostgreSQL**: Primary database
- **Redis**: Caching and session storage

### Development Tools
- **TypeScript**: Type-safe JavaScript
- **pnpm**: Package manager
- **Turbo**: Monorepo build system
- **ESLint**: Linting and code quality
- **Jest**: Testing framework
- **Playwright**: E2E testing

## Important Notes

### v3 Worker Service
- Located in `worker/` directory
- **Experimental**: Not recommended for production use in v2.x
- Uses Express.js with BullMQ for background job processing
- Will connect to ClickHouse in future v3 architecture

### Security Considerations
- API keys are encrypted using SALT environment variable
- All data access is project-scoped
- CSP headers configured for security
- Environment variables should never be committed

### Performance Considerations
- PostgreSQL for transactional data
- Redis for caching and session management
- Prisma query optimization important for scale
- ClickHouse planned for analytics workloads in v3

### Enterprise Features
- Located in `ee/` directory
- Closed source extensions
- Requires license for use
- Extends core functionality
