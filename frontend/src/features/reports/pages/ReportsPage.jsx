import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ErrorMessage from '../../../components/ErrorMessage';
import Spinner from '../../../components/Spinner';
import { projectsApi } from '../../detections/api/detectionsApi';
import { reportsApi } from '../api/reportsApi';
import styles from './ReportsPage.module.css';

export default function ReportsPage() {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    projectsApi
      .getAll()
      .then((rows) => {
        setProjects(rows);
        setProjectId(rows[0]?.id || '');
      })
      .catch((err) => setError(err.response?.data?.message || 'No se pudieron cargar proyectos.'))
      .finally(() => setLoading(false));
  }, []);

  async function downloadReport() {
    if (!projectId) {
      setError('Selecciona un proyecto para generar el reporte PDF.');
      return;
    }
    const project = projects.find((item) => item.id === projectId);
    const filename = `reporte-wildstat-${project?.name || 'proyecto'}.pdf`;
    setError('');
    setDownloading(true);
    try {
      await reportsApi.downloadProjectPdf(projectId, {}, filename);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo generar el reporte PDF.');
    } finally {
      setDownloading(false);
    }
  }

  if (loading) return <Spinner text="Cargando reportes..." />;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Reportes</h1>
          <p>Genera un PDF de proyecto con metricas basadas en datos validados y corregidos.</p>
        </div>
        <Link to="/analytics" className={styles.link}>Ver analytics</Link>
      </header>

      {error && <ErrorMessage message={error} />}

      <section className={styles.panel}>
        <label htmlFor="project">Proyecto</label>
        <select id="project" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
          <option value="">Selecciona un proyecto</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>{project.name}</option>
          ))}
        </select>
        <button type="button" onClick={downloadReport} disabled={!projectId || downloading}>
          {downloading ? 'Generando PDF...' : 'Descargar reporte PDF'}
        </button>
        <p>El reporte usa detecciones con estado VALIDATED o CORRECTED y no cuenta registros descartados.</p>
      </section>
    </div>
  );
}
