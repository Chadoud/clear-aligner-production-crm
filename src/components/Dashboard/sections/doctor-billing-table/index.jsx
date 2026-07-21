import React from "react";
import SortHeader from "./components/SortHeader";
import DoctorBillingTableRow from "./components/DoctorBillingTableRow";
import "./DoctorBillingTable.css";

/**
 * Payment overview table — pure display component.
 * All filtering is handled upstream; this component only renders the data it
 * receives, handles sorting UI, and expands/collapses rows.
 */
export default function DoctorBillingTable({
  filteredRows,
  hasActiveFilters,
  expandedIndex,
  onToggleExpand,
  sortBy,
  sortOrder,
  onSort,
  formatCHF,
  onRowClick,
  onPatientClick,
  getBillingState,
  dataMode = "invoices",
}) {
  const isPatientsMode = dataMode === "patients";

  const totals = React.useMemo(() => {
    let totalOwed = 0;
    let totalPaid = 0;
    let totalPending = 0;
    filteredRows.forEach(({ row }) => {
      if (isPatientsMode) {
        totalOwed += Number(row.owedCount) || 0;
        totalPaid += Number(row.paidCount) || 0;
        totalPending += Number(row.pendingCount) || 0;
      } else {
        totalOwed += Number(row.owed) || 0;
        totalPaid += Number(row.paid) || 0;
        totalPending += Number(row.pending ?? 0) || 0;
      }
    });
    return { totalOwed, totalPaid, totalPending };
  }, [filteredRows, isPatientsMode]);

  return (
    <div id="overview-payment-section" className="overview-payment-section">
      <h3 className="overview-chart-title">Table</h3>
      <div className="overview-payment-table-wrap">
        <table className="overview-payment-table" aria-label="Table">
          <thead>
            <tr>
              <SortHeader
                column="doctorName"
                label="Doctor / Cabinet"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={onSort}
              />
              <th scope="col" className="overview-payment-th-invoice">
                Invoice
              </th>
              <SortHeader
                column="owed"
                label={isPatientsMode ? "Owed (pts)" : "Left to pay"}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={onSort}
              />
              <SortHeader
                column="paid"
                label={isPatientsMode ? "Paid (pts)" : "Paid"}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={onSort}
              />
              <SortHeader
                column="pending"
                label={isPatientsMode ? "Pending (pts)" : "Pending"}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={onSort}
              />
              <th scope="col" className="overview-payment-th-date">
                Date
              </th>
              <th scope="col" className="overview-payment-th-state">
                State
              </th>
              <th
                scope="col"
                className="overview-payment-th-expand"
                aria-hidden
              />
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="overview-payment-empty">
                  {hasActiveFilters
                    ? "No doctors/cabinets match the current filters."
                    : "No billing data yet."}
                </td>
              </tr>
            ) : (
              filteredRows.map(({ row, originalIndex }) => (
                <DoctorBillingTableRow
                  key={`billing-row-${originalIndex}`}
                  row={row}
                  originalIndex={originalIndex}
                  expandedIndex={expandedIndex}
                  onToggleExpand={onToggleExpand}
                  getBillingState={getBillingState}
                  formatCHF={formatCHF}
                  onRowClick={onRowClick}
                  onPatientClick={onPatientClick}
                  dataMode={dataMode}
                />
              ))
            )}
          </tbody>
          {filteredRows.length > 0 && (
            <tfoot>
              <tr className="overview-payment-totals-row">
                <td className="overview-payment-totals-label" colSpan={2}>
                  Total
                </td>
                <td className="overview-payment-num overview-payment-totals-num">
                  {isPatientsMode
                    ? totals.totalOwed
                    : formatCHF(totals.totalOwed, { decimals: 0 })}
                </td>
                <td className="overview-payment-num overview-payment-paid overview-payment-totals-num">
                  {isPatientsMode
                    ? totals.totalPaid
                    : formatCHF(totals.totalPaid, { decimals: 0 })}
                </td>
                <td className="overview-payment-num overview-payment-pending overview-payment-totals-num">
                  {isPatientsMode
                    ? totals.totalPending
                    : formatCHF(totals.totalPending, { decimals: 0 })}
                </td>
                <td colSpan={3} aria-hidden />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
