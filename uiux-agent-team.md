# UIUX Agent Team

The agent team automates the Figma-to-code process: a design goes in, implemented UI comes out, and two gates stand between them. It runs on Claude Code's Agent Teams feature: the main session is the team lead, the six agent definitions are the teammates, work sits on a shared task list, and teammates talk to each other directly.

The team lives in `.claude/agents/ui-implementation/`. The process lives in `.claude/skills/build-ui/SKILL.md`, which is both the command and the team lead's playbook.

---

## Shape

```
                 ┌─────────────────────────────┐
                 │  Main session (team lead)   │  spawns the team, creates tasks,
                 └──────────────┬──────────────┘  merges QA findings, decides both
                                │                 gates, reports
                 ┌──────────────▼──────────────┐
                 │      Shared task list       │  Analyze → Implement → Visual QA +
                 └──┬─────────┬───────┬────────┘  Behavior QA + Responsive QA →
                    │         │       │            Code review (fix tasks on failure)
              ┌─────▼───┐ ┌───▼──────┐│
              │ analyst │◄►│developer ││          claim tasks, do the work,
              └─────────┘ └──────────┘│          message each other and the lead
                    ▲                  │
       ┌────────────┼──────────────────┼───────────────┐
 ┌─────┴─────┐ ┌────┴────────┐ ┌───────┴───────┐ ┌─────▼────┐
 │ visual-qa │ │ behavior-qa │ │ responsive-qa │ │ reviewer │
 └───────────┘ └─────────────┘ └───────────────┘ └──────────┘
```

## Process

```
Figma desktop frame (+ PNG) + mobile / tablet frames from their own sections
    │
    ▼
analyst ──► design spec file ◄── developer and QA ask, analyst answers and updates
    │
    ▼
developer (build, every breakpoint) ◄── uiux-development-standard.md
    │  "ready for validation"
    ├──────────────┬───────────────┐
    ▼              ▼               ▼
visual-qa     behavior-qa    responsive-qa     (all three run on the same pass)
    │              │               │
    └──────────────┼───────────────┘
                   ▼
lead merges deltas + issues ──► QA gate: all match? ── NO ──► "Fix: pass N" to developer ───┐
               │                                                                            │
              YES ◄─────────────────────────────────────────────────────────────────────────┘
               │                                        (loop, capped at 3 passes)
               ▼
reviewer ──► Approved? ◄── uiux-code-review-standard.md
               │
               ├── NO ──► "Fix: review round N" to developer ──► all QA again ──► next review round
               │                                        (loop, capped at 3 rounds)
              YES
               │
               ▼
Ready for human review, commit, and PR
```

Three deliberate rules:

1. **Only the lead sends findings to the developer.** Visual QA, Behavior QA, and Responsive QA each send a full verdict to the lead, which merges them into one fix list tagged `visual`, `behavior`, or `responsive`. The three QA streams never give the developer conflicting instructions.
2. **A fix always returns through all three QA checks.** A fix at one width can move pixels at another and a visual fix can break a handler, so after every fix pass all three engineers revalidate from the full spec, and a review fix is revalidated before it is re-reviewed.
3. **Both loops are capped.** When a cap is reached the lead stops the team and hands the remaining findings to a human instead of looping forever.

---

## Team

| Teammate | Agent type | Role | Edits | Messages |
|---|---|---|---|---|
| `analyst` | `mockup-analyst` | Reads the Figma MCP data, the PNG reference, the related frames, each breakpoint frame, and the prototype wiring; writes the spec; then on call for questions | The spec file | lead, developer, visual-qa, behavior-qa, responsive-qa |
| `developer` | `ui-developer` | Implements the spec as HTML + SCSS + JS at every breakpoint; the only one who edits implementation code; in fix mode resolves only the merged list the lead sends | Target files | lead, analyst, visual-qa, behavior-qa, responsive-qa |
| `visual-qa` | `visual-qa-engineer` | Compares the rendered build at desktop with the desktop frame, the PNG, and the spec: layout, spacing, dimensions, colors, fonts, alignment | Nothing | lead, analyst |
| `behavior-qa` | `behavior-qa-engineer` | Exercises every interaction, state, navigation, and keyboard path in the spec, at every breakpoint | Nothing | lead, analyst |
| `responsive-qa` | `responsive-qa-engineer` | Compares the build at tablet and mobile with their frames, sweeps the widths in between, checks derived breakpoints against section 8 | Nothing | lead, analyst |
| `reviewer` | `ui-code-reviewer` | Reviews the QA-passed build for quality, accessibility, conventions, bugs, and regressions | Nothing | lead |

