import type { DataClassification } from '../domain/earthquake/types';

const LABELS: Record<DataClassification, string> = {
  OBSERVED: '観測',
  CALCULATED: '計算',
  ESTIMATED: '推定',
  SIMULATED: 'シミュレーション',
  MODEL: 'モデル',
  ILLUSTRATIVE: '説明用',
  UNAVAILABLE: '未取得',
};

interface ClassificationBadgeProps {
  classification: DataClassification;
}

export function ClassificationBadge({
  classification,
}: ClassificationBadgeProps) {
  return (
    <span
      className={`badge badge-${classification.toLowerCase()}`}
      title={classification}
    >
      {LABELS[classification]}
    </span>
  );
}
