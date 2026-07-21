import { formatPaymentOverviewRowDate } from "../../overview/config/overviewHelpers";
import { getPatientForInvoiceRef } from "@/services/patientDataService";

function billingStateFromAggregate(item) {
  const L = Number(item.aggregateLeft) || 0;
  const P = Number(item.aggregatePaid) || 0;
  const Pe = Number(item.aggregatePending) || 0;
  if (Pe > 0) return "Pending";
  if (L > 0 && P > 0) return "Partially paid";
  if (L > 0) return "Left to pay";
  if (P > 0) return "Paid";
  return "—";
}

export default function DoctorBillingSubRow({
  item,
  row,
  getBillingState,
  formatCHF,
  onPatientClick,
}) {
  const patient = getPatientForInvoiceRef(item.caseRef, item.caseId);
  const dateForColumn = formatPaymentOverviewRowDate({
    createdAt: item.createdAt,
    generatedDate: item.generatedDate,
    patientEntered: patient?.entered,
  });
  const billingState = item.isPatientAggregate
    ? billingStateFromAggregate(item)
    : getBillingState
      ? getBillingState(row.doctorName, item.caseRef, patient, item)
      : null;
  const paymentRowClass =
    billingState === "Paid"
      ? "overview-payment-sub-row-paid"
      : billingState === "Left to pay"
        ? "overview-payment-sub-row-partial"
        : billingState === "Partially paid"
          ? "overview-payment-sub-row-to-pay"
          : billingState === "Pending"
            ? "overview-payment-sub-row-pending"
            : "overview-payment-sub-row-other";
  const displayName = item.name ?? patient?.name ?? "—";
  const patientPayload = patient?.ref
    ? patient
    : item.caseRef
      ? {
          ref: item.caseRef,
          case_id: item.caseId ?? null,
          name: item.name,
          cabinet: row.doctorName ?? "",
        }
      : null;

  const stateClass =
    billingState === "Paid"
      ? "overview-payment-state-paid"
      : billingState === "Left to pay"
        ? "overview-payment-state-partial"
        : billingState === "Partially paid"
          ? "overview-payment-state-to-pay"
          : billingState === "Pending"
            ? "overview-payment-state-pending"
            : "";

  return (
    <tr
      className={`overview-payment-sub-row ${paymentRowClass} ${onPatientClick ? "overview-payment-sub-row-clickable" : ""}`}
      onClick={
        onPatientClick && patientPayload
          ? (e) => {
              e.stopPropagation();
              onPatientClick(patientPayload);
            }
          : undefined
      }
      role={onPatientClick && patientPayload ? "button" : undefined}
      tabIndex={onPatientClick && patientPayload ? 0 : undefined}
      onKeyDown={
        onPatientClick && patientPayload
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onPatientClick(patientPayload);
              }
            }
          : undefined
      }
      aria-label={
        onPatientClick && patientPayload ? `Open ${displayName}` : undefined
      }
    >
      <td className="overview-payment-sub-cell">
        <span className="overview-payment-sub-patient-name">{displayName}</span>
        <span className="overview-payment-sub-ref"> - ref: {item.caseRef}</span>
      </td>
      <td className="overview-payment-invoice">{item.invoiceRef ?? "—"}</td>
      <td className="overview-payment-num overview-payment-sub-amount">
        {item.isPatientAggregate
          ? formatCHF(item.aggregateLeft, { decimals: 0 })
          : billingState === "Pending"
            ? formatCHF(0, { decimals: 0 })
            : item.amount != null && item.amountPaid != null
              ? formatCHF(Math.max(0, item.amount - item.amountPaid), {
                  decimals: 0,
                })
              : "—"}
      </td>
      <td className="overview-payment-num overview-payment-sub-amount">
        {item.isPatientAggregate
          ? formatCHF(item.aggregatePaid, { decimals: 0 })
          : item.amountPaid != null
            ? formatCHF(item.amountPaid, { decimals: 0 })
            : item.amount != null
              ? formatCHF(item.amount, { decimals: 0 })
              : "—"}
      </td>
      <td className="overview-payment-num overview-payment-sub-amount">
        {item.isPatientAggregate
          ? formatCHF(item.aggregatePending, { decimals: 0 })
          : billingState === "Pending" && item.amount != null
            ? formatCHF(item.amount, { decimals: 0 })
            : formatCHF(0, { decimals: 0 })}
      </td>
      <td className="overview-payment-date">{dateForColumn}</td>
      <td className="overview-payment-state">
        {getBillingState || item.isPatientAggregate ? (
          <span
            className={
              stateClass
                ? `overview-payment-state-badge ${stateClass}`
                : undefined
            }
          >
            {billingState}
          </span>
        ) : (
          "—"
        )}
      </td>
      <td />
    </tr>
  );
}
