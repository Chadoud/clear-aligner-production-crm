# Where document filenames are stored

Schema notes for case document filename columns used by this CRM.

## case_docs (patient dossier)

| Column       | Content                                                                     |
| ------------ | --------------------------------------------------------------------------- |
| `docs_name`  | Stored filename on disk (hash, e.g. `a1b2c3d4e5f6789012345678abcdef01.jpg`) |
| `docs_title` | **Original display name** (e.g. `FILE_0001 (1).jpg`)                        |

**Where it is used:** CRM case dossier tabs (radiographs, photos, documents, 3D models) show `docs_title` and load files via `/data/uploads/{caseId}/{docs_name}`.

**How it is saved:** Uploads through `POST /api/v1/cases/:id/docs` store a generated `docs_name` on disk and keep the original name in `docs_title` (optional message may be appended).

**Because it is stored in the DB, `docs_title` syncs across devices and accounts.**

## reply_docs (Discussion attachments)

| Column     | Content                              |
| ---------- | ------------------------------------ |
| `doc_name` | Stored filename on disk (hash)       |
| `doc_type` | **Display name** (original filename) |

**New uploads:** Store the original filename in `doc_type`.

## Summary

- **case_docs** (Dossier du patient) → original name in `docs_title` ✓
- **reply_docs** (Discussion, Stripping, etc.) → display name in `doc_type` ✓
