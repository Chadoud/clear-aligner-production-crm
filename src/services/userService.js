/**
 * User service — application-level boundary for all user operations.
 * Components and hooks must import from here, not directly from UserRepository.
 */
export {
  fetchUsers,
  fetchUserById,
  createUser,
  updateUser,
  deleteUser,
  fetchRightsList,
  fetchUserRights,
  updateUserRights,
} from "@/repositories/UserRepository";
