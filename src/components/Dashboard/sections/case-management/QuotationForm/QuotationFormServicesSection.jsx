/**
 * Services selector plus total price and amount-per-month row.
 */
import { useTranslation } from "react-i18next";
import NumberInputWithArrows from "@/components/shared/NumberInputWithArrows/NumberInputWithArrows";
import ServicesSelector from "./ServicesSelector";

export default function QuotationFormServicesSection({
  services,
  displayableServices,
  labPrice,
  linePriceOverrides,
  onServiceSelect,
  onRemoveService,
  onQuantityChange,
  totalPrice,
  totalInvoiceFree,
  onPriceChange,
  monthlyPaymentEnabled,
  numberOfMonthsForPayment,
  onNumberOfMonthsForPaymentChange,
  amountPaid,
  onAmountPaidChange,
  treatmentDuration,
  brand,
}) {
  const { t } = useTranslation();
  const showArrangementFields =
    brand === "Direct" && monthlyPaymentEnabled && !totalInvoiceFree;

  return (
    <div className="form-services-section">
      <ServicesSelector
        services={services}
        displayableServices={displayableServices}
        labPrice={labPrice}
        linePriceOverrides={linePriceOverrides}
        onServiceSelect={onServiceSelect}
        onRemoveService={onRemoveService}
        onQuantityChange={onQuantityChange}
      />
      <div className="form-total-monthly-row form-total-monthly-under-services">
        <div className="form-group form-group-inline">
          <label htmlFor="totalPrice">{t("quotation.totalPriceLabel")}</label>
          <div className="price-input-wrapper">
            <NumberInputWithArrows
              id="totalPrice"
              data-testid="quotation-total-price"
              className="number-input-with-arrows--currency"
              value={totalInvoiceFree ? "0" : totalPrice}
              onChange={onPriceChange}
              aria-label={t("quotation.totalPriceAria")}
              placeholder={t("quotation.totalPricePlaceholder")}
              min={0}
              max={9999}
              step={10}
              disabled={totalInvoiceFree}
            />
            <span className="input-suffix">CHF</span>
          </div>
        </div>
        {showArrangementFields && (
          <>
            <div className="form-group form-group-inline">
              <label htmlFor="amountPaid">
                {t("quotation.downPaymentLabel")}
              </label>
              <div className="price-input-wrapper">
                <NumberInputWithArrows
                  id="amountPaid"
                  className="number-input-with-arrows--currency"
                  value={amountPaid}
                  onChange={onAmountPaidChange}
                  aria-label={t("quotation.downPaymentAria")}
                  placeholder={t("quotation.downPaymentPlaceholder")}
                  min={0}
                  max={9999}
                  step={10}
                />
                <span className="input-suffix">CHF</span>
              </div>
            </div>
            <div className="form-group form-group-inline monthly-amount-box">
              <label htmlFor="numberOfMonthsForPayment">
                {t("quotation.monthlyPaymentLabel")}
              </label>
              <div className="price-input-wrapper">
                <NumberInputWithArrows
                  id="numberOfMonthsForPayment"
                  value={numberOfMonthsForPayment}
                  onChange={onNumberOfMonthsForPaymentChange}
                  aria-label={t("quotation.monthlyInstalmentsAria")}
                  placeholder={
                    treatmentDuration
                      ? `${parseInt(treatmentDuration, 10) - 1 || 1}`
                      : t("quotation.monthlyPlaceholderExample")
                  }
                  min={1}
                  max={36}
                  step={1}
                />
                <span className="input-suffix">
                  {t("quotation.formMonthsSuffix")}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
