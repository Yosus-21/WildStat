import styles from './Spinner.module.css';

export default function Spinner({ text = 'Cargando...' }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.ring} />
      {text && <span className={styles.text}>{text}</span>}
    </div>
  );
}