The team lead is the main session. It owns the task list, the pass and round counters, the merged fix list, and both gate decisions. It never does a teammate's work.

### How teammates interact

- Work moves forward as artifacts: spec file, file list, delta list, issue list, findings list. Teammates send each other results, never reasoning, so each verdict stays independent.
- The developer and the three QA engineers can ask the analyst about an ambiguous spec item. The analyst answers from Figma or the PNG and, if the spec changes, tells the developer, the QA engineers, and the lead.
- The developer tells the three QA engineers when a pass is ready so they start at once. Each sends its full verdict to the lead only.
- The reviewer talks to the lead only. It never negotiates with the developer.
- Disagreement has one channel. In fix mode the developer may decline a finding and return it under `disputed` with evidence. It does not argue with QA or the reviewer. Disputed items go to the human at the end.
- No two teammates edit the same file.

### Gate rules

| Gate | Passes when | On failure |
|---|---|---|
| QA gate | `visual-qa`, `behavior-qa`, and `responsive-qa` all report `matches` true with zero blocking items on the same pass, per section 15 of the development standard | Developer fixes from the merged list, all three QA engineers revalidate |
| Review gate | `reviewer` reports `approved` true: zero Critical or High findings per section 23 of the review standard | Developer fixes the Critical and High findings, all three QA engineers revalidate, reviewer re-reviews |

Medium and Low findings never block. They are returned as advisory for the human reviewer.

**Derived is not matched.** A breakpoint with no frame is built from section 8 of the development standard and reported as "no design to compare", never as a match.

**Unverified is not passed.** Anything any QA engineer lists under `notChecked` is reported as unverified with the reason. A run with unverified items ends as `ready-for-human-review with unverified items`, never `complete`. A `static` comparison is reported as weaker evidence than a `rendered` one. **Pixel-perfect** is claimed only when the final visual deltas list is empty, including minor items.

---

## Running it

From a Claude Code session in the target project, with these standards available in the project (copied, submoduled, or pointed to with `--standards`):

```
/build-ui <figma-url | image-path> <what to build and where> [--mobile <figma-url | image-path>] [--tablet <figma-url | image-path>] [--breakpoints <desktop>,<tablet>,<mobile>] [--png <path>] [--server <url>] [--standards <dir>] [--spec <path>]
```

Examples:

```
/build-ui https://www.figma.com/design/ABC123/App?node-id=45-678 Login page in build/login-page/ --mobile https://www.figma.com/design/ABC123/App?node-id=91-204
/build-ui https://www.figma.com/design/ABC123/App?node-id=45-678 Login page in build/login-page/ --mobile https://www.figma.com/design/ABC123/App?node-id=91-204 --tablet https://www.figma.com/design/ABC123/App?node-id=91-310 --server http://localhost:5173
/build-ui design/checkout-card.png Checkout summary card component in build/checkout-card/ --mobile design/checkout-card-mobile.png
```

The desktop frame is the first argument. The mobile and tablet frames live in their own Figma sections, so select each one in Figma, copy its link, and pass it with `--mobile` or `--tablet`. There is no need to copy the frames into the desktop section. A PNG export works in place of a URL, with values marked `estimated`. A breakpoint with no frame is still built and checked, from the section 8 defaults, and reported as derived.

| Input | Required | Default | Purpose |
|---|---|---|---|
| Figma URL | one of the two | | Figma design URL including `node-id` |
| Image path | one of the two | | Mockup image when there is no Figma file. Values are extracted with reduced confidence and marked `estimated`. |
| Target | yes | | What to build and where. Converted UIs go in `build/<frame>/`. |
| `--mobile` | no | derived | The mobile frame: Figma URL with `node-id`, or PNG path |
| `--tablet` | no | derived | The tablet frame: Figma URL with `node-id`, or PNG path |
| `--breakpoints` | no | `1440,768,375` | Viewport widths for desktop, tablet, mobile; a Figma frame's real width overrides its entry |
| `--png` | no | none | PNG reference of the desktop mockup, used alongside a Figma URL |
| `--standards` | no | `.` | Folder containing the two standard files |
| `--spec` | no | `.claude/design-spec.md` | Where the analyst writes the spec |
| `--server` | no | none | A running app so the QA engineers can render and drive the page. Without it they fall back to a static comparison and say so. |

