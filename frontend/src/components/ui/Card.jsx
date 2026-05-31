import styles from './Card.module.css';

export default function Card({ children, className = '', interactive = false }) {
  return (
    <section className={`${styles.card} ${interactive ? styles.interactive : ''} ${className}`}>
      {children}
    </section>
  );
}
