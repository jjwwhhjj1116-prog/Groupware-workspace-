# UX 13–15 UI implementation scope

## Identity

- Contract: WORKSPACE UX SHARED CONTRACT v2.1
- Baseline branch: `recovery/offday2-workflow`
- Baseline commit: `14b9d16`
- Implementation branch: `ux/workspace-v2-1`
- Evidence: source code, automated commands, and local browser screenshots

## Priority and conflict rules

1. Latest explicit user instruction
2. Existing shared engineering contract
3. Workspace UX shared contract v2.1
4. Approved ADR or scoped plan
5. Actual repository code and tests
6. Inference

The user explicitly requested continuous implementation and review in one session, so the executor prompt's stop-for-plan and stop-after-review rules are superseded for this session. Implementation and review remain separate passes.

## Baseline inventory

- `SOURCE_VERIFIED`: Next.js 16.2.10 App Router static export under `/workspace`.
- `SOURCE_VERIFIED`: role dashboards for super admin, department manager, PM, and worker.
- `SOURCE_VERIFIED`: KO/VI UI language switching and role-based menu filtering.
- `SOURCE_VERIFIED`: OFF-PM-16 canonical estimate-to-archive workflow and 16 automated tests.
- `SOURCE_VERIFIED`: approved logo asset exists and hashes to the value recorded in `docs/design/brand-color-extraction.md`.
- `SOURCE_VERIFIED`: current operational data is provided by the existing stores/API adapters; this UI pass adds no parallel domain store.
- `UNKNOWN`: production API/database behavior is not claimed by local static-browser validation.
- `VIDEO_VERIFIED`: none. No reference-video frame is claimed as inspected.

## Included

- Brand-derived color, surface, elevation, radius, motion, focus, and responsive tokens
- Near-black desktop navigation and mobile bottom navigation
- Responsive top bar that preserves role, account, mode, language, approvals, evaluation, notifications, and settings entry points
- Shared card, button, badge, input, and select visual contracts
- Role-dashboard KPI hierarchy and dashboard panel styling
- Existing project-workflow and management-support widget states
- Reduced-motion handling and visible keyboard focus
- Four viewport visual verification

## Excluded

- New domain entities, API endpoints, or database migrations
- Mail, contacts/OCR, Google Contacts, or AI implementation
- Changes to OFFDAY2 status transitions, permission rules, canonical IDs, estimates, QC, delivery, or profit lineage
- Remote push, deployment, or production claims

## Allowed paths

- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/components/layout/**`
- `src/components/ui/**`
- `src/components/dashboard/**`
- `src/lib/localization.ts`
- `docs/design/**`
- `docs/workspace/**`

## Rollback

Revert the single scoped UI commit. This pass has no schema or operational-data migration and does not alter persistent workflow payloads.
