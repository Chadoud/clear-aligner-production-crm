import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/context/ToastContext";
import { useServices } from "../../context/ServicesContext.jsx";
import LoadingDonut from "../shared/LoadingDonut/LoadingDonut";
import "./SettingsModal.css";

const SettingsModal = ({ onClose }) => {
  const { services, updateService, loading, error, exportToJSON } =
    useServices();
  const toast = useToast();
  const { t } = useTranslation();
  const [localServices, setLocalServices] = useState(services);

  useEffect(() => {
    setLocalServices(services);
  }, [services]);

  if (loading) {
    return (
      <div className="modal" style={{ display: "flex" }}>
        <div className="modal-content">
          <div className="modal-body">
            <LoadingDonut size="md" message="Loading services..." />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="modal" style={{ display: "flex" }}>
        <div className="modal-content">
          <div className="modal-body">Error: {error}</div>
          <div className="modal-footer">
            <button className="btn-cancel" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!services || services.length === 0) {
    return (
      <div className="modal" style={{ display: "flex" }}>
        <div className="modal-content">
          <div className="modal-body">No services available</div>
          <div className="modal-footer">
            <button className="btn-cancel" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleInputChange = (index, field, value) => {
    const updated = [...localServices];
    updated[index] = {
      ...updated[index],
      [field]: value === "" ? null : parseFloat(value),
    };
    setLocalServices(updated);
  };

  const handleSave = () => {
    localServices.forEach((localService) => {
      const originalService = services.find(
        (s) => s.code === localService.code
      );
      if (originalService) {
        if (localService.vpt !== originalService.vpt) {
          updateService(localService.code, "vpt", localService.vpt);
        }
        if (localService.points !== originalService.points) {
          updateService(localService.code, "points", localService.points);
        }
        if (localService.point_value !== originalService.point_value) {
          updateService(
            localService.code,
            "point_value",
            localService.point_value
          );
        }
      }
    });

    toast.success(t("toast.settingsSaved"));
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div
      className="modal"
      style={{ display: "flex" }}
      onClick={(e) => e.target.classList.contains("modal") && onClose()}
    >
      <div className="modal-content">
        <div className="modal-header">
          <h2>Service Settings</h2>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="modal-body">
          <p style={{ marginBottom: "16px", fontSize: "12px", color: "#666" }}>
            Price = (Quantity × Points × VPT) × Point Value (per service)
          </p>
          <table className="settings-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Service</th>
                <th>VPT</th>
                <th>Points</th>
                <th>Point Value</th>
              </tr>
            </thead>
            <tbody>
              {localServices.map((service, index) => (
                <tr key={index}>
                  <td>{service.code}</td>
                  <td>{service.service}</td>
                  <td>
                    <input
                      type="number"
                      className="settings-input"
                      value={
                        service.vpt !== null && service.vpt !== undefined
                          ? service.vpt
                          : ""
                      }
                      onChange={(e) =>
                        handleInputChange(index, "vpt", e.target.value)
                      }
                      step="0.1"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="settings-input"
                      value={
                        service.points !== null && service.points !== undefined
                          ? service.points
                          : ""
                      }
                      onChange={(e) =>
                        handleInputChange(index, "points", e.target.value)
                      }
                      step="0.1"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="settings-input"
                      value={
                        service.point_value !== null &&
                        service.point_value !== undefined
                          ? service.point_value
                          : "1"
                      }
                      onChange={(e) =>
                        handleInputChange(index, "point_value", e.target.value)
                      }
                      step="0.05"
                      min="0"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="modal-footer">
          <button
            type="button"
            className="btn-cancel"
            onClick={() => exportToJSON?.()}
            title="Download current services (with your edits) as JSON"
          >
            Export services
          </button>
          <button className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-save" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
