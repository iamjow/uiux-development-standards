# Fix Playbook

How to fix each kind of finding from a `/validate-uiux` report. The rules live in the standards; this file covers the order and technique. When a recipe and the standard disagree, the standard wins.

- **Dev** = `uiux-development-standard.md`
- **Review** = `uiux-code-review-standard.md`

---

## 1. Phases

Fix in this order. Structural changes rewrite the files that later fixes touch, so fixing markup before structure means doing it twice.

| Phase | Findings | Typical rules |
|---|---|---|
| 1. Structure | `STACK` findings; `SCSS` architecture, token, and responsive findings | Dev §1, §4, §7, §8, §9, §12, §13 |
| 2. Markup | `MARKUP` findings | Dev §2, §3, §5, §6; Review §1–8, §12–16, §18, §21 |
| 3. Accessibility | `A11Y` findings | Dev §3, §10; Review §9–11, §17, §19 |
| 4. Cleanups | Remaining Medium and Low findings | Any |

A merged finding that names several specialists goes in the earliest phase it touches.

---

## 2. Recipes

### Phase 1: Structure

| Finding | Fix |
|---|---|
| Banned framework or CSS-in-JS (Dev §1) | Remove the dependency, CDN tag, config files, and directives. Replace every framework class with a meaningful kebab-case class (Dev §6) styled in the owning partial with tokens. Match the old look closely. Leave no framework class names behind; grep for them afterward. |
| Plain CSS file (Dev §1, §4) | Move each rule into the partial that owns its selector, convert literals to tokens, `@use` the partial from the entry, then delete the `.css` file and its `<link>`. |
| No partial structure, or everything in one file (Dev §4, §7) | Create `_variables.scss`, `_mixins.scss` (breakpoint mixins), and `_global.scss`. Split the rest by selector ownership into `components/`, `layouts/` (header, sidebar, content, footer), and `pages/`. The entry file only `@use`s partials. In a framework project, keep component-scoped SCSS (rubric §2) and import the shared partials into it. |
| Per-breakpoint file, or raw media queries (Dev §4, §8) | Move each responsive rule into the partial that owns the selector, using the breakpoint mixins. Delete the per-breakpoint file and its import. Check the cascade: a responsive rule must come after the base rule it overrides. |
| Raw color, font, spacing, radius, or shadow (Dev §9) | Reuse an existing token with the same value. Otherwise add one to `_variables.scss`, named by role (`$color-text-muted`, not `$gray-2`). Define brand tokens once and delete any redefinitions. |
| Static `style` attribute or embedded `<style>` (Dev §1; Review §20) | Move the declarations to a class in the owning partial. Keep dynamic bindings for runtime values. |
| Inline handler, embedded script, or `javascript:` URL (Dev §12; Review §20) | Move the behavior into a JS module that binds with `addEventListener`, hooked by a class or `data-` attribute, and load it with `<script type="module" src>`. In a framework project, use the framework's event binding. Replace `javascript:` links with the correct element (see phase 2). |
| `innerHTML` with data (rubric §3) | Use `textContent`, or build nodes with DOM APIs. |
| JavaScript not modular (Dev §12) | Split by feature into modules imported from one entry. Remove globals. |
| browserslist (Dev §13) | Set it to `defaults, not IE 11`. |
| Missing doctype or charset, obsolete elements (Dev §2) | Add `<!DOCTYPE html>` and `<meta charset="utf-8">`. Replace obsolete elements with semantic ones styled in SCSS. |

### Phase 2: Markup

