# Repair quote confirmation implementation plan

> Inline execution using superpowers:executing-plans; direct implementation authorized by the user's acceptance of the recommended quote feature.

**Goal:** Administrators send repair estimates in existing ticket details; owners accept or request changes without confusing estimates and actual repair costs.
**Architecture:** Immutable quote revisions with a mutable owner response, ticket-first pessimistic locking, decimal amounts and a V7 additive migration. Shared React quote section for member/admin, no separate portal. Existing no-quote tickets remain usable.
**Stack:** Existing Java 21/Spring/JPA/Flyway, React/Vite and current tests. No new dependencies.

## Design and constraints
Quote has labor/parts amount (0–9999999999.99, max 2 decimals), required scope description, automatic total, TWD, creator/time and version. Only enabled non-admin owners can receive quotes. Create allowed OPEN/ASSIGNED/IN_PROGRESS. Submission supplies expected previous quote ID; owner response supplies latest ID/version. Old quotes stay readable; new revision needs fresh consent. States PENDING, ACCEPTED, CHANGES_REQUESTED. Questions require text. Closed/cancelled/awaiting acceptance cannot change quotes.

Quote acceptance records consent, not payment and not actual repair cost. Latest quote, if any, must be accepted before starting or completing repair. Save-draft, dispatch and cancellation still work. Actual costs remain separately recorded and may differ; no payment integration or auto-charge. Notification + activity for each transition. History is collapsible. Errors retain fields and show refresh for conflicts/uncertainty; no automatic POST retry.

Alternative: free-form comments alone cannot prove which amount was accepted. Editing an accepted quote in place loses that audit trail. Use explicit immutable revisions instead. These are implementation choices to fulfill the user's accepted feature.

## Tasks
- [x] HTTP RED then GREEN: new QuoteIntegrationTest, Quote entity/repository/service/controller, V7 migration, TicketService gates. Verify ownership/role, decimals, latest/version checks, rollback/no actual costs, closed tickets, race, legacy no-quote behavior.
- [x] UI RED then GREEN: shared TicketQuotes, member/admin integration and styling. Test acceptance/question/reissue, duplicate click lock, errors/reload without clearing input, collapsed history. Existing compact member screen retained.
- [x] Complete backend/frontend suites, build and real browser admin→member quote→repair flow, mobile checks. Independent final review; fix important findings once with regression tests.
- [ ] Original baseline check, backup/migration-safe update package, fixture verification and actual application only with filesystem permission. Report exact applied status; no GitHub push.

## Review focus
Stale acceptance must never approve newer amount; concurrent reissue/create serialized. Admin cannot impersonate owner's acceptance. Internal-admin ticket must not enter unreachable member confirmation. Quote totals cannot affect repair reporting. Unknown POST outcome must be checked before repeat; gate enforced on backend rather than UI only.

## Verified 2026-10-31
Backend 74 / frontend 140 / real browser 31 passed; production build passed. Final review issues fixed with RED/GREEN tests. Added ticket-status refresh and owner-account locking against deactivation. Application to original remains subject to filesystem access and stopped services; bundle verification recorded with delivery.
