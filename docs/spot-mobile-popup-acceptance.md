# Slice 3 targeted popup acceptance repair

References #187. Based on sandbox merge `a7bce8a44b3059666814a223467329c93b52058f`.
Local verification does not constitute TrueNAS deployment acceptance.

## Popup repair

Leaflet 1.9.4 measures `maxWidth` as content width. The previous `310` limit
produced a roughly 357px outer popup after Leaflet's margins, padding and rounding,
so autopan could not fit it in a 322px map. Viewport-only sizing cannot fix a map
inside a narrower padded panel.

`trackingPopupLayout` derives width and scrollable content height from the actual
Leaflet map size. Scoped CSS gives the popup known chrome dimensions, wraps long
content at the existing font size, and reserves a separate header for a 32px close
control. Leaflet's own max-height scrolling and autopan remain responsible for
layout; no additional overflow clipping is introduced. Narrow maps reserve the
zoom controls' area. The marker anchor and height budget leave the selected marker
below the popup and inside the map. Resize updates the public Popup options and
calls `update()` on open popups. Map cleanup unregisters the resize listener.

Selection raises the exact selected marker above overlapping markers; other
markers return to their normal stacking. Existing list selection, repeated focus,
popup close/reopen, tile-failure handling and lifecycle cleanup remain in use.

## Retired/inactive acceptance gap

The existing `tests/trip-tracking.test.ts` suite **Trip save and tracking read
models on isolated PostgreSQL** creates a disposable in-memory PGlite database,
applies the existing migrations and inserts invented domain records. It never
reads `DATABASE_URL`, connects to TrueNAS, or changes exported/deployed fixtures.

The existing subtest **new inactive/retired trackers rejected; existing retired
assignment can be retained or removed** already exercised all four status
behaviours. The repair strengthens this same subtest, rather than adding a
duplicate scenario: both rejected status writes now try to change the Trip title
and assert that every Trip, assignment and participant record is identical before
and after rejection. Removal is explicitly counted, and rejected reassignment of
the removed retired tracker also asserts unchanged records.

The existing subtest **cross-org assets, vehicles, Trip IDs, sessions and duplicate
rows reject without partial save** rejects foreign trackers, vehicles, Trip IDs
and organisation contexts and verifies unchanged Trip/assignment/participant data;
a rejected new Trip is not created. **option lists and assignment/status reads
cannot cross tenants** covers scoped reads.

These real database tests satisfy the retired-tracker coverage gap without
manufacturing a retired asset in the accepted seven-ACTIVE-tracker sandbox data.
No tracking/Trip domain implementation or fixture source changed in this repair.

## Automated regression coverage

`tests/tracking-map-client.test.ts` adds **popup layout fits the actual map with
space for chrome, close control and marker**, testing narrow container widths,
desktop bounds, initial zero size and resize lifecycle wiring. The existing
**selection focuses and opens the exact marker ID, including repeated selection
and no-fix selection** also verifies selected-marker stacking and reset.

## Compiled local browser acceptance

The actual application ran with `next start`, `NODE_ENV=production`, explicit
sandbox/demo flags and a localhost-only disposable database populated directly
with invented domain records. Container image downloads stalled, so browser QA
used the official [PGlite socket server](https://pglite.dev/docs/pglite-socket),
backed by the existing test PGlite engine. No application dependency changed.
Two local invented fixes were placed at exactly the same position to test overlap;
no exported fixture, accepted sandbox record, loader or remote system was changed.
The socket server, app, proxy, browser tab and unused QA VM were removed afterward.

Measured CSS pixels (not viewport-derived assumptions):

| Viewport | Actual map width | Popup outer width | Content height | Close control | Hit samples |
| --- | ---: | ---: | ---: | --- | --- |
| 390 × 844 | 322 | 298 | 164, scrollable | 32 × 32 | 5/5 pass |
| 320 × 844 | 252 | 228 | 164, scrollable | 32 × 32 | 5/5 pass |
| 1280 × 900 | 588.664 | 345 | 262, no scroll needed | 32 × 32 | 5/5 pass |

At each size, the popup and selected marker were fully inside the actual map;
the popup body did not intersect the marker. `document.elementFromPoint` hit the
close control or its child at the centre and all four inset corners. Real pointer
clicks at the centre removed the popup (DOM popup count zero), then list/marker
reselection reopened it. No forced locator click or synthetic click event was used.

Additional checks passed:

- List-to-marker and marker-to-list selection. Exact overlapping marker positions
  were recorded; the selected stale marker had z-index 1180 versus 180 for the
  other marker, with the correct popup title and pressed list row.
- Reselection after close, full reload and route unmount/remount. One map and one
  reopened popup remained; no duplicate-map exception or normal browser warnings/
  errors occurred. The normal run loaded six visible OSM tile images.
- A localhost QA proxy added an image-only CSP to block tiles without changing
  provider configuration or app code. The existing tile-unavailable notice and
  single safe tile warning appeared; list/marker selection, pointer close/reopen,
  popup scrolling and map dragging remained functional. Scrolling reached 123px
  inside 164px content with 287px total height. A native drag moved the marker from
  x=180 to x=215 at mouse-up; default inertia means its later settled displacement
  is not asserted to equal exactly 35px.
- Unchanged Trip form at 390px: add tracker, select an active tracker and remove the
  added row left the original assignment populated. Its fieldset had client/scroll
  width 322px with all controls within x=46…344; no horizontal form overflow. No Trip
  or TMP/JMP implementation changed. Known navigation clipping remains out of scope.

Evidence is committed alongside this report:

- [Geometry and interaction observations](acceptance/spot-mobile-popup/evidence.json)
- [390px mobile popup](acceptance/spot-mobile-popup/mobile-390.jpg)
- [320px mobile popup](acceptance/spot-mobile-popup/mobile-320.jpg)
- [Desktop popup](acceptance/spot-mobile-popup/desktop.jpg)
- [Overlapping marker selection](acceptance/spot-mobile-popup/overlap-desktop.jpg)
- [Tiles unavailable](acceptance/spot-mobile-popup/tiles-unavailable-390.jpg)
- [Scrolled popup without tiles](acceptance/spot-mobile-popup/tiles-unavailable-scrolled.jpg)
- [Unchanged mobile Trip controls](acceptance/spot-mobile-popup/trip-mobile-390.jpg)

Full validation passed: `npm install`, `npm run db:generate`, `npm test` (131 passed),
`npm run typecheck`, `npm run lint`, `npm run build`, `npx prisma validate`, and
`git diff --check`. One popup geometry regression was added; existing selection
and retired-status tests were strengthened. No Prisma migration, schema change,
synthetic fixture change, live SPOT request, polling, worker or deployment occurred.

This closes the targeted local popup and automated status-coverage checks. Slice 3
still requires separate TrueNAS browser acceptance after an authorised deployment;
this repair neither performs deployment nor claims the deployed system is accepted.
