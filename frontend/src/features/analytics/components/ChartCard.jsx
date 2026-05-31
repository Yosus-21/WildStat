import styles from '../pages/AnalyticsDashboardPage.module.css';

export default function ChartCard({ title, description, error, empty, children }) {
  return (
    <section className={styles.chartCard}>
      <div className={styles.cardHeader}>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {error ? (
        <div className={styles.inlineError}>{error}</div>
      ) : empty ? (
        <div className={styles.emptyState}>{empty}</div>
      ) : (
        children
      )}
    </section>
  );
}
