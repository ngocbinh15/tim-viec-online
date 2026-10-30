# Production README Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the project-planning README with an accurate Vietnamese guide to installing, deploying and operating the existing application.

**Architecture:** Documentation only. Read manifests, configuration, runtime commands and existing operations guides before rewriting the repository entry point. Keep detailed feature guides linked rather than duplicating them.

**Tech Stack:** Laravel 12, Next.js 16, React 19, MySQL, Reverb, database queues and the shared Node PDF renderer.

**Spec:** User request in this conversation; `AGENTS.md`, `docs/SRS.md` and the current repository configuration.

## Global Constraints

- Work on `docs/production-readme`; do not modify application code or secrets.
- Use direct Vietnamese, concrete descriptions and copyable commands. Avoid promotional claims, decorative badges and unverified production-readiness claims.
- Separate first installation, local development, production deployment and disposable tests.
- Do not include default passwords or run migrations, seeders, workers or deployment commands against the live environment while verifying documentation.
- Preserve documented CV performance limits and disabled-by-default AI/CV feature flags.

## Review Focus

- A new installation needs master data, while an existing installation must keep its database and APP_KEY.
- A worker must have the Node renderer, dependencies, fonts and private storage available at runtime.
- Browser origins, server API URLs and public WebSocket URLs have different purposes.
- A successful HTTP health endpoint does not prove queues, SMTP or database access work.
- The test database is disposable; development and production data must stay untouched.

## Task 1: Rewrite and verify the README

**Files:** Modify `README.md`. Record execution evidence in this plan.

**Interfaces:** Consume repository manifests/configuration and existing guides; produce a root README with valid relative links and commands matching installed scripts/Artisan signatures.

- [x] Read README, SRS, manifests, environment examples, authentication, storage, scheduler, queue configuration and feature guides.
- [x] Rewrite overview, supported workflows, requirements, local setup, production configuration, deployment, operations, tests, documentation and license.
- [x] Check relative links, Markdown/code-fence structure, npm scripts, Artisan commands and whitespace without running mutating commands.
- [x] Review wording and operational instructions against the source; record results.

## Execution Notes

- The previous README is a course-project plan with outdated version references, assignments and unchecked implementation lists.
- Use repository files as the authority for project-specific setup. No dependency upgrades or application changes are part of this task.
- Scope adjustment: this is a documentation edit, so verification uses link/command/configuration checks instead of adding application tests or running live deployment commands.
- Verification: 31 Markdown links/anchors resolve; 10 npm scripts and 20 Artisan commands match the installed project. UTF-8, code fences, Prettier formatting and `git diff --check` pass.
- Independent read-only review found a public-storage symlink missing from the fresh-release instructions. The release steps now require persistent storage to be attached and the public link created/verified for each new release before switching traffic.
- Prose review: removed the coursework plan, assignments, outdated stack references, default demo credentials and unchecked feature promises. Kept concrete procedures and the measured CV performance limitation.
