import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return `MK ${new Intl.NumberFormat('en-MW', { maximumFractionDigits: 0 }).format(value)}`;
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  
  return new Intl.DateTimeFormat('en-MW', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
