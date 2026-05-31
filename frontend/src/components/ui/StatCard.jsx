import Card from './Card';
import styles from './StatCard.module.css';

export default function StatCard({ label, value, detail, icon, tone = 'primary' }) {
  return (
    <Card className={styles.card} interactive>
      <div className={`${styles.icon} ${styles[tone]}`}>{icon}</div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        {detail && <span>{detail}</span>}
      </div>
    </Card>
  );
}
