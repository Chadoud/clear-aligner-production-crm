import IconButton from "@/components/shared/IconButton/IconButton";
import { useTranslation } from "react-i18next";
import {
  formatCHF,
  formatInvoiceDateForDisplay,
} from "@/utils/invoices/index.js";

function collectDistinctDates(lineItems, key) {
  return [
    ...new Set(
      (lineItems ?? [])
        .map((i) => String(i?.[key] ?? "").trim())
        .filter(Boolean)
    ),
  ];
}

function StatusTagPill({ label, variant }) {
  return (
    <span
      className={`doctors-billing-status-tag doctors-billing-status-tag--${variant}`}
    >
      {label}
    </span>
  );
}

function StatusDateTag({ label, date, variant }) {
  const d = formatInvoiceDateForDisplay(date);
  return (
    <span className="doctors-billing-status-line">
      <StatusTagPill label={label} variant={variant} />
      {d !== "—" ? (
        <span className="doctors-billing-status-line__date">{`the ${d}`}</span>
      ) : null}
    </span>
  );
}

function GroupStatusDateTag({ lineItems, dateKey, label, variant }) {
  const dates = collectDistinctDates(lineItems, dateKey);
  if (dates.length <= 1) {
    return <StatusDateTag label={label} date={dates[0]} variant={variant} />;
  }
  return (
    <span className="doctors-billing-status-line">
      <StatusTagPill label={label} variant={variant} />
      <span className="doctors-billing-status-line__date">
        on multiple dates
      </span>
    </span>
  );
}

function countBillingStatuses(lineItems) {
  const c = { to_bill: 0, billed: 0, paid: 0 };
  for (const i of lineItems ?? []) {
    const k = i?.billingStatus;
    if (k === "to_bill" || k === "billed" || k === "paid") c[k] += 1;
  }
  return c;
}

function formatBillingStatusSummary(lineItems, pendingStatusLabel, t) {
  const c = countBillingStatuses(lineItems);
  const parts = [];
  if (c.to_bill) {
    parts.push(
      t("doctorsBillingPage.statusCountPending", {
        count: c.to_bill,
        label: pendingStatusLabel,
      })
    );
  }
  if (c.billed) parts.push(`${c.billed} billed`);
  if (c.paid) parts.push(`${c.paid} paid`);
  return parts.join(" · ");
}

function LineItemStatusAll({ item, pendingStatusLabel }) {
  const s = item?.billingStatus;
  if (s === "paid") {
    return <StatusDateTag label="Paid" date={item.paidDate} variant="paid" />;
  }
  if (s === "billed") {
    return (
      <StatusDateTag
        label="Billed"
        date={item.doctorBillGeneratedAt}
        variant="billed"
      />
    );
  }
  return (
    <span className="doctors-billing-status-line">
      <StatusTagPill label={pendingStatusLabel} variant="toBill" />
    </span>
  );
}

