import Card from './Card';
import styles from './EmptyState.module.css';

export default function EmptyState({ icon = '○', title, description, action }) {
  return (
    <Card className={styles.empty}>
      <div className={styles.icon}>{icon}</div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </Card>
  );
}
