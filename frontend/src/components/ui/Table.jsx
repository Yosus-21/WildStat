import styles from './Table.module.css';

export default function Table({ children, className = '' }) {
  return (
    <div className={`${styles.wrap} ${className}`}>
      <table className={styles.table}>{children}</table>
    </div>
  );
}
