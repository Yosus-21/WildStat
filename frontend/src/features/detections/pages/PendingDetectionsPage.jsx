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

function pct(val) {
  if (val == null) return '—';
  return `${(Number(val) * 100).toFixed(1)}%`;
}

export default function PendingDetectionsPage() {
  const [detections, setDetections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    project: '',
    camera: '',
    species: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await detectionsApi.getPending();
      setDetections(data);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudieron cargar las detecciones.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = detections.filter((d) => {
    if (filters.project && !d.project?.name?.toLowerCase().includes(filters.project.toLowerCase())) return false;
    if (filters.camera && !d.camera?.code?.toLowerCase().includes(filters.camera.toLowerCase())) return false;
    if (filters.species && !d.aiSpecies?.toLowerCase().includes(filters.species.toLowerCase())) return false;
    return true;
  });

  if (loading) return <Spinner text="Cargando detecciones pendientes..." />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <div className={styles.stats}>
          <span className={styles.count}>{filtered.length} detección{filtered.length !== 1 ? 'es' : ''} pendiente{filtered.length !== 1 ? 's' : ''}</span>
          {filtered.length !== detections.length && (
            <span className={styles.countMuted}>(de {detections.length} total)</span>
          )}
        </div>
        <button className={styles.refreshBtn} onClick={load}>↺ Actualizar</button>
      </div>

      <div className={styles.filters}>
        <input
          className={styles.filterInput}
          placeholder="Filtrar por proyecto..."
          value={filters.project}
          onChange={(e) => setFilters((f) => ({ ...f, project: e.target.value }))}
        />
        <input
          className={styles.filterInput}
          placeholder="Filtrar por cámara..."
          value={filters.camera}
          onChange={(e) => setFilters((f) => ({ ...f, camera: e.target.value }))}
        />
        <input
          className={styles.filterInput}
          placeholder="Filtrar por especie IA..."
          value={filters.species}
          onChange={(e) => setFilters((f) => ({ ...f, species: e.target.value }))}
        />
      </div>

      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>✅</span>
          <p>No hay detecciones pendientes.</p>
          {(filters.project || filters.camera || filters.species) && (
            <button
              className={styles.clearBtn}
              onClick={() => setFilters({ project: '', camera: '', species: '' })}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Frame</th>
                <th>Especie IA</th>
                <th>Confianza</th>
                <th>Proyecto</th>
                <th>Cámara</th>
                <th>Timestamp</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id}>
                  <td>
                    <FrameThumb detectionId={d.id} />
                  </td>
                  <td>
                    <span className={styles.species}>
                      {d.aiSpecies || '—'}
                    </span>
                  </td>
                  <td>
                    <ConfidenceBar value={d.aiConfidence} />
                  </td>
                  <td>{d.project?.name || '—'}</td>
                  <td>{d.camera?.code || '—'}</td>
                  <td className={styles.mono}>{d.timestampVideo || '—'}</td>
                  <td><StatusBadge status={d.reviewStatus} /></td>
                  <td className={styles.date}>{fmt(d.detectedAt || d.createdAt)}</td>
                  <td>
                    <Link to={`/detections/${d.id}/review`} className={styles.reviewBtn}>
                      Revisar →
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

function FrameThumb({ detectionId }) {
  const [ok, setOk] = useState(true);
  const src = `${import.meta.env.VITE_API_URL}/detections/${detectionId}/frame`;
  const token = localStorage.getItem('token');

  if (!ok) {
    return <div className={styles.noThumb}>—</div>;
  }

  return (
    <AuthImage
      src={src}
      token={token}
      alt="frame"
      className={styles.thumb}
      onError={() => setOk(false)}
    />
  );
}

function AuthImage({ src, token, alt, className, onError }) {
  const [objectUrl, setObjectUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(src, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (!r.ok) throw new Error('no frame');
        return r.blob();
      })
      .then((blob) => {
        if (!cancelled) setObjectUrl(URL.createObjectURL(blob));
      })
      .catch(() => {
        if (!cancelled) onError?.();
      });
    return () => {
      cancelled = true;
    };
  }, [src, token, onError]);

  if (!objectUrl) return <div className={styles.noThumb} />;
  return <img src={objectUrl} alt={alt} className={className} />;
}

function ConfidenceBar({ value }) {
  if (value == null) return <span>—</span>;
  const pctVal = Number(value) * 100;
  const color = pctVal >= 70 ? '#00b894' : pctVal >= 40 ? '#e17055' : '#d63031';
  return (
    <div className={styles.confWrap}>
      <div
        className={styles.confBar}
        style={{ width: `${pctVal}%`, background: color }}
      />
      <span className={styles.confLabel}>{pct(value)}</span>
    </div>
  );
}
