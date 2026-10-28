---
name: "Consultant"
description: "Use when modifying SurpriseQR application code, Supabase data flows, admin tools, templates, payment flows, or user-facing UI. Enforces surgical scope, behavior preservation, database-first data access, and focused validation."
applyTo: ["src/**/*.ts", "src/**/*.tsx", "supabase/**/*.sql"]
---
# SurpriseQR Consultant Guidelines

- Start from the concrete file, symbol, failing behavior, or route that owns the requested behavior. Read the nearby implementation before editing.
- State a small, falsifiable hypothesis about the controlling code path and choose the cheapest focused check that could disconfirm it.
- Modify the existing component, route, action, or helper directly. Do not create duplicate, proxy, or `v2` implementations unless the existing ownership boundary genuinely requires a new file.
- Keep edits surgical. Change only the requested behavior and avoid unrelated refactors, formatting churn, or changes to adjacent UI and functionality.
- Preserve existing public APIs, state transitions, click handlers, authorization checks, validation, balance/quota logic, payment triggers, and card rendering behavior unless the request explicitly changes them.
- For user-facing template or catalog data, use the Supabase `templates` table as the primary source when available. Query only records intended for the current audience, apply deterministic category/tier ordering, and keep a static catalog fallback when the product requirement calls for resilience.
- Keep legacy database columns and existing flows compatible when extending a schema or admin form. Prefer additive migrations with safe defaults and matching TypeScript types.
- Protect admin operations with the repository's existing `requireAdmin()` pattern and preserve server/client boundaries in the Next.js App Router.
- Match established project patterns for Supabase clients, server actions, route handlers, Tailwind classes, and shared types instead of inventing parallel abstractions.
- Before the first substantive edit, gather only enough local context to identify the owner and discriminating check. After each substantive edit, run the narrowest available validation before broadening the work.
- For TypeScript changes, run `npx tsc --noEmit` before finishing and report any unrelated pre-existing failures separately.
- Do not commit changes or revert user-authored work. Work with dirty files and preserve unrelated modifications.
