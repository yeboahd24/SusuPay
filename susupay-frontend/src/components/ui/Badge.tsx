import type { ReactNode } from 'react';

type BadgeColor = 'green' | 'blue' | 'amber' | 'red' | 'gray';

interface BadgeProps {
  color?: BadgeColor;
  children: ReactNode;
}

const colorStyles: Record<BadgeColor, string> = {
  green: 'bg-green-100 text-green-800',
  blue: 'bg-blue-100 text-blue-800',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-800',
  gray: 'bg-gray-100 text-gray-800',
};

export function Badge({ color = 'gray', children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorStyles[color]}`}>
      {children}
    </span>
  );
}

export function statusBadgeColor(status: string): BadgeColor {
  switch (status) {
    case 'CONFIRMED':
    case 'COMPLETED':
    case 'APPROVED':
      return 'green';
    case 'PENDING':
    case 'REQUESTED':
      return 'blue';
    case 'QUERIED':
      return 'amber';
    case 'REJECTED':
    case 'AUTO_REJECTED':
    case 'DECLINED':
      return 'red';
    default:
      return 'gray';
  }
}
