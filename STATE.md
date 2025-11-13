# State & Progress Guide — Developer Workflow

## Purpose

A developer-facing state guide to progress through tasks and mark them complete. Use this as a canonical checklist for each task/issue.

## How to use this file

1. Pick the top unassigned task from the TASKS.md backlog.
2. Create a branch with a clear name: feat/{task-number}-{short-title}
3. Update the task status in project tracker (To Do → In Progress).
4. Use the per-task checklist below. When all checks pass, create a PR requesting review.

## Per-task checklist (template — copy into every task)

### Local development

- [ ] Pull latest main and rebase branch.
- [ ] Ensure required local env vars are present (.env.local from template).
- [ ] Run unit tests for affected modules.
- [ ] Run lint and fix warnings.

### Implementation

- [ ] Implement feature according to TASKS.md Implementation Details.
- [ ] Add server-side and client-side validations.
- [ ] Add logging at informative level for critical flows.

### Tests

- [ ] Add unit tests for new logic.
- [ ] Add integration tests for endpoints impacted.
- [ ] Run E2E scenario if flow involves public menu order.

### Security & QA

- [ ] Validate inputs against OWASP rules.
- [ ] Check file upload validations and size limits.
- [ ] Perform manual tests for edge cases listed in caveats.

### Staging

- [ ] Deploy to staging via CI.
- [ ] Run integration smoke tests.
- [ ] QA verifies the workflow and marks acceptance in issue.

### Production readiness

- [ ] Add migration scripts and note downtime (if any).
- [ ] Add monitoring dashboards and alerts for critical metrics.
- [ ] Document any runbook steps for incidents.

### PR & Merge

- [ ] Add PR description linking tasks and test evidence.
- [ ] At least one code review approval.
- [ ] Merge to main via CI gating.

### Post-merge

- [ ] Verify production monitoring after deploy.
- [ ] Confirm feature works and no regression occurred.

## CI gating rules (must be enforced by CI)

- Lint passes.
- Unit tests pass with coverage threshold (configurable).
- Integration tests for changed services pass.
- E2E smoke tests may be required for full flows touching public menu and orders.

## Rollback and migrations

### Rollback procedure

- Prefer database-compatible rollbacks (additive migrations).
- Use feature toggles to disable new behavior in case of issues.
- If hard rollback needed: restore DB backup taken before deploy (document restore time and data window).

### Migration rules

- Migrations must be backward compatible for at least one deploy cycle.
- Use zero-downtime migration patterns: add new columns nullable, deploy code, backfill, then change constraints.

## Marking task done for QA & release

A task is done when:

1. Implementation code is merged to main.
2. All CI checks passed.
3. Staging QA has verified the acceptance tests.
4. Monitoring and alerting for the feature are in place.
5. Documentation and runbook updated.

## Task workflow diagram

```
Backlog → In Progress → Code Complete → Testing → Staging → Code Review → Merged → Deployed → Verified → Done
```

## Progress tracking recommendations

- Use issue tracker labels: blocked, needs-review, ready-for-qa, deployed.
- Update task status daily in standups.
- Link PRs to issues for traceability.
- Keep a CHANGELOG.md with notable changes per release.

## Common pitfalls and reminders

### Environment configuration

- Always use .env.example as template; never commit secrets.
- Validate required env vars on app startup and fail fast if missing.

### Database migrations

- Test migrations on a copy of production data.
- Always provide rollback migration.
- Coordinate with team before running migrations in production.

### Testing

- Avoid flaky tests; use retries and stable selectors.
- Mock external services in unit tests.
- Use dedicated test tenants in staging to avoid polluting production data.

### Code reviews

- Keep PRs small and focused on single task.
- Respond to feedback promptly.
- Use linters and formatters to reduce style debates.

### Deployment

- Deploy during low-traffic windows when possible.
- Monitor error rates and latency closely after deploy.
- Keep rollback plan ready and tested.

### Incidents

- Follow incident response runbook.
- Document incident in postmortem.
- Update runbook with lessons learned.

## Release process

### Pre-release checklist

- [ ] All planned tasks for milestone completed and merged.
- [ ] E2E tests pass on staging.
- [ ] Load tests meet performance targets.
- [ ] Security scan shows no critical issues.
- [ ] Documentation updated.
- [ ] Release notes drafted.

### Release steps

1. Create release branch from main.
2. Tag release with semantic version (e.g., v1.0.0).
3. Deploy to production via CI with manual approval gate.
4. Monitor for 1 hour post-deploy.
5. Announce release to stakeholders.

### Post-release

- [ ] Verify all features working in production.
- [ ] Check error rates and user feedback.
- [ ] Archive release notes and close milestone.

## Escalation and support

- For blockers: tag tech lead in issue and escalate in team chat.
- For production incidents: follow on-call rotation and incident runbook.
- For questions: check docs first, then ask in team channel.

## Continuous improvement

- Review this STATE.md quarterly and update with lessons learned.
- Collect feedback from team on workflow pain points.
- Iterate on CI/CD pipeline and tooling to improve developer experience.
