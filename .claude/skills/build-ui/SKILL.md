---
name: build-ui
description: Run the UI implementation agent team on a mockup. Takes a Figma URL or a mockup image path plus a short description of what to build, optionally the mobile and tablet frames from their own Figma sections, and leads the team (analyst, developer, visual QA, behavior QA, responsive QA, code reviewer) through the QA gate and the code review gate.
argument-hint: <figma-url | image-path> <what to build and where> [--mobile <figma-url | image-path>] [--tablet <figma-url | image-path>] [--breakpoints <desktop>,<tablet>,<mobile>] [--png <path>] [--server <url>] [--standards <dir>] [--spec <path>]
disable-model-invocation: true
---

The user ran `/build-ui` with these arguments:

```
$ARGUMENTS
```

You are the team lead. You spawn the team, put the work on the shared task list, let the teammates claim tasks and talk to each other, merge the QA findings, decide the two gates, and report. You never analyze, build, validate, or review anything yourself. Follow these steps exactly.

## 1. Parse the arguments

- **Design source** is the first token: the desktop frame, the primary mockup. If it contains `figma.com`, it is `figmaUrl`. Otherwise it is `pngPath` and must point to an existing image file. Check that the file exists. If it does not, tell the user and stop.
- **Target** is everything after the first token that is not a flag. It describes what to build and where. Converted UIs normally go in `build/<kebab-frame-name>/`. If the target is empty, ask the user one question: "What should be built, and in which file or directory?" Do not guess a location.
- **Flags**, all optional:
  - `--mobile <figma-url | image-path>`: the mobile frame of the same screen. Designers hand it over in its own Figma section, so it is never found from the desktop frame; it must be passed here. A Figma URL must include a `node-id`. An image path must exist.
  - `--tablet <figma-url | image-path>`: the tablet frame, same rules.
  - `--breakpoints <desktop>,<tablet>,<mobile>`: viewport widths in px. Default `1440,768,375`. A Figma breakpoint source overrides its entry with the frame's real width once the analyst reports it.
  - `--png <path>`: PNG reference of the desktop mockup, used alongside a Figma URL. Check that the file exists.
  - `--server <url>`: dev server URL for rendered QA checks
  - `--standards <dir>`: folder holding `uiux-development-standard.md` and `uiux-code-review-standard.md`
  - `--spec <path>`: where the design spec is written. Default `.claude/design-spec.md`.

## 2. Resolve defaults and prerequisites

- **Team.** This process uses only the agents defined in `.claude/agents/ui-implementation/`: mockup-analyst, ui-developer, visual-qa-engineer, behavior-qa-engineer, responsive-qa-engineer, ui-code-reviewer. Confirm all six files exist there with Glob. If any is missing, tell the user which one and stop. Do not substitute any other agent, including agents defined elsewhere under `.claude/agents/`.
- **Breakpoint list.** Build it from `--breakpoints` or the default: `desktop <w>`, `tablet <w>`, `mobile <w>`. Attach the source to each: the design source for desktop, `--tablet` and `--mobile` for the others, `derived` for a breakpoint with no source. Tell the user in one line which breakpoints have a frame and which will be derived from section 8 of the development standard. Every breakpoint is built and checked either way.
- **Agent Teams.** Run `echo $CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`. If it is not `1`, tell the user to add `"env": {"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"}` to `.claude/settings.local.json`, start a new session, and run the command again. Stop. Never fall back to a scripted workflow.
- **Messaging tools.** Load `SendMessage` and `ListAgents` with ToolSearch (`select:SendMessage,ListAgents`).
- **Shared task list.** Load the task tools with ToolSearch (`select:TaskCreate,TaskList,TaskUpdate,TaskGet`). If they load, the team uses the shared task list. If they do not, tell the user in one line that adding `"CLAUDE_CODE_ENABLE_TODO_TOOLS": "1"` and `"CLAUDE_CODE_ENABLE_TASKS": "1"` to the same `env` block enables the shared list (the VS Code extension sets the second one to `0`), then continue in **file mode**: you keep the list in `.claude/team-tasks.md` (one line per task: id, title, owner, status, blocked-by), only you write to it, and teammates report status to you by message instead of updating tasks. Say in the spawn brief which mode is in use.
- **Standards dir.** If `--standards` is absent, locate `uiux-development-standard.md` with Glob and use its folder. If it is not in the project, tell the user the standards must be copied in and stop.
- **Dev server.** If `--server` is absent, probe the project's usual ports with a short curl: Vite (5173), Laravel (8000), and whatever `vite.config` or `.env` names. Use the first URL that responds. If none responds, say in one line that the QA checks will use the static method, and continue without a server.
- **Figma.** If any source is a Figma URL, confirm it includes a `node-id`. If not, ask the user to copy the link with the frame selected, and stop.
- **Caps.** QA gate: at most 3 QA passes per gate (so at most 2 fix passes). Review gate: at most 3 review rounds (so at most 2 review fix rounds).

