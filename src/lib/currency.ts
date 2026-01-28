/**
 * Currency formatting utilities for Ghana Cedis (GH₵)
 */

export const CURRENCY_SYMBOL = "GH₵";

/**
 * Format a number as Ghana Cedis currency
 */
export function formatCurrency(amount: number): string {
  return `${CURRENCY_SYMBOL}${amount.toFixed(2)}`;
}

/**
 * Format a number as Ghana Cedis without decimals
 */
export function formatCurrencyWhole(amount: number): string {
  return `${CURRENCY_SYMBOL}${Math.round(amount)}`;
}
