# Architecture

StaySpan is a Manifest V3 Chrome extension built with React, TypeScript, and Vite. It has no backend.

## Runtime surfaces

- **Popup:** starts an explicit active-page scan and communicates extraction status.
- **Collector:** runs in the active tab and returns a bounded serializable semantic snapshot.
- **Extraction engine:** interprets the snapshot inside the extension and scores candidate values.
- **Dashboard:** reviews, edits, groups, displays, exports, and deletes stays.
- **Storage:** persists reviewed records in `chrome.storage.local`, with localStorage used only during ordinary web preview development.

## Extraction boundary

The injected collector reads visible text, headings, labels, semantic attributes, safe link metadata, DOM order, layout rectangles, JSON-LD, and open shadow roots. It ignores hidden content, scripts, styles, and duplicate text, and caps the number and size of collected records.

The collector does not contain booking-provider logic. Field interpretation happens after the snapshot returns to the extension.

## Candidate scoring

Independent scorers produce property name, check-in, check-out, cancellation deadline, cancellation policy, address, and phone candidates. Evidence source, semantic proximity, visual proximity, parsing certainty, and validation influence confidence.

- Confidence at or above `0.80` is treated as high.
- Confidence from `0.55` through `0.79` is prefilled and marked for review.
- Lower-confidence candidates are omitted.

Chronology prevents check-out dates before check-in and cancellation deadlines after check-in. Phone extraction prefers `tel:` links and contact-labelled groups, rejecting arbitrary identifiers.

## Privacy invariants

- No extraction data leaves the browser.
- No production provider-specific selectors or hostname rules.
- No account, telemetry, analytics, or remote model dependency.
- No persistent access to pages without an explicit extension action.

Changes that weaken these invariants require an issue, documented rationale, tests, and explicit permission review.
