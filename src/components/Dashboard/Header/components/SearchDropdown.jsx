import { useTranslation } from "react-i18next";
import LoadingDonut from "@/components/shared/LoadingDonut/LoadingDonut";
import { SEARCH_RESULT_TYPE } from "../config/constants";

function searchResultKey(result, index) {
  switch (result.type) {
    case SEARCH_RESULT_TYPE.PATIENT:
      return `patient-${result.patient?.ref}-${index}`;
    case SEARCH_RESULT_TYPE.CABINET:
      return `cabinet-${result.cabinet?.slug}-${index}`;
    case SEARCH_RESULT_TYPE.DOCTOR:
    case SEARCH_RESULT_TYPE.COMPANY:
      return `user-${result.user?.id}-${index}`;
    default:
      return `result-${index}`;
  }
}

function getSearchResultDisplay(result, t) {
  switch (result.type) {
    case SEARCH_RESULT_TYPE.PATIENT:
      return {
        name: result.patient?.name ?? "—",
        meta: t("search.meta.patientRef", { ref: result.patient?.ref ?? "—" }),
        detail: result.patient?.cabinet || "—",
        tag: t("search.tag.patient"),
      };
    case SEARCH_RESULT_TYPE.CABINET:
      return {
        name: result.cabinet?.name ?? "—",
        meta:
          result.cabinet?.email ||
          t("search.meta.cabinetId", { id: result.cabinet?.id ?? "—" }),
        detail: null,
        tag: t("search.tag.cabinet"),
      };
    case SEARCH_RESULT_TYPE.DOCTOR:
      return {
        name: result.user?.name ?? result.user?.login ?? "—",
        meta: result.user?.login ?? "—",
        detail: null,
        tag: t("search.tag.doctor"),
      };
    case SEARCH_RESULT_TYPE.COMPANY:
      return {
        name: result.user?.name ?? result.user?.login ?? "—",
        meta: result.user?.login ?? "—",
        detail: null,
        tag: t("search.tag.company"),
      };
    default:
      return { name: "—", meta: "", detail: null, tag: "" };
  }
}

export default function SearchDropdown({
  searchQuery,
  setSearchQuery,
  searchResults,
  showSearchDropdown,
  patientService,
  focusedIndex,
  setFocusedIndex,
  onSelectPatient,
  onSelectCabinet,
  onSelectUser,
  searchWrapperRef,
  listRef,
}) {
  const { t } = useTranslation();

  const closeDropdown = () => {
    setSearchQuery("");
    setFocusedIndex(-1);
  };

  const handleSelectSearchResult = (result) => {
    if (!result) return;
    if (result.type === SEARCH_RESULT_TYPE.PATIENT && result.patient) {
      onSelectPatient(result.patient);
      closeDropdown();
      return;
    }
    if (result.type === SEARCH_RESULT_TYPE.CABINET && result.cabinet) {
      onSelectCabinet(result.cabinet.slug);
      closeDropdown();
      return;
    }
    if (
      (result.type === SEARCH_RESULT_TYPE.DOCTOR ||
        result.type === SEARCH_RESULT_TYPE.COMPANY) &&
      result.user
    ) {
      onSelectUser(result.user.id);
      closeDropdown();
    }
  };

  const handleSearchKeyDown = (e) => {
    if (!showSearchDropdown || !patientService) return;
    const count = searchResults.length;
    if (e.key === "Escape") {
      e.preventDefault();
      closeDropdown();
      e.target.blur();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((i) => (i < count - 1 ? i + 1 : 0));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((i) => (i <= 0 ? count - 1 : i - 1));
      return;
    }
    if (e.key === "Enter" && focusedIndex >= 0 && searchResults[focusedIndex]) {
      e.preventDefault();
      handleSelectSearchResult(searchResults[focusedIndex]);
    }
  };

  return (
    <div className="search-box-wrapper" ref={searchWrapperRef}>
      <div className="search-box">
        <i className="fas fa-search"></i>
        <input
          type="text"
          placeholder={t("search.placeholder")}
          aria-label={t("search.ariaLabel")}
          aria-expanded={showSearchDropdown}
          aria-controls="search-results-listbox"
          aria-activedescendant={
            focusedIndex >= 0 ? `search-result-${focusedIndex}` : undefined
          }
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          autoComplete="off"
        />
      </div>
      {showSearchDropdown && (
        <div
          id="search-results-listbox"
          className="search-results-dropdown"
          role="listbox"
          aria-label={t("search.resultsAriaLabel")}
          ref={listRef}
        >
          {!patientService ? (
            <div className="search-results-empty">
              <LoadingDonut size="sm" message={t("search.loading")} />
            </div>
          ) : searchResults.length === 0 ? (
            <div className="search-results-empty">
              {t("search.noResults", { query: searchQuery.trim() })}
            </div>
          ) : (
            <div className="search-results-list">
              {searchResults.map((result, index) => {
                const display = getSearchResultDisplay(result, t);
                return (
                  <button
                    key={searchResultKey(result, index)}
                    id={`search-result-${index}`}
                    type="button"
                    className={`search-results-item ${index === focusedIndex ? "search-results-item-focused" : ""}`}
                    role="option"
                    aria-selected={index === focusedIndex}
                    onClick={() => handleSelectSearchResult(result)}
                    onMouseEnter={() => setFocusedIndex(index)}
                  >
                    <div className="search-results-item-main">
                      <span className="search-results-item-name">
                        {display.name}
                      </span>
                      <span className="search-results-item-ref">
                        {display.meta}
                      </span>
                    </div>
                    <div className="search-results-item-aside">
                      <span
                        className={`search-result-tag search-result-tag--${result.type}`}
                      >
                        {display.tag}
                      </span>
                      {display.detail ? (
                        <span className="search-results-item-cabinet">
                          {display.detail}
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
