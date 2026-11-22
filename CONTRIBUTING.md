# Contributing

Thanks for your interest in contributing! This document describes the process for opening issues and submitting pull requests.

## Reporting Issues

Before opening a new issue, please search existing issues to avoid duplicates. When opening an issue, use the appropriate issue template if one is available (see `.github/ISSUE_TEMPLATE/`). Include a clear description, steps to reproduce, expected vs. actual behavior, and your environment where relevant.

## Branch Naming

Create a branch off `main` using a short, descriptive name prefixed by the type of change:

- `feat/<short-description>` — new feature
- `fix/<short-description>` — bug fix
- `docs/<short-description>` — documentation only
- `chore/<short-description>` — maintenance, tooling, dependencies
- `refactor/<short-description>` — code change that neither fixes a bug nor adds a feature

Example: `fix/contracts-page-pagination`.

## Commit Style

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<optional scope>): <short summary>

<optional body>
```

Common types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`. Keep the summary in the imperative mood and under ~72 characters. Reference the related issue in the body when applicable (e.g. `Closes #841`).

## Pull Request Requirements

Before opening a pull request:

1. Run the required test suites and make sure they pass:
   - `cargo test` for the Rust backend/indexer.
   - `npm test` for the frontend.
2. Keep changes focused on a single issue; avoid unrelated refactors.
3. Update documentation and tests when behavior changes.
4. Fill out the pull request template (`.github/pull_request_template.md`), describing what changed and how it was tested.

A pull request should:

- Target the `main` branch.
- Have a descriptive title and a linked issue.
- Pass CI checks.
- Be reviewed and approved before merging.

## Questions

If anything here is unclear, open an issue and we'll be happy to help.
