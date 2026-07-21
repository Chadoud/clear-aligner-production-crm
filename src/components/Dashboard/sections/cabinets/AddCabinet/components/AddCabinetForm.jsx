import { COUNTRIES } from "@/constants";

export default function AddCabinetForm({
  form,
  update,
  error,
  submitting,
  onSubmit,
  onCancel,
}) {
  return (
    <form onSubmit={onSubmit} className="add-cabinet-form">
      {error && (
        <div className="add-cabinet-error" role="alert">
          {error}
        </div>
      )}

      <div className="add-cabinet-section">
        <h2 className="add-cabinet-section-title">General info</h2>
        <div className="add-cabinet-grid">
          <label>
            <span>
              Name <span className="required">*</span>
            </span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              required
              placeholder="Cabinet name"
              autoFocus
            />
          </label>
          <label>
            Legal name
            <input
              type="text"
              value={form.legalName}
              onChange={(e) => update("legalName", e.target.value)}
              placeholder="Legal business name"
            />
          </label>
          <label>
            Telephone
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="+41 22 123 45 67"
            />
          </label>
          <label>
            E-mail
            <input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="contact@clinic.example.com"
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
          <label>
            Fax
            <input
              type="tel"
              value={form.fax}
              onChange={(e) => update("fax", e.target.value)}
              placeholder="+41 22 123 45 68"
            />
          </label>
        </div>
      </div>

      <div className="add-cabinet-section">
        <h2 className="add-cabinet-section-title">Address</h2>
        <div className="add-cabinet-grid">
          <label>
            Street number / Street
            <input
              type="text"
              value={form.addressNum}
              onChange={(e) => update("addressNum", e.target.value)}
              placeholder="N° / Rue"
            />
          </label>
          <label>
            Street
            <input
              type="text"
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              placeholder="Street name"
            />
          </label>
          <label>
            Postal code / City
            <input
              type="text"
              value={form.zip}
              onChange={(e) => update("zip", e.target.value)}
              placeholder="Postal code"
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

      <div className="add-cabinet-actions">
        <button
          type="button"
          className="add-cabinet-btn add-cabinet-btn--secondary"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="add-cabinet-btn add-cabinet-btn--primary"
          disabled={submitting}
        >
          {submitting ? "Creating…" : "Create cabinet"}
        </button>
      </div>
    </form>
  );
}
