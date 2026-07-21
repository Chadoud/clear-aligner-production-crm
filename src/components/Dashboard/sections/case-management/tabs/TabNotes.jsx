import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useRefreshCaseSheetOnMount } from "@/hooks";
import LoadingDonut from "@/components/shared/LoadingDonut/LoadingDonut";
import {
  getNotes,
  createNote,
  updateNote,
  deleteNote,
} from "@/services/userNotesService";

function getCaseId(patient) {
  if (!patient) return null;
  const id = patient.case_id;
  return id != null && Number.isFinite(id) ? String(id) : null;
}

export default function TabNotes({ patient, refreshCaseSheet }) {
  const { t } = useTranslation();
  useRefreshCaseSheetOnMount(refreshCaseSheet, patient?.case_id);
  const caseId = getCaseId(patient);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteText, setEditingNoteText] = useState("");

  const fetchNotes = useCallback(async () => {
    if (!caseId) {
      setNotes([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { notes: n } = await getNotes(caseId);
      setNotes(n ?? []);
    } catch (err) {
      setError(err?.message || t("caseMgmt.notes.loadFailed"));
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [caseId, t]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleAddNote = async () => {
    const text = noteDraft.trim();
    if (!text || !caseId || sending) return;
    setSending(true);
    try {
      await createNote(caseId, text);
      setNoteDraft("");
      await fetchNotes();
    } catch (err) {
      setError(err?.message || t("caseMgmt.notes.addFailed"));
    } finally {
      setSending(false);
    }
  };

  const handleUpdateNote = async () => {
    if (editingNoteId == null || !caseId || sending) return;
    const text = editingNoteText.trim();
    if (!text) return;
    setSending(true);
    try {
      await updateNote(caseId, editingNoteId, text);
      setEditingNoteId(null);
      setEditingNoteText("");
      await fetchNotes();
    } catch (err) {
      setError(err?.message || t("caseMgmt.notes.updateFailed"));
    } finally {
      setSending(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!caseId || sending) return;
    setSending(true);
    try {
      await deleteNote(caseId, noteId);
      if (editingNoteId === noteId) {
        setEditingNoteId(null);
        setEditingNoteText("");
      }
      await fetchNotes();
    } catch (err) {
      setError(err?.message || t("caseMgmt.notes.deleteFailed"));
    } finally {
      setSending(false);
    }
  };

  if (!patient) {
    return (
      <div className="form-section tab-panel">
        <p className="tab-panel-empty">{t("caseMgmt.notes.emptyPatient")}</p>
      </div>
    );
  }

  return (
    <div className="form-section tab-panel">
      <h3 className="tab-panel-title">{t("caseMgmt.notes.title")}</h3>
      <p className="tab-panel-description">
        {t("caseMgmt.notes.description", { name: patient.name })}
      </p>
      {error && (
        <div className="tab-panel-error" role="alert">
          {error}
        </div>
      )}
      <div className="tab-notes-panel">
        {loading && notes.length === 0 ? (
          <div className="tab-panel-loading-inline">
            <LoadingDonut size="sm" message={t("caseMgmt.notes.loading")} />
          </div>
        ) : (
          <>
            <ul className="tab-notes-list">
              {notes.map((note) => (
                <li key={note.noteId} className="tab-notes-item">
                  {editingNoteId === note.noteId ? (
                    <div className="tab-notes-edit">
                      <textarea
                        value={editingNoteText}
                        onChange={(e) => setEditingNoteText(e.target.value)}
                        rows={3}
                        className="tab-notes-textarea"
                        disabled={sending}
                      />
                      <div className="tab-notes-edit-actions">
                        <button
                          type="button"
                          className="btn-base btn-base--primary btn-sm"
                          onClick={handleUpdateNote}
                          disabled={sending || !editingNoteText.trim()}
                        >
                          {t("caseMgmt.notes.save")}
                        </button>
                        <button
                          type="button"
                          className="btn-base btn-base--secondary btn-sm"
                          onClick={() => {
                            setEditingNoteId(null);
                            setEditingNoteText("");
                          }}
                          disabled={sending}
                        >
                          {t("caseMgmt.notes.cancel")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="tab-notes-card">
                      <p className="tab-notes-text">{note.noteText}</p>
                      <span className="tab-notes-meta">
                        {note.createdAt?.slice(0, 10)}
                        {note.updatedAt !== note.createdAt &&
                          ` ${t("caseMgmt.notes.edited", { date: note.updatedAt?.slice(0, 10) })}`}
                      </span>
                      <div className="tab-notes-actions">
                        <button
                          type="button"
                          className="tab-notes-btn"
                          onClick={() => {
                            setEditingNoteId(note.noteId);
                            setEditingNoteText(note.noteText);
                          }}
                          aria-label={t("caseMgmt.notes.editAria")}
                        >
                          <i className="fas fa-edit" aria-hidden />
                        </button>
                        <button
                          type="button"
                          className="tab-notes-btn tab-notes-btn--danger"
                          onClick={() => handleDeleteNote(note.noteId)}
                          aria-label={t("caseMgmt.notes.deleteAria")}
                        >
                          <i className="fas fa-trash-alt" aria-hidden />
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {notes.length === 0 && !loading && (
              <p className="tab-chat-empty">{t("caseMgmt.notes.emptyList")}</p>
            )}
            <div className="tab-notes-add">
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder={t("caseMgmt.notes.placeholder")}
                rows={2}
                className="tab-notes-textarea"
                disabled={sending}
              />
              <button
                type="button"
                className="btn-base btn-base--primary"
                onClick={handleAddNote}
                disabled={!noteDraft.trim() || sending}
                aria-busy={sending}
              >
                {sending
                  ? t("caseMgmt.notes.adding")
                  : t("caseMgmt.notes.addNote")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
