# WildStat AI Service

Microservicio Python/FastAPI separado del backend NestJS para procesar imagenes y videos con YOLO.

## Desarrollo

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

El modelo entrenado `best.pt` debe ubicarse en `models/yolo/best.pt` o configurarse con `MODEL_PATH`.

## YOLOv8 en Apple Silicon

```bash
cp .env.example .env
python scripts/check_mps.py
python scripts/inspect_yolo_dataset.py --source ../jaguar
python scripts/import_manual_dataset.py --source ../jaguar
python scripts/prepare_dataset.py
YOLO_DEVICE=mps YOLO_MODEL=yolov8n.pt YOLO_EPOCHS=50 YOLO_IMGSZ=640 YOLO_BATCH=8 YOLO_PATIENCE=15 python scripts/train_yolov8.py
python scripts/validate_model.py
python scripts/predict_sample.py --source datasets/roboflow/valid/images/<imagen>.jpg
```

## Roboflow SDK

`roboflow` esta declarado en `pyproject.toml`. Si falta en el entorno local:

```bash
.venv/bin/pip install roboflow
```

La API key debe manejarse como secreto. No la escribas en codigo, README ni commits. Exportala temporalmente o ponla en `.env` local:

```bash
export ROBOFLOW_API_KEY="..."
```

Descarga segura por SDK:

```bash
.venv/bin/python scripts/download_roboflow_dataset.py \
  --workspace vod6-yosi \
  --project jaguar-ngh6d \
  --version 1 \
  --format yolov8 \
  --output ../jaguar_roboflow_sdk
```

Inspecciona el dataset descargado antes de importarlo:

```bash
.venv/bin/python scripts/inspect_yolo_dataset.py --source ../jaguar_roboflow_sdk
```

Si `nc=0`, `names=[]`, todos los labels estan vacios o no hay boxes, no entrenes. Prueba otra version del dataset o revisa la exportacion en Roboflow.

Notas:

- El dataset manual debe estar en formato YOLOv8 con `train/images`, `train/labels`, `valid/images`, `valid/labels`, `test/images`, `test/labels` y `data.yaml`.
- `scripts/import_manual_dataset.py` detecta `data.yaml`, valida la estructura, confirma que los labels tengan anotaciones YOLO reales, copia el dataset a `datasets/roboflow/` y reescribe `data.yaml` con rutas locales validas.
- `data.yaml` debe declarar clases reales (`nc > 0`, `names` no vacio) y los IDs usados en los `.txt` deben estar dentro de ese rango.
- Tambien se puede preparar desde otra ruta con `python scripts/prepare_dataset.py --source ../jaguar` o `MANUAL_DATASET_PATH=../jaguar python scripts/prepare_dataset.py`.
- Los frames extraidos desde `WWF/videos` quedan separados en `datasets/extracted_frames/` y no se mezclan automaticamente con el entrenamiento porque aun no tienen etiquetas.
- En Apple Silicon se usa `mps` si PyTorch lo detecta; si no, los scripts usan CPU. No se usa CUDA en este flujo.
- Si MPS falla por memoria, baja `YOLO_BATCH` a `4` o `2`. Usa CPU solo como ultimo recurso con `YOLO_DEVICE=cpu`.
- El entrenamiento copia automaticamente el mejor peso a `models/yolo/best.pt`.

Para validar una corrida corta del pipeline sin esperar el entrenamiento completo:

```bash
YOLO_EPOCHS=1 YOLO_BATCH=4 python scripts/train_yolov8.py
```

## Corrida validada: VOD6 Yosi

Dataset usado: Roboflow Universe `vod6-yosi/jaguar-ngh6d`, version 1, en `../jaguar`.

Resumen del dataset importado en `datasets/roboflow/`:

- `train`: 955 imagenes, 955 labels, 958 boxes
- `valid`: 190 imagenes, 190 labels, 192 boxes
- `test`: 14 imagenes, 14 labels, 16 boxes
- clases: `nc=1`, `names=['jaguar']`, `class_ids_used=[0]`
- labels vacios: 0 en `train`, `valid` y `test`

Comandos usados:

```bash
.venv/bin/python scripts/check_mps.py
.venv/bin/python scripts/inspect_yolo_dataset.py --source ../jaguar
.venv/bin/python scripts/import_manual_dataset.py --source ../jaguar
.venv/bin/python scripts/prepare_dataset.py
YOLO_DEVICE=mps YOLO_MODEL=yolov8n.pt YOLO_EPOCHS=50 YOLO_IMGSZ=640 YOLO_BATCH=8 YOLO_PATIENCE=15 YOLO_RUN_NAME=jaguar-yolov8n .venv/bin/python scripts/train_yolov8.py
YOLO_DEVICE=mps .venv/bin/python scripts/validate_model.py
YOLO_DEVICE=mps .venv/bin/python scripts/predict_sample.py --source datasets/roboflow/test/images/n02128925_38504_JPEG.rf.2191b906eda5626f47d5c616c2a0b0c5.jpg
```

