import { useCallback } from "react";
import { useCabinetList, usePagination, useSearchFilter } from "@/hooks";
import CustomSelect from "@/components/shared/CustomSelect/CustomSelect";
import DataTable from "@/components/shared/DataTable/DataTable";
import Pagination from "@/components/shared/Pagination/Pagination";
import SearchInput from "@/components/shared/SearchInput/SearchInput";
import "./ListOfCabinets.css";

const COLUMNS = [
  { key: "id", label: "ID ↕" },
  { key: "name", label: "name ↕" },
  { key: "enteringDate", label: "entering date ↕" },
  { key: "email", label: "e-mail ↕" },
  { key: "actions", label: "Actions" },
];

export default function ListOfCabinets({ onEdit }) {
  const { cabinets, loading, error } = useCabinetList();

  const filterCabinet = useCallback((c, q) => {
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      String(c.id).includes(q)
    );
  }, []);

  const { query, setQuery, filteredItems } = useSearchFilter(
    cabinets,
    filterCabinet
  );
  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    pageCount,
    start,
    end,
    total,
    paginatedItems,
  } = usePagination(filteredItems, 10);

  const onSearchChange = useCallback(
    (value) => {
      setQuery(value);
      setPage(1);
    },
    [setQuery, setPage]
  );

  return (
    <section className="dashboard-section list-of-cabinets">
      <h1 className="section-title list-of-cabinets-title">
        <i className="fas fa-clipboard-list" aria-hidden />
        List of cabinets
      </h1>
      <div className="dashboard-section-card list-of-cabinets-card">
        <p className="list-of-cabinets-context">
          Account management · {loading ? "…" : total} cabinet
          {total !== 1 ? "s" : ""}
        </p>

        {error && (
          <p className="list-of-cabinets-error" role="alert">
            {error}
          </p>
        )}

        <div className="list-of-cabinets-controls">
          <SearchInput
            label="search:"
            value={query}
            onChange={onSearchChange}
            ariaLabel="Search cabinets"
          />
          <label className="list-show-label">
            show:
            <CustomSelect
              className="list-show-select"
              value={String(pageSize)}
              onChange={(v) => setPageSize(Number(v))}
              aria-label="Items per page"
              options={[10, 25, 50, 100].map((n) => ({
                value: String(n),
                label: String(n),
              }))}
            />
          </label>
        </div>

        {loading ? (
          <p className="list-of-cabinets-loading">Loading…</p>
        ) : (
          <DataTable
            columns={COLUMNS}
            rows={paginatedItems}
            rowKey="slug"
            renderCell={(row, key) => {
              if (key === "actions") {
                return (
                  <button
                    type="button"
                    className="cabinet-action-q"
                    onClick={() => onEdit(row.slug)}
                    title="Edit cabinet"
                    aria-label={`Edit ${row.name}`}
                  >
                    <i className="fas fa-search" aria-hidden />
                  </button>
                );
              }
              return row[key];
            }}
            tableClassName="list-of-cabinets-table"
          />
        )}

        <Pagination
          className="list-of-cabinets-pagination"
          page={page}
          pageCount={pageCount}
          start={start}
          end={end}
          total={total}
          onPageChange={setPage}
          variant="full"
        />
      </div>
    </section>
  );
}
