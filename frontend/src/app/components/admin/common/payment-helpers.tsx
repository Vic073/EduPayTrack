import { Badge } from '../../../../components/ui/badge';

export function PaymentStatusBadge({ status }: { status: string }) {
  const s = status?.toUpperCase() || 'PENDING';
  const map: Record<string, string> = {
    APPROVED: 'bg-success/10 text-success border-success/20',
    PENDING: 'bg-warning/10 text-warning border-warning/20',
    REJECTED: 'bg-destructive/10 text-destructive border-destructive/20',
  };
  return (
    <Badge variant="outline" className={`text-[11px] font-medium ${map[s] || map.PENDING}`}>
      {s.charAt(0) + s.slice(1).toLowerCase()}
    </Badge>
  );
}

export function getFullImageUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return url;
  return `/${url}`;
}
