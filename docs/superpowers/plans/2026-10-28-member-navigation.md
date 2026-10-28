# Member navigation implementation plan

**Goal:** Let members jump from repair counts to matching tickets and return from details without losing their place.
**Architecture:** Keep list filters in MemberApp for the current login. Add an optional active filter to the member API, applied before database pagination with the existing ownership and search predicates. No new dependencies or schema changes.
**Authorization:** User asked to select useful improvements and implement directly; no design approval pause is needed.

## Design

Summary buttons select ACTIVE (OPEN/ASSIGNED/IN_PROGRESS), RESOLVED or CLOSED. Selecting a summary clears the search and returns to page one so its results agree with the count. The list dropdown also supports ACTIVE; clear filters returns to all statuses. Reading details or switching tabs preserves list filters; logout clears them. In-flight requests cannot overwrite a newer filter result. Empty pages after status changes clamp to the last available page. Summary load failures expose a retry rather than showing unexplained dashes.

Alternatives: filtering only the loaded page gives incorrect totals, so filter on the server. Persisting search text in the URL or storage is unnecessary for this change; keep it in memory for privacy and predictable logout.

## Steps

- [x] Add HTTP regression for active-state filtering, owner isolation, pagination and invalid paging; run RED. Implement in MemberController/MemberService and run GREEN.
- [x] Add MemberApp user-flow tests for summary shortcuts, return-to-list preservation, resetting filters and summary retry; add MemberTickets tests for late responses and removed last-page items; run RED. Implement controlled list state and accessible summary buttons, then run GREEN.
- [x] Run full backend/frontend suites, frontend build, and browser checks of desktop/mobile filters. Review the change, update member documentation and the update bundle, commit and upload.

## Review focus

- Filtered totals must include all pages, with OPEN/ASSIGNED/IN_PROGRESS only.
- Foreign users' tickets must never appear, including old assigned tickets.
- A late network response must not replace newly filtered results.
- Returning after cancelling the only item on the last page must remain navigable.
- Summary retry and keyboard-operated cards must be accessible at mobile widths.

## Outcome

67 backend, 125 frontend and 29 browser tests pass; frontend production build succeeds. Desktop 1440px and mobile 320px inspected. Independent review found no Critical/Important issues. Minor deferred: direct tab-round-trip and logout-filter reset tests; existing detail navigation and authentication tests pass. Original deployment is tracked separately in the delivered update bundle.
