# Manual QA checklist

Use after larger UI changes or before a release.

## Visual regression (desktop / tablet / mobile)

- [ ] **Overview** – Cards (Total cases, Left to pay, Paid, Invoiced), donut chart, status bars, doctor billing table, expandable rows
- [ ] **Billing (company)** – Summary cards, filters, cycles, unbilled card, draft/finalize/paid actions, PDF
- [ ] **Billing (doctor)** – Unbilled card, cycle list, status pills, summary by month
- [ ] **Case management list** – Filters sidebar, status buttons, search, case cards, pagination, empty state
- [ ] **Case management tabs** – Tab strip, panel content, forms, placeholders
- [ ] **Add new case** – Form layout, fields, primary/secondary buttons
- [ ] **Generated invoices** – Overview cards, invoice list, status (paid/partial/unpaid), actions
- [ ] **Invoice modal** – Summary, preview switch, receipt form, footer actions
- [ ] **Receipt generation modal** – Form, dropdowns, preview section
- [ ] **Shell** – Sidebar, header, right sidebar, responsive collapse

## Functional regression

- [ ] Forms: validation, submit, readonly fields
- [ ] Sorting/filtering/search on tables and lists
- [ ] Modals: open, close, confirm flows
- [ ] Navigation and patient-sheet transitions (case → invoice tab)
- [ ] Pagination (page change, page size)
- [ ] Dropdowns (status, cabinet, custom date)

## Responsive

- [ ] Breakpoints: 640px, 768px, 1024px – layout and spacing
- [ ] Case management: filters stack on small screens
- [ ] Billing/invoice tables and cards reflow
- [ ] Modals: width and scroll on small viewports

## Accessibility

- [ ] Keyboard: Tab through filters, buttons, links, form fields
- [ ] Focus visibility on interactive controls
- [ ] Semantic structure: headings, labels, buttons vs links
- [ ] ARIA where needed (e.g. modals, dropdowns)
- [ ] Color contrast for text and interactive elements

## Sign-off

| Phase                                | Visual | Functional | Responsive | A11y |
| ------------------------------------ | ------ | ---------- | ---------- | ---- |
| Shell (Sidebar/Header/RightSidebar)  |        |            |            |      |
| Overview + Billing                   |        |            |            |      |
| Case management                      |        |            |            |      |
| Invoice / Quotation / Receipt        |        |            |            |      |
| Admin (Cabinets/Users/Profile/Login) |        |            |            |      |
| Global CSS cleanup                   |        |            |            |      |

**Sign-off criteria:** For each phase, run the app (`npm run dev` or a staging build), verify the listed screens and interactions, then check the boxes above. Document any regressions before marking complete.
