import { useTranslation } from "react-i18next";
import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useDashboard } from "@/context/DashboardContext";
import {
  useVisiblePatients,
  usePatientSheetNavigation,
  usePatientService,
  useCabinetList,
  useHeaderSearchUsers,
  useBewarePatients,
  useDeliveryEvents,
} from "@/hooks";
import {
  ROUTES,
  getCabinetEditRoute,
  getUsersRoutes,
} from "@/routes/sectionConfig";
import SearchDropdown from "./components/SearchDropdown";
import DeliveryDropdown from "./components/DeliveryDropdown";
import BellDropdown from "./components/BellDropdown";
import MobileNotificationsDropdown from "./components/MobileNotificationsDropdown";
import LanguageDropdown from "./components/LanguageDropdown";
import UserMenuDropdown from "./components/UserMenuDropdown";
import { pickHeaderProfileImageUrls } from "@/utils/headerProfileImage";
import { MAX_SEARCH_RESULTS, SEARCH_RESULT_TYPE } from "./config/constants";
import "./Header.css";

function matchesQuery(value, q) {
  return value != null && String(value).toLowerCase().includes(q);
}

const Header = () => {
  const { t } = useTranslation();
  const { toggleBothSidebars, scope } = useDashboard();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const searchWrapperRef = useRef(null);
  const listRef = useRef(null);
  const { logout, user } = useAuth();
  const displayName =
    user?.fullName ?? user?.username ?? user?.email ?? t("header.defaultUser");
  const { primary: profileImageUrl, fallback: profileImageFallbackUrl } =
    pickHeaderProfileImageUrls(user);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { service: patientService } = usePatientService();
  const patients = useVisiblePatients();
  const bewarePatients = useBewarePatients();
  const { events: deliveryEvents, loading: deliveryEventsLoading } =
    useDeliveryEvents();
  const navigateToPatientSheet = usePatientSheetNavigation();
  const profileUrl = scope === "doctor" ? ROUTES.doctorProfile : ROUTES.profile;

  const { cabinets: allCabinets } = useCabinetList();
  const { users: searchUsers } = useHeaderSearchUsers();

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    const patientResults = patients
      .filter(
        (p) =>
          matchesQuery(p.name, q) ||
          matchesQuery(p.ref, q) ||
          matchesQuery(p.cabinet, q)
      )
      .map((p) => ({ type: SEARCH_RESULT_TYPE.PATIENT, patient: p }));

    const cabinetResults = allCabinets
      .filter(
        (c) =>
          matchesQuery(c.name, q) ||
          matchesQuery(c.email, q) ||
          matchesQuery(c.slug, q) ||
          matchesQuery(c.id, q)
      )
      .map((c) => ({ type: SEARCH_RESULT_TYPE.CABINET, cabinet: c }));

    const userResults = searchUsers
      .filter(
        (u) =>
          matchesQuery(u.name, q) ||
          matchesQuery(u.login, q) ||
          matchesQuery(u.id, q)
      )
      .map((u) => ({
        type: u.isCompany
          ? SEARCH_RESULT_TYPE.COMPANY
          : SEARCH_RESULT_TYPE.DOCTOR,
        user: u,
      }));

    return [...patientResults, ...cabinetResults, ...userResults].slice(
      0,
      MAX_SEARCH_RESULTS
    );
  }, [patients, allCabinets, searchUsers, searchQuery]);

  const showSearchDropdown = searchQuery.trim().length > 0;

  useEffect(() => {
    setFocusedIndex(-1);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        showSearchDropdown &&
        searchWrapperRef.current &&
        !searchWrapperRef.current.contains(e.target)
      ) {
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSearchDropdown]);

  const handleSelectPatient = (patient) => {
    navigateToPatientSheet(patient);
  };

  const handleSelectCabinet = (slug) => {
    navigate(getCabinetEditRoute(pathname, slug));
  };

  const handleSelectUser = (userId) => {
    navigate(getUsersRoutes(pathname).userDetail(userId));
  };

  const handleDeliverySelect = (ev) => {
    navigateToPatientSheet(
      {
        case_id: ev.case_id,
        ref: String(ev.case_id),
        name: ev.name,
        cabinet: ev.cabinet,
      },
      {}
    );
  };

  const handleDisconnect = () => {
    setDropdownOpen(false);
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="main-header">
      <div className="header-left">
        <button
          className="hamburger-menu"
          onClick={toggleBothSidebars}
          aria-label={t("header.toggleNav")}
        >
          <i className="fas fa-bars"></i>
        </button>
        <LanguageDropdown className="header-language-desktop" />
      </div>
      <div className="header-center">
        <SearchDropdown
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchResults={searchResults}
          showSearchDropdown={showSearchDropdown}
          patientService={patientService}
          focusedIndex={focusedIndex}
          setFocusedIndex={setFocusedIndex}
          onSelectPatient={handleSelectPatient}
          onSelectCabinet={handleSelectCabinet}
          onSelectUser={handleSelectUser}
          searchWrapperRef={searchWrapperRef}
          listRef={listRef}
        />
      </div>
      <div className="header-right">
        <div className="header-notifications header-notifications--desktop">
          <DeliveryDropdown
            events={deliveryEvents}
            loading={deliveryEventsLoading}
            onSelectEvent={handleDeliverySelect}
          />
          <BellDropdown
            patients={bewarePatients}
            scope={scope}
            onSelectPatient={navigateToPatientSheet}
          />
        </div>
        <div className="header-notifications header-notifications--mobile">
          <MobileNotificationsDropdown
            deliveryEvents={deliveryEvents}
            deliveryLoading={deliveryEventsLoading}
            onSelectDeliveryEvent={handleDeliverySelect}
            bewarePatients={bewarePatients}
            scope={scope}
            onSelectPatient={navigateToPatientSheet}
          />
        </div>
        <UserMenuDropdown
          open={dropdownOpen}
          onOpenChange={setDropdownOpen}
          displayName={displayName}
          profileImageUrl={profileImageUrl}
          profileImageFallbackUrl={profileImageFallbackUrl}
          profileUrl={profileUrl}
          onProfileClick={(url) => navigate(url)}
          onDisconnect={handleDisconnect}
        />
      </div>
    </header>
  );
};

export default Header;
