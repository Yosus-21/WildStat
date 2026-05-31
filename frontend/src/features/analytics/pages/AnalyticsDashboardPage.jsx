import { useCallback, useEffect, useMemo, useState } from 'react';
import { analyticsApi, cleanParams } from '../api/analyticsApi';
import { projectsApi, speciesApi } from '../../detections/api/detectionsApi';
import { reportsApi } from '../../reports/api/reportsApi';
import Spinner from '../../../components/Spinner';
import ErrorMessage from '../../../components/ErrorMessage';
import SummaryCards from '../components/SummaryCards';
import SpeciesFrequencyChart from '../components/SpeciesFrequencyChart';
import ZoneChart from '../components/ZoneChart';
import MonthChart from '../components/MonthChart';
import SexRatioChart from '../components/SexRatioChart';
import ActivityByHourChart from '../components/ActivityByHourChart';
import DensityCard from '../components/DensityCard';
import TrendCard from '../components/TrendCard';
import SharedHabitatCard from '../components/SharedHabitatCard';
import styles from './AnalyticsDashboardPage.module.css';

const ENDPOINTS = {
  summary: analyticsApi.getSummary,
  speciesFrequency: analyticsApi.getSpeciesFrequency,
  jaguarAbundance: analyticsApi.getJaguarAbundance,
  byZone: analyticsApi.getByZone,
  byMonth: analyticsApi.getByMonth,
  sexRatio: analyticsApi.getSexRatio,
  activityByHour: analyticsApi.getActivityByHour,
  sharedHabitat: analyticsApi.getSharedHabitat,
  trend: analyticsApi.getTrend,
};

export default function AnalyticsDashboardPage() {
  const [filters, setFilters] = useState({
    projectId: '',
    speciesId: '',
    fromDate: '',
    toDate: '',
  });
  const [projects, setProjects] = useState([]);
  const [species, setSpecies] = useState([]);
  const [data, setData] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');

  const params = useMemo(() => cleanParams(filters), [filters]);

  const loadCatalogs = useCallback(async () => {
    try {
      const [projectRows, speciesRows] = await Promise.all([
        projectsApi.getAll(),
        speciesApi.getAll(),
      ]);
      setProjects(projectRows);
      setSpecies(speciesRows);
    } catch (err) {
      setCatalogError(err.response?.data?.message || 'No se pudieron cargar filtros.');
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setErrors({});
    const nextData = {};
    const nextErrors = {};
    await Promise.all(
      Object.entries(ENDPOINTS).map(async ([key, fn]) => {
        try {
          nextData[key] = await fn(params);
        } catch (err) {
          nextErrors[key] = err.response?.data?.message || 'No se pudo cargar esta sección.';
        }
      }),
    );

    if (filters.projectId) {
      try {
        nextData.density = await analyticsApi.getSimpleDensity({ projectId: filters.projectId });
      } catch (err) {
        nextErrors.density = err.response?.data?.message || 'No se pudo calcular densidad.';
      }
    } else {
      nextData.density = null;
    }

    setData(nextData);
    setErrors(nextErrors);
    setLoading(false);
  }, [filters.projectId, params]);

  useEffect(() => { loadCatalogs(); }, [loadCatalogs]);
  useEffect(() => { loadAnalytics(); }, [loadAnalytics]);

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function clearFilters() {
    setFilters({ projectId: '', speciesId: '', fromDate: '', toDate: '' });
  }

  async function downloadPdfReport() {
    if (!filters.projectId) {
      setReportError('Selecciona un proyecto para generar el reporte PDF.');
      return;
    }

    const project = projects.find((item) => item.id === filters.projectId);
    const safeProjectName = (project?.name || 'proyecto')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();

    setReportError('');
    setReportLoading(true);
    try {
      await reportsApi.downloadProjectPdf(
        filters.projectId,
        {
          speciesId: filters.speciesId,
          fromDate: filters.fromDate,
          toDate: filters.toDate,
        },
        `reporte-wildstat-${safeProjectName || 'proyecto'}.pdf`,
      );
    } catch (err) {
      setReportError(err.response?.data?.message || 'No se pudo generar el reporte PDF.');
    } finally {
      setReportLoading(false);
    }
  }

  if (loading && !data.summary) return <Spinner text="Cargando analytics..." />;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Dashboard Analytics</h1>
          <p>Indicadores ecológicos basados en detecciones validadas.</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.reportBtn} onClick={downloadPdfReport} disabled={!filters.projectId || reportLoading}>
            {reportLoading ? 'Generando PDF...' : 'Descargar reporte PDF'}
          </button>
          <button className={styles.refreshBtn} onClick={loadAnalytics} disabled={loading}>
            {loading ? 'Actualizando...' : '↺ Actualizar'}
          </button>
        </div>
      </div>

      {catalogError && <ErrorMessage message={catalogError} />}
      {!filters.projectId && (
        <div className={styles.reportHint}>Selecciona un proyecto para generar el reporte PDF.</div>
      )}
      {reportError && <ErrorMessage message={reportError} />}

      <section className={styles.filters}>
        <select value={filters.projectId} onChange={(e) => updateFilter('projectId', e.target.value)}>
          <option value="">Todos los proyectos</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>{project.name}</option>
          ))}
        </select>
        <select value={filters.speciesId} onChange={(e) => updateFilter('speciesId', e.target.value)}>
          <option value="">Todas las especies</option>
          {species.map((item) => (
            <option key={item.id} value={item.id}>{item.commonName}</option>
          ))}
        </select>
        <input type="date" value={filters.fromDate} onChange={(e) => updateFilter('fromDate', e.target.value)} />
        <input type="date" value={filters.toDate} onChange={(e) => updateFilter('toDate', e.target.value)} />
        <button type="button" onClick={clearFilters}>Limpiar</button>
      </section>

      {errors.summary ? (
        <ErrorMessage message={errors.summary} />
      ) : (
        <SummaryCards data={data.summary} />
      )}

      <div className={styles.grid}>
        <SpeciesFrequencyChart data={data.speciesFrequency} error={errors.speciesFrequency} />
        <ZoneChart data={data.byZone} error={errors.byZone} />
        <MonthChart data={data.byMonth} error={errors.byMonth} />
        <SexRatioChart data={data.sexRatio} error={errors.sexRatio} />
        <ActivityByHourChart data={data.activityByHour} error={errors.activityByHour} />
        <DensityCard data={data.density} error={errors.density} selectedProjectId={filters.projectId} />
        <TrendCard data={data.trend} error={errors.trend} />
        <SharedHabitatCard data={data.sharedHabitat} error={errors.sharedHabitat} />
      </div>

      {data.jaguarAbundance && (
        <section className={styles.abundance}>
          <h2>Abundancia simplificada de jaguar</h2>
          <div className={styles.abundanceGrid}>
            <span><strong>{data.jaguarAbundance.events ?? 0}</strong> eventos</span>
            <span><strong>{data.jaguarAbundance.independentEvents ?? 0}</strong> independientes</span>
            <span><strong>{data.jaguarAbundance.undeterminedIndependence ?? 0}</strong> sin independencia definida</span>
          </div>
          <p>{data.jaguarAbundance.note}</p>
        </section>
      )}
    </div>
  );
}
