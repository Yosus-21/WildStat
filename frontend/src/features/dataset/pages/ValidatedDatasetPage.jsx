import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { datasetApi } from '../../detections/api/detectionsApi';
import StatusBadge from '../../../components/StatusBadge';
import Spinner from '../../../components/Spinner';
import ErrorMessage from '../../../components/ErrorMessage';
import styles from './ValidatedDatasetPage.module.css';

const SEX_LABELS = { MALE: 'Macho', FEMALE: 'Hembra', UNDETERMINED: 'No det.' };
const IND_LABELS = { YES: 'Sí', NO: 'No', UNDETERMINED: 'No det.' };

function fmt(val) {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d)) return val;
  return d.toLocaleDateString('es-PY', { dateStyle: 'short' });
}

function fmtFull(val) {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d)) return val;
  return d.toLocaleString('es-PY', { dateStyle: 'short', timeStyle: 'short' });
}

export default function ValidatedDatasetPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [exportError, setExportError] = useState('');

  const [filters, setFilters] = useState({
    projectId: '',
    cameraId: '',
    speciesId: '',
    sex: '',
    isIndependent: '',
    reviewStatus: '',
    fromDate: '',
    toDate: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await datasetApi.getValidated({});
      setRows(data);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo cargar el dataset.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const options = {
    projects: uniqueBy(rows.map((r) => r.project).filter(Boolean), 'id'),
    cameras: uniqueBy(rows.map((r) => r.camera).filter(Boolean), 'id'),
    species: uniqueBy(
      rows
        .map((r) => (typeof r.validatedSpecies === 'object' ? r.validatedSpecies : null))
        .filter(Boolean),
      'id',
    ),
  };

  const filtered = rows.filter((r) => {
    if (filters.projectId && r.project?.id !== filters.projectId) return false;
    if (filters.cameraId && r.camera?.id !== filters.cameraId) return false;
    const speciesId = typeof r.validatedSpecies === 'object' ? r.validatedSpecies?.id : '';
    if (filters.speciesId && speciesId !== filters.speciesId) return false;
    if (filters.sex && r.sex !== filters.sex) return false;
    if (filters.isIndependent && r.isIndependent !== filters.isIndependent) return false;
    if (filters.reviewStatus && r.reviewStatus !== filters.reviewStatus) return false;
    const dateValue = r.mediaFile?.recordingDate || r.detectedAt;
    if (filters.fromDate && dateValue && new Date(dateValue) < new Date(filters.fromDate)) return false;
    if (filters.toDate && dateValue && new Date(dateValue) > new Date(`${filters.toDate}T23:59:59`)) return false;
    return true;
  });

  const csvParams = {
    projectId: filters.projectId,
    cameraId: filters.cameraId,
    speciesId: filters.speciesId,
    sex: filters.sex,
    isIndependent: filters.isIndependent,
    reviewStatus: filters.reviewStatus,
    fromDate: filters.fromDate,
    toDate: filters.toDate,
  };

  async function exportCsv() {
    setExporting(true);
    setExportError('');
    try {
      const blob = await datasetApi.exportValidatedCsv(csvParams);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'dataset-validado.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err.response?.data?.message || 'No se pudo exportar el CSV.');
    } finally {
      setExporting(false);
    }
  }

  if (loading) return <Spinner text="Cargando dataset validado..." />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <div className={styles.stats}>
          <span className={styles.count}>{filtered.length} registro{filtered.length !== 1 ? 's' : ''}</span>
          {filtered.length !== rows.length && (
            <span className={styles.countMuted}>(de {rows.length} total)</span>
          )}
        </div>
        <div className={styles.toolbarRight}>
          <Link className={styles.analyticsBtn} to="/analytics">
            Ver dashboard
          </Link>
          <button
            className={styles.exportBtn}
            onClick={exportCsv}
            disabled={exporting}
          >
            {exporting ? 'Exportando...' : '⬇ Exportar CSV'}
          </button>
          <button className={styles.refreshBtn} onClick={load}>↺ Actualizar</button>
        </div>
      </div>
      {exportError && <ErrorMessage message={exportError} />}

      <div className={styles.filters}>
        <select
          className={styles.fi}
          value={filters.projectId}
          onChange={(e) => setFilters((f) => ({ ...f, projectId: e.target.value }))}
        >
          <option value="">Todos los proyectos</option>
          {options.projects.map((project) => (
            <option key={project.id} value={project.id}>{project.name}</option>
          ))}
        </select>
        <select
          className={styles.fi}
          value={filters.cameraId}
          onChange={(e) => setFilters((f) => ({ ...f, cameraId: e.target.value }))}
        >
          <option value="">Todas las cámaras</option>
          {options.cameras.map((camera) => (
            <option key={camera.id} value={camera.id}>{camera.code}</option>
          ))}
        </select>
        <select
          className={styles.fi}
          value={filters.speciesId}
          onChange={(e) => setFilters((f) => ({ ...f, speciesId: e.target.value }))}
        >
          <option value="">Todas las especies</option>
          {options.species.map((species) => (
            <option key={species.id} value={species.id}>{species.commonName}</option>
          ))}
        </select>
        <select
          className={styles.fi}
          value={filters.sex}
          onChange={(e) => setFilters((f) => ({ ...f, sex: e.target.value }))}
        >
          <option value="">Todos los sexos</option>
          <option value="MALE">Macho</option>
          <option value="FEMALE">Hembra</option>
          <option value="UNDETERMINED">No determinado</option>
        </select>
        <select
          className={styles.fi}
          value={filters.isIndependent}
          onChange={(e) => setFilters((f) => ({ ...f, isIndependent: e.target.value }))}
        >
          <option value="">Independencia</option>
          <option value="YES">Independiente</option>
          <option value="NO">No independiente</option>
          <option value="UNDETERMINED">No det.</option>
        </select>
        <select
          className={styles.fi}
          value={filters.reviewStatus}
          onChange={(e) => setFilters((f) => ({ ...f, reviewStatus: e.target.value }))}
        >
          <option value="">Todos los estados</option>
          <option value="VALIDATED">Validada</option>
          <option value="CORRECTED">Corregida</option>
          <option value="DISCARDED">Descartada</option>
          <option value="DOUBTFUL">Dudosa</option>
        </select>
        <input
          className={styles.fi}
          type="date"
          value={filters.fromDate}
          onChange={(e) => setFilters((f) => ({ ...f, fromDate: e.target.value }))}
        />
        <input
          className={styles.fi}
          type="date"
          value={filters.toDate}
          onChange={(e) => setFilters((f) => ({ ...f, toDate: e.target.value }))}
        />
      </div>

      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>📊</span>
          <p>No hay registros en el dataset validado con los filtros actuales.</p>
          <button
            className={styles.clearBtn}
            onClick={() => setFilters({ projectId: '', cameraId: '', speciesId: '', sex: '', isIndependent: '', reviewStatus: '', fromDate: '', toDate: '' })}
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Proyecto</th>
                <th>Cámara</th>
                <th>Zona</th>
                <th>Archivo</th>
                <th>Tipo</th>
                <th>Fecha</th>
                <th>Mes</th>
                <th>Hora</th>
                <th>Min. video</th>
                <th>Especie IA</th>
                <th>Confianza IA</th>
                <th>Especie validada</th>
                <th>Sexo</th>
                <th>Independiente</th>
                <th>Evento rel.</th>
                <th>Estado</th>
                <th>Observaciones</th>
                <th>Revisor</th>
                <th>Fecha val.</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const speciesLabel =
                  typeof r.validatedSpecies === 'object' && r.validatedSpecies
                    ? r.validatedSpecies.commonName
                    : r.validatedSpecies || '—';
                return (
                  <tr key={r.id}>
                    <td>{r.project?.name || '—'}</td>
                    <td>{r.camera?.code || '—'}</td>
                    <td>{r.camera?.zone || '—'}</td>
                    <td className={styles.fileCell}>
                      {r.mediaFile?.filePath
                        ? r.mediaFile.filePath.split('/').pop()
                        : '—'}
                    </td>
                    <td>{r.mediaFile?.fileType || '—'}</td>
                    <td className={styles.nowrap}>{fmt(r.mediaFile?.recordingDate || r.detectedAt)}</td>
                    <td>{r.month ?? '—'}</td>
                    <td>{r.hour ?? '—'}</td>
                    <td className={styles.mono}>{r.timestampVideo || '—'}</td>
                    <td>{r.aiSpecies || '—'}</td>
                    <td>
                      {r.aiConfidence != null
                        ? `${(Number(r.aiConfidence) * 100).toFixed(1)}%`
                        : '—'}
                    </td>
                    <td><strong>{speciesLabel}</strong></td>
                    <td>{SEX_LABELS[r.sex] ?? r.sex ?? '—'}</td>
                    <td>{IND_LABELS[r.isIndependent] ?? r.isIndependent ?? '—'}</td>
                    <td>{r.relatedDetectionId ? r.relatedDetectionId.slice(0, 8) + '…' : '—'}</td>
                    <td><StatusBadge status={r.reviewStatus} /></td>
                    <td className={styles.notes}>{r.notes || '—'}</td>
                    <td>{r.reviewer?.name || '—'}</td>
                    <td className={styles.nowrap}>{fmtFull(r.validatedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function uniqueBy(items, key) {
  const map = new Map();
  for (const item of items) {
    if (item?.[key] && !map.has(item[key])) map.set(item[key], item);
  }
  return Array.from(map.values());
}
