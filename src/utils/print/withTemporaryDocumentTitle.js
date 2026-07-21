export function withTemporaryDocumentTitle(
  title,
  action = () => window.print()
) {
  const prevTitle = document.title;
  document.title = String(title || prevTitle || "document");
  const onAfterPrint = () => {
    document.title = prevTitle;
    window.removeEventListener("afterprint", onAfterPrint);
  };
  window.addEventListener("afterprint", onAfterPrint);
  action();
}