## 3. The team

| Teammate name | Agent type | Owns (the only files it edits) | Talks to |
|---|---|---|---|
| `analyst` | mockup-analyst | the spec file | `team-lead`, `developer`, `visual-qa`, `behavior-qa`, `responsive-qa` |
| `developer` | ui-developer | the target files under the build location | `team-lead`, `analyst`, `visual-qa`, `behavior-qa`, `responsive-qa` |
| `visual-qa` | visual-qa-engineer | nothing | `team-lead`, `analyst` |
| `behavior-qa` | behavior-qa-engineer | nothing | `team-lead`, `analyst` |
| `responsive-qa` | responsive-qa-engineer | nothing | `team-lead`, `analyst` |
| `reviewer` | ui-code-reviewer | nothing | `team-lead` |

You are addressed as `team-lead`. Two teammates never edit the same file. The developer is the only teammate that edits implementation code. The three QA teammates split the work: visual QA owns the desktop frame's pixels and states, behavior QA owns interactions at every breakpoint, responsive QA owns layout at the tablet and mobile breakpoints and at every width in between. QA teammates report findings to you only; you are the only one who sends findings to the developer, so the three QA streams never produce conflicting instructions.

## 4. Create the task list

Create these tasks before spawning anyone, with the dependencies shown. Put the inputs each task needs in its description (spec path, standards paths, target, design source, PNG path, breakpoint list with sources, dev server URL), because teammates do not see this conversation.

| # | Task title | Claimed by | Blocked by |
|---|---|---|---|
| 1 | Analyze mockup | analyst | |
| 2 | Implement UI | developer | 1 |
| 3 | Visual QA, pass 1 | visual-qa | 2 |
| 4 | Behavior QA, pass 1 | behavior-qa | 2 |
| 5 | Responsive QA, pass 1 | responsive-qa | 2 |
| 6 | Code review, round 1 | reviewer | QA gate passed (you create it then) |

Fix tasks are created by you when a gate fails: "Fix: pass N" (QA gate) or "Fix: review round N" (review gate), claimed by the developer and carrying the merged findings list, followed by new "Visual QA, pass N", "Behavior QA, pass N", and "Responsive QA, pass N" tasks. Review tasks for a later round are new tasks with the round number in the title.

## 5. Spawn the team

Spawn with the Agent tool: `subagent_type` set to the agent type, `name` set to the teammate name, `run_in_background` true. With Agent Teams enabled a named spawn is a teammate, not a subagent. Spawn in two waves so the reviewer does not sit idle:

1. **At start:** `analyst`, `developer`, `visual-qa`, `behavior-qa`, `responsive-qa`.
2. **When the QA gate passes:** `reviewer`.

Every spawn prompt starts with the team brief below, filled in, followed by the teammate's own inputs from its agent definition.

