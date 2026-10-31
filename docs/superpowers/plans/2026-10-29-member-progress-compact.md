# Compact member progress implementation plan

> Execute inline using superpowers:executing-plans. User has authorized direct UI improvements while preserving other systems.

**Goal:** Short, understandable progress list and detail, with no repeated full part-request forms across views.
**Architecture:** Existing React components and native details/summary disclosures; no backend, database, permissions or dependencies change.
**Design / spec:** List cards show title, status, ticket number and a short action. Details prioritize status and acceptance, with report data, cost breakdown, parts, photos and comments expandable. Dashboard controls stay on lists. Part feed is an index into the owning ticket, not a duplicate full detail. Part additions remain available behind an explicit disclosure. Part notifications auto-open the matching section. Alternative (deleting parts lookup) rejected to retain existing functionality; tabs would hide context and require more navigation.

## Constraints and review focus
- Preserve search/pagination, all existing actions, request URLs and authorization.
- Pending acceptance visible immediately; do not hide submission errors in collapsed sections.
- Part deep-links must expand before scrolling; async data should not collapse a manually opened panel.
- Long text and 320px screens must not overflow.
- Preserve entered supplemental forms when toggling panels.

## Tasks
- [x] Add failing behavioral tests for collapsed detail / visible acceptance, parts deep-link and compact feed navigation.
- [x] Update MemberTickets, MemberTicketDetail, PartRequests, MemberFeed, MemberApp and member.css. Keep existing APIs. Update old tests to use the new navigation deliberately.
- [x] Run full frontend suite and production build, verify desktop/mobile and browser interactions. Fresh final review and one fix pass if necessary.
- [x] Prepare hash-checked update bundle and apply to original only with filesystem permission; report actual delivery status.
