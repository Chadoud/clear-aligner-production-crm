import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchRightsList } from "@/services/userService";
import {
  SECTIONS,
  DOCTOR_SECTIONS,
} from "@/components/Dashboard/Sidebar/config/navSections";
import { ROUTES } from "@/routes/sectionConfig";

/** Company sections a doctor may see when granted rights (never Users). */
const DOCTOR_DELEGATED_SECTION_IDS = new Set(["cabinets", "doctors-billing"]);

/** Survives Sidebar remounts when DashboardInner route key changes. */
let cachedRightsList = null;

/**
 * Resolve nav item's right id from rights list. Supports rightName or rightNames.
 */
function getRightIdForItem(item, nameToId) {
  const names = item.rightNames ?? (item.rightName ? [item.rightName] : []);
  for (const name of names) {
    const id = nameToId.get(name?.trim?.() ?? "");
    if (id != null) return id;
  }
  return null;
}

/**
 * Check if user has access to nav item. If userRights is empty, allow all (admin).
 * While the rights name map is loading, keep prior sections visible (optimistic).
 */
function hasAccess(item, userRights, nameToId, rightsListReady) {
  if (!userRights || userRights.length === 0) return true;
  const names = item.rightNames ?? (item.rightName ? [item.rightName] : []);
  if (names.length === 0) return true;
  if (!rightsListReady) return true;
  const rightId = getRightIdForItem(item, nameToId);
  if (rightId == null) return false;
  return userRights.includes(rightId);
}

function mapSectionRoutesForDoctor(section, doctorRouteMap) {
  if (section.sub) {
    return {
      ...section,
      to: doctorRouteMap[section.to] ?? section.to,
      sub: section.sub.map((s) => ({
        ...s,
        to: doctorRouteMap[s.to] ?? s.to,
      })),
    };
  }
  return {
    ...section,
    to: doctorRouteMap[section.to] ?? section.to,
  };
}

/**
 * Filter sections by user rights. For doctors with rights, merge in company sections they have access to.
 */
export function useFilteredNavSections() {
  const { userType, userRights } = useAuth();
  const [rightsList, setRightsList] = useState(() => cachedRightsList ?? []);
  const [rightsListReady, setRightsListReady] = useState(
    () => cachedRightsList != null
  );

  useEffect(() => {
    if (!userRights?.length) {
      cachedRightsList = null;
      setRightsList([]);
      setRightsListReady(true);
      return;
    }
    if (cachedRightsList) {
      setRightsList(cachedRightsList);
      setRightsListReady(true);
      return;
    }
    setRightsListReady(false);
    fetchRightsList()
      .then(({ rights }) => {
        cachedRightsList = rights ?? [];
        setRightsList(cachedRightsList);
      })
      .catch(() => {
        cachedRightsList = [];
        setRightsList([]);
      })
      .finally(() => setRightsListReady(true));
  }, [userRights?.length]);

  const nameToId = useMemo(() => {
    const map = new Map();
    for (const r of rightsList) {
      const name = (r.name ?? "").trim();
      if (name) map.set(name, r.id);
    }
    return map;
  }, [rightsList]);

  const doctorRouteMap = useMemo(
    () => ({
      [ROUTES.cabinets]: ROUTES.doctorCabinets,
      [ROUTES.cabinetsNew]: ROUTES.doctorCabinetsNew,
      [ROUTES.doctorsBilling]: ROUTES.doctorDoctorsBilling,
      [ROUTES.doctorsBillingAll]: ROUTES.doctorDoctorsBillingAll,
      [ROUTES.doctorsBillingBilled]: ROUTES.doctorDoctorsBillingBilled,
      [ROUTES.doctorsBillingPaid]: ROUTES.doctorDoctorsBillingPaid,
      [ROUTES.doctorsBillingToBill]: ROUTES.doctorDoctorsBillingUpcoming,
    }),
    []
  );

  return useMemo(() => {
    const baseSections = userType === "doctor" ? DOCTOR_SECTIONS : SECTIONS;
    const hasRightsFilter = userRights?.length > 0;

    if (!hasRightsFilter) {
      return baseSections;
    }

    const filtered = [];
    for (const section of baseSections) {
      if (section.sub) {
        const visibleSub = section.sub.filter((s) =>
          hasAccess(s, userRights, nameToId, rightsListReady)
        );
        if (visibleSub.length > 0) {
          filtered.push({ ...section, sub: visibleSub });
        }
      } else if (hasAccess(section, userRights, nameToId, rightsListReady)) {
        filtered.push(section);
      }
    }

    if (userType === "doctor" && rightsListReady) {
      const companyOnly = SECTIONS.filter(
        (s) =>
          DOCTOR_DELEGATED_SECTION_IDS.has(s.id) &&
          !DOCTOR_SECTIONS.some((d) => d.id === s.id)
      );

      for (const section of companyOnly) {
        const sectionAccess = section.rightName
          ? hasAccess(section, userRights, nameToId, rightsListReady)
          : section.sub?.some((s) =>
              hasAccess(s, userRights, nameToId, rightsListReady)
            );

        if (!sectionAccess || filtered.some((f) => f.id === section.id)) {
          continue;
        }

        if (section.sub) {
          const visibleSub = section.sub.filter((s) =>
            hasAccess(s, userRights, nameToId, rightsListReady)
          );
          if (visibleSub.length === 0) continue;
          const mapped = mapSectionRoutesForDoctor(
            { ...section, sub: visibleSub },
            doctorRouteMap
          );
          if (section.id === "doctors-billing") {
            mapped.sub = mapped.sub.map((item) =>
              item.to === ROUTES.doctorsBillingToBill ||
              item.to === ROUTES.doctorDoctorsBillingUpcoming
                ? {
                    ...item,
                    labelKey: "nav.doctorsBillingUpcoming",
                    icon: "fas fa-hourglass-half",
                    to: ROUTES.doctorDoctorsBillingUpcoming,
                  }
                : item
            );
          }
          filtered.push(mapped);
        } else {
          filtered.push(mapSectionRoutesForDoctor(section, doctorRouteMap));
        }
      }
    }

    return filtered;
  }, [userType, userRights, nameToId, rightsListReady, doctorRouteMap]);
}
