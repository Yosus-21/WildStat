# Reporte Final del Proyecto WildStat

## 1. Resumen ejecutivo

WildStat es una plataforma inteligente para investigadores y biologos que trabajan
con camaras trampa. El MVP ayuda a procesar imagenes y videos, detectar posibles
jaguares con IA, validar cientificamente los eventos y generar analisis ecologico
sin programar.

El valor principal del sistema es reducir el tiempo de revision manual, mantener el
control cientifico en manos del investigador y transformar datos dispersos en un
dataset validado, indicadores, CSV y reportes PDF listos para conservacion.

## 2. Problema identificado

Los equipos de monitoreo revisan grandes volumenes de imagenes y videos de camaras
trampa. Este trabajo manual consume tiempo, dispersa la informacion y dificulta el
analisis estadistico posterior.

Ademas, la evidencia biologica requiere validacion cientifica. No basta con detectar
un animal: es necesario confirmar la especie, registrar sexo, marcar si el evento es
independiente y evitar sobreconteos cuando varias capturas pertenecen al mismo
individuo o evento.

## 3. Solucion propuesta

WildStat propone un flujo human-in-the-loop:

1. Crear un proyecto de monitoreo.
2. Registrar camaras trampa.
3. Subir imagenes o videos.
4. La IA detecta posibles jaguares.
5. El sistema extrae frame clave y clip corto.
6. El investigador valida especie, sexo e independencia.
7. Se genera un dataset validado.
8. Se visualizan analytics ecologicos.
9. Se exporta CSV.
10. Se genera un reporte PDF de proyecto.

## 4. Alcance del MVP

El MVP incluye:

- Login con JWT.
- Roles `INVESTIGATOR` y `VIEWER`.
- Proyectos y camaras.
- Carga de imagen y video.
- Procesamiento IA.
- Deteccion de jaguar.
- Validacion humana.
- Dataset validado.
- Dashboard analytics.
- Exportacion CSV.
- Reporte PDF.
- Seed demo consistente.

El MVP no incluye todavia:

- RAG.
- Mapa avanzado.
- MegaDetector.
- SECR real.
- Identificacion individual automatica por manchas.
- App movil.
- Deteccion avanzada de fuego, humo, personas o vehiculos.

## 5. Arquitectura general

```text
Frontend React + Vite
        ↓
Backend NestJS
        ↓
PostgreSQL + Prisma
        ↓
BullMQ + Redis
        ↓
FastAPI IA
        ↓
YOLOv8n + OpenCV
```

NestJS coordina usuarios, proyectos, camaras, archivos, detecciones, validaciones,
analytics y reportes. FastAPI se encarga de la inferencia pesada de IA. PostgreSQL
guarda los datos estructurados. Redis y BullMQ permiten procesar archivos de forma
asincronica. React ofrece la interfaz para el investigador.

## 6. Stack tecnologico

Frontend:

- React.
- Vite.
- Axios.
- React Router DOM.
- Recharts.
- CSS Modules y CSS normal.

Backend:

- NestJS.
- TypeScript.
- Prisma.
- PostgreSQL.
- JWT.
- Passport.
- Multer.
- BullMQ.
- Redis.
- Swagger.
- PDFKit.
- json2csv.

IA:

- Python.
- FastAPI.
- OpenCV.
- Ultralytics YOLOv8n.
- PyTorch MPS.
- Roboflow.
- NumPy.
- Pillow.

## 7. Modulo de IA

El modulo de IA usa el dataset Roboflow Universe VOD6 Yosi, proyecto
`jaguar-ngh6d`, con clase `jaguar`. Se entreno YOLOv8n usando Apple Silicon/MPS y
el mejor peso quedo como `models/yolo/best.pt`.

Endpoints principales:

- `GET /health`.
- `GET /model`.
- `POST /detect/image`.
- `POST /detect/video`.

Capacidades:

- Deteccion en imagen.
- Deteccion en video.
- Extraccion de frames.
- Agrupacion temporal de detecciones en eventos.
- Frame clave.
- Clip corto.

Metricas aproximadas del modelo:

- Precision: `0.9735`.
- Recall: `0.9586`.
- mAP50: `0.9908`.
- mAP50-95: `0.8161`.

## 8. Backend

Modulos principales:

- `auth`.
- `users`.
- `projects`.
- `cameras`.
- `media`.
- `ai-client`.
- `jobs`.
- `detections`.
- `validations`.
- `species`.
- `dataset`.
- `analytics`.
- `reports`.

Flujo Backend-IA:

```text
upload → mediaFile → BullMQ job → FastAPI → detections → PENDING_REVIEW
```

Si la IA genera eventos, se crean detecciones pendientes de revision. Si no hay
detecciones, el archivo queda procesado. Si FastAPI esta apagado o falla, el
`mediaFile` pasa a `ERROR` con `errorMessage`.

