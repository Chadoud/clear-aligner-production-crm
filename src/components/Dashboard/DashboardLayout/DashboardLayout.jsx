import Sidebar from "../Sidebar/Sidebar";
import Header from "../Header/Header";
import RightSidebar from "../RightSidebar/RightSidebar";
import NotificationWatcher from "../NotificationWatcher";
import DiscussionRealtimeWatcher from "../DiscussionRealtimeWatcher";
import { useDashboard } from "@/context/DashboardContext";

/**
 * Shell layout: sidebar, header, main content area, right sidebar.
 * Left nav and patients panel share one open/close state on desktop.
 */
export default function DashboardLayout({ children }) {
  const { sidebarOpen, rightSidebarEnabled, closeBothSidebars } =
    useDashboard();

  const showRightSidebar = sidebarOpen && rightSidebarEnabled;

  return (
    <div
      className={`dashboard-container ${sidebarOpen ? "left-sidebar-open" : ""} ${showRightSidebar ? "right-sidebar-open" : ""}`}
    >
      {(sidebarOpen || showRightSidebar) && (
        <div
          className="sidebar-overlay"
          onClick={closeBothSidebars}
          role="button"
          tabIndex={0}
          aria-label="Close sidebars"
          onKeyDown={(e) => e.key === "Enter" && closeBothSidebars()}
        />
      )}
      <Sidebar isOpen={sidebarOpen} onClose={closeBothSidebars} />
      <Header />
      <main className="main-content">
        <NotificationWatcher />
        <DiscussionRealtimeWatcher />
        {children}
      </main>
      {rightSidebarEnabled && (
        <RightSidebar isOpen={showRightSidebar} onClose={closeBothSidebars} />
      )}
    </div>
  );
}
