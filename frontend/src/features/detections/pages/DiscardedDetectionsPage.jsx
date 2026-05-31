import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { detectionsApi } from '../api/detectionsApi';
import StatusBadge from '../../../components/StatusBadge';
import Spinner from '../../../components/Spinner';
import ErrorMessage from '../../../components/ErrorMessage';
import styles from './DetectionsListPage.module.css';

function fmt(val) {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d)) return val;
  return d.toLocaleString('es-PY', { dateStyle: 'short', timeStyle: 'short' });
}

export default function DiscardedDetectionsPage() {
  const [detections, setDetections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await detectionsApi.getDiscarded();
      setDetections(data);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudieron cargar las detecciones descartadas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filter
    ? detections.filter(
        (d) =>
          d.project?.name?.toLowerCase().includes(filter.toLowerCase()) ||
          d.camera?.code?.toLowerCase().includes(filter.toLowerCase()),
      )
    : detections;

  if (loading) return <Spinner text="Cargando descartadas..." />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <div className={styles.stats}>
          <span className={styles.count}>{filtered.length} descartada{filtered.length !== 1 ? 's' : ''}</span>
        </div>
        <button className={styles.refreshBtn} onClick={load}>↺ Actualizar</button>
      </div>

      <div className={styles.filters}>
        <input
          className={styles.filterInput}
          placeholder="Filtrar por proyecto o cámara..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>🗑️</span>
          <p>No hay detecciones descartadas.</p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Especie IA</th>
                <th>Confianza</th>
                <th>Estado</th>
                <th>Proyecto</th>
                <th>Cámara</th>
                <th>Timestamp</th>
                <th>Revisor</th>
                <th>Validado</th>
                <th>Notas</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id}>
                  <td>{d.aiSpecies || '—'}</td>
                  <td>{d.aiConfidence != null ? `${(Number(d.aiConfidence) * 100).toFixed(1)}%` : '—'}</td>
                  <td><StatusBadge status={d.reviewStatus} /></td>
                  <td>{d.project?.name || '—'}</td>
                  <td>{d.camera?.code || '—'}</td>
                  <td className={styles.mono}>{d.timestampVideo || '—'}</td>
                  <td>{d.reviewer?.name || '—'}</td>
                  <td className={styles.date}>{fmt(d.validatedAt)}</td>
                  <td style={{ maxWidth: 150, fontSize: 12 }}>{d.notes || '—'}</td>
                  <td>
                    <Link to={`/detections/${d.id}/review`} className={styles.reviewBtn}>
                      Ver →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
