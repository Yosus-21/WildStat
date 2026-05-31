import { useCallback, useEffect, useMemo, useState } from 'react';
import ErrorMessage from '../../../components/ErrorMessage';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import EmptyState from '../../../components/ui/EmptyState';
import { Input } from '../../../components/ui/Field';
import PageHeader from '../../../components/ui/PageHeader';
import Table from '../../../components/ui/Table';
import { mediaApi } from '../../media/api/mediaApi';
import styles from './CamerasPage.module.css';

export default function CamerasPage() {
  const [cameras, setCameras] = useState([]);
  const [filter, setFilter] = useState('');
  const [view, setView] = useState('cards');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setCameras(await mediaApi.getCameras());
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudieron cargar las cámaras.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = filter.toLowerCase();
    return cameras.filter((camera) =>
      [camera.code, camera.stationCode, camera.zone, camera.habitatType, camera.project?.name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [cameras, filter]);

  if (error) return <ErrorMessage message={error} />;

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Red de campo"
        title="Cámaras"
        description="Inventario operativo de estaciones, zonas, hábitat y coordenadas de monitoreo."
        actions={<Button variant="secondary" onClick={load} disabled={loading}>Actualizar</Button>}
      />

      <Card className={styles.toolbar}>
        <Input
          aria-label="Buscar cámaras"
          placeholder="Buscar por código, zona, hábitat o proyecto"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
        <div className={styles.segmented} aria-label="Cambiar vista">
          <button className={view === 'cards' ? styles.active : ''} onClick={() => setView('cards')}>Cards</button>
          <button className={view === 'table' ? styles.active : ''} onClick={() => setView('table')}>Tabla</button>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState icon="⌖" title="No hay cámaras registradas" description="Cuando el backend tenga cámaras para el proyecto, se mostrarán en esta vista." />
      ) : view === 'cards' ? (
        <div className={styles.cards}>
          {filtered.map((camera) => (
            <Card key={camera.id} className={styles.cameraCard} interactive>
              <div className={styles.cameraTop}>
                <div className={styles.cameraIcon}>⌖</div>
                <Badge tone="success">Activa</Badge>
              </div>
              <h3>{camera.code || camera.stationCode || 'Cámara sin código'}</h3>
              <p>{camera.project?.name || 'Proyecto no asociado'}</p>
              <dl>
                <div><dt>Zona</dt><dd>{camera.zone || '—'}</dd></div>
                <div><dt>Hábitat</dt><dd>{camera.habitatType || '—'}</dd></div>
                <div><dt>Coordenadas</dt><dd>{coords(camera)}</dd></div>
              </dl>
            </Card>
          ))}
        </div>
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Proyecto</th>
              <th>Zona</th>
              <th>Hábitat</th>
              <th>Coordenadas</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((camera) => (
              <tr key={camera.id}>
                <td><strong>{camera.code || camera.stationCode || '—'}</strong></td>
                <td>{camera.project?.name || '—'}</td>
                <td>{camera.zone || '—'}</td>
                <td>{camera.habitatType || '—'}</td>
                <td>{coords(camera)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}

function coords(camera) {
  if (camera.latitude == null || camera.longitude == null) return '—';
  return `${Number(camera.latitude).toFixed(5)}, ${Number(camera.longitude).toFixed(5)}`;
}
