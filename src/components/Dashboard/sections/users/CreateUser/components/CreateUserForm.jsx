import IconButton from "@/components/shared/IconButton/IconButton";
import { COUNTRIES } from "@/constants";

export default function CreateUserForm({
  form,
  update,
  cabinets,
  error,
  submitting,
  onSubmit,
  onCancel,
}) {
  return (
    <form onSubmit={onSubmit} className="create-user-form">
      {error && (
        <div className="create-user-error" role="alert">
          {error}
        </div>
      )}

      <div className="create-user-section">
        <h2 className="create-user-section-title">Account</h2>
        <div className="create-user-grid">
          <label>
            <span>
              Email <span className="required">*</span>
            </span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              required
              placeholder="user@example.com"
              autoFocus
            />
          </label>
          <label>
            <span>
              Password <span className="required">*</span>
            </span>
            <input
              type="password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              required
              minLength={6}
              placeholder="Min. 6 characters"
            />
          </label>
          <label>
            <span>
              Confirm password <span className="required">*</span>
            </span>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => update("confirmPassword", e.target.value)}
              required
              placeholder="Repeat password"
            />
          </label>
          <label>
            <span>
              First name <span className="required">*</span>
            </span>
            <input
              type="text"
              value={form.firstName}
              onChange={(e) => update("firstName", e.target.value)}
              required
              placeholder="First name"
            />
          </label>
          <label>
            <span>
              Last name <span className="required">*</span>
            </span>
            <input
              type="text"
              value={form.lastName}
              onChange={(e) => update("lastName", e.target.value)}
              required
              placeholder="Last name"
            />
          </label>
          <label>
            Phone
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="+41 22 123 45 67"
            />
          </label>
          <label>
            Website
            <input
              type="url"
              value={form.website}
              onChange={(e) => update("website", e.target.value)}
              placeholder="https://"
            />
          </label>
        </div>
      </div>

      <div className="create-user-section">
        <h2 className="create-user-section-title">Address</h2>
        <div className="create-user-grid">
          <label>
            Street
            <input
              type="text"
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              placeholder="Street name and number"
            />
          </label>
          <label>
            Postal code
            <input
              type="text"
              value={form.zip}
              onChange={(e) => update("zip", e.target.value)}
              placeholder="e.g. 1227"
            />
          </label>
          <label>
            City
            <input
              type="text"
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
              placeholder="City"
            />
          </label>
          <label>
            Country
            <select
              value={form.country}
              onChange={(e) => update("country", e.target.value)}
            >
              {COUNTRIES.map((c) => (
                <option key={c.value || "empty"} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="create-user-section">
        <h2 className="create-user-section-title">Access</h2>
        <div className="create-user-grid">
          <label>
            Role
            <select
              value={form.isCompany ? "company" : "doctor"}
              onChange={(e) =>
                update("isCompany", e.target.value === "company")
              }
            >
              <option value="doctor">Doctor / Cabinet</option>
              <option value="company">Company / Lab</option>
            </select>
          </label>
          {!form.isCompany && (
            <label>
              Cabinet
              <select
                value={form.cabinetId ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  update("cabinetId", v === "" ? null : Number(v));
                }}
              >
                <option value="">— Select cabinet —</option>
                {cabinets.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.slug || c.id}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>

      <div className="create-user-actions">
        <IconButton
          variant="cancel"
          type="button"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </IconButton>
        <IconButton variant="primary" type="submit" disabled={submitting}>
          {submitting ? "Creating…" : "Create user"}
        </IconButton>
      </div>
    </form>
  );
}
