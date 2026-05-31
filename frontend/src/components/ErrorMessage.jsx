import styles from './ErrorMessage.module.css';

export default function ErrorMessage({ message }) {
  return (
    <div className={styles.box}>
      <span className={styles.icon}>⚠️</span>
      <span>{message || 'Ocurrió un error inesperado.'}</span>
    </div>
  );
}
