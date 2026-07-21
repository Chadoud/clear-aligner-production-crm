import { type ReactNode } from "react";
import { createSafeContext } from "@/core/context/createSafeContext";
import { useAuth } from "./AuthContext";
import { useInvoiceData } from "../hooks/useInvoiceData";

// useInvoiceData is a JS hook — use a broad type to preserve runtime safety
// without requiring a full TS rewrite of the hook.
type InvoiceDataContextValue = ReturnType<typeof useInvoiceData>;

const [InvoiceDataContextBase, useDashboardInvoiceData] =
  createSafeContext<InvoiceDataContextValue>("InvoiceDataContext");
export { useDashboardInvoiceData };

export function InvoiceDataProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const value = useInvoiceData(undefined, !!token);
  return (
    <InvoiceDataContextBase.Provider value={value}>
      {children}
    </InvoiceDataContextBase.Provider>
  );
}
