import type { Booking, CancellationPolicy, Facility, PaymentMethod } from '../data/types';
import { HOUR, now } from '../lib/time';
import { uid } from '../lib/format';

/**
 * Payments architecture.
 *
 * The app never sees or stores card numbers. In production a provider SDK
 * (e.g. Stripe Elements / Apple Pay) collects card details inside its own
 * secure fields and returns a token. The client then:
 *   1. POST /payments/intents { amount, purpose }   → server creates an intent
 *   2. provider.confirm(intent, paymentMethodToken)   → provider charges the card
 *   3. Server receives a webhook and marks the booking paid.
 * This module simulates that sequence with the same inputs and outputs.
 */

/** Flat booking fee for non-partner venues, in pence. Partner venues pay us commission instead. */
export const BOOKING_FEE = 75;

export function bookingFee(f: Facility): number {
  return f.partner ? 0 : BOOKING_FEE;
}

/**
 * Split a total into n shares that add up exactly. Any leftover pennies go to
 * the first shares, so £40.00 / 3 = £13.34, £13.33, £13.33.
 */
export function splitAmounts(total: number, n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(total / n);
  const rem = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < rem ? 1 : 0));
}

export interface ChargeResult {
  ok: boolean;
  providerRef?: string;
  error?: string;
}

/** Simulated provider round-trip. `fail` lets the demo show the error state. */
export function charge(amount: number, method: PaymentMethod, opts: { fail?: boolean } = {}): Promise<ChargeResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (opts.fail) resolve({ ok: false, error: 'Your bank declined the payment. You haven’t been charged.' });
      else resolve({ ok: true, providerRef: `pi_${uid('').slice(1)}_${method.brand}_${amount}` });
    }, 1100);
  });
}

export interface RefundQuote {
  amount: number;
  percent: number;
  /** Plain-English explanation shown before the user confirms. */
  message: string;
  deadline?: Date;
}

/** What the user gets back if they cancel now, under the venue's policy. */
export function refundQuote(booking: Pick<Booking, 'start' | 'total'>, policy: CancellationPolicy, at: Date = now()): RefundQuote {
  const start = new Date(booking.start);
  const hoursLeft = (start.getTime() - at.getTime()) / HOUR;
  const fullDeadline = new Date(start.getTime() - policy.fullRefundHours * HOUR);
  if (hoursLeft >= policy.fullRefundHours) {
    return { amount: booking.total, percent: 100, message: 'You’ll get a full refund.', deadline: fullDeadline };
  }
  if (policy.partialRefundHours != null && policy.partialRefundPercent && hoursLeft >= policy.partialRefundHours) {
    const amount = Math.round((booking.total * policy.partialRefundPercent) / 100);
    return { amount, percent: policy.partialRefundPercent, message: `You’re inside the ${policy.fullRefundHours}-hour window, so you’ll get ${policy.partialRefundPercent}% back.` };
  }
  return { amount: 0, percent: 0, message: `It’s less than ${policy.partialRefundHours ?? policy.fullRefundHours} hours until your booking, so this booking is no longer refundable.` };
}

export const BRAND_LABELS: Record<PaymentMethod['brand'], string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  'apple-pay': 'Apple Pay',
  'google-pay': 'Google Pay',
};

export function methodLabel(m: PaymentMethod): string {
  return m.last4 ? `${BRAND_LABELS[m.brand]} •••• ${m.last4}` : BRAND_LABELS[m.brand];
}

/** The demo "add card" flow issues a provider test token instead of taking card details. */
export function testCard(brand: 'visa' | 'mastercard' | 'amex'): PaymentMethod {
  const last4 = brand === 'visa' ? '4242' : brand === 'mastercard' ? '4444' : '0005';
  return { id: uid('pm'), brand, label: BRAND_LABELS[brand], last4, expiry: '08/29', token: `tok_test_${brand}`, isDefault: false };
}
