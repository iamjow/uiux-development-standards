# UIUX Code Review Standards

## Objective

Ensure that UI code is clean, semantic, accessible, maintainable, and consistent with the existing project.

These standards are intended for UI/UX code review of existing implementations.

The goal is to identify unnecessary, incorrect, inconsistent, or poor-quality markup and recommend focused improvements without introducing unnecessary refactoring.

The existing project's framework, component structure, CSS/SCSS architecture, naming conventions, and established patterns should be respected.

SCSS architecture, design tokens, folder structure, and framework choice are governed by the UIUX Development Standard and are deliberately out of scope here. This document reviews markup, accessibility, and inline styling and scripting only.

---

## 1. Semantic HTML

Verify that HTML elements are used according to their meaning and purpose.

Check whether appropriate semantic elements are used when applicable:

- `header`
- `nav`
- `main`
- `section`
- `article`
- `aside`
- `footer`
- `form`
- `button`
- `table`
- `ul`
- `ol`
- `select`
- `details` / `summary`

Flag generic elements when a more appropriate semantic element should be used.

### Example

**Flag:**

```html
<div class="header">
    <div class="navigation">
        ...
    </div>
</div>
```

**Recommend:**

```html
<header>
    <nav>
        ...
    </nav>
</header>
```

Do not require semantic elements when there is no meaningful semantic equivalent.

---

## 2. Excessive or Unnecessary Elements

Check for unnecessary HTML elements, especially excessive wrapper `div` and `span` elements.

Flag elements that:

- Provide no structural purpose
- Provide no styling purpose
- Provide no functional purpose
- Are only used to create spacing
- Duplicate an existing container
- Add unnecessary DOM depth

### Example

**Flag:**

```html
<div class="card">
    <div class="card-wrapper">
        <div class="card-content">
            <div class="card-title-wrapper">
                <h3>Product Name</h3>
            </div>
        </div>
    </div>
</div>
```

When the wrappers are unnecessary, recommend a simpler structure:

```html
<article class="card">
    <h3 class="card-title">Product Name</h3>
</article>
```

Do not flag a wrapper if it has a legitimate layout, styling, component, or functional purpose.

A wrapper is unnecessary when all of the following are true:

- Removing it changes no rendered output.
- No selector, script, or test hook targets it.
- It is not a framework component root, slot, or template container.

When flagging a wrapper, state which of these checks it failed.

---

## 3. DOM Structure and Nesting

Review whether the DOM hierarchy is logical and maintainable.

Check for:

- Unnecessarily deep nesting
- Redundant containers
- Incorrect parent-child relationships
- Elements placed inside inappropriate elements
- Duplicated structural elements

Prefer the simplest DOM structure that accurately represents the UI.

Do not recommend restructuring working markup unless there is a clear benefit.

---

## 4. Headings

Check heading hierarchy.

Verify that:

- Headings represent actual content hierarchy.
- Heading levels are logically ordered.
- Headings are not used only for visual styling.
- Heading levels are not changed simply to achieve a desired font size.

Use CSS for visual appearance rather than using an incorrect heading level.

---

## 5. Classes

Review whether classes are meaningful and purposeful.

Good classes should describe:

- Component
- Content
- Function
- State
- Layout role

**Prefer:**

```html
<button class="product-filter-button">
```

**over:**

```html
<button class="blue-button">
```

Flag a visual class only when it is the element's sole identity, as in `blue-button` above. Modifier classes such as `button--large` and utility classes from the project's established system are not findings.

Also check for:

- Duplicate classes
- Unnecessary classes
- Meaningless class names
- Classes that are not used
- Classes added without a clear purpose

Follow the existing project's established naming convention.

---

## 6. IDs

Check whether IDs are necessary and used appropriately.

IDs are appropriate when a unique identifier is required, such as associating a label with a form control:

```html
<label for="email">Email</label>
<input id="email" type="email">
```

Flag IDs used unnecessarily for styling when a class should be used instead.

Do not require replacing existing IDs when they serve a legitimate functional purpose.

---

## 7. Buttons vs Links

Verify that interactive elements use the correct HTML element.

Use `<button>` for actions:

```html
<button type="button">
    Save Changes
</button>
```

Use `<a>` for navigation:

```html
<a href="/profile">
    View Profile
</a>
```

**Flag:**

- Clickable `div` elements used as buttons
- Clickable `span` elements used as buttons
- Links used for non-navigation actions
- Buttons used for pure navigation to a URL
- `<a>` without `href`, or with `href="#"` or `javascript:`, used as a button

