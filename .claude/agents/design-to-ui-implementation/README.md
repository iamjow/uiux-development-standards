# Design to UI implementation team

The six agents in this folder are one agent team, led by the main session through the
`/build-ui` command (`.claude/skills/build-ui/SKILL.md`). The command spawns them as
named teammates, puts the work on a shared task list, and decides the two gates. It uses
these agents and no others. Each definition ends with an "On the team" section that names
the teammate, who it may message, and what it may edit.

| Agent | Teammate name(s) | Role | Runs when |
|---|---|---|---|
| design-extractor | `extractor` | Reads the Figma frame, its related frames (states, dropdowns, modals), and its prototype wiring and writes `.claude/design-spec.md`; then answers the builder's questions | First; on call afterwards |
| ui-builder | `builder` | Implements the spec as HTML + SCSS + JS in `build/<frame>/`; in refine mode fixes only the delta list from the validator or the confirmed findings from the lead | After extraction, and after each failed gate |
| fidelity-validator | `validator` | Compares the build with Figma and the spec using the tolerance rules in the dev standard; sends deltas straight to the builder and the verdict to the lead | After every build or refine pass (gate 1) |
| code-reviewer | `reviewer-structure`, `reviewer-accessibility`, `reviewer-consistency` | Reviews the build against one dimension of the code review standard | Three in parallel after gate 1 passes |
| review-verifier | `verifier` | Tries to refute each finding it receives from the reviewers; sends the confirmed list to the lead | On every finding (gate 2) |
| ui-packager | `packager` | Copies the approved build into a dated delivery folder with the preview, sources, and reports | After both gates pass |

Outputs:

- `build/<frame>/` in the repo: the source of truth for every converted UI.
- `.claude/design-spec.md`: the spec the build was made from.
- `.claude/fidelity-report.md` or `<delivery>/FIDELITY-REPORT.md`: whether the UI matches the mockup, and every unmatched item.
- `.claude/team-tasks.md`: the task list, only when the shared task list tools are unavailable.

Other processes (for example `/review-standards`) keep their own agents elsewhere
under `.claude/agents/` and do not use this folder.
