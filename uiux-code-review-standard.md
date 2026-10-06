# UIUX Code Review Standards

## Objective

Ensure that UI code is clean, semantic, accessible, maintainable, and consistent with the existing project.

These standards are intended for UI/UX code review of existing implementations.

The goal is to identify unnecessary, incorrect, inconsistent, or poor-quality markup and recommend focused improvements without introducing unnecessary refactoring.

The existing project's framework, component structure, CSS/SCSS architecture, naming conventions, and established patterns should be respected.

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

Flag classes that describe purely visual properties when they should represent the element's purpose.

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
- Buttons used when the interaction is actually navigation

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

Flag buttons where an omitted `type` could cause unintended form submission.

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
    <svg>
        ...
    </svg>
</button>
```

Flag icon-only controls that have no accessible name.

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

- Correct label associations
- Appropriate input types
- Required fields
- Button types
- Accessible error messages where applicable

---

## 12. Input Types

Verify that the appropriate native input type is used.

**Examples:**

```html
<input type="email">
<input type="password">
<input type="number">
<input type="date">
<input type="search">
<input type="tel">
```

Flag use of `type="text"` when a more appropriate native input type is clearly applicable.

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
    <thead>
        <tr>
            <th scope="col">Name</th>
            <th scope="col">Status</th>
        </tr>
    </thead>

    <tbody>
        <tr>
            <td>John Doe</td>
            <td>Active</td>
        </tr>
    </tbody>
</table>
```

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

A native `<button>` already provides button semantics.

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

## 19. Existing Project Consistency

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

## 20. Scope of Review

Focus the review on the requested UI change.

**Prioritize:**

- Incorrect or invalid HTML
- Accessibility issues
- Semantic HTML issues
- Unnecessary DOM elements
- Incorrect interactive elements
- Unnecessary or incorrect classes
- Maintainability issues
- Consistency with existing project patterns

Do not turn a code review into a full refactoring exercise.

Avoid recommending unrelated changes.

---

## 21. Review Severity

Use the following severity when reporting findings.

### Critical

Issues that can cause major functionality or accessibility problems.

**Examples:**

- Broken interactive behavior
- Critical accessibility failure
- Invalid markup that breaks functionality

### High

Issues that should be fixed before approval.

**Examples:**

- Incorrect semantic structure affecting accessibility
- Clickable `div` used as a critical interactive control
- Missing accessible names for important controls
- Incorrect form behavior

### Medium

Issues that should be addressed but do not block functionality.

**Examples:**

- Excessive DOM nesting
- Unnecessary wrapper elements
- Incorrect heading hierarchy
- Poor class naming
- Missing semantic list structure

### Low

Minor improvements that improve code quality or maintainability.

**Examples:**

- Minor redundant markup
- Unnecessary class
- Small HTML cleanup

---

## 22. Code Review Comment Format

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

## 23. Avoid False Positives

Do not flag code simply because:

- A `div` is used.
- A class name does not match a generic naming convention.
- A wrapper exists.
- ARIA is present.
- A custom component is used.
- An existing project pattern differs from generic HTML examples.

Before raising a finding, determine whether the element has a legitimate structural, styling, functional, framework, or project-specific purpose.

Only report issues that have a clear reason for improvement.

---

## 24. Final Code Review Checklist

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
- [ ] Buttons use appropriate types.
- [ ] Links are used for navigation.
- [ ] Buttons are used for actions.
- [ ] Heading hierarchy is logical.
- [ ] ARIA is used only when necessary.
- [ ] Interactive elements are keyboard accessible.

### Code Quality

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
