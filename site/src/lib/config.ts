/* The only place the worker's address lives. It is the workers.dev hostname on purpose (see the
   note in worker.js); pointing api.perceptfolio.com at it and changing this string is the upgrade. */
export const WORKER = 'https://crimson-hat-6ad9.northbridgeai1.workers.dev';
export const CONTACT = 'northbridgeai1@gmail.com';

export const PLANS = {
  personal: { monthly: 149, yearly: 1490 },
  business: { monthly: 119, yearly: 1190, minSeats: 3 },
} as const;

export type PlanId = 'personal-monthly' | 'personal-yearly' | 'business-monthly' | 'business-yearly';

/* Named against the professional self-serve tier, never Bloomberg (PRD §6). Verify before publishing. */
export const COMPARISONS: ReadonlyArray<{ name: string; monthly: number | string; note?: string }> = [
  { name: 'Koyfin Pro', monthly: 79 },
  { name: 'Godel Terminal', monthly: 118 },
  { name: 'YCharts', monthly: 'from ~$400', note: 'sales-led' },
];
