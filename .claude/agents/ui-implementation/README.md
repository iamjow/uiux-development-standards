# UI implementation team

The six agents in this folder are one agent team that automates the Figma-to-code
workflow: Figma MCP data and a PNG reference go in, together with the mobile and tablet
frames the designer hands over in their own Figma sections, HTML + SCSS + JavaScript comes
out, and nothing is called complete until visual QA, behavior QA, responsive QA, and code
review all pass.
The main session is the team lead. It spawns the teammates by name, puts the work on a
shared task list, merges QA findings, decides the gates, and reports. It never analyzes,
builds, validates, or reviews anything itself.

Each definition ends with an "On the team" section that names the teammate, who it may
message, and what it may edit. Two teammates never edit the same file. The developer is
the only teammate that edits implementation code. QA teammates report findings; they
never fix them.

| Agent | Teammate name | Role | Edits | Runs when |
|---|---|---|---|---|
| mockup-analyst | `analyst` | Reads the Figma MCP data, the PNG reference, and each breakpoint frame, and writes the design spec: layout, dimensions, spacing, padding, colors, typography, assets, breakpoints and their overrides, interaction states. Then answers questions about the spec | the spec file | First; on call afterwards |
| ui-developer | `developer` | Implements the spec as HTML + SCSS + JS at every breakpoint, desktop as the base with every responsive style in `styles/responsive/`, following the development standard and project conventions; in fix mode resolves only the merged findings list the lead sends | the target files under the build location | After analysis, and after every failed QA gate |
| visual-qa-engineer | `visual-qa` | Compares the rendered build at the desktop breakpoint with the desktop frame, the PNG, and the spec; reports layout, spacing, dimension, color, font, and alignment deltas with the fix needed | nothing | After every build or fix pass, in parallel with the other QA engineers |
| behavior-qa-engineer | `behavior-qa` | Exercises every interaction, state, navigation, and keyboard path in the spec, at every breakpoint; reports functional issues and missing behaviours | nothing | After every build or fix pass, in parallel with the other QA engineers |
| responsive-qa-engineer | `responsive-qa` | Compares the build at the tablet and mobile breakpoints with their frames, sweeps the widths in between, and checks derived breakpoints against section 8 of the development standard; reports order, wrapping, visibility, overflow, and touch-target deltas per breakpoint | nothing | After every build or fix pass, in parallel with the other QA engineers |
| ui-code-reviewer | `reviewer` | Reviews the QA-passed implementation for quality, maintainability, accessibility, conventions, bugs, and regressions against the code review standard | nothing | After all three QA engineers pass |

## Breakpoint frames

Designers hand over the desktop and mobile (and sometimes tablet) versions of a screen as
separate frames in separate Figma sections. The analyst's sibling search never leaves the
desktop frame's section, so the other frames must be passed in explicitly: `/build-ui`
takes them as `--mobile` and `--tablet`, each a Figma URL with a `node-id` or a PNG path.
A breakpoint with no frame is still built and checked; it is marked `derived` in the spec,
implemented from the section 8 defaults, and reported as "no design to compare" rather
than as a match.

## Workflow the lead runs

```
Mockup analysis ──► UI development ──► Visual QA ─────┐
                                       Behavior QA ───┼──► merged findings ──► Developer fixes ──► Revalidation (all QA) ─┐
                                       Responsive QA ─┘                                                                   │
                          ▲                                                                                               │
                          └────────────────────────────── loop while any blocking finding remains, capped ◄───────────────┘
                                                                     │
                                                              all QA pass
                                                                     │
                                                                     ▼
                                                           Final code review ──► approved, or fix round ──► back to QA
```

1. **Mockup analysis.** `analyst` writes the spec. If it reports `blockers`, the run is blocked; stop and report.
2. **UI development.** `developer` builds every breakpoint from the spec and tells the three QA engineers it is ready.
3. **Visual QA, Behavior QA, and Responsive QA** run in parallel on the same pass and each send a full verdict to the lead.
4. **Developer fixes.** The lead merges the visual `deltas`, the behavior `issues`, and the responsive `deltas` into one fix list, tagged `visual`, `behavior`, or `responsive`, and creates a "Fix: pass N" task for `developer`. Only the lead sends findings to the developer, so the three QA streams never produce conflicting instructions.
5. **Revalidation.** After every fix pass all three QA engineers run again from the full spec, not just the fixed items, because a fix at one width can move pixels at another and a visual fix can break a handler.
6. **Final code review.** `reviewer` runs once all three QA verdicts have `matches` true. Critical and High findings go back to `developer` as a fix round, followed by full revalidation and a new review round. Medium and Low are advisory.

## Gates and caps

