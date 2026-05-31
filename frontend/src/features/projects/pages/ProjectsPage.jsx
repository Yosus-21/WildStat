import { useCallback, useEffect, useMemo, useState } from 'react';
import ErrorMessage from '../../../components/ErrorMessage';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import EmptyState from '../../../components/ui/EmptyState';
import { Input } from '../../../components/ui/Field';
import PageHeader from '../../../components/ui/PageHeader';
import StatCard from '../../../components/ui/StatCard';
import Table from '../../../components/ui/Table';
import { mediaApi } from '../../media/api/mediaApi';
import styles from './ProjectsPage.module.css';

const STATUS_TONE = {
  DRAFT: 'neutral',
  PROCESSING: 'info',
  REVIEW: 'warning',
  PUBLISHED: 'success',
  VALIDATED: 'success',
  PRIVATE: 'neutral',
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setProjects(await mediaApi.getProjects());
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudieron cargar los proyectos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = filter.toLowerCase();
    return projects.filter((project) =>
      [project.name, project.organization, project.areaName, project.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [filter, projects]);

  if (error) return <ErrorMessage message={error} />;

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Portafolio científico"
        title="Proyectos"
        description="Resumen de iniciativas de monitoreo, estado operativo y contexto territorial."
        actions={<Button type="button">Crear Proyecto</Button>}
      />

      <div className={styles.stats}>
        <StatCard label="Total" value={projects.length} detail="proyectos registrados" icon="◇" />
        <StatCard label="Activos" value={projects.filter((p) => p.status !== 'DRAFT').length} detail="en operación" icon="●" tone="success" />
        <StatCard label="En revisión" value={projects.filter((p) => p.status === 'REVIEW').length} detail="requieren atención" icon="!" tone="warning" />
      </div>

      <Card className={styles.card}>
        <div className={styles.filters}>
          <Input
            aria-label="Buscar proyectos"
            placeholder="Buscar por nombre, organización, área o estado"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
          <Button variant="secondary" onClick={load} disabled={loading}>
            {loading ? 'Actualizando...' : 'Actualizar'}
          </Button>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon="◇"
            title="No hay proyectos para mostrar"
            description="Ajusta los filtros o crea un nuevo proyecto cuando el flujo de administración esté activo."
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Proyecto</th>
                <th>Organización</th>
                <th>Área</th>
                <th>Estado</th>
                <th>Privacidad</th>
                <th>Inicio</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((project) => (
                <tr key={project.id}>
                  <td>
                    <strong>{project.name}</strong>
                    <span className={styles.subtle}>{project.description || 'Sin descripción'}</span>
                  </td>
                  <td>{project.organization || '—'}</td>
                  <td>{project.areaName || '—'}</td>
                  <td><Badge tone={STATUS_TONE[project.status] || 'neutral'}>{project.status || 'DRAFT'}</Badge></td>
                  <td><Badge tone="primary">{project.privacyStatus || 'PRIVATE'}</Badge></td>
                  <td>{project.startDate ? new Date(project.startDate).toLocaleDateString('es-BO') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