Do not flag:

- A submit button that navigates after the form is processed
- A button that performs work (validation, saving) and then navigates
- Router links that render an `<a>` with an `href`
- An `<a download>` styled as a button

Prefer native interactive elements over recreating their behavior with generic elements.

---

## 8. Button Type

Check that buttons inside forms have an explicit and appropriate `type`.

**Examples:**

```html
<button type="button">
    Cancel
</button>

<button type="submit">
    Save
</button>
```

A button without a `type` defaults to `submit`. Flag buttons inside a form, or associated with one through the `form` attribute, that omit `type`.

---

## 9. Images and Alt Text

Check every `<img>` for an appropriate `alt` attribute.

Meaningful images should describe their content or purpose:

```html
<img
    src="product-image.jpg"
    alt="Black running shoes"
>
```

Flag unhelpful alt text such as:

- `alt="image"`
- `alt="photo"`
- `alt="img123.jpg"`

Decorative images should use:

```html
alt=""
```

Flag missing `alt` attributes.

Do not require descriptive alt text for purely decorative images.

---

## 10. Icon Accessibility

Check icon-only interactive controls.

An icon-only button should have an accessible name:

```html
<button type="button" aria-label="Close">
    <svg aria-hidden="true" focusable="false">
        ...
    </svg>
</button>
```

Flag icon-only controls that have no accessible name.

Decorative and icon SVGs inside a labelled control should carry `aria-hidden="true" focusable="false"`. A standalone informative SVG needs `role="img"` and an accessible name.

If visible text already provides the accessible name, avoid unnecessary duplicate ARIA labels.

Follow the project's existing icon implementation.

---

## 11. Forms

Check that form controls have accessible labels.

**Prefer:**

```html
<label for="first-name">First Name</label>

<input
    id="first-name"
    name="first-name"
    type="text"
>
```

Flag inputs that rely only on placeholder text when a proper label is required.

Also check:

- Correct label associations: `for` points at a unique `id`, or the label wraps the control. Placeholder, `title`, and adjacent text are not labels.
- Radio and checkbox groups use `fieldset` and `legend`.
- Appropriate input types
- Required fields: the control has the `required` attribute and the required indicator is explained in text, not by an asterisk or color alone.
- Error messages: the message is visible text, not color or an icon alone; the control has `aria-invalid="true"`; the message is linked with `aria-describedby`; the error is announced with `role="alert"` or focus moves to the first invalid field or an error summary; the message identifies the field and how to fix it.
- Identity fields (name, email, phone, address) have `autocomplete`.

---

## 12. Input Types

Verify that the appropriate native input type is used.

**Examples:**

```html
<input type="email">
<input type="password">
<input type="search">
<input type="tel">
<input type="url">
```

Flag use of `type="text"` when a more appropriate native input type is clearly applicable.

Use `type="number"` only for true quantities. For identifiers, codes, phone numbers, and postcodes, prefer `type="text"` with `inputmode="numeric"` and a `pattern`, since `type="number"` strips leading zeros and changes value on scroll.

Do not require `type="date"`. Native date inputs render inconsistently across browsers and often conflict with the project's date picker.

Do not recommend changing the input type when project-specific functionality requires the existing type.

---

## 13. Lists

Check whether content that is logically a list uses list elements.

**Prefer:**

```html
<ul>
    <li>Option One</li>
    <li>Option Two</li>
</ul>
```

**or:**

```html
<ol>
    <li>Step One</li>
    <li>Step Two</li>
</ol>
```

Flag multiple generic elements when the content clearly represents a semantic list.

---

## 14. Tables

Check whether tabular data uses a semantic `<table>`.

Verify appropriate use of:

- `table`
- `thead`
- `tbody`
- `tr`
- `th`
- `td`

**Example:**

```html
<table>
    <caption>Team members</caption>
    <thead>
        <tr>
            <th scope="col">Name</th>
            <th scope="col">Status</th>
        </tr>
    </thead>

    <tbody>
        <tr>
            <th scope="row">John Doe</th>
            <td>Active</td>
        </tr>
    </tbody>
</table>
```

Data tables should have a `caption` or `aria-labelledby`. Row headers use `th scope="row"`.

Flag `td` used as a header cell and `th` without `scope` in tables with both row and column headers.

Flag tables used purely for page layout.

---

## 15. Empty Elements

Flag unnecessary empty elements such as:

```html
<div></div>

<span></span>

<p></p>
```

unless they have a legitimate styling, functional, or structural purpose.

Do not use empty elements solely for spacing.

