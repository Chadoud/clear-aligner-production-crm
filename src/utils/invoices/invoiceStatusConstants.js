/**
 * Invoice status constants.
 * Replaces is_quote (0/1) with a full lifecycle status.
 *
 * @module utils/invoices/invoiceStatusConstants
 */

/** Quote - pending acceptance */
export const INVOICE_STATUS_QUOTE = 1;

/** In fabrication - accepted, in production */
export const INVOICE_STATUS_IN_FABRICATION = 2;

/** Paid - delivered, fully paid */
export const INVOICE_STATUS_PAID = 3;
