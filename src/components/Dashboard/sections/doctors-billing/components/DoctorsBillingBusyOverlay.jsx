import PageLoading from "@/components/shared/PageLoading/PageLoading";

export default function DoctorsBillingBusyOverlay({
  billGenerating,
  markPaidSending,
  reverseBillingBusy,
}) {
  if (!billGenerating && !markPaidSending && !reverseBillingBusy) return null;
  const message = billGenerating
    ? "Sending bill…"
    : markPaidSending
      ? "Sending confirmation…"
      : "Updating…";
  return <PageLoading variant="overlay" message={message} />;
}
