# Codex Workflow Defaults

When a feature is complete and working, ask this before closing the task:

"Should I add a new Puppeteer test scenario for this feature?"

If user says yes:
- Add or extend a scenario in `tests/e2e/`.
- Run `npm run test:e2e`.
- Report coverage added and any gaps.
