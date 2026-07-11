# Product Specification

## Problem

Travelers often book accommodation across multiple websites. Essential information—cancellation deadlines, check-in/out times, address, and contact details—is fragmented and difficult to retrieve at the right moment.

## Goal

Provide a private, trustworthy timeline of accommodation stays that can be populated from the current booking page and corrected by the traveler.

## V1 audience

Independent travelers who make hotel or accommodation bookings across multiple providers and use a Chromium-based desktop browser.

## Core workflow

1. The user opens a booking confirmation or management page.
2. The user clicks StaySpan and starts a scan.
3. StaySpan extracts semantic candidates locally.
4. The user reviews, corrects, or leaves fields incomplete.
5. The stay is saved locally and grouped into a trip timeline.

## Success criteria

- Users can save a stay even when extraction is incomplete.
- Uncertain values are never silently represented as certain.
- Booking IDs are not treated as contact numbers.
- Consecutive dated stays group into coherent trips.
- No booking data is transmitted by StaySpan.
- The project remains understandable and extensible without provider-specific adapters.

## V1 fields

- Property name
- Check-in date and time
- Check-out date and time
- Cancellation deadline
- Cancellation policy summary
- Address
- Phone
- Booking source name and URL

All fields are optional and editable.

## Non-goals

- Booking, selling, recommending, or repricing accommodation.
- Flights, trains, restaurant reservations, or full itinerary planning.
- Inbox access, accounts, cross-device sync, collaboration, or hosted storage.
- Provider-specific scraping adapters.
- Remote AI extraction.

## Product risks

- Booking pages vary widely and may provide limited semantic structure.
- Date formats and language vary by locale.
- Overconfident extraction could create harmful travel mistakes.
- Browser permission expansion could weaken user trust.

The confidence-aware review flow and local-first architecture are deliberate mitigations.
