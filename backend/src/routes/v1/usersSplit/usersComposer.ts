import type { FastifyInstance } from "fastify";
import { registerUsersCrudRoutes } from "./usersCrudRoutes.js";
import { registerUsersRightsRoutes } from "./usersRightsRoutes.js";

export async function userRoutes(app: FastifyInstance): Promise<void> {
  registerUsersCrudRoutes(app);
  registerUsersRightsRoutes(app);
}
