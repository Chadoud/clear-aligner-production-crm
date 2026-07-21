import IconButton from "@/components/shared/IconButton/IconButton";

function rightsByParent(rightsList) {
  return rightsList.reduce((acc, r) => {
    const pid = r.parentId || 0;
    if (!acc[pid]) acc[pid] = [];
    acc[pid].push(r);
    return acc;
  }, {});
}

export default function RightsForm({
  rightsList,
  rightsForm,
  toggleRight,
  saving,
  onSave,
  onCancel,
}) {
  const byParent = rightsByParent(rightsList);
  const topLevel = byParent[0] || [];
  const children = (parentId) => byParent[parentId] || [];

  return (
    <div className="user-detail-card user-detail-form-card user-detail-rights-card">
      <h2 className="user-detail-section-heading">Rights</h2>
      <p className="user-detail-rights-help">
        Assign permissions to this user. Toggle each right on or off. Section
        headers (Overview, Cabinets, etc.) group related permissions.
      </p>
      {rightsList.length === 0 ? (
        <p className="user-detail-rights-empty">
          No rights available. The tbl_sidebar table may be empty.
        </p>
      ) : (
        <div className="user-detail-rights-groups">
          {topLevel.map((r) => (
            <div key={r.id} className="user-detail-rights-group">
              {r.hasChildren ? (
                <div className="user-detail-right-toggle user-detail-right-toggle--parent user-detail-rights-group-header">
                  <span className="user-detail-right-label">
                    {r.name || r.identify}
                  </span>
                </div>
              ) : (
                <label className="user-detail-right-toggle user-detail-right-toggle--parent">
                  <span className="user-detail-right-label">
                    {r.name || r.identify}
                  </span>
                  <div className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={rightsForm.has(r.id)}
                      onChange={() => toggleRight(r.id)}
                      className="toggle-input"
                    />
                    <span className="toggle-slider" />
                  </div>
                </label>
              )}
              {r.hasChildren ? (
                <div className="user-detail-rights-children">
                  {children(r.id).map((c) => (
                    <label
                      key={c.id}
                      className="user-detail-right-toggle user-detail-right-toggle--child"
                    >
                      <span className="user-detail-right-label">
                        {c.name || c.identify}
                      </span>
                      <div className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={rightsForm.has(c.id)}
                          onChange={() => toggleRight(c.id)}
                          className="toggle-input"
                        />
                        <span className="toggle-slider" />
                      </div>
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
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
