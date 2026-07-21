/**
 * FileUploadZone – drag-and-drop file upload area.
 *
 * Props:
 *   files    File[] – controlled list of selected files
 *   onChange (File[]) => void
 *   accept   string  – HTML input accept attribute
 *   label    string  – placeholder text
 *   multiple boolean – allow multiple files (default true)
 */
import { useRef, useState } from "react";
import "./FileUploadZone.css";

export default function FileUploadZone({
  files = [],
  onChange,
  accept = "*",
  label = "Drop files here or click to browse",
  multiple = true,
}) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const addFiles = (incoming) => {
    const list = Array.from(incoming);
    const merged = multiple
      ? [
          ...files,
          ...list.filter(
            (f) => !files.some((e) => e.name === f.name && e.size === f.size)
          ),
        ]
      : [list[0]];
    onChange(merged.filter(Boolean));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  const handleChange = (e) => {
    if (e.target.files.length) {
      addFiles(e.target.files);
      e.target.value = "";
    }
  };

  const removeFile = (idx) => {
    onChange(files.filter((_, i) => i !== idx));
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fuz-wrap">
      {/* Drop zone */}
      <div
        className={`fuz-zone ${dragging ? "fuz-zone--over" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        aria-label={label}
      >
        <i className="fas fa-cloud-upload-alt fuz-upload-icon" aria-hidden />
        <span className="fuz-label">{label}</span>
        <span className="fuz-sublabel">
          {accept !== "*" ? `Accepted: ${accept}` : "All file types accepted"}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          className="fuz-input"
          aria-hidden
          tabIndex={-1}
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <ul className="fuz-file-list" aria-label="Uploaded files">
          {files.map((file, idx) => (
            <li key={`${file.name}-${idx}`} className="fuz-file-item">
              <i
                className={`${getFileIcon(file.name)} fuz-file-icon`}
                aria-hidden
              />
              <span className="fuz-file-name" title={file.name}>
                {file.name}
              </span>
              <span className="fuz-file-size">{formatSize(file.size)}</span>
              <button
                type="button"
                className="fuz-file-remove"
                onClick={() => removeFile(idx)}
                aria-label={`Remove ${file.name}`}
              >
                <i className="fas fa-times" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function getFileIcon(name) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext))
    return "fas fa-image";
  if (["pdf"].includes(ext)) return "fas fa-file-pdf";
  if (["doc", "docx"].includes(ext)) return "fas fa-file-word";
  if (["stl", "obj", "ply", "3mf"].includes(ext)) return "fas fa-cube";
  return "fas fa-file";
}
