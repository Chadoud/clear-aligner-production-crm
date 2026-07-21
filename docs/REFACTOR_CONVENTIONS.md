# UI / CSS conventions

Keep styles consistent as the dashboard grows.

## Design tokens

- **Source of truth:** `src/assets/styles/variables.css`
- Use `var(--*)` for colors, spacing, radius, typography, shadows, transitions. No hardcoded hex or ad-hoc px for core UI.
- Semantic tokens: `--text-primary`, `--text-muted`, `--bg-white`, `--bg-muted`, `--border-default`, `--primary-blue`, `--color-danger`, etc.
- Spacing: `--spacing-xs` through `--spacing-4xl`
- Radius: `--radius-sm` through `--radius-xl`
- Typography: `--font-size-*`, `--font-weight-*`, `--line-height-*`

## CSS architecture

1. **tokens** – `variables.css` only.
2. **base** – `base.css`: reset, `html`/`body`/`#root`.
3. **layout** – `layout.css`: dashboard shell (sidebar, header, main content, right sidebar).
4. **components** – Component-level CSS files; prefer tokens and avoid leaking to unrelated pages.
5. **utilities** – `utilities.css`: small set of token-based utility classes.

Entry: `index.css` imports variables → base → layout → utilities, then page/component-specific rules that have not yet been moved to components.

## Shared UI primitives

- **Location:** `src/components/shared/` — Card, ConfirmDialog, DataTable, SearchInput, Pagination, LoadingDonut, CustomSelect.
- Prefer these over one-off markup and duplicate styles for cards, tables, filters, modals, selects.
- Use variant props and sensible defaults; keep behavior unchanged when replacing legacy UI.

## Naming and state

- Use `is-*` / `has-*` or variant modifiers for state (e.g. `.tab-item.active`, `.list-of-cases-status-btn.active`).
- Avoid generic names that could collide (e.g. prefix component-specific classes: `.list-of-cases-*`, `.invoice-item-*`).

## Do not

- Introduce new hardcoded core colors in migrated files.
- Add layout that belongs in the shell to `index.css`; use `layout.css` or component CSS.
- Use `!important` except for targeted overrides; document why when used.
- Create parallel styling paradigms; converge on the token + base/layout/components/utilities flow.

## Guardrails (recommended)

- **stylelint:** Rule to warn on hex colors and raw px for spacing/radius in `src/assets/styles` and migrated component CSS.
- **ESLint:** No new inline styles for layout/colors; prefer classes and tokens.
- **Code review:** New components should use design tokens and shared primitives where applicable.

## Component usage guidance

| Pattern    | Prefer                 | Avoid                      |
| ---------- | ---------------------- | -------------------------- |
| Card       | `shared/Card`          | Ad-hoc `.card` + local CSS |
| Table      | `shared/DataTable`     | Raw tables + custom CSS    |
| Search     | `shared/SearchInput`   | Repeated search markup     |
| Select     | `shared/CustomSelect`  | One-off dropdowns          |
| Confirm    | `shared/ConfirmDialog` | One-off modal wrappers     |
| Pagination | `shared/Pagination`    | Custom pagination markup   |
| Loading    | `shared/LoadingDonut`  | Ad-hoc spinners            |

## Route completion

- Company: overview, cabinets, case-management, users, billing, profile.
- Doctor: overview, case-management, billing, profile.
- Public: login.

Each route should be audited, refactored to tokens/primitives where done, and pass the QA checklist (visual, functional, responsive, a11y) before sign-off.

_Generated as Phase 6 deliverable for the Full-App UI/UX Audit and CSS Refactor Plan._
