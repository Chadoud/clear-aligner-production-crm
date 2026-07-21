import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/repositories/userRepository.js", () => ({
  getUserRights: vi.fn(),
  listSidebarRights: vi.fn(),
}));

import {
  getUserRights,
  listSidebarRights,
} from "../../src/repositories/userRepository.js";
import {
  userHasAnySidebarName,
  userHasChildRightUnderParentName,
} from "../../src/security/delegatedSidebarAccess.js";

describe("delegatedSidebarAccess", () => {
  beforeEach(() => {
    vi.mocked(getUserRights).mockReset();
    vi.mocked(listSidebarRights).mockReset();
  });

  it("userHasAnySidebarName is true when assigned id matches a candidate name", async () => {
    vi.mocked(getUserRights).mockResolvedValue([5]);
    vi.mocked(listSidebarRights).mockResolvedValue([
      {
        id: 5,
        identify: "u_list",
        name: "List of users",
        parentId: 0,
        hasChildren: 0,
      },
    ]);
    await expect(
      userHasAnySidebarName(1, ["List of users", "List of user"])
    ).resolves.toBe(true);
  });

  it("userHasAnySidebarName is false when name does not match", async () => {
    vi.mocked(getUserRights).mockResolvedValue([5]);
    vi.mocked(listSidebarRights).mockResolvedValue([
      {
        id: 5,
        identify: "x",
        name: "Other",
        parentId: 0,
        hasChildren: 0,
      },
    ]);
    await expect(userHasAnySidebarName(1, ["List of users"])).resolves.toBe(
      false
    );
  });

  it("userHasChildRightUnderParentName matches child under parent", async () => {
    vi.mocked(getUserRights).mockResolvedValue([10]);
    vi.mocked(listSidebarRights).mockResolvedValue([
      {
        id: 1,
        identify: "users_parent",
        name: "Users",
        parentId: 0,
        hasChildren: 1,
      },
      {
        id: 10,
        identify: "users_edit",
        name: "Edit",
        parentId: 1,
        hasChildren: 0,
      },
    ]);
    await expect(
      userHasChildRightUnderParentName(2, "users", ["edit"])
    ).resolves.toBe(true);
  });
});