```
You are a teammate on the UI implementation team. Your name is <name>. The team lead is `team-lead`.
Task list mode: <shared | file>. In shared mode claim your task with the task tools, set it in progress, and mark it completed when you send your result. In file mode the lead assigns work by message and tracks status.
Report every result to team-lead with SendMessage, as data in the format your definition gives, with a first line that names the task and says done, blocked, or escalated. Your plain text output reaches nobody.
Teammates you may message directly, by name: <list from the table>. Send results and questions only, never your reasoning. Do not message anyone else.
You edit only: <owned files, or "nothing">. Never commit, never open a pull request.
When you have no claimable task and no pending message, go idle and wait. Do not invent work.
When team-lead sends a shutdown request, reply with a shutdown_response that approves it.

Design source (desktop): <figmaUrl or pngPath>
PNG reference: <pngPath, or "none">
Breakpoints: desktop <w>px, source <design source> | tablet <w>px, source <--tablet value, or "derived"> | mobile <w>px, source <--mobile value, or "derived">
Target: <target>
Design spec: <specPath>
Development standard: <standardsDir>/uiux-development-standard.md
Review standard: <standardsDir>/uiux-code-review-standard.md
Dev server: <url, or "none, static method">
Caps: 3 QA passes per gate, 3 review rounds
```

Role-specific lines to append:

- **analyst:** Project root is the working directory. Write the spec to the spec path. Extract every breakpoint source into the Breakpoints and Breakpoint overrides tables; a breakpoint with no source is `derived`. Send `team-lead` the summary data your definition lists, including `breakpoints` with each frame's real width. Then stay available: answer questions from `developer`, `visual-qa`, `behavior-qa`, and `responsive-qa` about the spec, update the spec when the answer changes it, and tell those three, `responsive-qa`, and `team-lead` in one line what changed.
- **developer:** Start in build mode when task 2 is claimable. Build every breakpoint in the spec's Breakpoints table, with desktop as the base and every responsive style in `styles/responsive/` through the shared mixins. Ask `analyst` when a spec item is ambiguous rather than guess. When done, send `filesChanged`, `summary`, `blockers`, `checksRun` to `team-lead` and send `visual-qa`, `behavior-qa`, and `responsive-qa` one message each: "Ready for validation, pass <n>" with the file list. In fix mode, work only from the merged findings list in the task `team-lead` created, send the same data plus `disputed` to `team-lead`, and notify all three QA engineers again.
- **visual-qa:** Validate the desktop frame and its states when `developer` says a pass is ready. Number your passes within the current gate. Send the full verdict (`method`, `pass`, `matches`, `deltas`, `specGaps`, `notChecked`, `summary`) to `team-lead` on every pass. Never send findings to `developer`.
- **behavior-qa:** Validate when `developer` says a pass is ready. Number your passes within the current gate. Send the full verdict (`method`, `pass`, `matches`, `issues`, `specGaps`, `notChecked`, `summary`) to `team-lead` on every pass. Never send findings to `developer`.
- **responsive-qa:** Validate every breakpoint other than desktop, and the widths between breakpoints, when `developer` says a pass is ready. Number your passes within the current gate. Send the full verdict (`method`, `pass`, `matches`, `deltas`, `derivedBreakpoints`, `specGaps`, `notChecked`, `summary`) to `team-lead` on every pass. Never send findings to `developer`.
- **reviewer:** Review when a "Code review, round N" task is claimable. The task carries the file list and the round number. Send `round`, `approved`, `findings`, `checksRun`, `summary` to `team-lead`. An empty findings list is still a message.

When the analyst reports `breakpoints`, update your breakpoint list with each frame's real width and send the corrected line to `developer`, `visual-qa`, `behavior-qa`, and `responsive-qa` in one message if it differs from the brief.

Tell the user in one line that the team is running and which teammates are live. Then wait for messages. Messages from teammates arrive on their own; never poll with `ListAgents`, never send "are you done?", and never start doing a teammate's work because it is slow.

## 6. Lead the gates

Keep a running record: files changed (union of every `filesChanged`), blockers, disputed items, open spec questions, QA pass count, review round count, the latest visual, behaviour, and responsive verdicts, and the latest review result.

**Analysis.** When `analyst` reports `blockers`, the run is `blocked`. Shut the team down and report. Otherwise the developer's task is unblocked automatically; nothing for you to do but record the open questions and the breakpoint widths.

