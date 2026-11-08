import type { SourceStatus } from '../data/providers/types';

const LABELS: Record<SourceStatus, string> = {
  READY: '検証済み',
  CONDITIONAL: '条件付き',
  RESTRICTED: '制限あり',
  UNVERIFIED: '未検証',
  UNAVAILABLE: '利用不可',
};

interface ProviderStatusBadgeProps {
  status: SourceStatus;
}

export function ProviderStatusBadge({ status }: ProviderStatusBadgeProps) {
  return (
    <span className={`badge status-${status.toLowerCase()}`} title={status}>
      {LABELS[status]}
    </span>
  );
}
