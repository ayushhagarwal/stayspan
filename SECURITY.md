# Security Policy

## Supported versions

StaySpan is in early development. Security fixes are applied to the latest commit on `main`; no versioned release is currently supported.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting feature on the repository **Security** tab. If that feature is unavailable, contact the maintainer privately through the contact options on [@ayushhagarwal](https://github.com/ayushhagarwal).

Do not open a public issue for vulnerabilities, privacy leaks, overly broad permissions, or exposure of booking information.

Include:

- A clear description and impact.
- Reproduction steps using fictional or redacted data.
- Affected browser and StaySpan commit.
- Any suggested mitigation.

You can expect acknowledgement within seven days. Please allow a reasonable remediation window before public disclosure.

## Security model

- Booking extraction and interpretation run locally.
- Reviewed stays are stored in `chrome.storage.local`.
- StaySpan has no backend, telemetry, remote AI, or analytics service.
- The extension uses `activeTab`, `scripting`, and `storage`; it does not request broad host access.

Never send maintainers real confirmation links, account tokens, booking IDs, or unredacted personal information.
