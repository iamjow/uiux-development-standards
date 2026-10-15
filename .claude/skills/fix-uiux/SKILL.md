---
name: fix-uiux
description: Fix the findings in a /validate-uiux report for any delivered frontend project, in a safe order (structure, markup, accessibility, cleanups), on your fix branch, then re-run /validate-uiux once as QA and write a fix summary. Use when asked to fix, remediate, or resolve UIUX validation findings.
argument-hint: <report-path> [--blocking | --all | F-1 F-2 ...] [--target <path>] [--no-qa]
disable-model-invocation: true
---

# Fix the findings in a validation report

You are the fixer. Do the fixes yourself in this session, in order. Do not hand them to parallel subagents: fixes touch the same files, and later fixes depend on earlier ones. The validator team is the independent QA.

Arguments: `$ARGUMENTS`

## 1. Parse the arguments

- `REPORT`: the first argument, a report written by `/validate-uiux`. If it is missing, ask for it and stop.
- Selection, default `--blocking`:
  - `--blocking`: every Critical and High finding.
  - `--all`: every finding.
  - `F-n` IDs: exactly those findings, at any severity.
- `--target <path>`: use this project path instead of the report's Target row.
- `--no-qa`: skip step 7, so no agents run. Use it to save tokens and re-validate later.

## 2. Read the inputs

1. Read `REPORT` in full. Note the Target and its commit, the framework, the verdict, every finding (ID, severity, rule, requirement, locations, evidence, recommendation), the "Needs confirmation" items, and the "Manual checks".
2. Resolve `TARGET` to an absolute path and confirm it exists. If the report's Target is not an existing path and no `--target` was given, ask for it and stop.
3. Read [playbook.md](playbook.md) in full.
4. Read `uiux-development-standard.md` in full; it describes the end state. Read `.claude/skills/validate-uiux/rubric.md` §2 and §3. Open sections of `uiux-code-review-standard.md` as individual findings cite them.

## 3. Prepare a safe workspace

Never edit the delivery in place without a way back, and never commit or push. The user reviews the diff and commits.

- **`TARGET` is the top level of its own git repository** (`git -C "$TARGET" rev-parse --show-toplevel` prints `TARGET`):
  1. `git -C "$TARGET" status --porcelain` must print nothing. If it prints anything, stop and ask the user. Do not stash, reset, or discard their work.
  2. The user creates the fix branch before running this skill. Do not create a branch. If the current branch is the default branch (`main` or `master`), stop and ask the user to create a fix branch first.
  3. Record the current branch and base commit. If the commit differs from the report's commit, say so, and locate every finding by its evidence text rather than its line number.
  4. `WORK` = `TARGET`.
- **Anything else** (not a repository, or a folder inside another repository): do not create branches, because they would land in the parent repository. Copy the project to a sibling folder `<target-name>-fixed-<YYYY-MM-DD>`, skipping `node_modules/`, `dist/`, `build/`, and `.git/`. `WORK` = the copy. The original stays untouched.

## 4. Plan

