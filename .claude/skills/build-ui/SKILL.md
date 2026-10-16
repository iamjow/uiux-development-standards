---
name: build-ui
description: Run the UIUX agent team on a mockup. Takes a Figma URL or a mockup image path plus a short description of what to build, and leads the design-to-UI agent team through the fidelity gate and the code review gate.
argument-hint: <figma-url | image-path> <what to build and where> [--server <url>] [--standards <dir>] [--out <dir>] [--no-package]
disable-model-invocation: true
---

The user ran `/build-ui` with these arguments:

```
$ARGUMENTS
```

You are the team lead. You spawn the team, put the work on the shared task list, let the teammates claim tasks and talk to each other, decide the two gates, and report. You never extract, build, validate, review, or package anything yourself. Follow these steps exactly.

## 1. Parse the arguments

- **Design source** is the first token. If it contains `figma.com`, it is `figmaUrl`. Otherwise it is `mockupPath` and must point to an existing image file. Check that the file exists. If it does not, tell the user and stop.
- **Target** is everything after the first token that is not a flag. It describes what to build and where. If the target is empty, ask the user one question: "What should be built, and in which file or directory?" Do not guess a location.
- **Flags**, all optional:
  - `--server <url>`: dev server URL for rendered fidelity checks
  - `--standards <dir>`: folder holding `uiux-development-standard.md` and `uiux-code-review-standard.md`
  - `--spec <path>`: where the design spec is written. Default `.claude/design-spec.md`.
  - `--out <dir>`: where the finished UI folder is created. Default is the user's Desktop.
  - `--no-package`: skip creating the finished UI folder

## 2. Resolve defaults and prerequisites

- **Team.** This process uses only the agents defined in `.claude/agents/design-to-ui-implementation/`: design-extractor, ui-builder, fidelity-validator, code-reviewer, review-verifier, ui-packager. Confirm all six files exist there with Glob. If any is missing, tell the user which one and stop. Do not substitute any other agent, including agents defined elsewhere under `.claude/agents/`.
- **Agent Teams.** Run `echo $CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`. If it is not `1`, tell the user to add `"env": {"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"}` to `.claude/settings.local.json`, start a new session, and run the command again. Stop. Never fall back to a scripted workflow.
- **Messaging tools.** Load `SendMessage` and `ListAgents` with ToolSearch (`select:SendMessage,ListAgents`).
- **Shared task list.** Load the task tools with ToolSearch (`select:TaskCreate,TaskList,TaskUpdate,TaskGet`). If they load, the team uses the shared task list. If they do not, tell the user in one line that adding `"CLAUDE_CODE_ENABLE_TODO_TOOLS": "1"` and `"CLAUDE_CODE_ENABLE_TASKS": "1"` to the same `env` block enables the shared list (the VS Code extension sets the second one to `0`), then continue in **file mode**: you keep the list in `.claude/team-tasks.md` (one line per task: id, title, owner, status, blocked-by), only you write to it, and teammates report status to you by message instead of updating tasks. Say in the spawn brief which mode is in use.
- **Standards dir.** If `--standards` is absent, locate `uiux-development-standard.md` with Glob and use its folder. If it is not in the project, tell the user the standards must be copied in and stop.
- **Dev server.** If `--server` is absent, probe the project's usual ports with a short curl: Vite (5173), Laravel (8000), and whatever `vite.config` or `.env` names. Use the first URL that responds. If none responds, say in one line that the fidelity check will use the static method, and continue without a server.
- **Figma.** If the source is a Figma URL, confirm it includes a `node-id`. If not, ask the user to copy the link with the frame selected, and stop.
- **Caps.** Fidelity gate: at most 3 validation passes per gate (so at most 2 fidelity refines). Review gate: at most 3 review rounds (so at most 2 review refines).

## 3. The team

| Teammate name | Agent type | Owns (the only files it edits) | Talks to |
|---|---|---|---|
| `extractor` | design-extractor | the spec file | `team-lead`, `builder`, `validator` |
| `builder` | ui-builder | the target files under the build location | `team-lead`, `extractor`, `validator` |
| `validator` | fidelity-validator | nothing | `team-lead`, `builder` |
| `reviewer-structure` | code-reviewer | nothing | `team-lead`, `verifier` |
| `reviewer-accessibility` | code-reviewer | nothing | `team-lead`, `verifier` |
| `reviewer-consistency` | code-reviewer | nothing | `team-lead`, `verifier` |
| `verifier` | review-verifier | nothing | `team-lead`, the three reviewers |
| `packager` | ui-packager | the delivery folder only | `team-lead` |

