# Email Map — Triggers, Recipients & Content

Maps every email trigger: **when** it fires, **who triggers it**, **who** receives it, and **what** they receive (subject and content summary).

---

## CRM

| Trigger                                      | Triggered by  | Recipient                                         | Subject                                              | Content                                                                                                                                                                   |
| -------------------------------------------- | ------------- | ------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Invoice created** (Direct catalog cabinet) | Lab or Doctor | Patient (`case_email`)                            | `Invoice Direct - [Patient name] - [ref]`            | Salutation (Dear Sir / Dear Madam / Dear Sir or Madam). Invoice summary: reference, client name, total amount. Brand: Direct.                                             |
| **Invoice created** (other cabinets)         | Lab or Doctor | Doctor (`cabinet_email`)                          | `Invoice Lab - [Cabinet name] - [ref]`               | "Dear Dr." Invoice summary: reference, client name, total amount. Brand: Lab.                                                                                             |
| **New case created**                         | Lab or Doctor | Lab (`LAB_NOTIFICATION_EMAIL`, else From address) | `New case added - [Cabinet](Patient)`                | Practice + patient; ask to log in.                                                                                                                                        |
| **New case created**                         | Lab or Doctor | Doctor (`cabinet_email`)                          | `New case registered`                                | Acknowledgement; track in client area.                                                                                                                                    |
| **Case status → on hold (6)**                | Lab or Doctor | Doctor (`cabinet_email`)                          | `Order on hold`                                      | Patient name; sign in to contact team. Only when `case_status` **changes** to 6 via `PATCH /api/v1/patients/:ref`.                                                        |
| **Case status → Delivered (7)**              | Lab or Doctor | Lab (`LAB_NOTIFICATION_EMAIL`)                    | `Case delivered — [Cabinet](Patient)`                | Practice + patient; CRM status Delivered. Transition to 7 via `PATCH /api/v1/patients/:ref` when `skip_status_email` is not set.                                          |
| **Doctor bill generated** (Doctors Billing)  | Lab (company) | Doctor (`cabinet_email`)                          | `New bill — Aligner CRM` or `New bill (N patients)…` | One email per generated PDF; patient list. `POST /api/v1/invoices/doctor-billing-notify` after invoice lines stamped.                                                     |
| **Invoice fully paid** (regular invoice)     | Lab or Doctor | Lab (`LAB_NOTIFICATION_EMAIL`)                    | `Invoice paid — [Cabinet](Patient)`                  | Invoice ref, amount, practice, patient. Fires on `PUT /api/v1/invoices/:id` when invoice becomes fully paid.                                                              |
| **Quote fully paid**                         | Lab or Doctor | Lab (`LAB_NOTIFICATION_EMAIL`)                    | `Quote paid — [Cabinet](Patient)`                    | Quote ref, amount, practice, patient. Same hook as above — fires for quotes too when `amountPaid >= totalPrice`. Subject and body label say "Quote" instead of "Invoice". |
| **Case status → sans suite (8)**             | Lab or Doctor | Doctor (`cabinet_email`)                          | `Order closed — no further action`                   | Patient name; contact if needed. Transition to 8 via same PATCH.                                                                                                          |
| **New discussion reply**                     | Lab or Doctor | Lab **or** Doctor                                 | `New message` / `New message - [Cabinet](Patient)`   | Doctor post → email lab; lab post → email doctor. Skips `reply_type = 3` (acceptance / price-proposal rows).                                                              |
| **Password reset requested**                 | Doctor        | Doctor (`users.user_name`)                        | `Aligner CRM: reset your password`                   | Link to `/reset-password?token=...` on CRM. Sent when doctor submits **Forgot password?** form.                                                                           |
| **Password changed**                         | Doctor        | Doctor (`users.user_name`)                        | `Your Aligner CRM password was changed`              | Security notification that password changed (via reset or future in-app change).                                                                                          |

**Password reset request API:** `POST /api/v1/auth/password-reset-request` returns `{ ok, found, message }`. `found` is `true` only when a user row exists (`users.user_name`); the UI shows the server `message` (sent vs. not registered). This reveals whether an address is registered (email enumeration trade-off).

**HTML layout:** All of the above use a shared template (`backend/src/services/email/emailLayout.ts`): gradient header, white content card, typography, and a **Contact** block (email, optional phone & address from env, website). Configure via `ORG_CONTACT_EMAIL`, `ORG_CONTACT_PHONE`, `ORG_CONTACT_ADDRESS` (use `|` between address lines), `ORG_CONTACT_WEBSITE` in `.env` (see `backend/.env.example`).

**Source:** `backend/src/services/emailService.ts` (`sendInvoiceEmail`, `sendPasswordResetEmail`, `sendPasswordChangedEmail`); `backend/src/services/email/transactional.ts` (case lifecycle + reply notifications); routes: `routes/v1/cases.ts`, `routes/v1/patients.ts`, `routes/v1/replies.ts`, `modules/auth/http/routes.ts` (password reset).

**Not implemented (by design):** lab email when price proposal is **accepted**, registration / account refused, standalone “new price reply” notification, manual quote email, delivery alert crons.

---

## Quick reference

### Triggered by (who performs the action)

| Role       | Description                    |
| ---------- | ------------------------------ |
| **Lab**    | Company / lab staff            |
| **Doctor** | Cabinet / dental practice user |
| **System** | Cron job or automated process  |

### Recipient (who receives the email)

| Role        | Email source                    |
| ----------- | ------------------------------- |
| **Lab**     | `LAB_NOTIFICATION_EMAIL` / From |
| **Doctor**  | `tbl_cabinet.cabinet_email`     |
| **Patient** | `tbl_case.case_email`           |

---

## SMTP

Configure via `backend/.env` (see `.env.example`). Typical keys:

- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD`
- `FROM_EMAIL` / `FROM_NAME` (or `ORG_CONTACT_EMAIL`)
- `LAB_NOTIFICATION_EMAIL` — optional override for lab-facing mail; defaults to **From**
