import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ErrorMessage from '../../../components/ErrorMessage';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import EmptyState from '../../../components/ui/EmptyState';
import PageHeader from '../../../components/ui/PageHeader';
import Skeleton from '../../../components/ui/Skeleton';
import StatCard from '../../../components/ui/StatCard';
import { mediaApi } from '../../media/api/mediaApi';
import { detectionsApi } from '../../detections/api/detectionsApi';
import styles from './DashboardPage.module.css';

export default function DashboardPage() {
  const [data, setData] = useState({
    projects: [],
    cameras: [],
    media: [],
    pending: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [projects, cameras, media, pending] = await Promise.all([
        mediaApi.getProjects(),
        mediaApi.getCameras(),
        mediaApi.getMediaList(),
        detectionsApi.getPending(),
      ]);
      setData({ projects, cameras, media, pending });
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo cargar el dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeProject = data.projects[0];
  const latest = useMemo(() => data.media.slice(0, 5), [data.media]);

  if (error) return <ErrorMessage message={error} />;

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Centro de monitoreo"
        title="Dashboard"
        description="Vista ejecutiva del flujo de cámaras trampa, procesamiento IA y revisión científica."
        actions={<Button onClick={load} variant="secondary">Actualizar</Button>}
      />

      <section className={styles.hero}>
        <div>
          <span>Proyecto activo</span>
          <h2>{activeProject?.name || 'Sin proyecto activo'}</h2>
          <p>Monitoreo de jaguar con trazabilidad humana, dataset validado y reportes listos para presentación.</p>
        </div>
        <Link to="/media/upload">Subir archivo</Link>
      </section>

      {loading ? (
        <div className={styles.statGrid}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className={styles.loadingCard}>
              <Skeleton width={44} height={44} />
              <Skeleton width="70%" />
              <Skeleton width="42%" height={30} />
            </Card>
          ))}
        </div>
      ) : (
        <div className={styles.statGrid}>
          <StatCard label="Proyectos activos" value={data.projects.length} detail="unidades de monitoreo" icon="◇" />
          <StatCard label="Cámaras registradas" value={data.cameras.length} detail="estaciones en campo" icon="⌖" tone="info" />
          <StatCard label="Archivos procesados" value={data.media.length} detail="imágenes y videos" icon="▣" tone="success" />
          <StatCard label="Pendientes" value={data.pending.length} detail="requieren revisión" icon="!" tone="warning" />
        </div>
      )}

      <div className={styles.grid}>
        <Card className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h3>Cola de revisión</h3>
              <p>Eventos propuestos por IA listos para validación humana.</p>
            </div>
            <Link to="/detections/pending">Abrir</Link>
          </div>
          {loading ? (
            <div className={styles.stack}><Skeleton /><Skeleton /><Skeleton /></div>
          ) : data.pending.length === 0 ? (
            <EmptyState title="No hay detecciones todavía" description="Cuando la IA encuentre eventos sobre el umbral, aparecerán aquí." icon="○" />
          ) : (
            <div className={styles.reviewList}>
              {data.pending.slice(0, 4).map((item) => (
                <Link key={item.id} to={`/detections/${item.id}/review`} className={styles.reviewItem}>
                  <div>
                    <strong>{item.aiSpecies || 'Posible jaguar'}</strong>
                    <span>{item.project?.name || 'Proyecto sin nombre'} · {item.camera?.code || 'Cámara s/d'}</span>
                  </div>
                  <Badge tone={Number(item.aiConfidence) >= 0.7 ? 'success' : 'warning'}>
                    {Math.round(Number(item.aiConfidence || 0) * 100)}%
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h3>Archivos recientes</h3>
              <p>Últimas cargas procesadas por WildStat.</p>
            </div>
            <Link to="/media/upload">Ver</Link>
          </div>
          <div className={styles.mediaList}>
            {latest.map((item) => (
              <div key={item.id} className={styles.mediaItem}>
                <div>
                  <strong>{item.originalName || item.fileName}</strong>
                  <span>{item.fileType} · {item.camera?.code || 'Cámara s/d'}</span>
                </div>
                <Badge tone={item.processingStatus === 'ERROR' ? 'danger' : item.processingStatus === 'PENDING_REVIEW' ? 'warning' : 'success'}>
                  {item.processingStatus}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
