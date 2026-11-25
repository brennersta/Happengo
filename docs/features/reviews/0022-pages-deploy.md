# Review 0022: GitHub Pages deployment

## Cause

- The workflow uploaded the `github-pages` artifact and immediately ran `deploy-pages` in the same job.
- The deploy action looks up the artifact by name in the current workflow run. Artifact metadata can become visible to that lookup slightly after the upload step reports that it finalized, so an immediate lookup may return no matching artifact even though the upload succeeded.
- This matches the [upstream report of the same intermittent lookup race](https://github.com/actions/deploy-pages/issues/451).

## Fix

- Use separate `build` and `deploy` jobs in the same workflow run. The deploy job declares `needs: build`, so it starts after the artifact producer finishes and provides an explicit dependency.
- Keep upload and deploy on the current compatible major releases: configure-pages v6.0.0, upload-pages-artifact v5.0.0, and deploy-pages v5.0.1, pinned to full commit SHAs.
- Keep the `github-pages` environment, `pages: write`, `id-token: write`, `contents: read`, and the existing `pages` concurrency group.

## Validation

- Parsed `.github/workflows/pages.yml` with `js-yaml` and asserted the build/deploy dependency, environment, permissions, and three full-SHA action pins — passed.
- `git diff --check` — passed.
