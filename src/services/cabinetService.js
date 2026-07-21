/**
 * Cabinet service — application-level boundary for all cabinet operations.
 * Components and hooks must import from here, not directly from CabinetRepository.
 */
export {
  fetchCabinets,
  fetchCabinetBySlug,
  fetchCabinetById,
  updateCabinet,
  uploadCabinetLogo,
  removeCabinetLogo,
  createCabinet,
} from "@/repositories/CabinetRepository";
