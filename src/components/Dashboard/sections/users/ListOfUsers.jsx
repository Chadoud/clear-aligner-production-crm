import { useCallback, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useUserList } from "@/hooks";
import { getUsersRoutes } from "@/routes/sectionConfig";
import DataTable from "@/components/shared/DataTable/DataTable";
import Pagination from "@/components/shared/Pagination/Pagination";
import SearchInput from "@/components/shared/SearchInput/SearchInput";
import IconButton from "@/components/shared/IconButton/IconButton";
import LoadingDonut from "@/components/shared/LoadingDonut/LoadingDonut";
import "./ListOfUsers.css";

const BASE_COLUMNS = [
  { key: "id", label: "ID", sortable: true },
  { key: "login", label: "Login", sortable: true },
  { key: "name", label: "Name", sortable: true },
  { key: "enteringDate", label: "Entering date", sortable: true },
  { key: "actions", label: "Actions", sortable: false },
];

const STATUS_TABS = [
  { value: 1, label: "Active" },
  { value: 2, label: "Pending" },
  { value: -1, label: "Refused" },
];

const PAGE_SIZES = [5, 10, 25, 50];

function userStatusLabel(status) {
  if (status === 2) return "Pending";
  if (status === -1) return "Refused";
  if (status === 1) return "Active";
  return String(status ?? "—");
}

export default function ListOfUsers() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { isCompany } = useAuth();
  const userRoutes = useMemo(() => getUsersRoutes(pathname), [pathname]);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState(1);

  const columns = useMemo(() => {
    if (!isCompany || statusFilter === 1) return BASE_COLUMNS;
    const next = [...BASE_COLUMNS];
    next.splice(4, 0, {
      key: "statusLabel",
      label: "Status",
      sortable: true,
    });
    return next;
  }, [isCompany, statusFilter]);

  const {
    users,
    total,
    loading,
    error,
    page,
    setPage,
    pageCount,
    query,
    setQuery,
    sortBy,
    sortOrder,
    handleSort,
  } = useUserList({ status: isCompany ? statusFilter : 1, pageSize });

  const onSearchChange = useCallback((value) => setQuery(value), [setQuery]);

  const onPageSizeChange = useCallback(
    (size) => {
      setPageSize(size);
      setPage(1);
    },
    [setPage]
  );

  const onStatusChange = useCallback(
    (status) => {
      setStatusFilter(status);
      setPage(1);
    },
    [setPage]
  );

  const onColumnSort = useCallback(
    (columnKey) => {
      if (columnKey === "actions") return;
      if (columnKey === "statusLabel") {
        handleSort("status");
        return;
      }
      handleSort(columnKey);
    },
    [handleSort]
  );

  const activeSortBy =
    sortBy === "status" && columns.some((col) => col.key === "statusLabel")
      ? "statusLabel"
      : sortBy;

  const tableRows = useMemo(
    () =>
      users.map((user) => ({
        ...user,
        statusLabel: userStatusLabel(user.status),
      })),
    [users]
  );

  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const statusTabLabel =
    STATUS_TABS.find((tab) => tab.value === statusFilter)?.label ?? "Active";

  return (
    <section className="dashboard-section list-of-users">
      <h1 className="section-title list-of-users-title">
        <i className="fas fa-list" aria-hidden />
        List of users
      </h1>
      <div className="dashboard-section-card list-of-users-card">
        <p className="list-of-users-context">
          user management · {loading ? "…" : total}{" "}
          {isCompany && statusFilter !== 1 ? statusTabLabel.toLowerCase() : ""}{" "}
          user{total !== 1 ? "s" : ""}
        </p>

        {isCompany && (
          <div className="list-of-users-status-tabs" role="tablist">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={statusFilter === tab.value}
                className={
                  statusFilter === tab.value
                    ? "list-of-users-status-tab active"
                    : "list-of-users-status-tab"
                }
                onClick={() => onStatusChange(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {error && (
          <p className="list-of-users-error" role="alert">
            {error}
          </p>
        )}

        <div className="list-of-users-controls">
          <SearchInput
            value={query}
            onChange={onSearchChange}
            placeholder="Search"
            ariaLabel="Search users"
          />
          <IconButton variant="primary" icon="fas fa-search">
            search
          </IconButton>
        </div>

        {loading ? (
          <LoadingDonut
            size="md"
            message="Loading users…"
            className="list-of-users-loading"
          />
        ) : (
          <DataTable
            columns={columns}
            rows={tableRows}
            rowKey="id"
            sortBy={activeSortBy}
            sortOrder={sortOrder}
            onSort={onColumnSort}
            renderCell={(row, key) => {
              if (key === "actions") {
                return (
                  <IconButton
                    variant="secondary"
                    icon="fas fa-search"
                    title="View user"
                    aria-label={`View ${row.name}`}
                    onClick={() => navigate(userRoutes.userDetail(row.id))}
                    className="user-action-view"
                  />
                );
              }
              return row[key];
            }}
            tableClassName="list-of-users-table"
          />
        )}

        <Pagination
          className="list-of-users-pagination"
          page={page}
          pageCount={pageCount}
          start={start}
          end={end}
          total={total}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={onPageSizeChange}
          pageSizeOptions={PAGE_SIZES}
          variant="compact"
        />
      </div>
    </section>
  );
}