1. Select findings per step 1. Skip any finding that a "Needs confirmation" item covers, and list it as "needs a decision".
2. Put each selected finding in a phase using [playbook.md §1](playbook.md#1-phases), then group the findings inside each phase by file.
3. Tell the user, in one or two lines, the workspace, the number of findings per phase, and anything skipped. Then continue.

## 5. Fix, phase by phase

For each finding, in phase order:

1. **Locate** it by its evidence text; line numbers drift after earlier edits. If the evidence is gone, check whether an earlier fix resolved it and record "fixed by F-n". If it wasn't resolved that way, record "not found".
2. **Fix** it with the report's recommendation and the matching playbook recipe, adapted to the project's framework and conventions. Check the cited rule in the standard; when the recommendation and the standard disagree, follow the standard.
3. **Stay in scope.** Follow the [guardrails](playbook.md#3-guardrails): change only what the finding needs, keep copy, URLs, and behavior, and do not introduce a new violation.
4. **Record** a status: `FIXED`, `PARTIAL` (with what is left), or `SKIPPED` (with why). Record any visible change separately.

At the end of phase 1 (structure), run the build checks in step 6 before starting phase 2. Markup and accessibility fixes build on the new structure.

## 6. Run the build checks

- **SCSS:** compile the SCSS entry with the project's own Sass (`node_modules/.bin/sass`) if it is installed, otherwise with `npx --yes sass`. Write the output to a temporary directory, never into `WORK`. Fix every compile error.
- **References:** run `python3 -I "${CLAUDE_SKILL_DIR}/check_references.py" "$WORK"`. It reports duplicate IDs, `for` and ARIA references to missing IDs, and classes with no style or script hook in HTML files. Fix anything your changes caused, and list pre-existing problems you were not asked to fix.
- **JavaScript:** for each changed script, run `node --check`. For an ES module, copy it to a temporary `.mjs` file and check that copy.
- Do not install dependencies or run the project's own npm scripts without asking.
- **Self-check:** for each selected finding, re-open its location and confirm the evidence is gone and the cited rule is now met. This runs no agents. Fix anything that fails before moving on.

## 7. QA: re-validate once

This is the only step in `/fix-uiux` that runs agents. It runs `/validate-uiux` exactly once, which is 4 agents. Skip it when `--no-qa` was given.

1. Invoke the `validate-uiux` skill with `WORK` as its argument. If the skill can't be invoked, read `.claude/skills/validate-uiux/SKILL.md` and follow it. It writes a new report.
2. Compare the old and new reports. IDs are renumbered, so match findings by rule, file, and evidence.
   - **FIXED:** a selected finding no longer appears.
   - **STILL OPEN:** a selected finding still appears.
   - **NEW:** a finding that was not in the old report, in a file you changed. This is a regression.
3. If a selected finding is STILL OPEN, or a NEW finding is Critical or High, fix it in this session (step 5) and re-run the build checks and self-check (step 6). **Do not re-validate again.** Mark those findings "fixed after QA, not re-validated", and recommend that the user run `/validate-uiux` when they're ready.

## 8. Write the fix summary

Write `validation-reports/<project-name>-<YYYY-MM-DD>-fix.md` in this repository. Add `-2`, `-3` if it exists. Never write the summary into `WORK`.

```markdown
# UIUX Fix Summary: <project-name>

| | |
|---|---|
| **Result** | <final verdict from the last re-validation> |
| Source report | `<REPORT>` (<verdict>) |
| Workspace | branch `<branch>` in `<TARGET>`, or copy `<WORK>` |
| Base commit | `<commit>` or "not a git repository" |
| Selection | `--blocking` / `--all` / IDs |
| QA | `/validate-uiux` once (`<path to the QA report>`), or "skipped (`--no-qa`)" |

## Summary

<Two or three sentences: what was fixed, what remains, and what the user must review.>

| Selected | Fixed | Partial | Skipped | Still open | New (regressions) |
|---|---|---|---|---|---|
| n | n | n | n | n | n |

## Findings

| ID | Severity | Finding | Status | What changed |
|---|---|---|---|---|

## Visible changes to review

<Every change a user could see: colors adjusted for contrast, focus rings, larger touch targets, layout shifts, rewritten alt text.>

## Needs a decision

<Skipped findings and best-effort content to confirm, such as alt text written from context.>

## Build checks

<SCSS compile, reference check, and JS syntax results.>

## Manual checks

<Copied from the last re-validation report.>

## Files changed

<`git diff --stat` output for a branch, or the list of files changed in the copy.>
```

## 9. Reply

Reply in six lines or fewer:

1. The workspace (branch or copy).
2. Fixed out of selected.
3. The QA verdict, or "QA skipped".
4. Any regressions.
5. A link to the fix summary.
6. Next steps: review the diff and visible changes, run the manual checks, then commit.
