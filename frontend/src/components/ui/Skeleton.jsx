import styles from './Skeleton.module.css';

export default function Skeleton({ height = 16, width = '100%', className = '' }) {
  return <span className={`${styles.skeleton} ${className}`} style={{ height, width }} />;
}
