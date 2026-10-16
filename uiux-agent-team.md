# UIUX Agent Team

The agent team automates the Figma-to-code process: a design goes in, implemented UI comes out, and two gates stand between them. It runs on Claude Code's Agent Teams feature: the main session is the team lead, the six agent definitions are the teammates, work sits on a shared task list, and teammates talk to each other directly.

The team lives in `.claude/agents/design-to-ui-implementation/`. The process lives in `.claude/skills/build-ui/SKILL.md`, which is both the command and the team lead's playbook.

---

## Shape

```
                 ┌─────────────────────────────┐
                 │  Main session (team lead)   │  spawns the team, creates tasks,
                 └──────────────┬──────────────┘  decides both gates, reports
                                │
                 ┌──────────────▼──────────────┐
                 │      Shared task list       │  Extract → Build → Validate →
                 └──┬─────────┬─────────┬──────┘  Review ×3 → Verify → Package
                    │         │         │          (refine tasks added on failure)
              ┌─────▼───┐ ┌───▼─────┐ ┌─▼───────┐
              │extractor│◄►│ builder │◄►│validator│   claim tasks, do the work,
              └─────────┘ └─────────┘ └─────────┘   message each other and the lead
              ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ ┌────────┐
              │reviewer- │ │reviewer- │ │reviewer- │►│verifier│ │packager│
              │structure │ │access.   │ │consist.  │ └────────┘ └────────┘
              └──────────┘ └──────────┘ └──────────┘
```

## Process

```
Figma design
    │
    ▼
extractor ──► design spec file ◄── builder asks, extractor answers and updates
    │
    ▼
builder (build) ◄── uiux-development-standard.md
    │  "ready for validation"
    ▼
validator ──► Matches design? ── NO ──► deltas straight to builder (refine) ──┐
    │                                                                        │
   YES ◄─────────────────────────────────────────────────────────────────────┘
    │                                        (loop, capped at 3 passes)
    ▼
reviewer ×3 ──► findings to verifier ──► confirmed list to lead ◄── uiux-code-review-standard.md
    │
    ▼
Approved? ── NO ──► lead sends confirmed findings to builder ──► validator ──► back to review
    │                                        (loop, capped at 3 rounds)
   YES
    │
    ▼
packager ──► finished UI folder
    │
    ▼
Ready for human review, commit, and PR
```

Two deliberate rules:

1. **Refinement always returns through fidelity validation.** A fix for a review finding can move pixels, so the build is re-validated before it is re-reviewed.
2. **Both loops are capped.** When a cap is reached the lead stops the team and hands the remaining deltas or findings to a human instead of looping forever.

---

## Team

| Teammate | Agent type | Role | Edits | Messages |
|---|---|---|---|---|
| `extractor` | `design-extractor` | Designer handing over the spec, then on call for questions | The spec file | lead, builder, validator |
| `builder` | `ui-builder` | Front-end developer; the only one who edits application code | Target files | lead, extractor, validator |
| `validator` | `fidelity-validator` | Design QA; sends deltas straight to the builder | Nothing | lead, builder |
| `reviewer-structure`, `reviewer-accessibility`, `reviewer-consistency` | `code-reviewer` | Senior reviewer, one per dimension | Nothing | lead, verifier |
| `verifier` | `review-verifier` | Skeptic; tries to refute every finding | Nothing | lead, reviewers |
| `packager` | `ui-packager` | Release coordinator | The delivery folder | lead |

The team lead is the main session. It owns the task list, the pass and round counters, and both gate decisions. It never does a teammate's work.

### How teammates interact

- Work moves forward as artifacts: spec file, file list, delta list, findings list. Teammates send each other results, never reasoning, so each verdict stays independent.
- The builder can ask the extractor about an ambiguous spec item. The extractor answers from Figma and, if the spec changes, tells the builder, validator, and lead.
- The validator sends its delta list directly to the builder, so a refine pass starts without a round trip through the lead. The full verdict always goes to the lead, which counts passes and decides the gate.
- Reviewers send findings to the verifier and the lead. The verifier sends the confirmed and refuted lists to the lead. Only the lead passes confirmed findings to the builder.
- Disagreement has one channel. In refine mode the builder may decline a finding and return it under `disputed` with evidence. It does not argue with the reviewer. Disputed items go to the human at the end.
- No two teammates edit the same file.

### Gate rules

| Gate | Passes when | On failure |
|---|---|---|
| Matches design? | Zero blocking deltas per section 15 of the development standard | Builder refines from the delta list, validator re-validates |
| Approved? | Zero confirmed Critical or High findings per section 23 of the review standard | Builder refines from the confirmed findings, re-validate fidelity, re-review |

Medium and Low findings never block. They are returned as advisory for the human reviewer.

---

## Running it

From a Claude Code session in the target project, with these standards available in the project (copied, submoduled, or pointed to with `--standards`):

