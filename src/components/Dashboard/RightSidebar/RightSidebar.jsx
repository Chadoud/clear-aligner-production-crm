import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDashboard } from "@/context/DashboardContext";
import {
  usePatientService,
  usePatientSheetNavigation,
  useVisiblePatients,
  useRecentConsultedPatientsRefresh,
} from "@/hooks";
import { ROUTES } from "@/routes/sectionConfig";
import { sortPatientsByLastConsulted } from "@/constants/recentConsultedPatients.js";
import LoadingDonut from "@/components/shared/LoadingDonut/LoadingDonut";
import "./RightSidebar.css";

function matchesPatientQuery(patient, q) {
  return (
    (patient.name && patient.name.toLowerCase().includes(q)) ||
    (patient.ref && String(patient.ref).toLowerCase().includes(q)) ||
    (patient.cabinet && patient.cabinet.toLowerCase().includes(q))
  );
}

const RightSidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { scope, selectedPatient } = useDashboard();
  const { loading: patientsLoading } = usePatientService();
  const patients = useVisiblePatients();
  const recentConsultedTick = useRecentConsultedPatientsRefresh();
  const navigateToPatientSheet = usePatientSheetNavigation();
  const addCaseUrl =
    scope === "doctor"
      ? ROUTES.doctorCaseManagementNew
      : ROUTES.caseManagementNew;
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const listRef = useRef(null);

  const filteredPatients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = q
      ? patients.filter((p) => matchesPatientQuery(p, q))
      : [...patients];
    return sortPatientsByLastConsulted(list, scope, selectedPatient);
    // recentConsultedTick forces re-sort when sessionStorage recent list changes
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional refresh signal
  }, [patients, searchQuery, scope, recentConsultedTick, selectedPatient]);

  const handleSelectPatient = (patient) => {
    navigateToPatientSheet(patient);
    onClose();
  };

  useEffect(() => {
    setFocusedIndex(-1);
  }, [searchQuery]);

  const handleSearchKeyDown = (e) => {
    const n = filteredPatients.length;
    if (n === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((i) => (i < n - 1 ? i + 1 : 0));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((i) => (i <= 0 ? n - 1 : i - 1));
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setSearchQuery("");
      setFocusedIndex(-1);
      e.target.blur();
      return;
    }
    if (
      e.key === "Enter" &&
      focusedIndex >= 0 &&
      filteredPatients[focusedIndex]
    ) {
      e.preventDefault();
      handleSelectPatient(filteredPatients[focusedIndex]);
    }
  };

  useEffect(() => {
    if (focusedIndex < 0 || !listRef.current) return;
    const el = listRef.current.querySelector(
      `[data-patient-index="${focusedIndex}"]`
    );
    if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focusedIndex]);

  return (
    <aside className={`right-sidebar ${isOpen ? "sidebar-open" : ""}`}>
      <div className="patients-header">
        <h3>Patients</h3>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            className="add-case-link"
            aria-label="Add a case"
            onClick={() => {
              navigate(addCaseUrl);
              onClose();
            }}
          >
            <i className="fas fa-plus"></i>
            <i className="fas fa-user"></i>
            add a case
          </button>
          <button
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      </div>
      <div className="patients-search">
        <input
          type="text"
          placeholder="Search by name, ref or doctor..."
          aria-label="Search patients"
          aria-expanded={filteredPatients.length > 0}
          aria-controls="right-sidebar-patient-list"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleSearchKeyDown}
        />
      </div>
      <div
        id="right-sidebar-patient-list"
        className="patients-list"
        ref={listRef}
        role="listbox"
        aria-label="Patients"
      >
        {patientsLoading ? (
          <div className="patients-list-status">
            <LoadingDonut size="sm" message="Loading patients…" />
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="patients-list-status">
            {searchQuery.trim()
              ? `No patients match "${searchQuery.trim()}"`
              : "No patients yet"}
          </div>
        ) : null}
        {filteredPatients.map((patient, index) => (
          <button
            type="button"
            key={`${patient.ref}-${patient.name}-${index}`}
            data-patient-index={index}
            role="option"
            aria-selected={
              focusedIndex === index || selectedPatient?.ref === patient.ref
            }
            className={`patient-item ${selectedPatient?.ref === patient.ref ? "active" : ""} ${focusedIndex === index ? "patient-item-focused" : ""}`}
            onClick={() => handleSelectPatient(patient)}
            aria-label={`Select patient ${patient.name}`}
          >
            <div className="patient-info">
              <div className="patient-name">{patient.name}</div>
              <div className="patient-details">
                <span>Born on {patient.born}</span>
                <span>+ entering {patient.entered}</span>
              </div>
            </div>
            <i className="fas fa-chevron-right"></i>
          </button>
        ))}
      </div>
    </aside>
  );
};

export default RightSidebar;
