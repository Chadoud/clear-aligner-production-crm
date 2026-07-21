import IconButton from "@/components/shared/IconButton/IconButton";

export default function DetailsForm({
  form,
  setForm,
  cabinets,
  saving,
  onSave,
  onCancel,
}) {
  return (
    <div className="user-detail-card user-detail-form-card">
      <h2 className="user-detail-section-heading">Access</h2>
      <div className="user-detail-form-grid">
        <label>
          Role
          <select
            value={form.isCompany ? "company" : "doctor"}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                isCompany: e.target.value === "company",
              }))
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
                setForm((f) => ({
                  ...f,
                  cabinetId: v === "" ? null : Number(v),
                }));
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
