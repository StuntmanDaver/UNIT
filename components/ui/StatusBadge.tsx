import { STATUS_COLORS } from '@/constants/colors';
import { Badge } from './Badge';

type StatusBadgeProps = {
  status: keyof typeof STATUS_COLORS;
  size?: 'sm' | 'md';
};

export function StatusBadge({ status, size }: StatusBadgeProps) {
  const color = STATUS_COLORS[status];
  const label = status.charAt(0).toUpperCase() + status.slice(1);

  return <Badge label={label} color={color} size={size} />;
}