---

## 16. `<br>` Usage

Flag `<br>` elements used only for layout or spacing.

**Avoid:**

```html
<h2>Product Title</h2>
<br>
<br>
<p>Description</p>
```

Spacing should be handled by the project's styling system.

A `<br>` is appropriate when an actual line break is part of the content.

---

## 17. ARIA

Check whether ARIA is necessary and correctly applied.

Do not add ARIA when native HTML already provides the required semantics.

Flag unnecessary patterns such as:

```html
<button
    role="button"
    aria-label="Button"
>
    Save
</button>
```

A native `<button>` already provides button semantics. The `aria-label` here also replaces the visible name "Save" with "Button", which breaks voice control and fails WCAG 2.5.3 Label in Name.

Flag any `aria-label` that does not contain the element's visible text. When visible text exists, prefer no `aria-label` at all.

Review ARIA attributes such as:

- `aria-label`
- `aria-labelledby`
- `aria-describedby`
- `aria-expanded`
- `aria-selected`
- `aria-controls`
- `aria-hidden`

for correctness and necessity.

Do not flag valid ARIA simply because it is present.

---

## 18. Native HTML vs Custom Implementation

Prefer native HTML behavior when it satisfies the requirement.

**Examples:**

- `<button>` instead of clickable `div`
- `<a>` instead of clickable `span`
- `<input>` instead of manually simulated text fields
- `<select>` when a native select meets the requirement
- `<details>` / `<summary>` when appropriate

Only recommend custom implementations when the design or project requirements require them.

---

## 19. Keyboard Accessibility

Verify that every interactive element can be reached and operated with a keyboard alone.

Check for:

- Every control is reachable with Tab in DOM order.
- Buttons activate on Enter and Space. Links activate on Enter.
- Composite widgets (tabs, menus, listboxes) use Arrow keys per WAI-ARIA Authoring Practices.
- Custom interactive elements have a `role`, `tabindex="0"`, and key handlers.
- Focus is visible on every focusable element.
- Modals trap focus while open, close on Escape, and return focus to the opener.
- Focus moves to new content when the interaction expects it (opened dialog, error summary).

**Flag:**

- `tabindex` greater than 0
- `aria-hidden="true"` on a focusable element or its ancestor
- Clickable `div` or `span` without role, `tabindex`, and key handling
- `outline: none` or `outline: 0` without a `:focus-visible` replacement
- Mouse-only handlers with no keyboard equivalent
- Keyboard traps

**Flag:**

```html
<div class="dropdown-trigger" onclick="toggleMenu()">
    Options
</div>
```

**Recommend:**

```html
<button type="button" aria-expanded="false" aria-controls="options-menu">
    Options
</button>
```

Do not flag `tabindex="-1"` used to make a container programmatically focusable, or custom widgets that already implement the APG keyboard pattern.

---

## 20. Inline Styles and Scripts

Check that styling and behavior live in the project's stylesheets and scripts, not in the markup.

**Flag:**

- HTML `style` attributes with static values
- `<style>` blocks embedded in templates
- Inline event handlers (`onclick`, `onchange`) and `<script>` blocks embedded in templates
- `href="javascript:"`

**Flag:**

```html
<div style="margin-top: 20px; color: #333;">
```

**Recommend:**

```html
<div class="section-intro">
```

Do not flag:

- Dynamic style bindings for runtime-computed values (a progress width, a drag position, a CSS custom property set from data)
- Framework-native scoped styles the project already uses
- Framework event bindings (`@click`, `onClick={}`), which are not inline handlers

---

## 21. Existing Project Consistency

Code review must consider the existing project's conventions.

Check whether the implementation:

- Reuses existing components where appropriate
- Follows existing class naming conventions
- Follows existing markup patterns
- Uses established UI components
- Uses existing utilities
- Avoids introducing a different implementation pattern for the same UI

Do not flag code simply because it differs from a generic convention if the existing project has an established and valid pattern.

---

## 22. Scope of Review

Focus the review on the requested UI change.

Rank findings using the priority order in the Important section at the end of this document.

Do not turn a code review into a full refactoring exercise.

Avoid recommending unrelated changes.

---

## 23. Review Severity

Severity is determined by user impact, not by which section the finding comes from.

### Critical

The issue blocks a task for some users, or breaks functionality.

**Examples:**

