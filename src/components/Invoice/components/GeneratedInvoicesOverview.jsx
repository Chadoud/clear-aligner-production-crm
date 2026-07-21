import {
  INVOICE_FILTER_PAID,
  INVOICE_FILTER_PENDING,
  INVOICE_FILTER_LEFT_TO_PAY,
} from "@/constants/invoiceFilters";
import Card from "@/components/shared/Card/Card";

export default function GeneratedInvoicesOverview({
  overview,
  formatCHF,
  scope,
  activeFilter = null,
  onFilterChange,
}) {
  const handleCardClick = (filter) => {
    if (!onFilterChange) return;
    onFilterChange(activeFilter === filter ? null : filter);
  };

  return (
    <div className="invoices-overview">
      <div className="card-grid">
        <Card>
          <span className="shared-card-label">Invoiced</span>
          <span className="shared-card-value">{overview.invoiceCount}</span>
          <span className="shared-card-sublabel">
            {overview.paidCount} paid
            {overview.partialCount > 0 &&
              ` · ${overview.partialCount} partially paid`}
            {overview.unpaidCount > 0 && ` · ${overview.unpaidCount} pending`}
            {overview.pendingCount > 0 && ` · ${overview.pendingCount} pending`}
          </span>
        </Card>
        <Card>
          <span className="shared-card-label">Total amount</span>
          <span className="shared-card-value">
            {formatCHF(overview.totalAmount, { decimals: 0 })}
          </span>
        </Card>
        <Card
          className={`shared-card--received ${activeFilter === INVOICE_FILTER_PAID ? "shared-card--highlight" : ""}`}
          clickable={Boolean(onFilterChange)}
          onClick={() => handleCardClick(INVOICE_FILTER_PAID)}
          aria-label="Paid – click to filter invoice list"
          dot={Boolean(onFilterChange)}
          dotActive={activeFilter === INVOICE_FILTER_PAID}
          dotColor="var(--color-success)"
        >
          <span className="shared-card-label">
            {scope === "doctor" ? "Billed" : "Received so far"}
          </span>
          <span className="shared-card-value">
            {formatCHF(overview.totalReceived, { decimals: 0 })}
          </span>
        </Card>
        <Card
          className={`shared-card--left ${activeFilter === INVOICE_FILTER_LEFT_TO_PAY ? "shared-card--highlight" : ""}`}
          clickable={Boolean(onFilterChange)}
          onClick={() => handleCardClick(INVOICE_FILTER_LEFT_TO_PAY)}
          aria-label="Left to pay – click to filter invoice list"
          dot={Boolean(onFilterChange)}
          dotActive={activeFilter === INVOICE_FILTER_LEFT_TO_PAY}
          dotColor="var(--color-warning)"
        >
          <span className="shared-card-label">Left to pay</span>
          <span className="shared-card-value">
            {formatCHF(overview.totalLeftToPay, { decimals: 0 })}
          </span>
          {overview.totalLeftToPay > 0 && (
            <span className="shared-card-sublabel">across open invoices</span>
          )}
        </Card>
        <Card
          className={`shared-card--pending ${activeFilter === INVOICE_FILTER_PENDING ? "shared-card--highlight" : ""}`}
          clickable={Boolean(onFilterChange)}
          onClick={() => handleCardClick(INVOICE_FILTER_PENDING)}
          aria-label="Pending – click to filter invoice list"
          dot={Boolean(onFilterChange)}
          dotActive={activeFilter === INVOICE_FILTER_PENDING}
          dotColor="#6366f1"
        >
          <span className="shared-card-label">Pending</span>
          <span className="shared-card-value">
            {formatCHF(overview.totalPending ?? 0, { decimals: 0 })}
          </span>
          {(overview.totalPending ?? 0) > 0 && (
            <span className="shared-card-sublabel">quote invoices</span>
          )}
        </Card>
      </div>
      <p className="overview-receipt-hint">
        <i className="fas fa-receipt"></i> You can generate a receipt for any
        payment (e.g. first instalment) from the Receipt button.
      </p>
    </div>
  );
}
