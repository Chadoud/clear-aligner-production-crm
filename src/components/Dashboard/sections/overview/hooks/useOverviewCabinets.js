import { useMemo } from "react";
import { useCabinetList } from "@/hooks";
import { getOurCabinetName } from "@/data/cabinets";

/**
 * Derives cabinet names and slug map for the Overview billing table.
 */
export function useOverviewCabinets() {
  const { cabinets } = useCabinetList();

  const cabinetNamesForOverviewTable = useMemo(() => {
    const cabinetNames = cabinets.map((c) => c.name).filter(Boolean);
    const ourName = getOurCabinetName();
    if (!ourName) return cabinetNames;
    return [ourName, ...cabinetNames.filter((n) => n !== ourName)];
  }, [cabinets]);

  const cabinetNameToSlug = useMemo(() => {
    const map = {};
    cabinets.forEach((c) => {
      if (c.name && c.slug) map[String(c.name).trim()] = c.slug;
    });
    return map;
  }, [cabinets]);

  return { cabinetNamesForOverviewTable, cabinetNameToSlug };
}
