# security-tests

Evidence for the SE4030 assignment: what each finding did **before** the fix, and what it does
**after**. One folder per finding, named by ID.

```
security-tests/
  v08-regex-search/
    run.md        # the exact steps, so anyone can repeat them
    before.txt    # output on the unfixed code
    after.txt     # output with the fix in place
```

## Rules

- **Localhost only.** Every script targets `http://localhost:4000`, the disposable server started by
  `npm run dev:test` in `backend/`. Never aim any of this at `medi-hub.onrender.com` or any other hosted
  copy — that is the original author's server and we have no authorisation to test it.
- **The database is disposable.** `npm run dev:test` runs an in-memory MongoDB that is discarded on exit,
  so tests can create and destroy data freely.
- **`.tokens.json` is git-ignored.** The dev server writes seeded session cookies there. It is local
  scratch data, never committed.

## Before you capture "before" evidence

Make sure you are running the **unfixed** code, otherwise the capture proves nothing:

```bash
git stash            # or: git checkout main
cd backend && npm run dev:test
```

Then capture "after" evidence with your fix branch checked out, repeating the **same** steps.

## What good evidence looks like

- The exact request, and the exact response (status code plus the part that matters).
- A one-line statement of what it proves.
- The same tool re-run after the fix, when a tool found the issue.

Keep the text files even if you also take screenshots — text pastes into pull requests and the report,
and a marker can verify it.

See [`../docs/TEAM-GUIDE.md`](../docs/TEAM-GUIDE.md) for the full workflow and
[`../docs/VULNERABILITIES.md`](../docs/VULNERABILITIES.md) for the findings themselves.
