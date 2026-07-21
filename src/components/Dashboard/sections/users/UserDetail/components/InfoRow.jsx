export default function InfoRow({ label, value }) {
  return (
    <div className="user-detail-info-row">
      <span className="user-detail-info-label">{label}</span>
      <span className="user-detail-info-value">{value ?? "—"}</span>
    </div>
  );
}