- **QA gate** passes when `visual-qa`, `behavior-qa`, and `responsive-qa` all report `matches` true with zero blocking items on the same pass. Cap: 3 QA passes (2 fix passes). At the cap the run is `escalated` at the QA gate.
- **Review gate** passes when `reviewer` reports `approved` true. Cap: 3 review rounds. At the cap the run is `escalated` at the review gate.
- **Derived is not matched.** A breakpoint with no frame is checked against section 8, and the report says "no design to compare" for it, never "matches".
- **Unverified is not passed.** Anything any QA engineer lists under `notChecked` is reported as `unverified` with the reason. A run with unverified items is `ready-for-human-review with unverified items`, never `complete`. A `static` method is reported as weaker evidence than `rendered`.
- **Pixel-perfect** is claimed only when the final visual `deltas` list is empty, including minor items. Otherwise the report lists every unmatched item, blocking first.

## Task list

| # | Task title | Claimed by | Blocked by |
|---|---|---|---|
| 1 | Analyze mockup | analyst | |
| 2 | Implement UI | developer | 1 |
| 3 | Visual QA, pass 1 | visual-qa | 2 |
| 4 | Behavior QA, pass 1 | behavior-qa | 2 |
| 5 | Responsive QA, pass 1 | responsive-qa | 2 |
| 6 | Fix: pass N | developer | created by the lead when a QA gate fails, with the merged findings |
| 7 | Visual QA, pass N / Behavior QA, pass N / Responsive QA, pass N | visual-qa, behavior-qa, responsive-qa | 6 |
| 8 | Code review, round N | reviewer | created by the lead when the QA gate passes |

Put every input a task needs in its description (spec path, standards paths, target, Figma URL, PNG path, breakpoint list with each one's source, dev server URL), because teammates do not see the lead's conversation.

## Spawn brief

Spawn with the Agent tool: `subagent_type` set to the agent name, `name` set to the teammate name, `run_in_background` true. Spawn `analyst`, `developer`, `visual-qa`, `behavior-qa`, and `responsive-qa` at the start, and `reviewer` when the QA gate passes. Every spawn prompt starts with this brief, filled in, followed by the inputs the agent's own definition lists.

```
You are a teammate on the UI implementation team. Your name is <name>. The team lead is `team-lead`.
Task list mode: <shared | file>. In shared mode claim your task with the task tools, set it in progress, and mark it completed when you send your result. In file mode the lead assigns work by message and tracks status.
Report every result to team-lead with SendMessage, as data in the format your definition gives, with a first line that names the task and says done, blocked, or escalated. Your plain text output reaches nobody.
Teammates you may message directly, by name: <list from the table>. Send results and questions only, never your reasoning. Do not message anyone else.
You edit only: <owned files, or "nothing">. Never commit, never open a pull request.
When you have no claimable task and no pending message, go idle and wait. Do not invent work.
When team-lead sends a shutdown request, reply with a shutdown_response that approves it.

Design source (desktop): <figmaUrl>
PNG reference: <pngPath>
Breakpoints: desktop <w>px, source <design source> | tablet <w>px, source <figma url, png, or "derived"> | mobile <w>px, source <figma url, png, or "derived">
Target: <target, for example build/<kebab-frame-name>/>
Design spec: <specPath, default .claude/design-spec.md>
Development standard: <standardsDir>/uiux-development-standard.md
Review standard: <standardsDir>/uiux-code-review-standard.md
Dev server: <url, or "none, static method">
Caps: 3 QA passes, 3 review rounds
```

Prerequisites are the same as for `/build-ui`: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in `.claude/settings.local.json`, `SendMessage` and `ListAgents` loaded with ToolSearch, and the task tools loaded for shared mode (file mode uses `.claude/team-tasks.md`, written only by the lead).

## Report

- **Status** first: complete, ready for human review with unverified items, escalated at which gate, or blocked.
- **Visual match**: `Pixel-perfect` only when the final visual deltas list is empty; otherwise every unmatched item, blocking first, one line each as area, expected, actual, file.
- **Responsive match**, per breakpoint: matches its frame, derived with no design to compare, or every unmatched item the same way with its breakpoint.
- **Behaviour match**: every open issue the same way.
- **Unverified**: every `notChecked` item from the three QA engineers with its reason, and each one's comparison method (`rendered` or `static`).
- **Review**: advisory Medium and Low findings; disputed findings with the developer's reason.
- **Open spec questions** from the analyst.
- **Files changed** as clickable paths, and a one-line-per-decision team log.
- **Next step**: the user reviews the diff, then commits and opens the PR. The team never commits.

Outputs land in `build/<frame>/` (the source of truth for converted UIs) and `.claude/design-spec.md`.
This team is run by the `/build-ui` command (`.claude/skills/build-ui/SKILL.md`), which is
both the command and the lead's playbook. It uses these six agents and no others.
