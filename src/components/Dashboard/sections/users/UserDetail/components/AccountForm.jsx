import IconButton from "@/components/shared/IconButton/IconButton";
import { COUNTRIES } from "../config/constants";

export default function AccountForm({
  form,
  setForm,
  saving,
  onSave,
  onCancel,
}) {
  return (
    <div className="user-detail-card user-detail-form-card">
      <h2 className="user-detail-section-heading">Account</h2>
      <div className="user-detail-form-grid">
        <label>
          First name
          <input
            type="text"
            value={form.firstName}
            onChange={(e) =>
              setForm((f) => ({ ...f, firstName: e.target.value }))
            }
          />
        </label>
        <label>
          Last name
          <input
            type="text"
            value={form.lastName}
            onChange={(e) =>
              setForm((f) => ({ ...f, lastName: e.target.value }))
            }
          />
        </label>
        <label>
          Phone
          <input
            type="text"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
        </label>
        <label>
          Website
          <input
            type="text"
            value={form.website}
            onChange={(e) =>
              setForm((f) => ({ ...f, website: e.target.value }))
            }
          />
        </label>
        <label>
          Address
          <input
            type="text"
            value={form.address}
            onChange={(e) =>
              setForm((f) => ({ ...f, address: e.target.value }))
            }
            placeholder="Street name and number"
          />
        </label>
        <label>
          Postal code
          <input
            type="text"
            value={form.zip}
            onChange={(e) => setForm((f) => ({ ...f, zip: e.target.value }))}
            placeholder="e.g. 1227"
          />
        </label>
        <label>
          City
          <input
            type="text"
            value={form.city}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            placeholder="City"
          />
        </label>
        <label>
          Country
          <select
            value={form.country}
            onChange={(e) =>
              setForm((f) => ({ ...f, country: e.target.value }))
            }
          >
            {COUNTRIES.map((c) => (
              <option key={c.value || "empty"} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="user-detail-form-actions">
        <IconButton variant="primary" onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </IconButton>
        <IconButton variant="cancel" onClick={onCancel}>
          Cancel
        </IconButton>
      </div>
    </div>
  );
}
