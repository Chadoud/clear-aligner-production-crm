/**
 * Case channel unread stats (General + Doctor) for CRM badges — shared DB with mobile.
 */
import { mysqlQuery } from "../db/mysql.js";
import {
  resolveReadStateForFeed,
  type CaseChannel,
  type ChannelReadState,
} from "./caseChannelReadRepository.js";
import {
  DISCUSSION_REPLY_TYPE,
  GENERAL_REPLY_TYPE,
} from "./replyRepository.js";

export interface CaseFeedStats {
  lastGeneralAt: string | null;
  lastDoctorAt: string | null;
  unreadGeneralCount: number;
  unreadDoctorCount: number;
  lastActivityAt: string | null;
}

function toIso(value: unknown): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function maxIso(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

function readAtForCase(
  readState: Record<string, ChannelReadState>,
  caseId: number,
  channel: CaseChannel
): Date | null {
  const entry = readState[String(caseId)];
  const raw = entry?.[channel];
  if (typeof raw !== "string" || !raw.trim()) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function countUnreadForCaseChannel(
  caseId: number,
  channel: CaseChannel,
  readAt: Date | null,
  excludeUserId: number
): Promise<number> {
  const cid = Number(caseId);
  if (!Number.isFinite(cid) || cid <= 0) return 0;

  const replyType =
    channel === "doctor" ? DISCUSSION_REPLY_TYPE : GENERAL_REPLY_TYPE;
  const sinceClause = readAt ? " AND reply_created > ?" : "";
  const sinceParams = readAt ? [readAt] : [];
  const excludeUid = Number(excludeUserId);
  const excludeClause =
    Number.isFinite(excludeUid) && excludeUid > 0 ? " AND user_idx <> ?" : "";
  const excludeParams =
    Number.isFinite(excludeUid) && excludeUid > 0 ? [excludeUid] : [];

  let count = 0;
  try {
    const replyRows = await mysqlQuery<{ cnt: number }>(
      `SELECT COUNT(*) AS cnt FROM tbl_reply
       WHERE case_idx = ? AND reply_type = ?${sinceClause}${excludeClause}`,
      [cid, replyType, ...sinceParams, ...excludeParams]
    );
    count += Number(replyRows[0]?.cnt) || 0;
  } catch {
    /* non-fatal */
  }

  if (channel === "general") {
    try {
      const chatSince = readAt ? " AND chat_created > ?" : "";
      const chatExclude =
        Number.isFinite(excludeUid) && excludeUid > 0
          ? " AND user_idx <> ?"
          : "";
      const chatRows = await mysqlQuery<{ cnt: number }>(
        `SELECT COUNT(*) AS cnt FROM tbl_chat WHERE case_idx = ?${chatSince}${chatExclude}`,
        [cid, ...sinceParams, ...excludeParams]
      );
      count += Number(chatRows[0]?.cnt) || 0;
    } catch {
      /* non-fatal */
    }
  }

  return count;
}

async function mergeChatLastGeneralAt(
  caseIds: number[],
  lastReplyMap: Map<string, string | null>
): Promise<void> {
  if (!caseIds.length) return;
  const ph = caseIds.map(() => "?").join(",");
  try {
    const chatRows = await mysqlQuery<{ case_idx: number; last_at: string }>(
      `SELECT case_idx, MAX(chat_created) AS last_at
       FROM tbl_chat
       WHERE case_idx IN (${ph})
       GROUP BY case_idx`,
      caseIds
    );
    for (const row of chatRows || []) {
      const chatIso = toIso(row.last_at);
      if (!chatIso) continue;
      const key = `${row.case_idx}:${GENERAL_REPLY_TYPE}`;
      lastReplyMap.set(key, maxIso(lastReplyMap.get(key) ?? null, chatIso));
    }
  } catch {
    /* non-fatal */
  }
}

async function buildFeedStats(
  caseId: number,
  readState: Record<string, ChannelReadState>,
  lastGeneralAt: string | null,
  lastDoctorAt: string | null,
  viewerUserId: number
): Promise<CaseFeedStats> {
  const generalRead = readAtForCase(readState, caseId, "general");
  const doctorRead = readAtForCase(readState, caseId, "doctor");

  let unreadGeneralCount = 0;
  if (lastGeneralAt) {
    unreadGeneralCount = await countUnreadForCaseChannel(
      caseId,
      "general",
      generalRead,
      viewerUserId
    );
  }

  let unreadDoctorCount = 0;
  if (lastDoctorAt) {
    unreadDoctorCount = await countUnreadForCaseChannel(
      caseId,
      "doctor",
      doctorRead,
      viewerUserId
    );
  }

  return {
    lastGeneralAt,
    lastDoctorAt,
    unreadGeneralCount,
    unreadDoctorCount,
    lastActivityAt: maxIso(lastGeneralAt, lastDoctorAt),
  };
}

/** Batch unread stats per case id for the logged-in CRM user. */
export async function getFeedStatsForCaseIds(
  rawCaseIds: number[],
  options: { viewerUserId?: number } = {}
): Promise<Map<number, CaseFeedStats>> {
  const caseIds = [
    ...new Set(
      rawCaseIds
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0)
    ),
  ];
  const statsMap = new Map<number, CaseFeedStats>();
  if (!caseIds.length) return statsMap;

  const viewerUserId = Number(options.viewerUserId);
  const readState = await resolveReadStateForFeed({
    viewerUserId,
    caseIds,
  });

  const lastReplyMap = new Map<string, string | null>();
  try {
    const ph = caseIds.map(() => "?").join(",");
    const rows = await mysqlQuery<{
      case_idx: number;
      reply_type: number;
      last_at: string;
    }>(
      `SELECT r.case_idx, r.reply_type, MAX(r.reply_created) AS last_at
       FROM tbl_reply r
       WHERE r.case_idx IN (${ph})
         AND r.reply_type IN (?, ?)
       GROUP BY r.case_idx, r.reply_type`,
      [...caseIds, GENERAL_REPLY_TYPE, DISCUSSION_REPLY_TYPE]
    );
    for (const row of rows || []) {
      lastReplyMap.set(`${row.case_idx}:${row.reply_type}`, toIso(row.last_at));
    }
  } catch {
    /* non-fatal */
  }
  await mergeChatLastGeneralAt(caseIds, lastReplyMap);

  await Promise.all(
    caseIds.map(async (caseId) => {
      const lastGeneralAt =
        lastReplyMap.get(`${caseId}:${GENERAL_REPLY_TYPE}`) ?? null;
      const lastDoctorAt =
        lastReplyMap.get(`${caseId}:${DISCUSSION_REPLY_TYPE}`) ?? null;
      const feedStats = await buildFeedStats(
        caseId,
        readState,
        lastGeneralAt,
        lastDoctorAt,
        viewerUserId
      );
      statsMap.set(caseId, feedStats);
    })
  );

  return statsMap;
}
