# Changelog

All notable changes to StaySpan will be documented here.

The project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-07-11

### Added

- Local-first Chrome extension dashboard and popup.
- Generic semantic booking-page extraction engine.
- Confidence-aware review workflow.
- Automatic trip grouping and cancellation deadline highlighting.
- Manual trip grouping with an automatic-grouping fallback.
- JSON export and incomplete-stay support.
- Sanitized extraction and UI test suite.

### Fixed

- Prefer detailed dated cancellation policies over short promotional badges.
- Recover the start of explicit 24-hour time ranges and separately rendered checkout times.
- Ignore generic booking-confirmation headings when scoring property names.
- Recover property names exposed as lodging links while rejecting nearby navigation and promotional links.
- Extract explicit cancellation deadlines from separate refund schedules.
- Reuse the existing StaySpan dashboard instead of opening duplicate tabs.
- Strip sensitive query parameters and fragments from stored booking-source URLs.

[Unreleased]: https://github.com/ayushhagarwal/stayspan/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/ayushhagarwal/stayspan/releases/tag/v0.1.0
