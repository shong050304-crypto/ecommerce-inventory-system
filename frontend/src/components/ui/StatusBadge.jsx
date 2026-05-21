import Badge from './Badge';
import { PAYMENT_STATUS, ORDER_STATUS } from '../../constants/status';

export function PaymentBadge({ status }) {
  const config = PAYMENT_STATUS[status] || { label: status, variant: 'neutral' };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function OrderBadge({ status }) {
  const config = ORDER_STATUS[status] || { label: status, variant: 'neutral' };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