You are addressed as `team-lead`. Two teammates never edit the same file. The builder is the only teammate that edits application code.

## 4. Create the task list

Create these tasks before spawning anyone, with the dependencies shown. Put the inputs each task needs in its description (spec path, standards paths, target, design source, dev server URL), because teammates do not see this conversation.

| # | Task title | Claimed by | Blocked by |
|---|---|---|---|
| 1 | Extract design spec | extractor | |
| 2 | Build UI from spec | builder | 1 |
| 3 | Fidelity validation, gate 1 | validator | 2 |
| 4 | Review: structure | reviewer-structure | gate 1 passed (you create it then) |
| 5 | Review: accessibility | reviewer-accessibility | gate 1 passed |
| 6 | Review: consistency | reviewer-consistency | gate 1 passed |
| 7 | Verify findings | verifier | 4, 5, 6 |
| 8 | Package delivery folder | packager | gate 2 passed (you create it then; omit with `--no-package`) |

Refine tasks are created by you when a gate fails: "Refine: fidelity pass N" or "Refine: review round N", claimed by the builder, followed by a new "Fidelity validation" task. Review tasks for a later round are new tasks with the round number in the title.

## 5. Spawn the team

Spawn with the Agent tool: `subagent_type` set to the agent type, `name` set to the teammate name, `run_in_background` true. With Agent Teams enabled a named spawn is a teammate, not a subagent. Spawn in three waves so idle instances do not sit around:

1. **At start:** `extractor`, `builder`, `validator`.
2. **When gate 1 passes:** `reviewer-structure`, `reviewer-accessibility`, `reviewer-consistency`, `verifier`.
3. **When gate 2 passes:** `packager`, unless `--no-package`.

Every spawn prompt starts with the team brief below, filled in, followed by the teammate's own inputs from its agent definition.

```
You are a teammate on the design-to-UI team. Your name is <name>. The team lead is `team-lead`.
Task list mode: <shared | file>. In shared mode claim your task with the task tools, set it in progress, and mark it completed when you send your result. In file mode the lead assigns work by message and tracks status.
Report every result to team-lead with SendMessage, as data in the format your definition gives, with a first line that names the task and says done, blocked, or escalated. Your plain text output reaches nobody.
Teammates you may message directly, by name: <list from the table>. Send results and questions only, never your reasoning. Do not message anyone else.
You edit only: <owned files, or "nothing">. Never commit, never open a pull request.
When you have no claimable task and no pending message, go idle and wait. Do not invent work.
When team-lead sends a shutdown request, reply with a shutdown_response that approves it.

Design source: <figmaUrl or mockupPath>
Target: <target>
Design spec: <specPath>
Development standard: <standardsDir>/uiux-development-standard.md
Review standard: <standardsDir>/uiux-code-review-standard.md
Dev server: <url, or "none, static method">
Caps: 3 fidelity passes per gate, 3 review rounds
```

Role-specific lines to append:

- **extractor:** Project root is the working directory. Write the spec to the spec path. Send `team-lead` the summary data your definition lists. Then stay available: answer questions from `builder` about the spec, update the spec when the answer changes it, and tell `builder`, `validator`, and `team-lead` in one line what changed.
- **builder:** Start in build mode when task 2 is claimable. Ask `extractor` when a spec item is ambiguous rather than guess. When done, send `filesChanged`, `summary`, `blockers` to `team-lead` and send `validator` one message: "Ready for validation, pass <n>" with the file list. In refine mode, work only from the delta or finding list in the message you receive, send the same data plus `disputed` to `team-lead`, and notify `validator` again.
- **validator:** Validate when `builder` says it is ready. Number your passes. Send the full verdict (`method`, `matches`, `deltas`, `specGaps`, `notChecked`, `summary`) to `team-lead` on every pass. When `matches` is false and the pass number is below the cap, also send the `deltas` list, nothing else, to `builder` so it can start fixing at once. At the cap, send deltas to `team-lead` only.
- **reviewer-\*:** Dimension is `structure`, `accessibility`, or `consistency` with the sections from your definition. Review the file list in your task. Send `findings` to `team-lead` and to `verifier`, with your dimension and the round number.
- **verifier:** Verify every finding you receive from the three reviewers, one at a time. When all three dimensions of a round have arrived and are verified, send `team-lead` one message: `confirmed` (each with `adjustedSeverity`) and `refuted` (each with `reason`), tagged with the round number.
- **packager:** Package when task 8 is claimable. The message assigning it carries the fidelity report, the review result, the disputed list, the file list, and the delivery root.

