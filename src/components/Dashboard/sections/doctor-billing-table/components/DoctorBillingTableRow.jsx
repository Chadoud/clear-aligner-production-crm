import React from "react";
import { getFilteredSubRows } from "../utils/getFilteredSubRows";
import DoctorBillingSubRow from "./DoctorBillingSubRow";

export default function DoctorBillingTableRow({
  row,
  originalIndex,
  expandedIndex,
  onToggleExpand,
  getBillingState,
  formatCHF,
  onRowClick,
  onPatientClick,
  dataMode = "invoices",
}) {
  const isPatientsMode = dataMode === "patients";
  const subRows = getFilteredSubRows(row, dataMode, getBillingState);
  const expandCount = subRows.length;
  const isExpanded = expandedIndex.has(originalIndex);

  return (
    <React.Fragment key={`billing-row-${originalIndex}`}>
      <tr
        className="overview-payment-doctor-row overview-payment-doctor-row-clickable"
        onClick={() => onRowClick(row.doctorName)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onRowClick(row.doctorName);
          }
        }}
        aria-label={`Open billing for ${row.doctorName}`}
      >
        <td className="overview-payment-doctor-name">{row.doctorName}</td>
        <td className="overview-payment-invoice" aria-hidden>
          —
        </td>
        <td className="overview-payment-num">
          {isPatientsMode
            ? Number(row.owedCount) || 0
            : formatCHF(row.owed, { decimals: 0 })}
        </td>
        <td className="overview-payment-num overview-payment-paid">
          {isPatientsMode
            ? Number(row.paidCount) || 0
            : formatCHF(row.paid, { decimals: 0 })}
        </td>
        <td className="overview-payment-num overview-payment-pending">
          {isPatientsMode
            ? Number(row.pendingCount) || 0
            : formatCHF(row.pending ?? 0, { decimals: 0 })}
        </td>
        <td className="overview-payment-date">
          {row.latestInvoiceDateDisplay ?? "—"}
        </td>
        <td className="overview-payment-state" aria-hidden>
          —
        </td>
        <td className="overview-payment-expand">
          {expandCount > 0 ? (
            <button
              type="button"
              className="overview-payment-expand-btn"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(originalIndex);
              }}
              aria-expanded={isExpanded}
              aria-label={
                isExpanded
                  ? isPatientsMode
                    ? "Collapse patient rows"
                    : "Collapse invoice rows"
                  : isPatientsMode
                    ? "Show patient rows"
                    : "Show invoice rows"
              }
            >
              <i
                className={`fas fa-chevron-${isExpanded ? "down" : "right"}`}
                aria-hidden
              />
              {isPatientsMode
                ? `${expandCount} patient(s)`
                : `${expandCount} invoice(s)`}
            </button>
          ) : (
            <span className="overview-payment-no-items">—</span>
          )}
        </td>
      </tr>
      {isExpanded &&
        subRows.map((item, idx) => (
          <DoctorBillingSubRow
            key={`billing-row-${originalIndex}-sub-${item.caseRef}-${idx}`}
            item={item}
            row={row}
            getBillingState={getBillingState}
            formatCHF={formatCHF}
            onPatientClick={onPatientClick}
          />
        ))}
    </React.Fragment>
  );
}
