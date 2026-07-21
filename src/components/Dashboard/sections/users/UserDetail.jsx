import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import IconButton from "@/components/shared/IconButton/IconButton";
import ConfirmDialog from "@/components/shared/ConfirmDialog/ConfirmDialog";
import { useUserDetail } from "./UserDetail/hooks/useUserDetail";
import AccountForm from "./UserDetail/components/AccountForm";
import DetailsForm from "./UserDetail/components/DetailsForm";
import RightsForm from "./UserDetail/components/RightsForm";
import UserDetailView from "./UserDetail/components/UserDetailView";
import "./UserDetail.css";

export default function UserDetail({ userId }) {
  const navigate = useNavigate();
  const { isCompany, user: authUser } = useAuth();
  const {
    user,
    cabinet,
    cabinets,
    rightsList,
    rightsForm,
    loading,
    error,
    activeTab,
    setActiveTab,
    editing,
    setEditing,
    saving,
    deleting,
    canDelete,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    handleDeleteUser,
    form,
    setForm,
    rightsUnsavedTarget,
    cancelEdit,
    handleSaveAccount,
    handleSaveDetails,
    handleSaveRights,
    handleRightsUnsavedSave,
    handleRightsUnsavedDiscard,
    requestTabSwitch,
    requestBack,
    toggleRight,
  } = useUserDetail(userId, isCompany, authUser?.id);

  const canEdit = isCompany;

  const handleRightsUnsavedSaveBound = () =>
    handleRightsUnsavedSave(navigate, setActiveTab);
  const handleRightsUnsavedDiscardBound = () =>
    handleRightsUnsavedDiscard(navigate, setActiveTab);

  return (
    <section className="dashboard-section user-detail">
      <button
        type="button"
        className="user-detail-back"
        onClick={() => requestBack(navigate)}
      >
        <i className="fas fa-arrow-left" aria-hidden /> Back to users
      </button>

      <h1 className="section-title user-detail-title">
        <i className="fas fa-user" aria-hidden />
        {user
          ? `User: ${[user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.name || user.login || ""}`
          : "User"}
      </h1>

      {loading && <p className="user-detail-loading">Loading…</p>}
      {error && (
        <p className="user-detail-error" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && user && (
        <div className="user-detail-body">
          {canEdit && editing && (
            <div className="user-detail-tabs">
              <div className="user-detail-tab-list">
                <IconButton
                  variant={activeTab === "account" ? "primary" : "cancel"}
                  onClick={() => requestTabSwitch("account")}
                  className="user-detail-tab"
                >
                  Account
                </IconButton>
                <IconButton
                  variant={activeTab === "details" ? "primary" : "cancel"}
                  onClick={() => requestTabSwitch("details")}
                  className="user-detail-tab"
                >
                  Access
                </IconButton>
                <IconButton
                  variant={activeTab === "rights" ? "primary" : "cancel"}
                  onClick={() => setActiveTab("rights")}
                  className="user-detail-tab"
                >
                  Rights
                </IconButton>
              </div>

              {activeTab === "account" && (
                <AccountForm
                  form={form}
                  setForm={setForm}
                  saving={saving}
                  onSave={handleSaveAccount}
                  onCancel={cancelEdit}
                />
              )}

              {activeTab === "details" && (
                <DetailsForm
                  form={form}
                  setForm={setForm}
                  cabinets={cabinets}
                  saving={saving}
                  onSave={handleSaveDetails}
                  onCancel={cancelEdit}
                />
              )}

              {activeTab === "rights" && (
                <RightsForm
                  rightsList={rightsList}
                  rightsForm={rightsForm}
                  toggleRight={toggleRight}
                  saving={saving}
                  onSave={handleSaveRights}
                  onCancel={cancelEdit}
                />
              )}
            </div>
          )}

          {!editing && (
            <UserDetailView
              user={user}
              cabinet={cabinet}
              canEdit={canEdit}
              canDelete={canDelete}
              deleting={deleting}
              onEdit={() => setEditing(true)}
              onDelete={() => setDeleteConfirmOpen(true)}
              onNavigateCabinet={(url) => navigate(url)}
            />
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!rightsUnsavedTarget}
        title="Unsaved Rights Changes"
        message="You have unsaved changes to the rights. Do you want to save them before leaving?"
        confirmLabel="Save"
        cancelLabel="Discard"
        confirmVariant="primary"
        onConfirm={handleRightsUnsavedSaveBound}
        onCancel={handleRightsUnsavedDiscardBound}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete user permanently?"
        message={
          user
            ? `This will permanently remove ${user.login || user.name || "this user"} from the database. Their email can be used again for a new registration. This cannot be undone.`
            : "This will permanently remove this user from the database. This cannot be undone."
        }
        confirmLabel={deleting ? "Deleting…" : "Delete permanently"}
        cancelLabel="Cancel"
        confirmVariant="danger"
        onConfirm={() => handleDeleteUser(navigate)}
        onCancel={() => !deleting && setDeleteConfirmOpen(false)}
      />
    </section>
  );
}