**QA gate, "Matches design at every breakpoint and behaves as designed?"** is decided only when all three QA verdicts for the same pass have arrived. It passes when `visual-qa`, `behavior-qa`, and `responsive-qa` each report `matches` true with zero `blocking` items.
- Pass: create the code review task with the current file list and the round number, spawn `reviewer`.
- Fail, pass count below 3: merge the visual `deltas`, the behaviour `issues`, and the responsive `deltas` into one fix list, each item tagged `visual`, `behavior`, or `responsive` (responsive items keep their `breakpoint`), blocking items first. Create "Fix: pass N" for the developer carrying that list and nothing else. Do not forward any QA engineer's reasoning. Then create "Visual QA, pass N+1", "Behavior QA, pass N+1", and "Responsive QA, pass N+1".
- Fail at pass 3: status `escalated` at gate `qa`. Shut down and report.

**Review gate, "Approved?"** passes when the reviewer reports `approved` true, which means no Critical or High finding. Medium and Low never block; keep them as advisory.
- Pass: status `ready-for-human-review`, or `complete` when nothing is unverified (see below).
- Fail, round below 3: create "Fix: review round N" for the developer carrying the Critical and High findings to fix, with Medium and Low listed for context (fix only when trivial and local; dispute with evidence instead of arguing). A review fix can move pixels at any width or break a handler, so after the developer reports, run the QA gate again from pass 1 with new Visual, Behavior, and Responsive QA tasks, and only then create the "Code review, round N+1" task.
- Fail at round 3: status `escalated` at gate `review`. Shut down and report.

**Unverified is not passed.** Anything any QA engineer lists under `notChecked` is `unverified`. A run with unverified items ends as `ready-for-human-review with unverified items`, never `complete`. A `static` method is weaker evidence than `rendered` and is reported as such. A `derived` breakpoint was checked against section 8 of the standard, not against a design, and is reported as such.

A teammate that reports `blocked` or sends nothing within a reasonable time is a blocked run, not a reason to do its work yourself. Check `ListAgents` once, resend the assignment once, and if it still fails, report `blocked` with the stage.

## 7. Shut the team down

Send each live teammate a `shutdown_request` by name, confirm with `ListAgents` that none remain, and use `TaskStop` by name on any that do not stop. Do this on every exit path: complete, ready, escalated, or blocked.

## 8. Report the result

Write the QA result to `.claude/fidelity-report.md` first, so it survives the session: verdict on the first line (`PIXEL-PERFECT`, `MATCHES WITHIN TOLERANCE`, or `DOES NOT MATCH`), the comparison method for each QA engineer, the breakpoint list with each one's source, a table of every visual delta, every responsive delta (with its breakpoint), and every behaviour issue (blocking first; columns Breakpoint, Area, Expected, Actual, Severity, File), then spec gaps and not-checked items. Never drop an item.

Then report for the user:

- **Status** first: complete, ready for human review with unverified items, escalated at which gate, or blocked.
- **Visual match** second, from the latest visual verdict: write `Pixel-perfect` only when `matches` is true and `deltas` is empty, including minor items. Otherwise write `Does not perfectly match: N unmatched items` and list every item, `blocking` first then `minor`, one line each as Area, expected, actual, file. Never summarise the list or drop minor items.
- **Responsive match**, from the latest responsive verdict, per breakpoint: `Matches frame` when its deltas are empty and it had a frame, `Derived from section 8, no design to compare` when it was derived, otherwise every item, blocking first, one line each as Breakpoint, area, expected, actual, file.
- **Behaviour match**, from the latest behaviour verdict, the same way: every open issue, blocking first.
- **Unverified**: every `notChecked` item from all three QA engineers with its reason, and each engineer's method (`rendered` or `static`, with a static result called out as weaker evidence). Then `specGaps` from all three, so the reader knows what the comparison did not cover.
- **Files changed**, as a list of clickable paths. Converted UIs live in `build/<frame>/`; tell the user to open its `index.html` to see the UI.
- **Match report file**: the path to `.claude/fidelity-report.md`.
- **Review**: advisory Medium and Low findings, each as Finding and Recommendation in one or two lines.
- **Disputed** findings the developer declined, with its reason, so the user can rule on them.
- **Open spec questions** from the analyst, including any breakpoint that was derived because no frame was passed.
- **Team log**: one line per gate decision you made, with the pass or round number, so the user can see how the loop went.
- **Next step**: the user reviews the diff, then commits and opens the PR. Never commit or open a PR from this command.

If the status is escalated, lead with what remains and why the loop stopped, so the user can decide whether to accept, fix by hand, or change the spec.
