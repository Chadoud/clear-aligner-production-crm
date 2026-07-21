import { useLocation } from "react-router-dom";
import { getCabinetEditRoute } from "@/routes/sectionConfig";
import IconButton from "@/components/shared/IconButton/IconButton";
import InfoRow from "./InfoRow";

function userStatusLabel(status) {
  if (status === 2) return "Pending registration";
  if (status === -1) return "Refused registration";
  if (status === 1) return "Active";
  return String(status ?? "—");
}

export default function UserDetailView({
  user,
  cabinet,
  canEdit,
  canDelete,
  deleting,
  onEdit,
  onDelete,
  onNavigateCabinet,
}) {
  const { pathname } = useLocation();
  const address =
    user.address || user.zip || user.city || user.country
      ? [
          user.address,
          [user.zip, user.city].filter(Boolean).join(" "),
          user.country,
        ]
          .filter(Boolean)
          .join(", ")
      : null;

  return (
    <>
      <div className="dashboard-section-card user-detail-card">
        <h2 className="user-detail-section-heading">Account</h2>
        <InfoRow label="ID" value={user.id} />
        <InfoRow label="Name" value={user.name} />
        <InfoRow label="Email" value={user.login} />
        <InfoRow label="Status" value={userStatusLabel(user.status)} />
        <InfoRow
          label="Role"
          value={user.isCompany ? "Company / Lab" : "Doctor / Cabinet"}
        />
        <InfoRow label="Phone" value={user.phone} />
        <InfoRow label="Website" value={user.website} />
        {address != null && <InfoRow label="Address" value={address} />}
        <InfoRow label="Member since" value={user.enteringDate} />
        {(canEdit || canDelete) && (
          <div className="user-detail-actions">
            {canEdit && (
              <IconButton
                variant="primary"
                icon="fas fa-edit"
                onClick={onEdit}
                className="user-detail-edit-btn"
              >
                Edit user
              </IconButton>
            )}
            {canDelete && (
              <IconButton
                variant="danger"
                icon="fas fa-trash-alt"
                onClick={onDelete}
                disabled={deleting}
                className="user-detail-delete-btn"
              >
                Delete user
              </IconButton>
            )}
          </div>
        )}
      </div>

      {cabinet && (
        <div className="dashboard-section-card user-detail-card">
          <h2 className="user-detail-section-heading">Cabinet</h2>
          <InfoRow label="Name" value={cabinet.name} />
          <InfoRow label="Email" value={cabinet.email} />
          <InfoRow label="Phone" value={cabinet.phone} />
          <InfoRow label="Address" value={cabinet.address} />
          <InfoRow label="City" value={cabinet.city} />
          <IconButton
            variant="secondary"
            icon="fas fa-external-link-alt"
            onClick={() =>
              onNavigateCabinet(getCabinetEditRoute(pathname, cabinet.slug))
            }
            className="user-detail-view-cabinet"
          >
            View cabinet
          </IconButton>
        </div>
      )}
    </>
  );
}
