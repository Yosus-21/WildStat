import styles from './Modal.module.css';

export default function Modal({ open, title, children, onClose }) {
  if (!open) return null;
  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={onClose}>
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <h2>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar">×</button>
        </header>
        {children}
      </section>
    </div>
  );
}