- Broken interactive behavior or invalid markup that breaks functionality
- A primary control that cannot be reached or operated with a keyboard
- A form control with no accessible label
- `aria-hidden="true"` on main content or on a focusable element
- A viewport meta that blocks zoom (`user-scalable=no`, `maximum-scale=1`)
- An icon-only control with no accessible name
- A keyboard trap, including a modal that does not return focus
- `aria-label` that replaces the visible text with a different name
- Status, error, or success messages that are never announced to assistive technology

### High

The issue degrades the experience for some users but a workaround exists. Fix before approval.

**Examples:**

- Clickable `div` or `span` used as a secondary interactive control
- Skipped heading levels or a page with no `h1`
- Links used for actions, or buttons used for pure navigation
- Missing `type` on a button inside a form
- Unhelpful alt text on a meaningful image
- Missing semantic list or table structure for content that is clearly a list or table

### Medium

No user impact. The issue affects maintainability or clarity.

**Examples:**

- Excessive DOM nesting
- Unnecessary wrapper elements
- Headings used for visual size only, with hierarchy still correct
- Poor or purely visual class naming
- Unnecessary ARIA that duplicates native semantics

### Low

Minor cleanup.

**Examples:**

- Minor redundant markup
- Unnecessary class
- Unnecessary `<br>` or empty element

---

## 24. Code Review Comment Format

When identifying an issue, provide:

- **Finding** — Clearly explain what is wrong.
- **Why** — Explain why it matters.
- **Recommendation** — Provide a concise recommended improvement.

### Example

**Finding:** The button does not define a `type` attribute.

**Why:** When used inside a form, the browser may treat it as a submit button by default.

**Recommendation:** Define the intended button type.

```html
<button type="button">
    Cancel
</button>
```

Keep review comments specific and actionable.

---

## 25. Avoid False Positives

Do not flag code simply because:

- A `div` is used.
- A class name does not match a generic naming convention.
- A wrapper exists.
- ARIA is present.
- A custom component is used.
- An existing project pattern differs from generic HTML examples.

Before raising a finding, determine whether the element has a legitimate structural, styling, functional, framework, or project-specific purpose. For wrappers, apply the three-part test in section 2. For other findings, state the purpose you looked for and could not find.

Review examples in this document use plain HTML. In Vue, React, Blade, or similar templates, a component root element, a slot container, or a wrapper the framework requires is not a finding.

Only report issues that have a clear reason for improvement.

---

## 26. Final Code Review Checklist

### HTML Structure

- [ ] Semantic elements are used appropriately.
- [ ] DOM hierarchy is logical.
- [ ] No unnecessary wrapper elements.
- [ ] No unnecessary `div` or `span` elements.
- [ ] No excessive DOM nesting.
- [ ] No empty elements without purpose.
- [ ] Heading hierarchy is logical.

### Classes and IDs

- [ ] Classes have meaningful purposes.
- [ ] No unnecessary classes.
- [ ] No meaningless or purely visual class names where a semantic name is more appropriate.
- [ ] IDs are used only when necessary.
- [ ] Existing naming conventions are followed.

### Accessibility

- [ ] Meaningful images have appropriate alt text.
- [ ] Decorative images use `alt=""`.
- [ ] Form controls have accessible labels.
- [ ] Icon-only controls have accessible names.
- [ ] Decorative SVGs have `aria-hidden="true" focusable="false"`.
- [ ] Buttons use appropriate types.
- [ ] Inputs use appropriate native types.
- [ ] Data tables use `caption`, `th`, and `scope`.
- [ ] Native elements are used instead of custom implementations where they meet the requirement.
- [ ] Links are used for navigation.
- [ ] Buttons are used for actions.
- [ ] ARIA is used only when necessary.
- [ ] Interactive elements are keyboard accessible (see section 19).
- [ ] No `tabindex` greater than 0.
- [ ] Form errors are announced and linked to their controls.

### Code Quality

- [ ] No static inline styles, embedded `<style>` blocks, or inline event handlers.
- [ ] No unnecessary `<br>` elements.
- [ ] No empty elements used for spacing.
- [ ] No duplicated markup without justification.
- [ ] Existing components are reused where appropriate.
- [ ] Existing project patterns are respected.
- [ ] No unrelated refactoring is introduced.
- [ ] Review findings are specific and actionable.

---

## Important

The purpose of this standard is to review and improve existing UI code, not to impose a new project architecture.

The reviewer should prioritize:

1. Correctness
2. Accessibility
3. Semantic HTML
4. Clean DOM structure
5. Maintainability
6. Existing project consistency
7. Visual/UI requirements

Do not recommend changes solely for the sake of following a generic standard.

Only raise a code review finding when there is a clear and defensible reason for the change.
