import styles from './PageHeader.module.css';

export default function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <header className={styles.header}>
      <div>
        {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}
