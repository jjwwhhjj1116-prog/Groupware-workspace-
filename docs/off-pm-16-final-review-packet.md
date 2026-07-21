# OFF-PM-16 Final Review Packet

## Baseline

- Date: 2026-07-21
- Branch: `recovery/offday2-workflow`
- Starting commit: `070ed0f OFF-PM-15: integrate canonical project workflow UI`
- Scope: final workflow E2E, UAT, security, migration handoff, performance, and rollback verification
- Remote operations: none

## Functional Scenarios

| Scenario | Result | Verified behavior |
|---|---|---|
| A - LOST | PASS | Estimate history remains, no project or intake is generated |
| B - CANCELLED | PASS | Cancellation reason is required and terminal requests reject estimate generation |
| C - WON lifecycle | PASS | One canonical project ID is retained through intake, PM schedule, operation, QC, delivery, daily report, profit analysis, and archive |
| D - Revision/resend | PASS | Prior versions and submissions remain immutable while a revised document receives a new hash |
| E - Duplicate conversion | PASS | A second WON conversion is rejected without creating another project |
| F - Permissions | PASS | Out-of-scope users cannot view project modules; assigned workers and managers receive only their allowed actions |
| G - Brand and files | PASS | Approved logo hash, secret-reference policy, Excel workbook generation, and file-version lineage are preserved |
| H - Failure handling | PASS | Invalid re-delivery parent, plaintext secret, missing reason, and invalid terminal transition fail without partial state mutation |

## Automated Verification

- `npm test`: 16 passed, 0 failed, 0 skipped.
- Four approved estimate template hashes match the legacy baseline.
- All four estimate workbooks pass semantic round-trip checks.
- Formula evaluation tests cover the supported SUM and Korean amount-expression subsets without dynamic code execution.
- The canonical WON workflow reaches 100% completion with zero pending approvals.
- Performance gate: 5,000 workflow-summary calculations completed in 3.6045 ms in the local Node test environment.
- Node tests emit Zustand storage-unavailable warnings because browser storage is intentionally absent; these are non-failing environment warnings.

## Build And Static Checks

- `npm run build`: PASS; TypeScript completed and 23 static pages were generated.
- `npm run lint`: PASS with 0 errors and 32 pre-existing warnings.
- `npm run json:validate`: PASS; current handoff files contain 0 projects and 0 personnel records.
- `git diff --check`: PASS.
- Legacy workbook helper scripts pass `node --check`.

## Security

- `npm audit --json`: 0 vulnerabilities across info, low, moderate, high, and critical severities.
- The vulnerable direct `xlsx` dependency was removed.
- Estimate database and legacy helper workbook handling now use the existing `exceljs` runtime.
- `brace-expansion` under ESLint is pinned to `1.1.16` and Next.js resolves `postcss` to `8.5.16`.
- Secret fields accept references only; plaintext secret input is rejected by automated tests.

## Browser UAT

Local browser UAT was performed at 1440x900 and 390x844.

Desktop routes checked:

- `/workspace`
- `/workspace/projects`
- `/workspace/projects/intake/estimate`
- `/workspace/schedules`
- `/workspace/approvals`
- `/workspace/settings`

Mobile routes checked:

- `/workspace`
- `/workspace/projects`
- `/workspace/projects/intake/estimate`
- `/workspace/schedules`

Observed results:

- No horizontal overflow at either viewport.
- The CON-COST logo is present with accessible alt text.
- KO to VI switching updates the document language and visible dashboard commands.
- The estimate route displays its valid empty state when no request is linked.
- Browser console errors: 0.

This browser UAT validates the local/static application and its `LOCAL_DEMO` fallback. It does not claim production API or remote database verification.

## Corrections Made During Final Verification

- Terminal estimate requests now reject new estimate-sheet creation.
- Project intake preserves explicit first through final delivery dates before falling back to legacy arrays.
- Start approval synchronizes the canonical project status to `IN_PROGRESS` or back to `SCHEDULE_APPROVED` after rejection.
- Estimate database Excel export was migrated from `xlsx` to `exceljs` with a testable workbook builder.
- ESLint 9 ignore configuration was consolidated into `eslint.config.mjs`.
- OFF-PM-16 test scripts and the complete A-H E2E suite were added.

## Rollback

1. Revert the single OFF-PM-16 commit; do not force-push or reset shared history.
2. Reinstall from the reverted lockfile.
3. Run `npm test`, `npm run build`, and `npm audit` before reopening the branch.
4. Preserve any exported workspace JSON before changing local browser storage.

No database migration or remote deployment was performed in this phase.

## Operator Notes

- Follow the workflow rail from estimate request to archive; each module uses the canonical project ID.
- Use the header account selector to validate PM, worker, manager, and administrator permissions.
- Use the KO/VI control before and after a refresh to verify language persistence.
- Empty static handoff data is expected until JSON data is imported or demo data is enabled.

## Final Gate

- Functional A-H: PASS
- Automated tests: PASS
- Production build: PASS
- Lint: PASS with warnings only
- Security audit: PASS, 0 vulnerabilities
- Desktop/mobile KO/VI UAT: PASS
- Remote push/deploy: NOT PERFORMED
