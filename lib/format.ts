// lib/format.ts
import { format, parseISO, isValid } from 'date-fns';

// ─── Local date (NOT UTC) ──────────────────────────────────────────────────
// `new Date().toISOString().split('T')[0]` is a common bug: toISOString()
// converts to UTC first, so anyone east of UTC (e.g. EAT = UTC+3) gets
// "yesterday" for several hours after their own local midnight. This
// helper reads the device's local year/month/day directly instead.
export function getTodayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ─── Auto-comma amount formatting ──────────────────────────────────────────
// Mirrors the web onAmountInput() behaviour: strips all non-digits and
// reformats with thousand-separator commas as the user types. Wire this up
// as a TextInput's onChangeText for any amount-in-TZS field so 180000
// displays as 180,000 live while typing.
//
// IMPORTANT: takes only the INTEGER part before any decimal point, so
// pre-filling from a server value like "500000.00" (Decimal serialised by
// DRF as a string) works correctly — otherwise stripping `.` would turn
// "500000.00" into "50000000" (100× inflation), which then overflows the
// DB column on save.
export function formatAmountCommas(raw: string): string {
  const s = String(raw ?? '');
  // Cut everything from the first `.` onward — TZS amounts are whole shillings
  const integerPart = s.split('.')[0];
  const digits = integerPart.replace(/[^0-9]/g, '');
  if (!digits) return '';
  return parseInt(digits, 10).toLocaleString('en-US');
}

// Inverse — strip commas to send the raw numeric string to the API.
export function stripAmountCommas(formatted: string): string {
  return String(formatted ?? '').replace(/,/g, '').split('.')[0];
}


// ─── Currency ───────────────────────────────────────────────────────────────
export function formatTZS(value: string | number | null | undefined): string {
  const num = parseFloat(String(value ?? 0));
  if (isNaN(num)) return 'TZS 0';
  return (
    'TZS ' +
    num.toLocaleString('en-TZ', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
  );
}

export function formatTZSShort(
  value: string | number | null | undefined
): string {
  const num = parseFloat(String(value ?? 0));
  if (isNaN(num)) return 'TZS 0';
  if (num >= 1_000_000)
    return `TZS ${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000)
    return `TZS ${(num / 1_000).toFixed(0)}K`;
  return `TZS ${num.toFixed(0)}`;
}

// ─── Dates ──────────────────────────────────────────────────────────────────
export function formatDate(
  value: string | null | undefined,
  fmt = 'dd MMM yyyy'
): string {
  if (!value) return '—';
  try {
    const d = parseISO(value);
    return isValid(d) ? format(d, fmt) : '—';
  } catch {
    return '—';
  }
}

export function formatDateTime(value: string | null | undefined): string {
  return formatDate(value, 'dd MMM yyyy, HH:mm');
}

export function formatMonth(value: string | null | undefined): string {
  return formatDate(value, 'MMM yyyy');
}

// ─── Numbers ────────────────────────────────────────────────────────────────
export function formatPercent(value: string | number | null | undefined): string {
  const num = parseFloat(String(value ?? 0));
  if (isNaN(num)) return '0%';
  return `${num}%`;
}

// ─── Loan progress ──────────────────────────────────────────────────────────
export function loanProgress(loan: {
  total_repayment_amount: string | null;
  repayment_amount_remaining: string;
}): number {
  const total = parseFloat(loan.total_repayment_amount ?? '0');
  const remaining = parseFloat(loan.repayment_amount_remaining ?? '0');
  if (!total) return 0;
  return Math.min(1, Math.max(0, (total - remaining) / total));
}

// ─── Status helpers ─────────────────────────────────────────────────────────
export function loanStatusColor(status: string): string {
  const s = status?.toLowerCase();
  if (s === 'approved') return '#22c55e';
  if (s === 'pending') return '#f59e0b';
  if (s === 'rejected') return '#ef4444';
  if (s === 'completed') return '#3b82f6';
  return '#8aa3be';
}

export function loanStatusLabel(status: string): string {
  return status ?? 'Unknown';
}

// ─── Initials avatar ────────────────────────────────────────────────────────
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
