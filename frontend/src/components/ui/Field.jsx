import styles from './Field.module.css';

export function Input({ className = '', ...props }) {
  return <input className={`${styles.control} ${className}`} {...props} />;
}

export function Select({ className = '', children, ...props }) {
  return (
    <select className={`${styles.control} ${className}`} {...props}>
      {children}
    </select>
  );
}
