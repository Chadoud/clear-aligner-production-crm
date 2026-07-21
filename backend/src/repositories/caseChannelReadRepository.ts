import { mysqlQuery } from "../db/mysql.js";

export type CaseChannel = "general" | "doctor";

let tableEnsured = false;

async function ensureTable(): Promise<void> {
  if (tableEnsured) return;
  await mysqlQuery(`
    CREATE TABLE IF NOT EXISTS mob_case_channel_read (
      user_id int(11) NOT NULL COMMENT 'users.user_id (doctor/lab) or patient case_id',
      case_id int(11) NOT NULL,
      channel varchar(16) NOT NULL COMMENT 'general or doctor',
      read_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, case_id, channel),
      KEY idx_mob_case_channel_read_case (case_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  tableEnsured = true;
}

function normalizeChannel(channel: string): CaseChannel {
  return String(channel || "")
    .trim()
    .toLowerCase() === "doctor"
    ? "doctor"
    : "general";
}

export async function markCaseChannelRead(
  userId: number,
  caseId: number,
  channel: CaseChannel,
  readAt: Date = new Date()
): Promise<void> {
  const uid = Number(userId);
  const cid = Number(caseId);
  if (!Number.isFinite(uid) || uid <= 0 || !Number.isFinite(cid) || cid <= 0) {
    return;
  }
  const at =
    readAt instanceof Date && !Number.isNaN(readAt.getTime())
      ? readAt
      : new Date();
  await ensureTable();
  await mysqlQuery(
    `INSERT INTO mob_case_channel_read (user_id, case_id, channel, read_at)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE read_at = GREATEST(read_at, VALUES(read_at))`,
    [uid, cid, normalizeChannel(channel), at]
  );
}

/** CRM discussion tab id → mobile channel id. */
export function channelForReplyType(typeParam: string): CaseChannel {
  return String(typeParam || "")
    .trim()
    .toLowerCase() === "general"
    ? "general"
    : "doctor";
}

/** Mark read through the latest message in the channel (avoids clock-skew false unread). */
export async function resolveMarkReadTimestamp(
  caseId: number,
  channel: CaseChannel
): Promise<Date> {
  const cid = Number(caseId);
  if (!Number.isFinite(cid) || cid <= 0) return new Date();

  const replyType = channel === "doctor" ? 0 : 21;
  const candidates: Date[] = [];

  try {
    const replyRows = await mysqlQuery<{ last_at: string | null }>(
      `SELECT MAX(reply_created) AS last_at FROM tbl_reply
       WHERE case_idx = ? AND reply_type = ?`,
      [cid, replyType]
    );
    if (replyRows[0]?.last_at) candidates.push(new Date(replyRows[0].last_at));
  } catch {
    /* non-fatal */
  }

  if (channel === "general") {
    try {
      const chatRows = await mysqlQuery<{ last_at: string | null }>(
        `SELECT MAX(chat_created) AS last_at FROM tbl_chat WHERE case_idx = ?`,
        [cid]
      );
      if (chatRows[0]?.last_at) candidates.push(new Date(chatRows[0].last_at));
    } catch {
      /* non-fatal */
    }
  }

  const times = candidates
    .map((d) => d.getTime())
    .filter((t) => Number.isFinite(t));
  if (!times.length) return new Date();
  return new Date(Math.max(...times));
}

function toIso(value: unknown): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function maxIso(
  a: string | null | undefined,
  b: string | null | undefined
): string | null {
  if (!a) return b || null;
  if (!b) return a || null;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

export type ChannelReadState = Partial<Record<CaseChannel, string>>;

/** @returns map keyed by case id string */
export async function getReadStateForUser(
  userId: number,
  rawCaseIds: number[]
): Promise<Record<string, ChannelReadState>> {
  const uid = Number(userId);
  const caseIds = [
    ...new Set(
      rawCaseIds
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0)
    ),
  ];
  if (!Number.isFinite(uid) || uid <= 0 || !caseIds.length) return {};

  await ensureTable();
  const ph = caseIds.map(() => "?").join(",");
  const rows = await mysqlQuery<{
    case_id: number;
    channel: string;
    read_at: string;
  }>(
    `SELECT case_id, channel, read_at
     FROM mob_case_channel_read
     WHERE user_id = ? AND case_id IN (${ph})`,
    [uid, ...caseIds]
  );

  const state: Record<string, ChannelReadState> = {};
  for (const row of rows || []) {
    const caseId = String(row.case_id);
    const channel = normalizeChannel(row.channel);
    const iso = toIso(row.read_at);
    if (!iso) continue;
    state[caseId] ??= {};
    const merged = maxIso(state[caseId][channel], iso);
    if (merged) state[caseId][channel] = merged;
  }
  return state;
}

export async function resolveReadStateForFeed(options: {
  viewerUserId?: number;
  caseIds?: number[];
}): Promise<Record<string, ChannelReadState>> {
  const viewerUserId = Number(options.viewerUserId);
  const caseIds = Array.isArray(options.caseIds) ? options.caseIds : [];
  if (!Number.isFinite(viewerUserId) || viewerUserId <= 0 || !caseIds.length) {
    return {};
  }
  return getReadStateForUser(viewerUserId, caseIds);
}
