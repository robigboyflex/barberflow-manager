/**
 * Salary period utility
 * Periods start from March 23, 2026 and recur every 2 weeks.
 * Payment is due on the first day of each new period.
 */

const EPOCH = new Date(2026, 2, 23); // March 23, 2026
const PERIOD_DAYS = 14; // 2 weeks

export interface SalaryPeriod {
  start: Date;
  end: Date;
  paymentDueDate: Date;
  /** Whether today is on or past the payment due date for this period */
  isDue: boolean;
  label: string;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function toDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Get the current salary period and the previous one.
 */
export function getSalaryPeriods(referenceDate: Date = new Date()): {
  current: SalaryPeriod;
  previous: SalaryPeriod | null;
} {
  const ref = new Date(referenceDate);
  ref.setHours(0, 0, 0, 0);

  const epochMs = EPOCH.getTime();
  const refMs = ref.getTime();
  const diffMs = refMs - epochMs;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const periodIndex = Math.max(0, Math.floor(diffDays / PERIOD_DAYS));

  const currentStart = new Date(EPOCH);
  currentStart.setDate(currentStart.getDate() + periodIndex * PERIOD_DAYS);

  const currentEnd = new Date(currentStart);
  currentEnd.setDate(currentEnd.getDate() + PERIOD_DAYS - 1);

  // Payment is due on the day after the period ends (start of next period)
  const paymentDue = new Date(currentEnd);
  paymentDue.setDate(paymentDue.getDate() + 1);

  const current: SalaryPeriod = {
    start: currentStart,
    end: currentEnd,
    paymentDueDate: paymentDue,
    isDue: ref >= paymentDue,
    label: `${formatDate(currentStart)} – ${formatDate(currentEnd)}`,
  };

  let previous: SalaryPeriod | null = null;
  if (periodIndex > 0) {
    const prevStart = new Date(EPOCH);
    prevStart.setDate(prevStart.getDate() + (periodIndex - 1) * PERIOD_DAYS);
    const prevEnd = new Date(prevStart);
    prevEnd.setDate(prevEnd.getDate() + PERIOD_DAYS - 1);
    const prevPaymentDue = new Date(prevEnd);
    prevPaymentDue.setDate(prevPaymentDue.getDate() + 1);

    previous = {
      start: prevStart,
      end: prevEnd,
      paymentDueDate: prevPaymentDue,
      isDue: ref >= prevPaymentDue,
      label: `${formatDate(prevStart)} – ${formatDate(prevEnd)}`,
    };
  }

  return { current, previous };
}

export function periodToDateRange(period: SalaryPeriod): {
  startDate: string;
  endDate: string;
} {
  return {
    startDate: toDateString(period.start),
    endDate: toDateString(period.end),
  };
}