Tell the user in one line that the team is running and which teammates are live. Then wait for messages. Messages from teammates arrive on their own; never poll with `ListAgents`, never send "are you done?", and never start doing a teammate's work because it is slow.

## 6. Lead the gates

Keep a running record: files changed (union of every `filesChanged`), blockers, disputed items, open spec questions, fidelity pass count, review round count, the latest fidelity verdict, and the latest review result.

**Extraction.** When `extractor` reports `blockers`, the run is `blocked`. Shut the team down and report. Otherwise the builder's task is unblocked automatically; nothing for you to do but record the open questions.

**Gate 1, "Matches design?"** passes when the validator's verdict has `matches` true and zero `blocking` deltas.
- Pass: create tasks 4 to 7 with the current file list, spawn wave 2.
- Fail, pass count below 3: create "Refine: fidelity pass N" for the builder. The validator has already sent it the deltas; if it did not (cap, or a dropped message), send the delta list yourself. Then create the next validation task. Do not forward the validator's reasoning, only the deltas.
- Fail at pass 3: status `escalated` at gate `fidelity`. Shut down and report.

**Gate 2, "Approved?"** passes when the verifier's confirmed list has no Critical or High finding. Medium and Low never block; keep them as advisory.
- Pass: create task 8 with the fidelity report, review result, and disputed list, spawn `packager`. With `--no-package`, status is `ready-for-human-review` now.
- Fail, round below 3: send the builder the confirmed findings as "Refine: review round N" (Critical and High to fix; Medium and Low listed for context, fix only when trivial and local; dispute with evidence instead of arguing). A review fix can move pixels, so after the builder reports, run gate 1 again from pass 1 with a new validation task, and only then create round N+1 review tasks for the three reviewers and the verifier.
- Fail at round 3: status `escalated` at gate `review`. Shut down and report.

**Packaging.** When `packager` reports `folder`, status is `ready-for-human-review`.

A teammate that reports `blocked` or sends nothing within a reasonable time is a blocked run, not a reason to do its work yourself. Check `ListAgents` once, resend the assignment once, and if it still fails, report `blocked` with the stage.

## 7. Shut the team down

Send each live teammate a `shutdown_request` by name, confirm with `ListAgents` that none remain, and use `TaskStop` by name on any that do not stop. Do this on every exit path: ready, escalated, or blocked.

## 8. Report the result

Report for the user:

- **Status** first: ready for human review, escalated at which gate, or blocked.
- **Design match** second, from the latest fidelity verdict: write `Perfect match` when `matches` is true and `deltas` is empty. Otherwise write `Does not perfectly match: N unmatched items` and list every item, `blocking` first then `minor`, one line each as Area, expected, actual, file. Never summarise the list or drop minor items. Then list `specGaps` and `notChecked` so the reader knows what the comparison did not cover.
- **Delivery folder**, when the status is ready: its absolute path, the preview method, and any packager notes such as a compile failure or states that need the live app. Tell the user to open `index.html` in that folder to see the UI.
- **Files changed**, as a list of clickable paths.
- **Fidelity method**: rendered or static, and that a static result is weaker evidence.
- **Match report file**: when a delivery folder exists, point to its `FIDELITY-REPORT.md`. When it does not (escalated, blocked after build, or `--no-package`), write the same report yourself to `.claude/fidelity-report.md` using the format in the ui-packager agent definition, and give its path.
- **Review**: advisory Medium and Low findings, each as Finding and Recommendation in one or two lines.
- **Disputed** findings the builder declined, with its reason, so the user can rule on them.
- **Open spec questions** from the extractor.
- **Team log**: one line per gate decision you made, with the pass or round number, so the user can see how the loop went.
- **Next step**: the user reviews the diff, then commits and opens the PR. Never commit or open a PR from this command.

If the status is escalated, lead with what remains and why the loop stopped, so the user can decide whether to accept, fix by hand, or change the spec.