```
/build-ui <figma-url | image-path> <what to build and where> [--server <url>] [--standards <dir>] [--out <dir>] [--no-package]
```

Examples:

```
/build-ui https://www.figma.com/design/ABC123/App?node-id=45-678 Login page at resources/js/Pages/Auth/Login.vue
/build-ui design/checkout-card.png Checkout summary card component in resources/js/Components/Checkout --server http://localhost:5173
```

| Input | Required | Default | Purpose |
|---|---|---|---|
| Figma URL | one of the two | | Figma design URL including `node-id` |
| Image path | one of the two | | Mockup image when there is no Figma file. Values are extracted with reduced confidence. |
| Target | yes | | What to build and where: page, component, route, parent |
| `--standards` | no | `.` | Folder containing the two standard files |
| `--spec` | no | `.claude/design-spec.md` | Where the extractor writes the spec |
| `--server` | no | none | A running app so the validator can take real screenshots. Without it the validator falls back to a static comparison and says so. |
| `--out` | no | `$HOME/Desktop` | Where the finished UI folder is created |
| `--no-package` | no | off | Skip the finished UI folder |

Caps are fixed at 3 fidelity passes per gate and 3 review rounds.

The team never commits or opens a pull request. The run ends in one of three states:

- `ready-for-human-review`: both gates passed. The report lists files changed, advisory findings, minor deltas, disputed items, and the delivery folder.
- `escalated`: a loop cap was reached. The report says which gate and what remains.
- `blocked`: the extractor could not read the design, or a teammate stopped responding.

### The finished UI folder

When both gates pass, the `packager` creates a folder named `<slug>-<date>`, for example `~/Desktop/login-page-2026-10-14/`. It never overwrites an existing folder; a second run the same day gets a `-2` suffix.

```
login-page-2026-10-14/
  index.html          standalone preview, opens in a browser with no build step
  styles/             compiled styles.css plus the SCSS sources and tokens used
  scripts/            JavaScript the preview needs, if any
  assets/             icons, images, fonts
  src/                exact copies of the project files changed, at their repo paths
  design-spec.md      the spec the UI was built from
  REQUIREMENTS.md     section 14 checklist marked off, fidelity and review results, open questions
  FIDELITY-REPORT.md  does the UI match the mockup, and every unmatched item
  README.md           what this is, how to open it, where each file came from
```

For Vue or React components the preview is a static rendering of the template with the spec's content. States that need the live app are listed in README. The files in `src/` are the source of truth; the preview is a snapshot.

### Using agents on their own

Each agent also works outside the team. Mention it by name in a Claude Code session, for example asking the `code-reviewer` to review the current diff for the `accessibility` dimension, or the `fidelity-validator` to check a component against a spec. Used this way it runs as an ordinary subagent and the main session holds the loop.

---

## Requirements

- **Agent Teams enabled.** `.claude/settings.local.json` must contain `"env": {"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"}`. The feature is experimental and needs an interactive session; under `claude -p` named spawns run as plain subagents and no team forms.
- **Shared task list tools.** On current models the `TaskCreate`, `TaskList`, `TaskUpdate`, and `TaskGet` tools are off by default. Add `"CLAUDE_CODE_ENABLE_TODO_TOOLS": "1"` to the same `env` block. The VS Code extension also launches Claude Code with `CLAUDE_CODE_ENABLE_TASKS=0`, which swaps the shared list for a private TodoWrite; add `"CLAUDE_CODE_ENABLE_TASKS": "1"` to the env block to override it. Without both, the lead keeps the task list in `.claude/team-tasks.md` and teammates coordinate by message only, which works but loses self-claiming.
- **Session restart after edits.** Agent definitions and skills load when a session starts. After editing anything in `.claude/agents` or `.claude/skills`, start a new session before running `/build-ui`.
- **Figma access.** Agents that must reach the Figma connector (`design-extractor`, `fidelity-validator`) have no `tools:` whitelist. A whitelist hides the connector's tools from the agent, and in the current build it also drops Glob, Grep, and ToolSearch. Their read-only behaviour is enforced by instruction, not by tool restriction.
- The Figma MCP connector, authorized in Claude Code. Without it the extractor reports a blocker, or extracts from a supplied image with reduced confidence.
- For rendered validation: a running dev server and Playwright or Puppeteer available in the project. Without them the validator uses the static method.
- The two standard files reachable from the project.
- **Cost.** Each teammate is a separate Claude instance. A full run spawns up to eight. The lead spawns them in three waves so reviewers and the packager are not idling during extraction and build.

## History

Until 2026-10-15 this process ran as a scripted Workflow (`figma-to-ui.js`), with the gates decided in code. It was replaced by the Agent Teams model so the lead can coordinate live, teammates can message each other, and the task list is visible while the run is in progress. The retired script is kept at `.claude/workflows/retired/figma-to-ui.js` for reference and is not registered as a workflow.
