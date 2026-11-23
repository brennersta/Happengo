# 0006. Review of the GitHub Pages demo

- Pull request: https://github.com/brennersta/Happengo/pull/16
- Branch: `cursor/demo-pages-c78e`

## Areas

Static web demo (`EXPO_PUBLIC_DEMO_MODE`), the in-page fetch mock, sample events around Tallinn, the fake demo session, the Pages workflow, the `/Happengo/` base path and `404.html` fallback, the #15 follow-ups on share tokens and `GET /v1/events/mine`, and ADR 0005 (Auth0 accepted).

## Checklist

- [x] A normal production web or native build does not start mocks or a fake session. Only `EXPO_PUBLIC_DEMO_MODE=true` on web does.
- [x] The static export does not load the MSW worker. Production Metro stubs `msw`, which is why `http.get` threw. The demo fetch mock answers the same routes.
- [x] The banner "Demo: sample data, nothing is saved" stays on screen. Sample data includes a live event, upcoming events, and a past owned event.
- [x] Playwright served the export at `/Happengo/` and walked create, pin, card, join, decline, approve, Upcoming, Past, reduced motion, and a deep-link reload.
- [x] `listMyEvents` drops a request at `endAt`. Create and detail do not return `shareToken`. Join omits a null share token.
- [x] Anonymous `GET /v1/events/mine` uses `ProblemTypes.Unauthorized`.
- [x] ADR 0005 is Accepted for Auth0. Entra External ID is the considered alternative. No tenant and no secrets.
- [x] The Pages workflow is not a pull-request check. `CI / ci-success` stays the only required check.
- [ ] GitHub Pages Source set to GitHub Actions. `GET /repos/brennersta/Happengo/pages` returned 404. Brenner has to set that in the repository settings. The expected URL is https://brennersta.github.io/Happengo/.
