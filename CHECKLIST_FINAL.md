# Checklist final WildStat

## Backend

- [x] `npm run build` OK.
- [x] `npx prisma validate` OK.
- [x] Migraciones aplicadas OK.
- [x] `npm run seed` OK.
- [x] Swagger registrado en backend en `/docs`.
- [x] Login investigador OK.
- [x] Login viewer OK.
- [x] CSV protegido con JWT OK.
- [x] PDF protegido con JWT OK.
- [x] Proyecto inexistente devuelve 404 claro.

## IA

- [x] `GET /health` OK.
- [x] `GET /model` devuelve `exists: true`.
- [x] `POST /detect/image` OK.
- [x] `POST /detect/video` OK.
- [x] Modelo `models/yolo/best.pt` presente.

## Frontend

- [x] `npm run build` OK.
- [x] Login OK.
- [x] `/media/upload` incluida en build/rutas protegidas.
- [x] Subida de imagen/video desde frontend disponible para INVESTIGATOR.
- [x] Viewer bloqueado para subida desde frontend.
- [x] Polling de `GET /media/:id/status` implementado.
- [x] Resultado IA muestra detecciones, timestamp, confianza, frame, clip y link a revision.
- [x] `/detections/pending` responde en Vite.
- [x] `/detections/:id/review` incluida en build/rutas protegidas.
- [x] `/dataset/validated` responde en Vite.
- [x] `/analytics` responde en Vite.
- [x] `/reports` responde en Vite.
- [x] Usuario sin token recibe 401 en API protegida y frontend redirige a login.
- [x] Viewer puede consultar, pero no validar.

## Demo

- [x] Proyecto demo OK.
- [x] Camaras demo OK.
- [x] Datos demo OK.
- [x] Video o imagen demo OK desde `/media/upload`.
- [x] Detecciones pendientes OK.
- [x] Validacion humana OK.
- [x] Dataset validado OK.
- [x] CSV OK.
- [x] Dashboard OK.
- [x] Reporte PDF OK.

## Congelamiento de entrega

- [ ] Commit final realizado. Nota: este workspace no expone repositorio Git.
- [ ] Rama limpia. Nota: `git status` no aplica porque no hay `.git` en el workspace.
- [x] Builds pasando.
- [x] Servicios documentados.
- [x] Credenciales demo documentadas.
- [x] Datos demo disponibles.
- [x] PDF backup documentado en `demo-assets/`.
- [x] CSV backup documentado en `demo-assets/`.
- [x] Video/imagen demo documentados en `demo-assets/README.md`.
- [x] Comandos listos en `scripts/start-demo.sh`.
- [x] Verificacion rapida lista en `scripts/check-demo.sh`.

## No incluir en esta fase

- [ ] RAG.
- [ ] Chatbot.
- [ ] Mapa avanzado.
- [ ] Reentrenamiento automatico.
- [ ] Identificacion individual por manchas.
- [ ] SECR real.
- [ ] App movil.
- [ ] Admin complejo.
