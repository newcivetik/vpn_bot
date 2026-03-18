# Full Code Audit — Comprehensive Review

You are a senior code auditor performing a thorough, systematic audit of the entire codebase. Your goal is to find every issue across ALL categories without modifying any business logic.

## Step 0 — Auto-Detect Project Structure

Before starting the audit, run these discovery steps:

1. **List all directories** in the project root to identify packages/apps (backend, frontend, admin, etc.)
2. **Detect tech stack** from `package.json`, `tsconfig.json`, `nest-cli.json`, `vite.config.*`, etc.
3. **Detect architecture style** by scanning `src/` structure:
   - If you see `domain/`, `application/`, `infrastructure/` folders → **DDD/Hexagonal** (enable Section 11)
   - If you see `commands/`, `queries/`, `use-cases/` → **CQRS** (enable Section 12)
   - If you see `events/`, `sagas/`, `handlers/` → **Event-Driven** (enable Section 13)
   - If you see flat `*.module.ts`, `*.service.ts`, `*.controller.ts` → **Standard NestJS** (skip 11-13)
4. **Count source files** to estimate scope. If >200 files, use parallel subagents per module.
5. **Build file list** — collect ALL `.ts`, `.tsx`, `.js`, `.jsx` files in `src/` directories. Also collect: `Dockerfile*`, `docker-compose*`, `.github/workflows/*`, `*.json` config files, `*.yml`/`*.yaml` configs, `.env.example`, migration files.

Adapt the checklist below based on what you find. Skip sections that don't apply.

---

## Output Format

For every found issue, add an inline comment directly in the source file using the `Edit` tool:

```
// AUDIT:[SEVERITY]:[CATEGORY] — Description of the issue
```

**Severity levels:**
- `CRITICAL` — Security vulnerability, data loss risk, crash in production
- `HIGH` — Bug, race condition, broken logic, missing validation
- `MEDIUM` — Performance issue, bad pattern, tech debt, missing error handling
- `LOW` — Code smell, naming, minor improvement

**Categories:**
- `SEC` — Security
- `BUG` — Bug or broken logic
- `PERF` — Performance
- `ARCH` — Architecture / patterns
- `DB` — Database / queries
- `ERR` — Error handling
- `TEST` — Missing tests / test quality
- `DEVOPS` — Docker, CI/CD, env config
- `TYPE` — Type safety issues
- `UX` — Frontend UX issues
- `DDD` — Domain-Driven Design violations
- `CQRS` — CQRS / use-case violations
- `EVT` — Event / messaging issues

Example: `// AUDIT:CRITICAL:SEC — User input not sanitized, possible XSS via innerHTML`

---

## Audit Checklist — Go Through EVERY Item

### 1. SECURITY (SEC)

