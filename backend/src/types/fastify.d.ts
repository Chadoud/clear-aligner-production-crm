import "fastify";
import type { RequestPrincipal } from "../modules/auth/domain/principal.js";

declare module "fastify" {
  interface FastifyRequest {
    principal?: RequestPrincipal;
  }
}
