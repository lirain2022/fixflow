# Unified member report

User approved combining report data and optional part requests into one submission while retaining all other systems.

## Design

Home /repair.html and member new-report use the same MemberReport component. Guests log in first on the repair page, then fill the single form. Service links preselect category unless a draft exists. During form entry, hide the dashboard counts, tabs and duplicate new-report button. Existing reports, dispatch, assets, costs, notifications and later part additions remain available.

The report includes zero to ten optional part requests (name, quantity, purpose/spec, reference URL). One POST /api/member/tickets creates the ticket and requests in one Spring transaction. Existing payloads without parts remain compatible. Use a coordinating service to avoid circular dependencies. No schema/dependency changes. No fees are generated from part requests.

One-hour session draft includes part fields. A synchronous submit lock prevents double clicks. Network/5xx uncertainty preserves fields and blocks resubmission pending manual checking of My Reports; pending submission state survives reload. Validation failures preserve editable input. Auth expiry preserves the draft. Cancel explicitly clears it.

## Plan / checks

- [x] HTTP RED: successful combined creation, no-parts compatibility, invalid nested inputs, limit, ownership, and rollback of ticket/parts/notifications when a later part has an invalid URL. Implement coordinating service and controller; GREEN.
- [x] UI RED: one POST with parts, add/remove fields, failed-input retention, double-click protection, persisted unknown result, draft restoration. Implement unified MemberReport and draft whitelist; GREEN.
- [x] Route RED: repair page login -> exactly one report form, category preselection/draft precedence, no duplicate dashboard controls. Reuse MemberApp and simplify form layout; GREEN.
- [x] Full backend/frontend/browser checks, desktop/mobile screenshots, independent review, update delivery package.

Review focus: nested validation and transaction rollback; no role or fee changes; auth expiry and uncertain submission; service category versus saved draft; one canonical form without duplicated navigation or footer.

## Results

Backend: 68 passed. Frontend: 130 passed. Browser: full 29 passed, then affected landing/member flow 7 passed after recovery fix. Production build succeeded (existing 3D chunk-size warning). Independent review found an uncertain-submission recovery dead end; fixed with a failing-then-passing regression test. Recovery requires reviewing existing tickets and explicit confirmation; server idempotency remains outside this change. Desktop/mobile visual checks and hash-verified delivery are recorded in the delivery report.