Caps are fixed at 3 QA passes per gate and 3 review rounds.

The team never commits or opens a pull request. The run ends in one of four states:

- `complete`: both gates passed and nothing is unverified.
- `ready-for-human-review with unverified items`: both gates passed, but a QA engineer could not check something. The report lists each item and why.
- `escalated`: a loop cap was reached. The report says which gate and what remains.
- `blocked`: the analyst could not read the design, or a teammate stopped responding.

### Outputs

- `build/<frame>/` in the repo: the source of truth for every converted UI. Open its `index.html` to see the result.
- `.claude/design-spec.md`: the spec the build was made from.
- `.claude/fidelity-report.md`: whether the UI matches the mockup at every breakpoint and behaves as designed, every unmatched item, and what was not checked.
- `.claude/team-tasks.md`: the task list, only when the shared task list tools are unavailable.

### Using agents on their own

Each agent also works outside the team. Mention it by name in a Claude Code session, for example asking the `ui-code-reviewer` to review the current diff, or the `visual-qa-engineer` to check a component against a spec. Used this way it runs as an ordinary subagent and the main session holds the loop.

---

## Requirements

- **Agent Teams enabled.** `.claude/settings.local.json` must contain `"env": {"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"}`. The feature is experimental and needs an interactive session; under `claude -p` named spawns run as plain subagents and no team forms.
- **Shared task list tools.** On current models the `TaskCreate`, `TaskList`, `TaskUpdate`, and `TaskGet` tools are off by default. Add `"CLAUDE_CODE_ENABLE_TODO_TOOLS": "1"` to the same `env` block. The VS Code extension also launches Claude Code with `CLAUDE_CODE_ENABLE_TASKS=0`, which swaps the shared list for a private TodoWrite; add `"CLAUDE_CODE_ENABLE_TASKS": "1"` to the env block to override it. Without both, the lead keeps the task list in `.claude/team-tasks.md` and teammates coordinate by message only, which works but loses self-claiming.
- **Session restart after edits.** Agent definitions and skills load when a session starts. After editing anything in `.claude/agents` or `.claude/skills`, start a new session before running `/build-ui`.
- **Figma access.** Agents that must reach the Figma connector (`mockup-analyst`, `visual-qa-engineer`, `behavior-qa-engineer`, `responsive-qa-engineer`) have no `tools:` whitelist. A whitelist hides the connector's tools from the agent, and in the current build it also drops Glob, Grep, and ToolSearch. Their read-only behaviour is enforced by instruction, not by tool restriction.
- The Figma MCP connector, authorized in Claude Code. Without it the analyst reports a blocker, or extracts from a supplied image with reduced confidence.
- For rendered QA: a running dev server and Playwright or Puppeteer available in the project. Without them the QA engineers use the static method.
- The two standard files reachable from the project.
- **Cost.** Each teammate is a separate Claude instance. A full run spawns six. The lead spawns the reviewer only after the QA gate passes so it is not idling during analysis and build.

## History

Until 2026-10-15 this process ran as a scripted Workflow (`figma-to-ui.js`), with the gates decided in code. It was replaced by the Agent Teams model so the lead can coordinate live, teammates can message each other, and the task list is visible while the run is in progress. The retired script is kept at `.claude/workflows/retired/figma-to-ui.js` for reference and is not registered as a workflow.

Until 2026-10-26 the team was the six-agent "design to UI implementation" team (extractor, builder, fidelity validator, three code reviewers with a verifier, packager) in `.claude/agents/design-to-ui-implementation/`. It was replaced by the UI implementation team, which splits fidelity QA into visual, behaviour, and responsive engineers, uses one code reviewer, takes the mobile and tablet frames as explicit inputs, and keeps the delivered UI in `build/<frame>/` instead of a Desktop delivery folder.