export default function DoctorBillingCard({
  group,
  isExpanded,
  viewMode,
  canGenerateBill = true,
  pendingStatusLabel = "To bill",
  onToggleExpand,
  onOpenPreview,
  onReverse,
  onMarkPaid,
  onPatientRowClick,
}) {
  const { t } = useTranslation();

  return (
    <div key={group.doctorName} className="doctors-billing-doctor-card">
      <div
        className="doctors-billing-doctor-card-header"
        onClick={() => onToggleExpand(group.doctorName)}
        onKeyDown={(e) => e.key === "Enter" && onToggleExpand(group.doctorName)}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
      >
        <div className="doctors-billing-doctor-card-header-left">
          <span className="doctors-billing-doctor-card-name">
            {group.doctorName}
          </span>
          <span className="doctors-billing-doctor-card-meta">
            {group.lineItems.length} patient
            {group.lineItems.length !== 1 ? "s" : ""} ·{" "}
            {formatCHF(group.totalAmount)}
          </span>
          {viewMode === "paid" && (
            <GroupStatusDateTag
              lineItems={group.lineItems}
              dateKey="paidDate"
              label="Paid"
              variant="paid"
            />
          )}
          {viewMode === "billed" && (
            <GroupStatusDateTag
              lineItems={group.lineItems}
              dateKey="doctorBillGeneratedAt"
              label="Billed"
              variant="billed"
            />
          )}
          {viewMode === "all" && group.lineItems.length > 0 && (
            <span className="doctors-billing-doctor-card-status-summary">
              {formatBillingStatusSummary(
                group.lineItems,
                pendingStatusLabel,
                t
              )}
            </span>
          )}
        </div>
        <div
          className="doctors-billing-doctor-card-actions"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          role="presentation"
        >
          {viewMode === "bill" && (
            <>
              <IconButton
                variant="secondary"
                icon="far fa-eye"
                onClick={() =>
                  onOpenPreview(group.doctorName, group.lineItems, true)
                }
                aria-label={`Preview bill for ${group.doctorName}`}
              >
                Preview
              </IconButton>
              {canGenerateBill && (
                <IconButton
                  variant="secondary"
                  className="doctors-billing-btn-primary"
                  icon="far fa-file-pdf"
                  onClick={() =>
                    onOpenPreview(group.doctorName, group.lineItems)
                  }
                  aria-label={`Preview and generate bill for ${group.doctorName}`}
                >
                  Generate bill
                </IconButton>
              )}
            </>
          )}
          {(viewMode === "billed" || viewMode === "paid") && (
            <>
              <IconButton
                variant="secondary"
                icon="far fa-eye"
                onClick={() =>
                  onOpenPreview(group.doctorName, group.lineItems, true)
                }
                aria-label={`Preview bill for ${group.doctorName}`}
              >
                Preview
              </IconButton>
              {viewMode === "paid" && (
                <IconButton
                  variant="secondary"
                  icon="fas fa-undo"
                  onClick={() => onReverse({ ...group, reverseType: "paid" })}
                  aria-label={`Reverse bill for ${group.doctorName}`}
                >
                  Reverse
                </IconButton>
              )}
              {viewMode === "billed" && (
                <>
                  <IconButton
                    variant="secondary"
                    icon="fas fa-undo"
                    onClick={() =>
                      onReverse({ ...group, reverseType: "billed" })
                    }
                    aria-label={`Reverse billed invoices for ${group.doctorName}`}
                  >
                    Reverse
                  </IconButton>
                  <IconButton
                    variant="secondary"
                    className="doctors-billing-btn-mark-paid"
                    icon="fas fa-money-check-alt"
                    onClick={() => onMarkPaid(group)}
                    aria-label={`Mark billed invoices as paid for ${group.doctorName}`}
                  >
                    Mark as paid
                  </IconButton>
                </>
              )}
            </>
          )}
          <button
            type="button"
            className="doctors-billing-doctor-card-expand"
            onClick={() => onToggleExpand(group.doctorName)}
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            <i
              className={`fas fa-chevron-${isExpanded ? "up" : "down"}`}
              aria-hidden
            />
          </button>
        </div>
      </div>
      {isExpanded && (
        <div className="doctors-billing-doctor-card-body">
          <table
            className="doctors-billing-patient-table"
            aria-label={`Patients for ${group.doctorName}`}
          >
            <thead>
              <tr>
                <th>Patient</th>
                <th>Ref</th>
                <th>Invoice</th>
                <th>Entered</th>
                <th>Invoice date</th>
                {viewMode === "all" && <th>Status</th>}
                {viewMode === "billed" && <th>Billed</th>}
                {viewMode === "paid" && <th>Paid</th>}
                <th className="doctors-billing-th-amount">Amount</th>
              </tr>
            </thead>
            <tbody>
              {group.lineItems.map((item, idx) => (
                <tr
                  key={`${group.doctorName}-${item.caseRef}-${idx}`}
                  className="doctors-billing-patient-row-clickable"
                  role="button"
                  tabIndex={0}
                  onClick={() => onPatientRowClick(item)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && onPatientRowClick(item)
                  }
                  aria-label={`View invoices for ${item.patientName}`}
                >
                  <td>{item.patientName}</td>
                  <td>{item.caseRef}</td>
                  <td>{item.invoiceRef ?? "—"}</td>
                  <td>{item.entered || "—"}</td>
                  <td>{formatInvoiceDateForDisplay(item.invoiceDate)}</td>
                  {viewMode === "all" && (
                    <td className="doctors-billing-td-status-tag">
                      <LineItemStatusAll
                        item={item}
                        pendingStatusLabel={pendingStatusLabel}
                      />
                    </td>
                  )}
                  {viewMode === "billed" && (
                    <td className="doctors-billing-td-status-tag">
                      <StatusDateTag
                        label="Billed"
                        date={item.doctorBillGeneratedAt}
                        variant="billed"
                      />
                    </td>
                  )}
                  {viewMode === "paid" && (
                    <td className="doctors-billing-td-status-tag">
                      <StatusDateTag
                        label="Paid"
                        date={item.paidDate}
                        variant="paid"
                      />
                    </td>
                  )}
                  <td>{formatCHF(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
