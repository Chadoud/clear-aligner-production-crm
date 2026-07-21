import { describe, expect, it } from "vitest";
import {
  DISCUSSION_REPLY_TYPE as frontendDiscussionReplyType,
  GENERAL_REPLY_TYPE as frontendGeneralReplyType,
} from "@/services/discussionService.js";
import {
  DISCUSSION_REPLY_TYPE as backendDiscussionReplyType,
  GENERAL_REPLY_TYPE as backendGeneralReplyType,
} from "../../backend/src/constants/replyTypes.ts";

describe("reply type parity", () => {
  it("keeps frontend and backend discussion/general reply types in sync", () => {
    expect(frontendDiscussionReplyType).toBe(backendDiscussionReplyType);
    expect(frontendGeneralReplyType).toBe(backendGeneralReplyType);
  });
});
