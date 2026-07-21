import { ROUTES } from "@/routes/sectionConfig";
import DataTable from "@/components/shared/DataTable/DataTable";
import { USER_COLUMNS } from "../config/constants";

export default function CabinetUsersSection({
  users,
  loading,
  onNavigateToUser,
}) {
  if (loading) {
    return (
      <div className="cabinet-section">
        <h2 className="cabinet-section-title">
          <i className="fas fa-users"></i>
          Users
        </h2>
        <p className="cabinet-users-loading">Loading users…</p>
      </div>
    );
  }

  return (
    <div className="cabinet-section">
      <h2 className="cabinet-section-title">
        <i className="fas fa-users"></i>
        Users
      </h2>
      {users.length === 0 ? (
        <p className="cabinet-users-list">No users linked to this cabinet.</p>
      ) : (
        <DataTable
          className="cabinet-users-table-wrap"
          columns={USER_COLUMNS}
          rows={users}
          rowKey="id"
          renderCell={(row, key) => {
            if (key === "actions") {
              return (
                <button
                  type="button"
                  className="case-action-btn case-action-edit"
                  title="View user profile"
                  aria-label={`View ${row.name}`}
                  onClick={() => onNavigateToUser(ROUTES.userDetail(row.id))}
                >
                  <i className="fas fa-search" aria-hidden />
                </button>
              );
            }
            return row[key];
          }}
          tableClassName="cabinet-cases-table cabinet-users-table"
        />
      )}
    </div>
  );
}
