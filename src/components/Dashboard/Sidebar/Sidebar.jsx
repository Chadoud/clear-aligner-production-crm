import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useDashboard } from "@/context/DashboardContext";
import { ROUTES } from "@/routes/sectionConfig";
import { doctorsBillingNavTarget } from "@/components/Dashboard/sections/doctors-billing/config/billingPeriodSearchParams";
import { useFilteredNavSections } from "@/hooks";
import BrandMark from "../../shared/BrandMark/BrandMark";
import LanguageDropdown from "../Header/components/LanguageDropdown";
import "./Sidebar.css";

const Sidebar = ({ isOpen }) => {
  const { t } = useTranslation();
  const { userType } = useAuth();
  const location = useLocation();
  const pathname = location.pathname;
  const search = location.search;
  const {
    navOpenSubmenus,
    expandNavSubmenu,
    toggleNavSubmenu,
    setNavOpenSubmenus,
  } = useDashboard();

  const sections = useFilteredNavSections();

  const isSectionActive = useCallback(
    (id) => {
      if (id === "overview") {
        if (userType === "doctor")
          return (
            pathname.startsWith("/app/doctor/overview") ||
            pathname === "/app/doctor" ||
            pathname === "/app/doctor/"
          );
        return (
          pathname.startsWith("/app/company/overview") ||
          pathname === "/app/company" ||
          pathname === "/app/company/"
        );
      }
      if (id === "cabinets") {
        return (
          pathname.startsWith("/app/company/cabinets") ||
          pathname.startsWith("/app/doctor/cabinets")
        );
      }
      if (id === "case-management")
        return (
          pathname.startsWith("/app/company/case-management") ||
          pathname.startsWith("/app/doctor/case-management")
        );
      if (id === "users")
        return (
          pathname.startsWith("/app/company/users") ||
          pathname.startsWith("/app/doctor/users")
        );
      if (id === "doctors-billing")
        return (
          pathname.startsWith("/app/company/doctors-billing") ||
          pathname.startsWith("/app/doctor/doctors-billing")
        );
      return false;
    },
    [pathname, userType]
  );

  /** Auto-expand the section for the current route without collapsing others. */
  useEffect(() => {
    const activeIds = sections
      .filter(({ id }) => isSectionActive(id))
      .map(({ id }) => id);
    if (activeIds.length === 0) return;

    setNavOpenSubmenus((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const id of activeIds) {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [pathname, userType, sections, setNavOpenSubmenus, isSectionActive]);

  const isSubmenuOpen = (id) => navOpenSubmenus.has(id);

  const toggleSubmenu = (id, e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    toggleNavSubmenu(id);
  };

  const renderNavArrow = (id, hasSubmenu) => {
    if (!hasSubmenu) {
      return <i className="fas fa-chevron-right nav-arrow" />;
    }
    const open = isSubmenuOpen(id);
    return (
      <i
        className={`fas ${open ? "fa-minus" : "fa-chevron-right"} nav-arrow active-arrow`}
        onClick={(e) => toggleSubmenu(id, e)}
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") toggleSubmenu(id, e);
        }}
      />
    );
  };

  const getSubitemActive = (sectionId, subItem, active) => {
    if (active) return true;
    if (
      sectionId === "cabinets" &&
      (subItem.to === ROUTES.cabinets ||
        subItem.to === ROUTES.doctorCabinets) &&
      pathname.match(/\/app\/(?:company|doctor)\/cabinets\/[^/]+\/edit/)
    ) {
      return true;
    }
    return false;
  };

  return (
    <aside className={`left-sidebar ${isOpen ? "sidebar-open" : ""}`}>
      <div className="sidebar-header">
        <div className="sidebar-header-row">
          <div className="sidebar-header-brand">
            <BrandMark height={18} textColor="white" className="sidebar-logo" />
            {userType && (
              <span
                className={`sidebar-header-badge ${userType === "company" ? "sidebar-header-badge-company" : "sidebar-header-badge-doctor"}`}
              >
                {userType === "company"
                  ? t("sidebar.roleCompany")
                  : t("sidebar.roleDoctor")}
              </span>
            )}
          </div>
        </div>
      </div>
      <nav className="sidebar-nav">
        {sections.map(({ id, labelKey, icon, to, hasSubmenu, sub }) => (
          <div key={id}>
            {to ? (
              <NavLink
                to={
                  id === "doctors-billing"
                    ? doctorsBillingNavTarget(pathname, search, to)
                    : to
                }
                className={({ isActive: active }) =>
                  `nav-item ${active || isSectionActive(id) ? "active" : ""}`
                }
                onClick={() => hasSubmenu && expandNavSubmenu(id)}
              >
                <i className={icon}></i>
                <span>{t(labelKey)}</span>
                {renderNavArrow(id, hasSubmenu)}
              </NavLink>
            ) : (
              <span
                className={`nav-item ${isSectionActive(id) ? "active" : ""}`}
                onClick={() => hasSubmenu && expandNavSubmenu(id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) =>
                  e.key === "Enter" && hasSubmenu && expandNavSubmenu(id)
                }
              >
                <i className={icon}></i>
                <span>{t(labelKey)}</span>
                {renderNavArrow(id, hasSubmenu)}
              </span>
            )}
            {hasSubmenu && isSubmenuOpen(id) && sub && (
              <div className="nav-submenu">
                {sub.map((s) => (
                  <NavLink
                    key={s.to}
                    to={
                      id === "doctors-billing"
                        ? doctorsBillingNavTarget(pathname, search, s.to)
                        : s.to
                    }
                    className={({ isActive: active }) =>
                      `nav-subitem ${getSubitemActive(id, s, active) ? "active" : ""}`
                    }
                  >
                    <i className={s.icon}></i>
                    <span>{t(s.labelKey)}</span>
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
      <footer className="sidebar-footer">
        <div className="sidebar-language">
          <LanguageDropdown />
        </div>
        <p className="sidebar-footer-text">{t("sidebar.footer")}</p>
      </footer>
    </aside>
  );
};

export default Sidebar;
