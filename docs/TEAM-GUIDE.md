# Team guide — how we work on this assignment

Short version: run the app locally, prove a finding is real, fix it, prove it is fixed, write it up.
Everything you need is in this repo.

- **Findings and evidence:** [`docs/VULNERABILITIES.md`](VULNERABILITIES.md)
- **Original project:** https://github.com/imohit159/medi-hub (MIT, © 2024 Mohit Kumar)

---

## 1. Who owns what

| Member | Findings | Theme |
|---|---|---|
| **Dinith** | V-01 to V-06 | Identity, sessions, error handling, secrets — plus the OAuth/OIDC feature |
| **Pasan** (IT22062642) | V-07 to V-10 | Injection and input handling |
| Member 3 | *pick 4+ from V-11 to V-24* | post your picks in the group chat |
| Member 4 | *pick 4+ from V-11 to V-24* | post your picks in the group chat |

V-16, V-23 and V-24 are **supporting only** — they do not count toward anyone's four. The reasons are in
the register.

Do not edit a finding that belongs to someone else. If a fix needs to touch their file, say so in the
group chat first, and agree who commits first.

---

## 2. Ground rules

1. **Localhost only.** Never point a tool or a test at `medi-hub.onrender.com` or any hosted copy. That
   is the original author's server and we have no permission to test it. The brief's own references, and
   Week 7, both require written authorisation before testing anything you do not own.
2. **Golden rule (from Dinith's list):** if you did not see it happen with your own eyes, it does not go
   in the report.
3. **Never commit** a `.env` file, a real key, or `security-tests/.tokens.json`. All are git-ignored —
   keep it that way.
4. **Never rewrite the original history.** Mohit Kumar's 166 commits are our "before" evidence.

---

## 3. Run the app locally

```bash
cd backend
npm install
npm run dev:test          # http://localhost:4000
```

`npm run dev:test` starts a **throwaway in-memory MongoDB** — nothing is saved, and the whole database
disappears when you press Ctrl+C. It seeds:

| Account | Role | Email |
|---|---|---|
| alice, bobby, carol, dana | Patient | `alice@test.local` … |
| admin | Admin | `admin@test.local` |
| alpha, beta | Doctor | `alpha@test.local`, `beta@test.local` |

Password for all of them: `Passw0rd!123`. It also seeds 500 medicines, one cart row owned by Bobby, and
one appointment belonging to Dr Beta — the fixtures the access-control and search findings need.

**Session cookies are minted for you** and written to `security-tests/.tokens.json`. Use them with curl
or Postman. This matters because the original login route is broken (`axios` is never imported, V-04), so
until that fix lands nobody can log in normally.

For the frontend or dashboard: `npm install && npm run dev` inside that folder, after copying
`.env.example` to `.env`.

---

## 4. Evidence: before and after

Each finding needs two captures, and the report is built from them.

1. **Before** — reproduce the finding on the original code and save the output. If your branch is already
   started, `git stash` or check out `main` first, so you are clearly testing the unfixed version.
2. **After** — repeat exactly the same steps once your fix is in, and save that output too.

Save both under `security-tests/` using the finding ID, for example:

```
security-tests/v08-regex-search/before.txt
security-tests/v08-regex-search/after.txt
security-tests/v08-regex-search/run.md    # the exact steps, so anyone can repeat them
```

Screenshots are good for the report and the video, but keep the text too — text can be pasted into the
PR, and it is easier to verify.

**Also re-run the tool that found it.** If Semgrep or npm audit reported it, run the tool again after the
fix. If it still reports the pattern but the behaviour is now safe, say so plainly and explain why —
that is a triaged finding, not a failure.

---

## 5. Branches, commits, pull requests

The repo's own `contributing.md` asks for [conventional commits](https://www.conventionalcommits.org/),
so we follow that.

**Branch:** `type/index-number/short-meaning`

```
fix/it22062642/v08-regex-search-injection
chore/it22062642/dev-environment-setup
docs/it22062642/vulnerability-register
```

**Types:** `fix` (a vulnerability or bug), `feat` (new feature, e.g. the OAuth login), `chore` (setup,
config, tooling), `docs`, `test`.

**Commits:** one commit per finding, with a real explanation.

```
fix(V-08): escape regex metacharacters in medicine search

The search endpoint passed user input into a $regex query after running it
through validator.escape(), which escapes HTML and does nothing to regex
metacharacters. A search containing regex operators therefore changed the
query and returned the entire catalogue.

Now the parameter must be a string, is length-capped, and every regex
metacharacter is escaped before the query is built.

Before: <what happened>
After:  <what happens now>
Retest: <how it was verified>
```

Write the message so a reader who has never seen the code understands what was wrong and how it was
proved fixed. The brief says twice that commit history with detailed comments is required.

**Pull requests:** one PR per finding, into `main`. Use the repo's PR template; put the before/after
evidence in the Screenshots section. **Ask a teammate to review and merge — do not merge your own.** The
review trail is worth marks in the Discussion section, and a second reader catches mistakes.

---

## 6. What to write for each finding

Dinith's register has the full template (Section 6). The short version — nine points:

1. Title, OWASP 2025 category, CWE number
2. CVSS score **and one line justifying it**
3. Exact file and line
4. What the flaw is, in plain English
5. Proof — request, response, screenshot
6. Which tool found it, with its output
7. The fix, as a before/after code comparison
8. Retest evidence — the same test, now failing to exploit
9. **Root cause** — *why* a real developer wrote this, and which specific practice would have caught it

**Point 9 is the one groups skip**, and it most likely maps to the Discussion row of the rubric.
"The developer should have been more careful" earns nothing. Name the practice: a code review checklist
item, a validation layer, a test, a CI gate.

---

## 7. Still unclaimed — please take one

From the register, Section 1:

| Task | Why it matters |
|---|---|
| **OWASP ZAP** scan, before and after | The brief links ZAP directly. Gives the whole team before/after evidence for the header and CSRF findings |
| **OWASP Dependency-Check** | The brief links it too. Second opinion next to npm audit for V-17 |
| **gitleaks** | Second opinion on V-01. Runs as a Windows binary, no Docker needed |

---

## 8. Definition of done, per finding

- [ ] Before evidence saved
- [ ] Fix committed with a detailed message
- [ ] After evidence saved, same steps
- [ ] Normal use still works (you did not break the feature)
- [ ] Register updated if anything you learned changes it
- [ ] PR opened, reviewed by a teammate, merged
- [ ] Report section drafted while it is fresh in your head