**Backend:**
- [ ] SQL injection / ORM injection (raw queries, QueryBuilder without parameterization)
- [ ] Missing input validation on controllers (DTOs without class-validator decorators)
- [ ] Missing authentication guards on endpoints (@Public missing or guard not applied)
- [ ] Missing authorization checks (user A accessing user B's data, missing ownership check)
- [ ] Broken role-based access (RolesGuard bypassed, roles not checked on sensitive endpoints)
- [ ] Hardcoded secrets, API keys, tokens in source code
- [ ] Secrets in environment files committed to git (.env in repo, secrets in docker-compose)
- [ ] Weak or missing HMAC/signature verification (webhooks from payment/Telegram/Stripe)
- [ ] Missing rate limiting on public endpoints (login, register, password reset, API)
- [ ] Insecure CORS configuration (wildcard origins, credentials with wildcard)
- [ ] Missing helmet / security headers
- [ ] Sensitive data in logs (passwords, tokens, card numbers, PII)
- [ ] Insecure password/token storage (plaintext, weak hash, MD5/SHA1 without salt)
- [ ] Path traversal in file operations (user-controlled paths not sanitized)
- [ ] Command injection in exec/spawn calls
- [ ] Missing CSRF protection where applicable
- [ ] JWT issues (no expiration, weak secret, algorithm confusion, token in URL)
- [ ] Refresh token issues (no rotation, no revocation, stored insecurely)
- [ ] Mass assignment vulnerability (accepting raw body without DTO whitelist)
- [ ] IDOR (Insecure Direct Object Reference — user can guess/enumerate other users' IDs)
- [ ] File upload issues (no type validation, no size limit, executable uploads)
- [ ] SSRF (Server-Side Request Forgery — user-controlled URLs in backend HTTP calls)
- [ ] Regex DoS (ReDoS — catastrophic backtracking in user-facing regex patterns)

**Frontend:**
- [ ] XSS via dangerouslySetInnerHTML or unescaped user content
- [ ] Sensitive data stored in localStorage (tokens, secrets — should use httpOnly cookies)
- [ ] API keys or secrets exposed in frontend bundle (check VITE_* / NEXT_PUBLIC_* env vars)
- [ ] Missing Content Security Policy
- [ ] Open redirects from URL parameters
- [ ] Clickjacking vulnerability (missing X-Frame-Options handling)
- [ ] Sensitive data in URL query parameters (tokens, passwords in URL)
- [ ] Auth token handling (exposed in console.log, not cleared on logout)

### 2. BUGS & LOGIC (BUG)

- [ ] Race conditions (concurrent requests modifying same resource without locks/transactions)
- [ ] Null/undefined not handled (optional chaining missing, no null checks)
- [ ] Off-by-one errors in pagination, array indexing, slice operations
- [ ] Incorrect date/timezone handling (UTC vs local, missing timezone conversion)
- [ ] Promise rejections not caught (missing try/catch, missing .catch())
- [ ] Event listeners not cleaned up (memory leaks in React useEffect return)
- [ ] State update on unmounted components (missing cleanup/abort controller)
- [ ] Infinite loops or recursive calls without base case
- [ ] Dead code paths that look like they should be active
- [ ] Logical operators misuse (|| vs ?? for falsy values like 0, "", false)
- [ ] Enum or constant values that don't match between frontend and backend
- [ ] Stale closures in callbacks/hooks (capturing old state in setTimeout, event handlers)
- [ ] Missing `await` on async calls (fire-and-forget where result matters)
- [ ] Incorrect error comparison (catching generic Error, losing stack trace, string comparison)
- [ ] Incorrect array/object mutation (push/splice on state, spread missing on nested objects)
- [ ] Switch/case without default or break (fall-through bugs)
- [ ] Floating point precision issues in money/currency calculations
- [ ] Incorrect string comparison (locale-sensitive, case-sensitive where shouldn't be)
- [ ] Resource cleanup missing (DB connections, file handles, streams not closed)

### 3. PERFORMANCE (PERF)

**Backend:**
- [ ] N+1 query problems (loops with individual DB calls, missing `relations` option)
- [ ] Missing database indexes on frequently queried/filtered/sorted columns
- [ ] Large result sets without pagination (findAll without take/skip)
- [ ] Missing caching where appropriate (repeated identical queries, config lookups)
- [ ] Synchronous operations blocking event loop (fs sync, crypto sync, large JSON parse)
- [ ] Unnecessary eager loading of relations (loading full relation trees when not needed)
- [ ] Missing connection pooling configuration
- [ ] Heavy computation in request handler (should offload to queue/worker)
- [ ] Missing pagination on list endpoints
- [ ] Repeated DB queries in same request (query result not reused)
- [ ] SELECT * instead of selecting only needed columns
- [ ] Missing database query logging in development (hard to spot slow queries)

**Frontend:**
- [ ] Unnecessary re-renders (missing React.memo, useMemo, useCallback where beneficial)
- [ ] Large component trees without code splitting (React.lazy)
- [ ] Missing lazy loading for routes/heavy components
- [ ] Unbounded list rendering without virtualization (>100 items in DOM)
- [ ] Large images without optimization/lazy loading
- [ ] API calls on every render (missing/incorrect dependency arrays in useEffect)
- [ ] Bundle size issues (importing entire libraries for one function, e.g., `import _ from 'lodash'`)
- [ ] Missing debounce/throttle on search/input handlers
- [ ] Redundant API calls (same data fetched by multiple components)
- [ ] CSS-in-JS creating new objects on every render

### 4. ARCHITECTURE & PATTERNS (ARCH)

- [ ] Circular dependencies between modules/services
- [ ] Business logic in controllers (should be in services/use-cases)
- [ ] Tight coupling between modules (direct imports instead of DI/interfaces)
- [ ] Duplicated logic across files (DRY violations — same validation, same mapping, same query)
- [ ] God classes/services (single class doing too many things, >300 lines)
- [ ] Inconsistent patterns across similar modules (one module uses pattern X, another uses Y)
- [ ] Mixed concerns (UI logic in data layer, data fetching in presentational components)
- [ ] Missing abstraction layer (direct DB access from controllers)
- [ ] Hardcoded magic numbers/strings without constants/enums
- [ ] Inconsistent naming conventions (camelCase mixed with snake_case, inconsistent file naming)
- [ ] Barrel exports hiding deep dependency chains
- [ ] Configuration scattered across files instead of centralized config module
- [ ] Missing dependency injection (manual `new Service()` instead of NestJS DI)
- [ ] Feature envy (service A constantly reaching into service B's internals)

### 5. DATABASE (DB)

- [ ] Missing indexes on foreign keys and frequently filtered columns
- [ ] Missing cascade delete/update where needed (orphaned records)
- [ ] Incorrect entity relations (missing JoinColumn, wrong cardinality, bidirectional without need)
- [ ] Missing database transactions for multi-step operations (create + update not atomic)
- [ ] Missing unique constraints where data should be unique
- [ ] Missing NOT NULL constraints on required fields
- [ ] No soft delete when data should be preserved (audit trail, billing history)
- [ ] Column types too large or too small for actual data
- [ ] Missing migration for schema changes (synchronize:true in production)
- [ ] Raw SQL queries where ORM methods would be safer
- [ ] Missing optimistic locking for concurrent updates (@VersionColumn)
- [ ] Entity validation inconsistent with DB constraints
- [ ] Missing default values in entity definitions
- [ ] Lazy relations loaded in loops (triggering N+1 via lazy proxy)
- [ ] Missing composite indexes for multi-column queries
- [ ] Enum stored as string without DB-level enum type
- [ ] Date columns without timezone awareness
- [ ] Missing ON DELETE/ON UPDATE strategy on foreign keys

### 6. ERROR HANDLING (ERR)

- [ ] Swallowed exceptions (empty catch blocks, catch with only console.log)
- [ ] Generic error messages leaking internal details to clients (stack traces, DB errors)
- [ ] Missing global exception filter in NestJS
- [ ] Inconsistent error response format across endpoints
- [ ] Missing retry logic for external API calls (payment gateway, email, SMS, external APIs)
- [ ] Missing timeout for HTTP requests to external services (default infinite timeout)
- [ ] Uncaught promise rejections in async code
- [ ] Missing graceful shutdown handling (onModuleDestroy, beforeApplicationShutdown)
- [ ] Missing circuit breaker for external service calls
- [ ] Error constructor misuse (throwing string instead of Error, losing stack trace)
- [ ] Missing fallback behavior when external service is down
- [ ] Incorrect HTTP status codes in error responses (200 for errors, 500 for validation)
- [ ] Missing error boundary in React (entire app crashes on component error)
- [ ] Catch-all that hides specific errors (catch(e) { return null })

### 7. TYPE SAFETY (TYPE)

- [ ] `any` type usage that could be properly typed
- [ ] Missing return types on public functions/methods
- [ ] Type assertions (`as`) that bypass type checking unsafely
- [ ] Missing generic types on collections (Array vs Array<User>)
- [ ] Inconsistent types between API request/response and frontend types
- [ ] Missing discriminated unions for state management
- [ ] Non-null assertions (!) without justification
- [ ] Interface vs Type inconsistency (mixing without reason)
- [ ] Missing Partial/Pick/Omit where full type isn't needed
- [ ] Enum misuse (numeric enum where string enum is safer)
- [ ] Missing readonly on properties that shouldn't change
- [ ] API response types not matching actual response shape

### 8. TESTS (TEST)

- [ ] Missing unit tests for services/use-cases
- [ ] Missing integration tests for controllers/endpoints
- [ ] Missing edge case coverage (empty input, boundary values, error states, null)
- [ ] Tests that test implementation details instead of behavior
- [ ] Missing mock cleanup between tests (shared state leaking)
- [ ] No e2e tests for critical user flows (auth, payment, subscription, file upload)
- [ ] Test files that exist but are skipped or empty
- [ ] Missing negative test cases (what should NOT happen)
- [ ] Flaky tests (time-dependent, order-dependent, network-dependent)
- [ ] Missing test for authorization (can user A access user B's data?)
- [ ] Missing test for error paths (what happens when DB is down, API returns 500?)
- [ ] Assertions too loose (toHaveBeenCalled without checking arguments)
- [ ] Test coverage gaps on critical paths (payment, auth, data mutation)
- [ ] Missing test for race conditions / concurrent operations

### 9. DEVOPS & CONFIGURATION (DEVOPS)

- [ ] Dockerfile issues (running as root, no multi-stage build, large image, no .dockerignore)
- [ ] Missing health check endpoint (/health or /api/health)
- [ ] Missing .dockerignore (node_modules, .git, dist in image)
- [ ] Environment variables without defaults or validation (app crashes on missing var)
- [ ] Missing log levels / structured logging (no way to control log verbosity)
- [ ] CI/CD pipeline missing linting, type checking, or tests
- [ ] Missing docker-compose resource limits (memory, CPU)
- [ ] Secrets in docker-compose.yml instead of secrets management
- [ ] Missing backup strategy configuration (DB backups)
- [ ] Production dependencies in devDependencies or vice versa
- [ ] Missing NODE_ENV check (dev behavior leaking to production)
- [ ] Missing process manager (PM2, cluster mode for production)
- [ ] Docker image using `latest` tag instead of pinned version
- [ ] Missing volume configuration for persistent data
- [ ] GitHub Actions secrets potentially exposed in logs
- [ ] Missing deployment rollback strategy
- [ ] Missing monitoring/alerting configuration references

### 10. FRONTEND UX (UX)

- [ ] Missing loading states during async operations (skeleton, spinner)
- [ ] Missing error states / error boundaries
- [ ] Missing empty states for lists/data ("No items found")
- [ ] Buttons without disabled state during submission (double-click = double submit)
- [ ] Missing accessibility attributes (aria-labels, alt text, roles)
- [ ] Unresponsive layout on mobile
- [ ] Missing form validation feedback (inline errors, not just alert)
- [ ] No optimistic updates where appropriate
- [ ] Missing confirmation for destructive actions (delete, cancel subscription)
- [ ] Missing keyboard navigation support
- [ ] Toast/notification not dismissible or auto-dismissing too fast
- [ ] Missing offline/network error handling in frontend

---

## Advanced Architecture Checks (Auto-Enabled Based on Detection)

### 11. DOMAIN-DRIVEN DESIGN (DDD) — Enable if `domain/` folders detected

**Domain Layer Integrity:**
- [ ] Domain entities contain infrastructure concerns (imports from TypeORM, NestJS, HTTP)
- [ ] Domain logic leaking into application/infrastructure layers
- [ ] Anemic domain models (entities are just data bags, all logic in services)
- [ ] Rich domain model missing validation in constructor/factory methods
- [ ] Value Objects mutable (should be immutable, no setters)
- [ ] Value Objects compared by reference instead of by value (missing equals() method)
- [ ] Aggregate root not enforcing invariants (child entities modified directly from outside)
- [ ] Missing factory methods for complex entity creation
- [ ] Domain events not raised for significant state changes
- [ ] Domain exceptions too generic (using base Error instead of specific domain exceptions)
- [ ] Entity ID type inconsistency (string vs number vs UUID across bounded contexts)

**Bounded Context Boundaries:**
- [ ] Cross-context direct entity references (User entity imported in Billing domain)
- [ ] Shared database tables across bounded contexts (tight coupling at DB level)
- [ ] Missing anti-corruption layer between contexts (direct type sharing)
- [ ] Context mapping not documented or enforced

**Repository Pattern:**
- [ ] Repository interface defined in infrastructure instead of domain layer
- [ ] Repository returning ORM entities instead of domain entities (leaking persistence)
- [ ] Repository methods doing business logic (filtering, mapping, computation)
- [ ] Missing repository interface (concrete implementation used directly)
- [ ] Repository method names not domain-language (findByX instead of meaningful domain terms)

### 12. CQRS / USE-CASES (CQRS) — Enable if `commands/`, `queries/`, `use-cases/` detected

**Command/Query Separation:**
- [ ] Query handlers with side effects (modifying state in a read operation)
- [ ] Command handlers returning data (should return void or ID only)
- [ ] Mixed read/write in single use-case (should be separate command and query)
- [ ] Use-case doing too many things (violating Single Responsibility)
- [ ] Use-case directly calling repository without going through domain entity methods
- [ ] Missing command/query validation (no DTO validation before handler execution)

**Use-Case Integrity:**
- [ ] Use-case importing from another use-case (should compose at controller/handler level)
- [ ] Use-case containing infrastructure logic (HTTP calls, file system, direct DB queries)
- [ ] Missing use-case for significant business operation (CRUD operation directly in controller)
- [ ] Use-case not transactional when it should be (multi-step operation without transaction)

**Port/Adapter Pattern:**
- [ ] Port (interface) defined in infrastructure instead of application layer
- [ ] Adapter not implementing port interface (duck typing instead of explicit implements)
- [ ] Application layer importing concrete infrastructure classes
- [ ] Missing port for external service integration (direct HTTP call in use-case)

### 13. EVENT-DRIVEN PATTERNS (EVT) — Enable if `events/`, `handlers/`, `sagas/` detected

- [ ] Event handlers with side effects that aren't idempotent (re-processing causes duplicates)
- [ ] Missing event handler error handling (one handler failure blocks others)
- [ ] Event payload containing too much data (should contain IDs, handler fetches details)
- [ ] Synchronous event handling where async is needed (blocking request for non-critical work)
- [ ] Missing event ordering guarantees where order matters
- [ ] Event handler doing work that should be in a separate bounded context
- [ ] Circular event chains (A→B→C→A causing infinite loop)
- [ ] Missing dead letter queue / failed event handling strategy
- [ ] Domain events published outside of aggregate root
- [ ] Infrastructure events mixed with domain events (no clear separation)
- [ ] Missing event versioning strategy (breaking changes in event schema)
- [ ] Event handler accessing repositories from wrong bounded context

---

## Execution Strategy

### Phase 1: Discovery
1. List all directories and detect project structure
2. Identify which advanced sections (11, 12, 13) apply
3. Build complete file manifest

### Phase 2: Infrastructure & Config
1. Review ALL config files: `package.json`, `tsconfig.json`, `docker-compose.yml`, `Dockerfile`, `.github/workflows/*`, `.env.example`, `nest-cli.json`
2. Check for DEVOPS issues

### Phase 3: Backend — Module by Module
For each module in `src/`:
1. Read ALL files in the module (entity, service, controller, DTOs, guards, etc.)
2. Check against sections 1-9 + applicable advanced sections (11-13)
3. Add inline comments for every issue found
4. Track count per category

### Phase 4: Frontend — Component by Component
For each frontend app (mini-app, admin, frontend, etc.):
1. Read ALL source files (pages, components, hooks, stores, API clients)
2. Check against sections 1-4, 6-8, 10
3. Add inline comments for every issue found

### Phase 5: Cross-Cutting Concerns
1. Check API contract consistency (backend DTOs vs frontend types)
2. Check shared constants/enums match between frontend and backend
3. Check auth flow end-to-end (token generation → storage → refresh → expiry)
4. Check payment/billing flow end-to-end (if applicable)
5. Check file upload flow end-to-end (if applicable)

### Phase 6: Summary Report

Output a summary as a message to the user:

```
## Audit Summary

| Category | CRITICAL | HIGH | MEDIUM | LOW | Total |
|----------|----------|------|--------|-----|-------|
| SEC      |          |      |        |     |       |
| BUG      |          |      |        |     |       |
| PERF     |          |      |        |     |       |
| ARCH     |          |      |        |     |       |
| DB       |          |      |        |     |       |
| ERR      |          |      |        |     |       |
| TEST     |          |      |        |     |       |
| DEVOPS   |          |      |        |     |       |
| TYPE     |          |      |        |     |       |
| UX       |          |      |        |     |       |
| DDD      |          |      |        |     |       |
| CQRS     |          |      |        |     |       |
| EVT      |          |      |        |     |       |

**Total issues: X**
**Files reviewed: Y / Z**
**Architecture style detected: [Standard NestJS / DDD+Hexagonal / CQRS / Event-Driven]**

### Top 5 Critical Issues (fix these first):
1. ...
2. ...
3. ...
4. ...
5. ...

### Patterns Noticed:
- [Recurring issues seen across multiple modules]
```

---

## Rules

- **DO NOT** change any business logic or functionality
- **DO NOT** refactor code
- **DO NOT** add new files
- **DO NOT** delete any code
- **ONLY** add `// AUDIT:...` inline comments via the Edit tool
- Be specific: include the exact issue and why it's a problem, not vague complaints
- Reference related files when an issue spans multiple files (e.g., "see also: src/auth/jwt.strategy.ts:15")
- If unsure about severity, err on the side of higher severity
- For large codebases (>200 files), use Agent subagents to parallelize per module
- If a module is clean, note it in the summary — don't force issues where there are none
- Track files reviewed vs total to ensure 100% coverage

---

Start the audit now. Begin with Phase 1: Discovery.
