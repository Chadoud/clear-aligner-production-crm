/**
 * Price calculation utilities — re-exports shared domain logic.
 * @see packages/domain
 */
export {
  calculateServicePrice,
  calculateTotalFromServices,
  calculateServicesSumExcludingLab,
  calculateLabPrice,
  calculateTotalPoints,
  distributeTotalAcrossServices,
} from "@aligner-crm/domain";
