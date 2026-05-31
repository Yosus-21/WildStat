# Pitch final WildStat

## Problema

Los equipos de conservacion revisan grandes volumenes de imagenes y videos de
camaras trampa. Esa revision manual consume tiempo, retrasa decisiones y hace mas
dificil convertir evidencia de campo en analisis accionable.

## Solucion

WildStat combina deteccion con IA, procesamiento asincronico y validacion humana.
El sistema identifica posibles eventos de jaguar, genera frame clave y clip corto,
y permite que el investigador confirme, corrija o descarte cada deteccion.

## Flujo demo

1. Login como investigador.
2. Proyecto demo `Monitoreo Jaguar Palmarito 2026`.
3. Detecciones pendientes.
4. Revision humana con frame/clip.
5. Dataset validado.
6. Dashboard analytics.
7. Exportacion CSV.
8. Reporte PDF.
9. Login viewer para demostrar permisos de solo consulta.

## Diferenciador

WildStat no reemplaza al biologo: lo potencia.

La IA reduce ruido y acelera la revision, pero la decision cientifica queda en manos
del investigador. Esto mantiene trazabilidad, confianza y control experto.

## Impacto

- Menos tiempo revisando material irrelevante.
- Datos validados listos para analisis.
- Indicadores ecologicos basicos para reportes de conservacion.
- CSV y PDF listos para compartir.

## Limitaciones honestas

- La densidad es una estimacion MVP, no SECR real.
- El modelo actual esta especializado en jaguar.
- No hay identificacion individual por manchas.
- No hay mapa avanzado ni Camtrap DP completo.
- Videos largos pueden requerir ajuste de intervalo de frames.

## Futuro

- MegaDetector para filtrar fauna/personas/vehiculos.
- Identificacion individual por manchas.
- Modelos SECR reales.
- Camtrap DP para interoperabilidad cientifica.
- Mapa avanzado de camaras y eventos.
- Deteccion de anomalias como fuego, humo o actividad humana.
