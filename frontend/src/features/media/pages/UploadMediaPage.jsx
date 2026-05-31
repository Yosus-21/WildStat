import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { mediaApi } from '../api/mediaApi';
import styles from './UploadMediaPage.module.css';

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png'];
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'avi', 'mkv'];
const ALLOWED_EXTENSIONS = [...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS];
const MAX_IMAGE_SIZE_BYTES = 25 * 1024 * 1024;
const MAX_VIDEO_SIZE_BYTES = 500 * 1024 * 1024;
const POLL_INTERVAL_MS = 2000;
const TERMINAL_STATUSES = ['PENDING_REVIEW', 'PROCESSED', 'VALIDATED', 'ERROR'];

const STATUS_LABELS = {
  UPLOADED: 'Archivo recibido por backend',
  PROCESSING: 'Procesando con YOLO',
  PROCESSED: 'Procesado',
  PENDING_REVIEW: 'Pendiente de revisión',
  VALIDATED: 'Validado',
  ERROR: 'Error',
};

function extensionOf(fileName = '') {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

function mediaKind(file) {
  const ext = extensionOf(file?.name);
  if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
  if (VIDEO_EXTENSIONS.includes(ext)) return 'video';
  return 'unknown';
}

function formatMb(bytes = 0) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatDate(value) {
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatConfidence(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 'Sin confianza';
  return `${Math.round(numeric * 100)}%`;
}

function formatSeconds(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 'Sin timestamp';
  const minutes = Math.floor(numeric / 60);
  const seconds = Math.floor(numeric % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default function UploadMediaPage() {
  const { user, isInvestigator } = useAuth();
  const token = localStorage.getItem('token');
  const [projects, setProjects] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [recentMedia, setRecentMedia] = useState([]);
  const [projectId, setProjectId] = useState('');
  const [cameraId, setCameraId] = useState('');
  const [recordingDate, setRecordingDate] = useState('');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState(null);
  const [status, setStatus] = useState(null);
  const [detections, setDetections] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const pollingRef = useRef(null);

  const selectedKind = useMemo(() => (file ? mediaKind(file) : null), [file]);
  const selectedProject = projects.find((p) => p.id === projectId);
  const selectedCamera = cameras.find((c) => c.id === cameraId);

  const loadRecentMedia = useCallback(async () => {
    try {
      const rows = await mediaApi.getMediaList();
      setRecentMedia(rows.slice(0, 6));
    } catch {
      setRecentMedia([]);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadCatalog() {
      setLoadingCatalog(true);
      setError('');
      try {
        const [projectRows, mediaRows] = await Promise.all([
          mediaApi.getProjects(),
          mediaApi.getMediaList(),
        ]);
        if (!mounted) return;
        setProjects(projectRows);
        setRecentMedia(mediaRows.slice(0, 6));
        if (projectRows[0]) {
          setProjectId((current) => current || projectRows[0].id);
        }
      } catch (err) {
        if (mounted) {
          setError(err.response?.data?.message || 'No se pudo cargar proyectos y archivos.');
        }
      } finally {
        if (mounted) setLoadingCatalog(false);
      }
    }
    loadCatalog();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadCameras() {
      if (!projectId) {
        setCameras([]);
        setCameraId('');
        return;
      }
      try {
        const rows = await mediaApi.getCameras(projectId);
        if (!mounted) return;
        setCameras(rows);
        setCameraId((current) => {
          if (rows.some((camera) => camera.id === current)) return current;
          return rows[0]?.id || '';
        });
      } catch (err) {
        if (mounted) {
          setCameras([]);
          setCameraId('');
          setError(err.response?.data?.message || 'No se pudieron cargar las cámaras.');
        }
      }
    }
    loadCameras();
    return () => {
      mounted = false;
    };
  }, [projectId]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl('');
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) window.clearInterval(pollingRef.current);
    };
  }, []);

  function validateForm() {
    if (!isInvestigator) return 'Tu rol permite consultar resultados, pero no subir archivos para análisis.';
    if (!projectId) return 'Selecciona un proyecto.';
    if (!cameraId) return 'Selecciona una cámara.';
    if (!file) return 'Selecciona una imagen o video.';

    const ext = extensionOf(file.name);
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return 'Formato no permitido. Usa jpg, jpeg, png, mp4, mov, avi o mkv.';
    }

    const kind = mediaKind(file);
    if (kind === 'image' && file.size > MAX_IMAGE_SIZE_BYTES) {
      return 'La imagen supera el límite real de 25 MB.';
    }
    if (kind === 'video' && file.size > MAX_VIDEO_SIZE_BYTES) {
      return 'El video supera el límite real de 500 MB.';
    }
    return '';
  }

  async function refreshDetections(mediaFileId) {
    const rows = await mediaApi.getDetectionsByMedia(mediaFileId);
    setDetections(rows);
    return rows;
  }

  function stopPolling() {
    if (pollingRef.current) {
      window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }

  function startPolling(mediaFileId, kind) {
    stopPolling();
    const startedAt = Date.now();
    const maxMs = kind === 'video' ? 5 * 60 * 1000 : 2 * 60 * 1000;

    async function tick() {
      try {
        const nextStatus = await mediaApi.getMediaStatus(mediaFileId);
        setStatus(nextStatus);

        if (nextStatus.detectionsCount > 0 || TERMINAL_STATUSES.includes(nextStatus.processingStatus)) {
          await refreshDetections(mediaFileId);
        }

        if (TERMINAL_STATUSES.includes(nextStatus.processingStatus)) {
          stopPolling();
          await loadRecentMedia();
          if (nextStatus.processingStatus === 'ERROR') {
            setError(nextStatus.errorMessage || 'El servicio de IA no pudo completar el procesamiento.');
          } else if (nextStatus.detectionsCount > 0) {
            setNotice('WildStat detectó posibles eventos de jaguar.');
          } else {
            setNotice('El archivo fue procesado correctamente, pero no se detectaron eventos que superen el umbral de confianza.');
          }
        } else if (Date.now() - startedAt > maxMs) {
          stopPolling();
          setNotice('El procesamiento está tardando más de lo esperado. Puedes revisar el resultado luego en Detecciones pendientes.');
        }
      } catch (err) {
        stopPolling();
        setError(err.response?.data?.message || 'No se pudo consultar el estado de procesamiento.');
      }
    }

    tick();
    pollingRef.current = window.setInterval(tick, POLL_INTERVAL_MS);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadResult(null);
    setStatus(null);
    setDetections([]);
    setError('');
    setNotice('Subiendo archivo...');

    try {
      const result = await mediaApi.uploadMedia({
        file,
        projectId,
        cameraId,
        recordingDate,
        onUploadProgress: (progressEvent) => {
          if (!progressEvent.total) return;
          setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
        },
      });

      setUploadProgress(100);
      setUploadResult(result);
      setStatus({
        id: result.mediaFile.id,
        fileType: result.mediaFile.fileType,
        processingStatus: result.mediaFile.processingStatus,
        detectionsCount: 0,
      });
      setNotice('Archivo recibido por backend. Enviado a procesamiento IA.');
      startPolling(result.mediaFile.id, selectedKind);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo subir el archivo.');
      setNotice('');
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(event) {
    const nextFile = event.target.files?.[0] || null;
    setFile(nextFile);
    setUploadResult(null);
    setStatus(null);
    setDetections([]);
    setError('');
    setNotice('');
    setUploadProgress(0);
  }

  const currentStatus = status?.processingStatus || uploadResult?.mediaFile?.processingStatus;
  const statusLabel = STATUS_LABELS[currentStatus] || currentStatus || 'Esperando archivo';
  const canSubmit = isInvestigator && !uploading && !pollingRef.current;

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <div>
          <h2>Subir imagen o video para análisis</h2>
          <p>WildStat analizará el archivo con IA y generará detecciones pendientes para revisión humana.</p>
        </div>
        <Link className={styles.pendingLink} to="/detections/pending">
          Ver pendientes
        </Link>
      </section>

      {!isInvestigator && (
        <div className={styles.roleNotice}>
          Tu rol permite consultar resultados, pero no subir archivos para análisis.
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}
      {notice && !error && <div className={styles.notice}>{notice}</div>}

      <section className={styles.grid}>
        <form className={styles.panel} onSubmit={handleSubmit}>
          <div className={styles.formGrid}>
            <label>
              Proyecto
              <select
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
                disabled={loadingCatalog || uploading || !isInvestigator}
              >
                <option value="">Seleccionar proyecto</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </label>

            <label>
              Cámara
              <select
                value={cameraId}
                onChange={(event) => setCameraId(event.target.value)}
                disabled={!projectId || uploading || !isInvestigator}
              >
                <option value="">Seleccionar cámara</option>
                {cameras.map((camera) => (
                  <option key={camera.id} value={camera.id}>
                    {camera.code || camera.stationCode || camera.id}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Fecha de grabación
              <input
                type="datetime-local"
                value={recordingDate}
                onChange={(event) => setRecordingDate(event.target.value)}
                disabled={uploading || !isInvestigator}
              />
            </label>

            <label>
              Archivo
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.mp4,.mov,.avi,.mkv,image/jpeg,image/png,video/mp4,video/quicktime,video/x-msvideo,video/x-matroska"
                onChange={handleFileChange}
                disabled={uploading || !isInvestigator}
              />
            </label>
          </div>

          <p className={styles.limitText}>
            Límite real: imágenes hasta 25 MB y videos hasta 500 MB. Formatos: jpg, jpeg, png, mp4, mov, avi, mkv.
          </p>

          {file && (
            <div className={styles.fileBox}>
              <div className={styles.fileMeta}>
                <strong>{file.name}</strong>
                <span>{selectedKind === 'video' ? 'Video' : selectedKind === 'image' ? 'Imagen' : 'Archivo'} · {file.type || 'tipo desconocido'} · {formatMb(file.size)}</span>
                <span>{selectedProject?.name || 'Proyecto sin seleccionar'} · {selectedCamera?.code || selectedCamera?.stationCode || 'Cámara sin seleccionar'}</span>
              </div>
              <div className={styles.preview}>
                {selectedKind === 'image' && <img src={previewUrl} alt="Vista previa" />}
                {selectedKind === 'video' && <video src={previewUrl} controls />}
                {selectedKind === 'unknown' && <span>Sin vista previa</span>}
              </div>
            </div>
          )}

          {(uploading || uploadProgress > 0 || currentStatus) && (
            <div className={styles.progressBlock}>
              <div className={styles.progressHeader}>
                <span>{uploading ? 'Subiendo archivo...' : statusLabel}</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className={styles.progressTrack}>
                <div className={styles.progressBar} style={{ width: `${uploadProgress}%` }} />
              </div>
              <div className={styles.statusSteps}>
                <span className={uploadProgress > 0 ? styles.activeStep : ''}>Subida</span>
                <span className={uploadResult ? styles.activeStep : ''}>Backend</span>
                <span className={currentStatus === 'PROCESSING' ? styles.activeStep : ''}>YOLO</span>
                <span className={TERMINAL_STATUSES.includes(currentStatus) ? styles.activeStep : ''}>Resultado</span>
              </div>
            </div>
          )}

          <button className={styles.submitBtn} type="submit" disabled={!canSubmit}>
            {uploading ? 'Subiendo...' : 'Subir y analizar'}
          </button>
        </form>

        <AnalysisResult
          status={status}
          detections={detections}
          token={token}
          mediaFileId={uploadResult?.mediaFile?.id}
        />
      </section>

      <RecentMediaList rows={recentMedia} />
    </div>
  );
}

function AnalysisResult({ status, detections, token, mediaFileId }) {
  if (!status && detections.length === 0) {
    return (
      <aside className={styles.resultPanel}>
        <h3>Resultado del análisis</h3>
        <p className={styles.muted}>Sube una imagen o video para ver aquí los eventos detectados por IA.</p>
      </aside>
    );
  }

  const terminal = TERMINAL_STATUSES.includes(status?.processingStatus);
  const hasDetections = detections.length > 0;

  return (
    <aside className={styles.resultPanel}>
      <h3>Resultado del análisis</h3>
      <dl className={styles.statusList}>
        <div>
          <dt>Archivo</dt>
          <dd>{mediaFileId || status?.id}</dd>
        </div>
        <div>
          <dt>Estado</dt>
          <dd>{STATUS_LABELS[status?.processingStatus] || status?.processingStatus || 'Esperando resultados'}</dd>
        </div>
        <div>
          <dt>Detecciones</dt>
          <dd>{status?.detectionsCount ?? detections.length}</dd>
        </div>
      </dl>

      {status?.errorMessage && <div className={styles.error}>{status.errorMessage}</div>}

      {terminal && !hasDetections && status?.processingStatus !== 'ERROR' && (
        <div className={styles.emptyResult}>
          <strong>No se detectaron jaguares en este archivo.</strong>
          <span>El archivo fue procesado correctamente, pero el modelo no encontró eventos que superen el umbral de confianza.</span>
        </div>
      )}

      {hasDetections && (
        <div className={styles.eventList}>
          <h4>WildStat detectó posibles eventos de jaguar.</h4>
          {detections.map((detection) => (
            <DetectionEventCard key={detection.id} detection={detection} token={token} />
          ))}
        </div>
      )}
    </aside>
  );
}

function DetectionEventCard({ detection, token }) {
  const [frameUrl, setFrameUrl] = useState('');
  const [clipUrl, setClipUrl] = useState('');
  const [frameError, setFrameError] = useState(false);
  const [clipError, setClipError] = useState(false);

  useEffect(() => {
    let frameObjectUrl = '';
    let clipObjectUrl = '';
    const headers = { Authorization: `Bearer ${token}` };

    fetch(`${import.meta.env.VITE_API_URL}/detections/${detection.id}/frame`, { headers })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.blob();
      })
      .then((blob) => {
        frameObjectUrl = URL.createObjectURL(blob);
        setFrameUrl(frameObjectUrl);
      })
      .catch(() => setFrameError(true));

    if (detection.clipPath) {
      fetch(`${import.meta.env.VITE_API_URL}/detections/${detection.id}/clip`, { headers })
        .then((r) => {
          if (!r.ok) throw new Error();
          return r.blob();
        })
        .then((blob) => {
          clipObjectUrl = URL.createObjectURL(blob);
          setClipUrl(clipObjectUrl);
        })
        .catch(() => setClipError(true));
    }

    return () => {
      if (frameObjectUrl) URL.revokeObjectURL(frameObjectUrl);
      if (clipObjectUrl) URL.revokeObjectURL(clipObjectUrl);
    };
  }, [detection.id, detection.clipPath, token]);

  return (
    <article className={styles.eventCard}>
      <div className={styles.eventMedia}>
        {frameUrl && <img src={frameUrl} alt="Frame clave" />}
        {!frameUrl && !frameError && <span>Cargando frame...</span>}
        {frameError && <span>Frame no disponible</span>}
      </div>
      <div className={styles.eventBody}>
        <div className={styles.eventTitle}>
          <strong>{detection.aiSpecies || 'Posible jaguar'}</strong>
          <span>{formatConfidence(detection.aiConfidence)}</span>
        </div>
        <p>Minuto: {detection.timestampVideo || formatSeconds(detection.timestampSeconds || detection.startTime)}</p>
        <p>Rango: {formatSeconds(detection.startTime)} - {formatSeconds(detection.endTime)}</p>
        {clipUrl && <video className={styles.clip} src={clipUrl} controls />}
        {detection.clipPath && clipError && <p className={styles.muted}>Clip no disponible.</p>}
        <Link className={styles.reviewBtn} to={`/detections/${detection.id}/review`}>
          Revisar detección
        </Link>
      </div>
    </article>
  );
}

function RecentMediaList({ rows }) {
  return (
    <section className={styles.recentPanel}>
      <div className={styles.recentHeader}>
        <h3>Últimos archivos subidos</h3>
        <Link to="/detections/pending">Ver detecciones pendientes</Link>
      </div>
      {rows.length === 0 ? (
        <p className={styles.muted}>No hay archivos recientes para mostrar.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Archivo</th>
                <th>Tipo</th>
                <th>Proyecto</th>
                <th>Cámara</th>
                <th>Estado</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.originalName || row.fileName}</td>
                  <td>{row.fileType}</td>
                  <td>{row.project?.name || '—'}</td>
                  <td>{row.camera?.code || row.camera?.stationCode || '—'}</td>
                  <td><span className={styles.statusPill}>{STATUS_LABELS[row.processingStatus] || row.processingStatus}</span></td>
                  <td>{formatDate(row.uploadDate || row.recordingDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
