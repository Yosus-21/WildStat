import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { detectionsApi, speciesApi } from '../api/detectionsApi';
import StatusBadge from '../../../components/StatusBadge';
import Spinner from '../../../components/Spinner';
import ErrorMessage from '../../../components/ErrorMessage';
import { useAuth } from '../../../context/AuthContext';
import styles from './DetectionReviewPage.module.css';

const SEX_LABELS = { MALE: 'Macho', FEMALE: 'Hembra', UNDETERMINED: 'No determinado' };
const IND_LABELS = { YES: 'Sí (independiente)', NO: 'No (relacionado)', UNDETERMINED: 'No determinado' };
const STATUS_LABELS = {
  VALIDATED: 'Validada',
  CORRECTED: 'Corregida',
  DISCARDED: 'Descartada',
  DOUBTFUL: 'Dudosa',
};

function fmtDate(val) {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d)) return val;
  return d.toLocaleString('es-PY', { dateStyle: 'medium', timeStyle: 'short' });
}

function pct(val) {
  if (val == null) return '—';
  return `${(Number(val) * 100).toFixed(1)}%`;
}

export default function DetectionReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isInvestigator } = useAuth();

  const [ctx, setCtx] = useState(null);
  const [species, setSpecies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    hasAnimal: true,
    validatedSpeciesId: '',
    sex: 'UNDETERMINED',
    isIndependent: 'UNDETERMINED',
    relatedDetectionId: '',
    reviewStatus: 'VALIDATED',
    notes: '',
  });

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [imageUrl, setImageUrl] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [clipUrl, setClipUrl] = useState(null);
  const [clipError, setClipError] = useState(false);

  const token = localStorage.getItem('token');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [ctxData, speciesData] = await Promise.all([
        detectionsApi.getValidationContext(id),
        speciesApi.getAll(),
      ]);
      setCtx(ctxData);
      setSpecies(speciesData);

      const det = ctxData.detection;
      setForm((f) => ({
        ...f,
        hasAnimal: det.hasAnimal ?? true,
        validatedSpeciesId: det.validatedSpeciesId ?? det.species?.id ?? '',
        sex: det.sex ?? 'UNDETERMINED',
        isIndependent: det.isIndependent ?? 'UNDETERMINED',
        relatedDetectionId: det.relatedDetectionId ?? '',
        reviewStatus: det.reviewStatus === 'PENDING' ? 'VALIDATED' : det.reviewStatus,
        notes: det.notes ?? '',
      }));
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo cargar la detección.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!ctx) return;
    const src = `${import.meta.env.VITE_API_URL}/detections/${id}/frame`;
    setImageError(false);
    fetch(src, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => { if (!r.ok) throw new Error(); return r.blob(); })
      .then((blob) => setImageUrl(URL.createObjectURL(blob)))
      .catch(() => setImageError(true));
  }, [ctx, id, token]);

  useEffect(() => {
    if (!ctx?.clipUrl) { setClipError(true); return; }
    const src = `${import.meta.env.VITE_API_URL}/detections/${id}/clip`;
    setClipError(false);
    fetch(src, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => { if (!r.ok) throw new Error(); return r.blob(); })
      .then((blob) => setClipUrl(URL.createObjectURL(blob)))
      .catch(() => setClipError(true));
  }, [ctx, id, token]);

  function set(field, value) {
    setForm((f) => {
      const next = { ...f, [field]: value };
      if (field === 'hasAnimal' && !value) {
        next.reviewStatus = 'DISCARDED';
      }
      if (field === 'hasAnimal' && value && next.reviewStatus === 'DISCARDED') {
        next.reviewStatus = 'VALIDATED';
      }
      if (field === 'isIndependent' && value === 'YES') {
        next.relatedDetectionId = '';
      }
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaveError('');
    setSaveSuccess(false);
    setSaving(true);

    const body = {
      hasAnimal: form.hasAnimal,
      sex: form.sex,
      isIndependent: form.isIndependent,
      reviewStatus: form.reviewStatus,
      notes: form.notes || undefined,
    };

    if (form.hasAnimal && form.reviewStatus !== 'DISCARDED') {
      if (form.validatedSpeciesId) {
        body.validatedSpeciesId = form.validatedSpeciesId;
      }
    }

    if (form.isIndependent === 'NO' && form.relatedDetectionId) {
      body.relatedDetectionId = form.relatedDetectionId;
    }

    try {
      await detectionsApi.validate(id, body);
      setSaveSuccess(true);
      setTimeout(() => navigate('/detections/pending'), 1200);
    } catch (err) {
      const msg = err.response?.data?.message;
      setSaveError(Array.isArray(msg) ? msg.join(' | ') : (msg || 'Error al guardar la validación.'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner text="Cargando contexto de validación..." />;
  if (error) return <ErrorMessage message={error} />;
  if (!ctx) return null;

  const det = ctx.detection;
  const relatedCandidates = ctx.relatedCandidates ?? [];

  const speciesRequired =
    form.hasAnimal && (form.reviewStatus === 'VALIDATED' || form.reviewStatus === 'CORRECTED');

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <Link to="/detections/pending" className={styles.backLink}>← Volver a pendientes</Link>
        <span className={styles.separator}>/</span>
        <span>Revisión #{id.slice(0, 8)}</span>
      </div>

      <div className={styles.layout}>
        {/* LEFT: media + metadata */}
        <div className={styles.left}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Frame clave</h3>
            {imageError ? (
              <div className={styles.noMedia}>No hay frame disponible para esta detección.</div>
            ) : imageUrl ? (
              <img src={imageUrl} alt="frame" className={styles.frame} />
            ) : (
              <div className={styles.mediaPlaceholder}>Cargando frame...</div>
            )}
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Clip de video</h3>
            {clipError ? (
              <div className={styles.noMedia}>Esta detección no tiene clip asociado.</div>
            ) : clipUrl ? (
              <video
                src={clipUrl}
                controls
                className={styles.clip}
                preload="metadata"
              />
            ) : (
              <div className={styles.mediaPlaceholder}>Cargando clip...</div>
            )}
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Metadatos IA</h3>
            <dl className={styles.dl}>
              <dt>Especie sugerida</dt>
              <dd><strong>{det.aiSpecies || det.suggestedSpecies || '—'}</strong></dd>
              <dt>Confianza IA</dt>
              <dd>
                <span className={styles.conf}>
                  {pct(det.aiConfidence ?? det.confidence)}
                </span>
              </dd>
              <dt>Timestamp</dt>
              <dd className={styles.mono}>{det.timestampVideo || '—'}</dd>
              <dt>Detectado</dt>
              <dd>{fmtDate(det.detectedAt)}</dd>
              <dt>Estado</dt>
              <dd><StatusBadge status={det.reviewStatus} /></dd>
            </dl>
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Contexto</h3>
            <dl className={styles.dl}>
              <dt>Proyecto</dt>
              <dd>{det.project?.name || '—'}</dd>
              <dt>Cámara</dt>
              <dd>{det.camera?.code || '—'}{det.camera?.stationCode ? ` (${det.camera.stationCode})` : ''}</dd>
              <dt>Zona</dt>
              <dd>{det.camera?.zone || '—'}</dd>
              <dt>Revisor</dt>
              <dd>{det.reviewer?.name || '—'}</dd>
              <dt>Validado</dt>
              <dd>{fmtDate(det.validatedAt)}</dd>
            </dl>
          </div>
        </div>

        {/* RIGHT: validation form */}
        <div className={styles.right}>
          {!isInvestigator ? (
            <div className={styles.viewerBanner}>
              ℹ️ Tu rol permite consulta, pero no validación. Solo los investigadores pueden validar.
            </div>
          ) : null}

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Formulario de validación</h3>

            {saveSuccess && (
              <div className={styles.successBanner}>
                ✅ Validación guardada correctamente. Redirigiendo...
              </div>
            )}

            {saveError && (
              <div className={styles.errorBanner}>{saveError}</div>
            )}

            <form onSubmit={handleSubmit} className={styles.form}>
              {/* hasAnimal */}
              <div className={styles.field}>
                <label className={styles.label}>¿Hay animal?</label>
                <div className={styles.radioGroup}>
                  {[
                    { value: true, label: 'Sí' },
                    { value: false, label: 'No' },
                  ].map(({ value, label }) => (
                    <label key={String(value)} className={styles.radio}>
                      <input
                        type="radio"
                        name="hasAnimal"
                        checked={form.hasAnimal === value}
                        onChange={() => set('hasAnimal', value)}
                        disabled={!isInvestigator}
                      />
                      {label}
                    </label>
                  ))}
                </div>
                {!form.hasAnimal && (
                  <p className={styles.hint}>
                    Sin animal → se marcará como Descartada.
                  </p>
                )}
              </div>

              {/* species */}
              <div className={styles.field}>
                <label className={styles.label}>
                  Especie validada
                  {speciesRequired && <span className={styles.req}> *</span>}
                </label>
                <select
                  className={styles.select}
                  value={form.validatedSpeciesId}
                  onChange={(e) => set('validatedSpeciesId', e.target.value)}
                  disabled={!isInvestigator || !form.hasAnimal || form.reviewStatus === 'DISCARDED'}
                  required={speciesRequired}
                >
                  <option value="">— Seleccionar especie —</option>
                  {species.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.commonName}{s.scientificName ? ` (${s.scientificName})` : ''}
                    </option>
                  ))}
                </select>
                {ctx.aiSuggestion?.species && (
                  <p className={styles.hint}>
                    IA sugiere: <strong>{ctx.aiSuggestion.species}</strong> ({pct(ctx.aiSuggestion.confidence)})
                  </p>
                )}
              </div>

              {/* sex */}
              <div className={styles.field}>
                <label className={styles.label}>Sexo</label>
                <select
                  className={styles.select}
                  value={form.sex}
                  onChange={(e) => set('sex', e.target.value)}
                  disabled={!isInvestigator || !form.hasAnimal}
                >
                  {Object.entries(SEX_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>

              {/* isIndependent */}
              <div className={styles.field}>
                <label className={styles.label}>¿Individuo/evento independiente?</label>
                <select
                  className={styles.select}
                  value={form.isIndependent}
                  onChange={(e) => set('isIndependent', e.target.value)}
                  disabled={!isInvestigator || !form.hasAnimal}
                >
                  {Object.entries(IND_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>

              {/* relatedDetection */}
              {form.isIndependent === 'NO' && (
                <div className={styles.field}>
                  <label className={styles.label}>Evento relacionado</label>
                  {relatedCandidates.length === 0 ? (
                    <p className={styles.hint}>No hay candidatos en esta cámara/proyecto.</p>
                  ) : (
                    <select
                      className={styles.select}
                      value={form.relatedDetectionId}
                      onChange={(e) => set('relatedDetectionId', e.target.value)}
                      disabled={!isInvestigator}
                    >
                      <option value="">— Sin evento relacionado —</option>
                      {relatedCandidates.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.timestampVideo || fmtDate(r.detectedAt) || r.id.slice(0, 8)} — {r.aiSpecies || r.validatedSpecies || '?'}
                          {r.reviewStatus ? ` [${r.reviewStatus}]` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* reviewStatus */}
              <div className={styles.field}>
                <label className={styles.label}>Estado de revisión <span className={styles.req}>*</span></label>
                <select
                  className={styles.select}
                  value={form.reviewStatus}
                  onChange={(e) => set('reviewStatus', e.target.value)}
                  disabled={!isInvestigator || !form.hasAnimal}
                  required
                >
                  {Object.entries(STATUS_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
                {!form.hasAnimal && (
                  <p className={styles.hint}>Sin animal: solo DISCARDED permitido.</p>
                )}
              </div>

              {/* notes */}
              <div className={styles.field}>
                <label className={styles.label}>Observaciones</label>
                <textarea
                  className={styles.textarea}
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  rows={3}
                  placeholder="Jaguar macho visible, evento independiente..."
                  disabled={!isInvestigator}
                />
              </div>

              {isInvestigator && (
                <div className={styles.actions}>
                  <button
                    type="submit"
                    disabled={saving || saveSuccess}
                    className={styles.saveBtn}
                  >
                    {saving ? 'Guardando...' : '💾 Guardar validación'}
                  </button>
                  <Link to="/detections/pending" className={styles.cancelBtn}>
                    Cancelar
                  </Link>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
