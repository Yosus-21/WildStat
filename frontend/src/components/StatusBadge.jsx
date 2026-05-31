import styles from './StatusBadge.module.css';

const STATUS_CONFIG = {
  PENDING: { label: 'Pendiente', variant: 'warning' },
  VALIDATED: { label: 'Validada', variant: 'success' },
  CORRECTED: { label: 'Corregida', variant: 'info' },
  DISCARDED: { label: 'Descartada', variant: 'danger' },
  DOUBTFUL: { label: 'Dudosa', variant: 'neutral' },
};

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] ?? { label: status, variant: 'neutral' };
  return (
    <span className={`${styles.badge} ${styles[config.variant]}`}>
      {config.label}
    </span>
  );
}
