import { describe, it, expect } from "vitest";
import { i18n } from "./index";
import {
  formatTimeAgo,
  formatDeliveryDays,
  getBewareNotificationReason,
} from "@/components/Dashboard/Header/utils/formatters";

describe("i18n", () => {
  it("resolves nav and overview panel keys in EN and FR", async () => {
    await i18n.changeLanguage("en");
    expect(i18n.t("nav.overviewLastCases")).toBe("Last cases");
    expect(i18n.t("overview.panels.lastCasesAdded.title")).toBe(
      "Last cases added"
    );
    await i18n.changeLanguage("fr");
    expect(i18n.t("nav.overviewLastCases")).toBe("Derniers dossiers");
    expect(i18n.t("overview.panels.lastCasesAdded.title")).toBe(
      "Derniers dossiers ajoutés"
    );
  });

  it("exposes pdf namespace for getFixedT", () => {
    const tPdf = i18n.getFixedT("en", "pdf");
    expect(typeof tPdf("_comment")).toBe("string");
  });
});

describe("header formatters (i18n)", () => {
  it("uses distinct singular and plural hour strings in English", async () => {
    await i18n.changeLanguage("en");
    expect(i18n.t("header.timeAgoHoursOne")).toMatch(/1 hour ago/);
    expect(i18n.t("header.timeAgoHoursMany", { count: 2 })).toMatch(
      /2 hours ago/
    );
  });

  it("formatTimeAgo returns translated strings", async () => {
    await i18n.changeLanguage("en");
    const now = Date.now();
    const iso = new Date(now - 2 * 60 * 1000).toISOString();
    expect(formatTimeAgo(iso)).toMatch(/2/);
    expect(formatTimeAgo(iso)).toMatch(/ago|min/);
  });

  it("formatDeliveryDays returns translated strings", async () => {
    await i18n.changeLanguage("en");
    const future = new Date();
    future.setDate(future.getDate() + 3);
    const y = future.getFullYear();
    const m = String(future.getMonth() + 1).padStart(2, "0");
    const d = String(future.getDate()).padStart(2, "0");
    const s = `${y}-${m}-${d}`;
    expect(formatDeliveryDays(s)).toMatch(/remaining|day/);
  });

  it("getBewareNotificationReason is translated", async () => {
    await i18n.changeLanguage("fr");
    expect(
      getBewareNotificationReason("company", {
        case_notif_reason: 1,
      })
    ).toMatch(/facture|devis|Nouvelle/i);
  });
});
