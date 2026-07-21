import {
  useState,
  useCallback,
  useEffect,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from "react";
import { createSafeContext } from "@/core/context/createSafeContext";

const RIGHT_SIDEBAR_MIN_WIDTH_PX = 769;
const MOBILE_MAX_WIDTH_PX = 768;

function canUseRightSidebar() {
  return (
    typeof window !== "undefined" &&
    window.innerWidth >= RIGHT_SIDEBAR_MIN_WIDTH_PX
  );
}

function isMobileViewport() {
  return (
    typeof window !== "undefined" && window.innerWidth <= MOBILE_MAX_WIDTH_PX
  );
}

interface DashboardContextValue {
  selectedPatient: unknown;
  setSelectedPatient: (p: unknown) => void;
  sidebarOpen: boolean;
  rightSidebarOpen: boolean;
  rightSidebarEnabled: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  openRightSidebar: () => void;
  closeRightSidebar: () => void;
  toggleRightSidebar: () => void;
  closeBothSidebars: () => void;
  toggleBothSidebars: () => void;
  /** Sidebar section ids with expanded submenus (survives route remounts). */
  navOpenSubmenus: Set<string>;
  expandNavSubmenu: (id: string) => void;
  toggleNavSubmenu: (id: string) => void;
  setNavOpenSubmenus: Dispatch<SetStateAction<Set<string>>>;
  scope: string;
  actor: unknown;
}

const [DashboardContextBase, useDashboard] =
  createSafeContext<DashboardContextValue>("DashboardContext");
export { useDashboard };

interface DashboardProviderProps {
  children: ReactNode;
  scope?: string;
  actor?: unknown;
}

export function DashboardProvider({
  children,
  scope = "company",
  actor = null,
}: DashboardProviderProps) {
  const [selectedPatient, setSelectedPatient] = useState<unknown>(null);
  const [navOpenSubmenus, setNavOpenSubmenus] = useState<Set<string>>(
    () => new Set()
  );
  const [sidebarsOpen, setSidebarsOpen] = useState(() => !isMobileViewport());
  const [rightSidebarEnabled, setRightSidebarEnabled] =
    useState(canUseRightSidebar);
  const sidebarOpen = sidebarsOpen;
  const rightSidebarOpen = sidebarsOpen && rightSidebarEnabled;

  useEffect(() => {
    const mq = window.matchMedia(
      `(min-width: ${RIGHT_SIDEBAR_MIN_WIDTH_PX}px)`
    );
    const onChange = () => {
      setRightSidebarEnabled(mq.matches);
    };
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    setNavOpenSubmenus(new Set());
  }, [scope]);

  const expandNavSubmenu = useCallback((id: string) => {
    setNavOpenSubmenus((prev) => {
      if (prev.has(id)) return prev;
      return new Set([...prev, id]);
    });
  }, []);

  const toggleNavSubmenu = useCallback((id: string) => {
    setNavOpenSubmenus((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH_PX}px)`);
    const onChange = () => {
      if (mq.matches) {
        setSidebarsOpen(false);
      }
    };
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const closeBothSidebars = useCallback(() => {
    setSidebarsOpen(false);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarsOpen(false);
  }, []);

  const closeRightSidebar = useCallback(() => {
    setSidebarsOpen(false);
  }, []);

  const openSidebar = useCallback(() => {
    setSidebarsOpen(true);
  }, []);

  const openRightSidebar = useCallback(() => {
    setSidebarsOpen(true);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarsOpen((v) => !v);
  }, []);

  const toggleRightSidebar = useCallback(() => {
    setSidebarsOpen((v) => !v);
  }, []);

  const toggleBothSidebars = useCallback(() => {
    setSidebarsOpen((v) => !v);
  }, []);

  const value: DashboardContextValue = {
    selectedPatient,
    setSelectedPatient,
    sidebarOpen,
    rightSidebarOpen,
    rightSidebarEnabled,
    openSidebar,
    closeSidebar,
    toggleSidebar,
    openRightSidebar,
    closeRightSidebar,
    toggleRightSidebar,
    closeBothSidebars,
    toggleBothSidebars,
    navOpenSubmenus,
    expandNavSubmenu,
    toggleNavSubmenu,
    setNavOpenSubmenus,
    scope,
    actor,
  };

  return (
    <DashboardContextBase.Provider value={value}>
      {children}
    </DashboardContextBase.Provider>
  );
}
