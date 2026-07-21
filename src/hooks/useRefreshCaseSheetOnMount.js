/**
 * Previously invalidated + refetched the case sheet on every tab mount, which
 * stormed the API under rate limits. Case sheet loading is owned by useCaseSheet
 * on caseId change; tab remounts keep the in-memory sheet.
 *
 * Hook kept so call sites need not change (extra args ignored).
 */
export function useRefreshCaseSheetOnMount() {
  // no-op
}
