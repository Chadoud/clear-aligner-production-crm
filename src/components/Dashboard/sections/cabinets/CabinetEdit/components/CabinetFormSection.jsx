export default function CabinetFormSection({ form, onUpdate }) {
  const fields = [
    { key: "name", label: "Name*", type: "text" },
    { key: "legalName", label: "Legal name", type: "text" },
    { key: "telephone", label: "Telephone", type: "text" },
    { key: "fax", label: "Fax", type: "text" },
    { key: "email", label: "E-mail", type: "email" },
    { key: "website", label: "Website", type: "text" },
  ];

  return (
    <div className="cabinet-section">
      <h2 className="cabinet-section-title">
        <i className="fas fa-user"></i>
        General info
      </h2>
      <div className="cabinet-form-grid">
        {fields.map(({ key, label, type }) => (
          <label key={key}>
            {label}{" "}
            <input
              type={type}
              value={form[key] ?? ""}
              onChange={(e) => onUpdate(key, e.target.value)}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
