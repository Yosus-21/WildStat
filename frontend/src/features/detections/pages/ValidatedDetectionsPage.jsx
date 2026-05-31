import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { detectionsApi } from '../api/detectionsApi';
import StatusBadge from '../../../components/StatusBadge';
import Spinner from '../../../components/Spinner';
import ErrorMessage from '../../../components/ErrorMessage';
import { useAuth } from '../../../context/AuthContext';
import styles from './DetectionsListPage.module.css';

const SEX_LABELS = { MALE: 'Macho', FEMALE: 'Hembra', UNDETERMINED: 'No det.' };
const IND_LABELS = { YES: 'Sí', NO: 'No', UNDETERMINED: 'No det.' };

function fmt(val) {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d)) return val;
  return d.toLocaleString('es-PY', { dateStyle: 'short', timeStyle: 'short' });
}

export default function ValidatedDetectionsPage() {
  const { isInvestigator } = useAuth();
  const [detections, setDetections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ project: '', species: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await detectionsApi.getValidated();
      setDetections(data);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudieron cargar las detecciones validadas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = detections.filter((d) => {
    if (filters.project && !d.project?.name?.toLowerCase().includes(filters.project.toLowerCase())) return false;
    if (filters.species) {
      const sp = (d.validatedSpeciesRef?.commonName || d.validatedSpecies || '').toLowerCase();
      if (!sp.includes(filters.species.toLowerCase())) return false;
    }
    return true;
  });

  if (loading) return <Spinner text="Cargando detecciones validadas..." />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className={styles.page}>
      {!isInvestigator && (
        <div className={styles.viewerBanner}>
          ℹ️ Tu rol permite consulta, pero no validación.
        </div>
      )}

      <div className={styles.toolbar}>
        <div className={styles.stats}>
          <span className={styles.count}>{filtered.length} detección{filtered.length !== 1 ? 'es' : ''} validada{filtered.length !== 1 ? 's' : ''}</span>
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
          placeholder="Filtrar por especie..."
          value={filters.species}
          onChange={(e) => setFilters((f) => ({ ...f, species: e.target.value }))}
        />
      </div>

      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>📂</span>
          <p>No hay detecciones validadas aún.</p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Especie validada</th>
                <th>Especie IA</th>
                <th>Sexo</th>
                <th>Independiente</th>
                <th>Estado</th>
                <th>Proyecto</th>
                <th>Cámara</th>
                <th>Timestamp</th>
                <th>Revisor</th>
                <th>Validado</th>
                <th>Observaciones</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id}>
                  <td>
                    <strong>{d.validatedSpeciesRef?.commonName || d.validatedSpecies || '—'}</strong>
                    {d.validatedSpeciesRef?.scientificName && (
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                        {d.validatedSpeciesRef.scientificName}
                      </div>
                    )}
                  </td>
                  <td>{d.aiSpecies || '—'}</td>
                  <td>{SEX_LABELS[d.sex] ?? d.sex ?? '—'}</td>
                  <td>{IND_LABELS[d.isIndependent] ?? d.isIndependent ?? '—'}</td>
                  <td><StatusBadge status={d.reviewStatus} /></td>
                  <td>{d.project?.name || '—'}</td>
                  <td>{d.camera?.code || '—'}</td>
                  <td className={styles.mono}>{d.timestampVideo || '—'}</td>
                  <td>{d.reviewer?.name || '—'}</td>
                  <td className={styles.date}>{fmt(d.validatedAt)}</td>
                  <td style={{ maxWidth: 160, fontSize: 12 }}>{d.notes || '—'}</td>
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