| Finding | Fix |
|---|---|
| Clickable `div` or `span`, `href="#"`, `<a>` without `href`, button used for navigation (Review §7) | Navigation becomes `<a href>`. An action becomes `<button type="button">`. Remove click handlers from containers and never nest interactive elements. If the whole card must be clickable, use a stretched link from the title, with any buttons layered above it. |
| Generic element for a landmark (Review §1) | Use `header`, `nav`, `main`, `footer`, `aside`, `section`, `article`. Keep the existing classes so the styles still apply. |
| Heading levels (Review §4) | Restore a logical order with one `h1` per page. Move visual sizing to classes. |
| List or table built from `div`s (Review §13, §14) | Use `ul`/`ol` and `li`. For tables: `table`, `caption`, `thead`/`tbody`, and `th scope`. Reset list styles in the component partial. |
| Button without `type` in a form (Review §8) | `type="submit"` for the submit action, `type="button"` for everything else. |
| Wrong input type (Review §12) | Follow Review §12, including its `inputmode` and `pattern` guidance for codes. |
| `<br>` or empty elements for spacing (Review §15, §16) | Delete them and add spacing in SCSS with tokens. |
| Unnecessary wrapper (Review §2) | Remove it only if it fails all three tests. Update any selector that referenced it. |
| Duplicate implementations (Dev §5; Review §21) | Consolidate onto one class set and one partial. Express variants as modifiers (`button--secondary`). |
| Naming, IDs, design-export class names (Dev §6; Review §5, §6) | Rename to meaningful kebab-case. Grep every reference in HTML, SCSS, and JS before and after renaming. Style with classes, not IDs. |

### Phase 3: Accessibility

| Finding | Fix |
|---|---|
| `lang`, viewport zoom, skip link (Dev §10) | Add `lang`. Remove `user-scalable` and `maximum-scale`. Add a skip link as the first focusable element, pointing at `<main id="main" tabindex="-1">`. |
| Missing or unassociated label (Dev §3; Review §11) | Add a visible `<label for>` matching a unique `id`. A placeholder can stay as a hint, but not as the label. |
| Radio or checkbox group (Review §11) | Wrap in `fieldset` with a `legend`. |
| Required fields, `autocomplete` (Dev §10) | Add `required` and explain the indicator in text. Add `autocomplete` tokens to identity fields. |
| Errors not announced (Dev §10; Review §11) | Visible message text, `aria-invalid="true"`, linked with `aria-describedby`, and focus moved to the first invalid field or announced with `role="alert"`. The message names the field and how to fix it. |
| Icon-only control, SVG (Review §10) | Add an accessible name (`aria-label` or visually hidden text). Decorative SVGs get `aria-hidden="true" focusable="false"`. |
| Alt text (Review §9) | Describe the image's content or purpose. When you can't see the image, write the best description the context supports and list it under "Needs a decision". Decorative images get `alt=""`. |
| Focus indicator (Dev §10) | Remove `outline: none`, or replace it with a `:focus-visible` ring built from tokens that meets the Dev §10 contrast. |
| Contrast (Dev §10) | Change the token value rather than individual uses. Compute the new ratio and record it as a visible change. |
| Target size (Dev §10) | Set `min-width`/`min-height` from a target-size token. Primary touch actions get the larger size. |
| Status messages (Dev §10) | A `role="status"` (or `role="alert"`) container present from page load. Write messages into it with `textContent`. |
| Modal (Dev §10 component contracts) | Use `<dialog>` opened with `showModal()`, named with `aria-labelledby`, with a close button. Return focus to the opener on `close`. |
| Tabs, menus, other widgets (Dev §10 component contracts) | Implement the WAI-ARIA pattern Dev §10 describes, including its keyboard handlers. Prefer native elements first. |
| `tabindex` > 0, `aria-hidden` on focusable content, Label in Name (Review §17, §19) | Remove positive `tabindex`. Remove `aria-hidden` from focusable content, or hide the content properly. Make every `aria-label` contain the visible text, or remove it. |
| Redundant ARIA (Review §17) | Remove it. |
| Motion (Dev §10) | Wrap non-essential animation in `@media (prefers-reduced-motion: no-preference)`, through a mixin. |
| Units (Dev §10) | Use `rem` tokens for type and spacing. |

---

## 3. Guardrails

- **Change only what the finding needs.** No unrelated refactoring (Review §22).
- **Keep copy, URLs, routes, and features.** Do not add features or dependencies.
- **Keep the visual design** unless a rule requires a visible change (contrast, focus ring, target size). List every visible change in the summary.
- **Don't introduce new violations.** No inline styles, no literals outside `_variables.scss`, no ARIA that duplicates native semantics, no new IDs used for styling.
- **Grep before renaming or deleting** a class, ID, or file. Grep again afterward to confirm nothing still points at the old name.
- **Content you can't know** (real alt text, legal copy, error wording the business owns): write a best-effort version and list it under "Needs a decision".
- **Unselected findings:** fix one only when a selected fix can't be done without it, and record it as "fixed alongside F-n".