## 9. Validacion humana

WildStat usa un enfoque human-in-the-loop:

- La IA sugiere.
- El investigador confirma o corrige.
- Se registra especie validada.
- Se registra sexo.
- Se marca individuo o evento independiente.
- Se puede relacionar con un evento anterior.
- Se guardan observaciones.
- Se registra revisor y fecha de validacion.

Estados:

- `PENDING`: pendiente de revision.
- `VALIDATED`: deteccion validada.
- `CORRECTED`: deteccion corregida.
- `DISCARDED`: falso positivo o sin animal.
- `DOUBTFUL`: caso dudoso.

## 10. Analytics ecologico

Metricas disponibles:

- Resumen general.
- Frecuencia por especie.
- Abundancia de jaguar.
- Apariciones por zona.
- Apariciones por mes.
- Proporcion de sexos.
- Actividad por hora.
- Densidad simple.
- Habitat compartido.
- Tendencia.

La densidad poblacional es una estimacion simplificada para MVP. No reemplaza
modelos cientificos como SECR.

## 11. Exportaciones y reportes

WildStat permite:

- Exportar CSV con dataset validado.
- Generar PDF por proyecto.
- Incluir metricas, tablas, notas cientificas y conclusiones automaticas.
- Guardar respaldos de demo en `demo-assets`.

Backups actuales:

- `demo-assets/dataset-demo.csv`.
- `demo-assets/reporte-demo.pdf`.

## 12. Seguridad y roles

`INVESTIGATOR`:

- Sube archivos.
- Valida detecciones.
- Consulta analytics.
- Descarga CSV/PDF.

`VIEWER`:

- Consulta informacion.
- Ve analytics.
- Descarga CSV/PDF.
- No puede validar detecciones.

Seguridad implementada:

- JWT.
- Rutas protegidas.
- Control por roles.
- Frame y clip protegidos.
- `401` sin token.
- `403` cuando viewer intenta validar.

## 13. Datos demo

Proyecto:

`Monitoreo Jaguar Palmarito 2026`

Camaras:

- `CAM-01`, Zona Norte.
- `CAM-02`, Zona Rio.
- `CAM-03`, Zona Camino.

Especies:

- Jaguar.
- Puma.
- Ocelote.
- Taitetu.
- Guaso.
- Tatu.
- Jochi.

Usuarios demo:

- `investigador@faunalens.local`.
- `viewer@faunalens.local`.
- Contraseña: `FaunaLens123!`.

Los correos y la contraseña son credenciales demo; se mantienen por compatibilidad
con el seed existente.

## 14. Pruebas realizadas

- Backend build OK.
- Frontend build OK.
- Prisma validate OK.
- FastAPI `/health` OK.
- FastAPI `/model` OK con `exists=true`.
- Upload + BullMQ + IA OK.
- Validacion humana OK.
- Analytics demo OK.
- CSV demo OK.
- PDF demo OK.
- Viewer no puede validar: `403`.
- Sin token: `401`.
- Frame y clip protegidos con JWT.
- `scripts/check-demo.sh`: `13 OK`, `0 FAIL`.

## 15. Estado actual del proyecto

WildStat esta listo para demo con observaciones menores.

Observaciones:

- Redis debe estar levantado.
- FastAPI debe estar levantado.
- El procesamiento de video puede tardar.
- Si el puerto `3000` esta ocupado, ajustar `PORT` y `VITE_API_URL`.
- Existe un warning de `pg` que no bloquea la demo.

## 16. Guion recomendado de presentacion

- `0:00-0:30`: problema.
- `0:30-1:00`: solucion.
- `1:00-2:15`: demo del sistema.
- `2:15-2:45`: analytics, CSV y PDF.
- `2:45-3:00`: cierre.

## 17. Diferenciadores

- IA para reducir revision manual.
- Procesamiento de video, no solo imagenes.
- Frame y clip clave.
- Human-in-the-loop.
- Conteo de eventos independientes.
- Dataset validado.
- Analytics sin programar.
- Reporte PDF automatico.
- Proteccion de datos por roles.

## 18. Limitaciones actuales

- Modelo enfocado en jaguar.
- No identifica individuos por manchas.
- Densidad simplificada.
- No usa SECR real.
- No tiene RAG en MVP.
- Videos largos pueden demorar.
- Se requiere validacion humana para rigor cientifico.

## 19. Trabajo futuro

- RAG.
- MegaDetector.
- Mapa avanzado.
- Identificacion individual por manchas.
- SECR real.
- Camtrap DP.
- Deteccion de fuego, humo, personas o vehiculos.
- App movil.
- Roles avanzados.
- Despliegue cloud.

## 20. Conclusion

WildStat no reemplaza al biologo: lo potencia. La IA reduce el tiempo de revision,
el investigador conserva el control cientifico y el sistema convierte datos
dispersos en informacion util para conservacion.
