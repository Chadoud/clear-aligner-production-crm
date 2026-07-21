export default function CabinetAddressSection({ form, onUpdate }) {
  const fields = [
    { key: "address", label: "Address" },
    { key: "zipCity", label: "ZIP / City" },
    { key: "country", label: "Country", placeholder: "Country" },
  ];

  return (
    <div className="cabinet-section">
      <h2 className="cabinet-section-title">
        <i className="fas fa-building"></i>
        address
      </h2>
      <div className="cabinet-form-grid">
        {fields.map(({ key, label, placeholder }) => (
          <label key={key}>
            {label}{" "}
            <input
              type="text"
              value={form[key] ?? ""}
              onChange={(e) => onUpdate(key, e.target.value)}
              placeholder={placeholder}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
