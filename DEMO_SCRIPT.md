# Guion demo WildStat - 3 minutos

## 1. Problema

Tiempo: `0:00-0:30`.

Los biologos que trabajan con camaras trampa revisan manualmente grandes cantidades
de imagenes y videos. Ese proceso consume tiempo, retrasa el analisis y dificulta
convertir evidencia de campo en decisiones de conservacion.

## 2. Solucion

Tiempo: `0:30-1:00`.

WildStat usa IA para detectar momentos importantes en imagenes y videos de camaras
trampa, pero mantiene al biologo en control. La IA propone; el investigador valida,
corrige o descarta.

## 3. Demo

Tiempo: `1:00-2:15`.

1. Iniciar sesion como investigador.
2. Ir a **Subir imagen/video**.
3. Seleccionar el proyecto `Monitoreo Jaguar Palmarito 2026`.
4. Seleccionar una camara demo en Zona Norte, Zona Rio o Zona Camino.
5. Subir una imagen o video.
6. Mostrar progreso de subida y estado de procesamiento IA.
7. Explicar que NestJS encola el procesamiento con BullMQ y FastAPI ejecuta YOLO.
8. Ver el resultado IA: timestamp/minuto, confianza, frame clave y clip si existe.
9. Abrir la deteccion pendiente desde el resultado.
10. Validar como Jaguar, elegir sexo y marcar independencia.
11. Confirmar que la deteccion sale de pendientes y aparece en validadas.
12. Abrir Dataset validado.

## 4. Analytics, CSV y PDF

Tiempo: `2:15-2:45`.

1. Abrir Dashboard Analytics.
2. Filtrar por `Monitoreo Jaguar Palmarito 2026`.
3. Mostrar especies, zonas, meses, sexo, actividad por hora, densidad y tendencia.
4. Descargar CSV desde Dataset validado.
5. Descargar PDF desde Analytics o Reportes.

## 5. Diferenciador

WildStat no reemplaza al biologo: lo potencia. La plataforma reduce el tiempo de
revision, conserva trazabilidad humana y transforma datos validados en indicadores
listos para presentar.

## 6. Cierre

Tiempo: `2:45-3:00`.

Con WildStat, un equipo de conservacion puede pasar de videos crudos a detecciones
revisadas, dataset exportable, analytics y reporte PDF en un solo flujo. Es un MVP
preparado para crecer hacia mapas, estandares Camtrap DP, MegaDetector, identificacion
individual por manchas y modelos cientificos mas avanzados.