Resultados de validacion de `models/yolo/best.pt`:

- precision: `0.9735526320802415`
- recall: `0.9586198104182019`
- mAP50: `0.9908549275866232`
- mAP50-95: `0.8161635126879216`

La prediccion de muestra detecto `jaguar` con confianza `0.8836125731468201`. El modelo final quedo en `models/yolo/best.pt` y la corrida en `runs/train/jaguar-yolov8n/`.

Prueba FastAPI:

```bash
PYTHONPATH=src:. .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8010
curl http://127.0.0.1:8010/health
curl http://127.0.0.1:8010/model
curl -X POST -F "file=@datasets/roboflow/test/images/n02128925_38504_JPEG.rf.2191b906eda5626f47d5c616c2a0b0c5.jpg" http://127.0.0.1:8010/detect/image
```

`/model` devolvio `exists=true` y `/detect/image` devolvio un evento `jaguar` con confianza `0.883612871170044`.

## FastAPI

```bash
uvicorn faunalens_ai.main:app --reload
```

Tambien funciona:

```bash
uvicorn app.main:app --reload
```

Endpoints:

- `GET /health`
- `GET /model`: devuelve `exists=true` cuando `models/yolo/best.pt` existe.
- `POST /detect/image`: usa YOLO si existe `best.pt` y devuelve `events` con `aiSpecies`, `aiConfidence`, `bbox`, `framePath` y `outputPath`. Si no hay detecciones, devuelve `events: []`.
- `POST /detect/video`: procesa un video con OpenCV + YOLOv8, agrupa detecciones cercanas en eventos y devuelve frame clave, clip corto y timestamp por evento.

Ejemplo de imagen:

```bash
curl -X POST http://127.0.0.1:8010/detect/image \
  -F "file=@datasets/roboflow/test/images/n02128925_38504_JPEG.rf.2191b906eda5626f47d5c616c2a0b0c5.jpg"
```

Ejemplo de video:

```bash
curl -X POST http://127.0.0.1:8010/detect/video \
  -F "file=@/ruta/al/video.mp4" \
  -F "frame_interval_seconds=1" \
  -F "confidence_threshold=0.3" \
  -F "event_gap_seconds=10" \
  -F "clip_padding_seconds=3" \
  -F "max_frames=300"
```

Parametros de `/detect/video`:

- `frame_interval_seconds`: cada cuantos segundos se toma un frame para YOLO. Por defecto `1.0`.
- `confidence_threshold`: umbral de confianza YOLO. Por defecto `0.3` para video.
- `event_gap_seconds`: detecciones separadas por este tiempo o menos se agrupan en un solo evento. Por defecto `10.0`.
- `clip_padding_seconds`: segundos extra antes/despues del evento al extraer clip. Por defecto `3.0`.
- `max_frames`: limite de frames procesados para demos o videos largos. Por defecto `300`.

Respuesta resumida de video:

```json
{
  "status": "ok",
  "media_type": "video",
  "model_exists": true,
  "summary": {
    "duration_seconds": 5.0,
    "fps": 10.0,
    "frames_processed": 5,
    "detections_count": 5,
    "events_count": 1
  },
  "events": [
    {
      "event_id": 1,
      "timestamp_video": "00:00:01",
      "start_time": 0.0,
      "end_time": 4.0,
      "ai_species": "jaguar",
      "ai_confidence": 0.8802170753479004,
      "frame_path": "outputs/frames/<video>_event_001.jpg",
      "clip_path": "outputs/clips/<video>_event_001.mp4",
      "bbox": [1.9, 119.8, 516.2, 463.7]
    }
  ]
}
```

Los frames clave se guardan en `outputs/frames/` con bounding box dibujado. Los clips se guardan en `outputs/clips/` usando OpenCV. Los uploads temporales se guardan en `uploads/temp/` y se eliminan al terminar.

Script local para video:

```bash
.venv/bin/python scripts/predict_video_sample.py \
  --video /ruta/al/video.mp4 \
  --frame-interval 1 \
  --conf 0.3 \
  --event-gap 10 \
  --clip-padding 3 \
  --max-frames 300
```

Limitaciones actuales:

- El endpoint de video solo detecta posible `jaguar`; no confirma sexo, individuo ni validacion humana.
- No usa MegaDetector todavia.
- No hace tracking continuo; agrupa eventos por distancia temporal entre detecciones.
- Para videos largos conviene ajustar `frame_interval_seconds` y `max_frames`.

## Verificacion de demo

Con backend y frontend levantados, desde la raiz del workspace:

```bash
cd /Users/rivero/Downloads/WWF
./scripts/check-demo.sh
```

## Detener FastAPI

Presiona `Ctrl+C` en la terminal donde corre `uvicorn`.

## Estado de entrega

NestJS ya sube imagen/video con Multer, llama a `/detect/image` o `/detect/video`,
guarda eventos en `Detection` y los muestra como pendientes de validacion humana.
