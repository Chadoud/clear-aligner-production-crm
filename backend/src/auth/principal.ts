export {
  getPrincipal,
  requirePrincipal,
  toPrincipal,
  type RequestPrincipal,
} from "../modules/auth/domain/principal.js";
export {
  assertCaseAccess as enforceCaseAccess,
  assertCompany as enforceCompany,
  doctorCabinetId,
  isCompany,
} from "../security/policies/index.js";
