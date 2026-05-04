# Changesets

This repo uses [Changesets](https://github.com/changesets/changesets) to manage versioning and changelogs for `@kdowswell/hitl-ui`.

## Adding a changeset

```bash
pnpm changeset
```

Pick `@kdowswell/hitl-ui`, choose the bump (patch/minor/major), and write a one-line summary. Commit the generated `.md` file with your PR.

## Releasing

PRs that include changesets trigger a "Version Packages" PR via the release workflow (added before first publish). Merging that PR runs `pnpm release`, which bumps versions and publishes to npm.

## Ignored packages

`@kdowswell/hitl-ui-components` and `examples-nextjs-tool-call` are private and excluded from versioning — see `config.json`.
