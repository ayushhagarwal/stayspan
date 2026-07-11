# Changelog

All notable changes to StaySpan will be documented here.

The project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning will begin when the first public release is prepared; no release has been published yet.

## [Unreleased]

### Added

- Local-first Chrome extension dashboard and popup.
- Generic semantic booking-page extraction engine.
- Confidence-aware review workflow.
- Automatic trip grouping and cancellation deadline highlighting.
- JSON export and incomplete-stay support.
- Sanitized extraction and UI test suite.

### Fixed

- Prefer detailed dated cancellation policies over short promotional badges.
- Recover the start of explicit 24-hour time ranges and separately rendered checkout times.
- Ignore generic booking-confirmation headings when scoring property names.
- Strip sensitive query parameters and fragments from stored booking-source URLs.
