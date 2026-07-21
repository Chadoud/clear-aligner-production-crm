import { beforeEach, describe, expect, it } from "vitest";
import { getInvoiceClient } from "@/utils/invoices/index.js";
import {
  addInvoice,
  deleteInvoice,
  filterInvoicesByPatient,
  loadInvoices,
  updateInvoice,
} from "./invoiceDataService.js";

describe("invoiceDataService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("adds and loads invoices from storage", async () => {
    await addInvoice({
      brand: "Direct",
      client: { name: "John Doe" },
      services: [],
      totalPrice: 1000,
    });
    const invoices = await loadInvoices();
    expect(invoices).toHaveLength(1);
  });

  it("filters invoices by patient name", async () => {
    await addInvoice({
      brand: "Direct",
      client: { name: "Jane" },
      services: [],
      totalPrice: 10,
    });
    await addInvoice({
      brand: "Direct",
      client: { name: "Mark" },
      services: [],
      totalPrice: 11,
    });
    const all = await loadInvoices();
    expect(filterInvoicesByPatient(all, "Jane")).toHaveLength(1);
  });

  it("filters invoices by patient ref when available", async () => {
    await addInvoice({
      brand: "Direct",
      client: { name: "Dr Jane", ref: "E1001" },
      services: [],
      totalPrice: 10,
    });
    await addInvoice({
      brand: "Direct",
      client: { name: "Jane", ref: "E1002" },
      services: [],
      totalPrice: 11,
    });
    const all = await loadInvoices();
    expect(filterInvoicesByPatient(all, "Jane", "E1002")).toHaveLength(1);
  });

  it("returns no invoices without patient identity", async () => {
    await addInvoice({
      brand: "Direct",
      client: { name: "Jane" },
      services: [],
      totalPrice: 10,
    });
    const all = await loadInvoices();
    expect(filterInvoicesByPatient(all, "")).toHaveLength(0);
  });

  it("update and delete match by client ref so one treatment does not affect another", async () => {
    const date = "24/02/2026";
    await addInvoice({
      brand: "Direct",
      client: { name: "Jean-David Schmidt", ref: "E-001" },
      services: [],
      totalPrice: 5000,
      generatedDate: date,
    });
    await addInvoice({
      brand: "Direct",
      client: { name: "Jean-David Schmidt", ref: "E-002" },
      services: [],
      totalPrice: 5000,
      generatedDate: date,
    });
    const initial = await loadInvoices();
    expect(initial).toHaveLength(2);

    await updateInvoice(
      {
        clientRef: "E-001",
        clientName: "Jean-David Schmidt",
        generatedDate: date,
        totalPrice: 5000,
      },
      { amountPaid: 1000 }
    );
    const afterUpdate = await loadInvoices();
    const invE001 = afterUpdate.find(
      (i) => getInvoiceClient(i)?.ref === "E-001"
    );
    const invE002 = afterUpdate.find(
      (i) => getInvoiceClient(i)?.ref === "E-002"
    );
    expect(invE001?.amountPaid).toBe(1000);
    expect(invE002?.amountPaid).toBeUndefined();

    await deleteInvoice({
      clientRef: "E-001",
      clientName: "Jean-David Schmidt",
      generatedDate: date,
      totalPrice: 5000,
    });
    const afterDelete = await loadInvoices();
    expect(afterDelete).toHaveLength(1);
    expect(getInvoiceClient(afterDelete[0])?.ref).toBe("E-002");
  });
});
