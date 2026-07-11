# Contributing to StaySpan

Thank you for helping make travel information easier to manage without compromising privacy.

## Before you start

- Search existing issues and discussions before opening a new one.
- For a focused bug fix, open an issue or reference an existing one.
- For a substantial feature or architectural change, start a discussion before implementation.
- Never include real booking pages, confirmation numbers, personal addresses, phone numbers, or account data in issues, fixtures, screenshots, or commits.

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Development setup

Requirements: Node.js 22+, pnpm 11, and a Chromium-based browser.

```bash
git clone https://github.com/ayushhagarwal/stayspan.git
cd stayspan
corepack enable
pnpm install --frozen-lockfile
pnpm test
pnpm build
```

Use `pnpm dev` for the dashboard preview. To test the extension, run `pnpm build`, load `dist` from `chrome://extensions`, and reload it after each build.

## Making a change

1. Fork the repository and create a branch from `main`.
2. Keep the change narrow and avoid unrelated formatting.
3. Add or update tests for behavior changes.
4. Run `pnpm test`, `pnpm lint`, and `pnpm build`.
5. Update documentation when behavior, permissions, architecture, or limitations change.
6. Open a pull request using the repository template.

## Extraction contributions

The production extractor must stay provider independent.

Accepted approaches include semantic labels, structured metadata, layout relationships, field validators, confidence scoring, and sanitized generic fixtures. Production hostname checks, provider names, generated class names, and website-specific selectors are out of scope.

Every extractor change should include fictional fixture coverage for the success case and at least one plausible false-positive case.

## Pull request expectations

- Explain the user problem and why the change is needed.
- Describe privacy, permission, and data-handling impact.
- Include screenshots for visible UI changes.
- Keep new dependencies justified and minimal.
- Do not modify extension permissions without explicitly discussing the reason.
- Do not commit generated `dist` output.

Maintainers may ask to split broad pull requests or move product discussion to GitHub Discussions.

## Commit style

Use short, imperative commit subjects, for example:

```text
Improve cancellation deadline confidence
Add keyboard focus styles
Document sanitized fixture rules
```

## Reporting security issues

Do not open a public issue for vulnerabilities or privacy leaks. Follow [SECURITY.md](SECURITY.md).
