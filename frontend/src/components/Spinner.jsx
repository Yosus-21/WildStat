import Skeleton from './ui/Skeleton';
import styles from './Spinner.module.css';

export default function Spinner({ text = 'Cargando...' }) {
  return (
    <div className={styles.wrap} role="status" aria-live="polite">
      <div className={styles.panel}>
        <Skeleton height={18} width="45%" />
        <Skeleton height={54} width="100%" />
        <Skeleton height={54} width="88%" />
        {text && <span className={styles.text}>{text}</span>}
      </div>
    </div>
  );
}
