/**
 * Panel lists and config for Overview "Last Cases" tab.
 */
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { attachCaseStatus } from "@/services/caseStatusMetrics";
import { getInvoiceClient } from "@/utils/invoices/index.js";
import { formatCHF } from "@/utils/index.js";
import { formatPanelDate, PANEL_LIST_SIZE } from "../config/overviewHelpers";

const PANEL_SPECS = [
  {
    key: "last-cases-added",
    i18n: "lastCasesAdded",
    iconClass: "fa-plus",
    statusFilter: null,
    dateMode: "withTime",
  },
  {
    key: "last-exchanges",
    i18n: "lastExchanges",
    iconClass: "fa-sync-alt",
    statusFilter: null,
    dateMode: "withTime",
  },
  {
    key: "last-proposals",
    i18n: "lastProposals",
    iconClass: "fa-eye",
    statusFilter: "case_study",
    dateMode: "dateOnly",
  },
  {
    key: "last-accepted",
    i18n: "lastAccepted",
    iconClass: "fa-check",
    statusFilter: "en_attente",
    dateMode: "dateOnly",
  },
  {
    key: "execution-in-progress",
    i18n: "executionInProgress",
    iconClass: "fa-clock",
    statusFilter: (c) =>
      c.caseStatus === "in_fabrication" || c.caseStatus === "in_treatment",
    dateMode: "dateOnly",
  },
  {
    key: "last-cases-sent",
    i18n: "lastCasesSent",
    iconClass: "fa-clock",
    statusFilter: "delivered",
    dateMode: "dateOnly",
  },
];

function filterAndSlice(casesWithStatus, statusFilter) {
  let filtered = casesWithStatus;
  if (statusFilter) {
    filtered =
      typeof statusFilter === "function"
        ? casesWithStatus.filter(statusFilter)
        : casesWithStatus.filter((c) => c.caseStatus === statusFilter);
  }
  return [...filtered].reverse().slice(0, PANEL_LIST_SIZE);
}

function formatDateForSpec(entered, dateMode) {
  return formatPanelDate(entered, dateMode === "withTime");
}

function buildSubtitle(t, spec, item, priceByPatientName) {
  const base = `overview.panels.${spec.i18n}`;
  const date = formatDateForSpec(item.entered, spec.dateMode);
  if (spec.i18n === "lastProposals") {
    const price = formatCHF(priceByPatientName[item.name] || 0);
    return t(`${base}.subtitle`, { date, price });
  }
  return t(`${base}.subtitle`, { date });
}

export function useOverviewPanels({ patients, invoices }) {
  const { t } = useTranslation();

  const casesWithStatus = useMemo(() => attachCaseStatus(patients), [patients]);

  const priceByPatientName = useMemo(() => {
    const map = {};
    invoices.forEach((inv) => {
      const name = getInvoiceClient(inv)?.name;
      if (name && map[name] == null) map[name] = Number(inv.totalPrice) || 0;
    });
    return map;
  }, [invoices]);

  const lastCasesAdded = useMemo(
    () => filterAndSlice(casesWithStatus, null),
    [casesWithStatus]
  );
  const lastExchanges = useMemo(
    () => filterAndSlice(casesWithStatus, null),
    [casesWithStatus]
  );
  const lastProposals = useMemo(
    () => filterAndSlice(casesWithStatus, "case_study"),
    [casesWithStatus]
  );
  const lastAccepted = useMemo(
    () => filterAndSlice(casesWithStatus, "en_attente"),
    [casesWithStatus]
  );
  const executionInProgress = useMemo(
    () =>
      filterAndSlice(casesWithStatus, (c) =>
        ["in_fabrication", "in_treatment"].includes(c.caseStatus)
      ),
    [casesWithStatus]
  );
  const lastCasesSent = useMemo(
    () => filterAndSlice(casesWithStatus, "delivered"),
    [casesWithStatus]
  );

  const overviewPanelsConfig = useMemo(() => {
    const keyToItems = {
      "last-cases-added": lastCasesAdded,
      "last-exchanges": lastExchanges,
      "last-proposals": lastProposals,
      "last-accepted": lastAccepted,
      "execution-in-progress": executionInProgress,
      "last-cases-sent": lastCasesSent,
    };
    return PANEL_SPECS.map((spec) => {
      const items = keyToItems[spec.key] ?? [];
      const base = `overview.panels.${spec.i18n}`;
      return {
        key: spec.key,
        title: t(`${base}.title`),
        iconClass: spec.iconClass,
        emptyMessage: t(`${base}.empty`),
        items,
        getSubtitle: (item) => buildSubtitle(t, spec, item, priceByPatientName),
      };
    });
  }, [
    t,
    lastCasesAdded,
    lastExchanges,
    lastProposals,
    lastAccepted,
    executionInProgress,
    lastCasesSent,
    priceByPatientName,
  ]);

  return {
    casesWithStatus,
    overviewPanelsConfig,
    priceByPatientName,
  };
}
