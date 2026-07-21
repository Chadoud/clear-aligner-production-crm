import CustomSelect from "@/components/shared/CustomSelect/CustomSelect";
import DataTable from "@/components/shared/DataTable/DataTable";
import Pagination from "@/components/shared/Pagination/Pagination";
import SearchInput from "@/components/shared/SearchInput/SearchInput";
import { CASE_COLUMNS } from "../config/constants";

export default function CabinetCasesSection({
  caseSearch,
  setCaseSearch,
  casePage,
  setCasePage,
  casePageSize,
  setPageSize,
  casePageCount,
  caseStart,
  caseEnd,
  caseTotal,
  caseRows,
  onNavigateToPatient,
}) {
  return (
    <div className="cabinet-section">
      <h2 className="cabinet-section-title">
        <i className="fas fa-list"></i>
        List of cases
      </h2>
      <div className="cabinet-cases-controls">
        <SearchInput
          label="search:"
          value={caseSearch}
          onChange={(v) => {
            setCaseSearch(v);
            setCasePage(1);
          }}
          ariaLabel="Search cases"
        />
        <label className="cabinet-cases-show-label">
          show:
          <CustomSelect
            value={String(casePageSize)}
            onChange={(v) => setPageSize(Number(v))}
            aria-label="Cases per page"
            options={[10, 25, 50].map((n) => ({
              value: String(n),
              label: String(n),
            }))}
          />
        </label>
      </div>
      <DataTable
        className="cabinet-cases-table-wrap"
        columns={CASE_COLUMNS}
        rows={caseRows}
        rowKey="ref"
        renderCell={(row, key) => {
          if (key === "actions") {
            return (
              <>
                <button
                  type="button"
                  className="case-action-btn case-action-edit"
                  title="View patient"
                  aria-label={`View patient ${row.ref}`}
                  onClick={() =>
                    onNavigateToPatient({
                      ref: row.ref,
                      case_id: row.case_id,
                      name: row.name,
                    })
                  }
                >
                  <i className="fas fa-search" aria-hidden />
                </button>
                <button
                  type="button"
                  className="case-action-btn case-action-delete"
                  title="Delete"
                  aria-label="Delete case"
                >
                  ✕
                </button>
              </>
            );
          }
          return row[key];
        }}
        tableClassName="cabinet-cases-table"
      />
      <Pagination
        className="cabinet-cases-pagination"
        page={casePage}
        pageCount={casePageCount}
        start={caseStart}
        end={caseEnd}
        total={caseTotal}
        onPageChange={setCasePage}
        variant="full"
      />
    </div>
  );
}
