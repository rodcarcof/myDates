# MyDate — definición de producto

## Visión

MyDate es un calendario de ejecución personal: convierte la planificación diaria en evidencia visual de lo que una persona efectivamente realizó. Está dirigido inicialmente a personas que procrastinan, pierden continuidad o sienten que los calendarios tradicionales solo acumulan compromisos pendientes.

La experiencia principal es un calendario cronológico donde cada bloque se puede completar sin abandonar la vista. Al hacerlo, pasa del color de su categoría a un verde intenso con una breve celebración; el calendario deja de mostrar solo intención y pasa a representar avance real. En escritorio, MyDate también ofrece un widget compacto para consultar y completar las actividades del día sin abrir la vista completa.

## Problema que resuelve

Los calendarios existentes organizan el tiempo, pero normalmente no hacen visible ni gratificante la ejecución. Marcar una tarea como hecha suele requerir abrir otro panel, usar una aplicación distinta o no queda asociado visualmente al momento del día en que se planificó.

## Principios del producto

- **La ejecución es el centro:** completar un bloque debe requerir un toque o clic.
- **El historial es evidencia, no juicio:** los bloques no realizados se pueden mover u omitir sin lenguaje punitivo.
- **El calendario es la superficie principal:** no se obliga al usuario a navegar a listas secundarias para operar su día.
- **Poca fricción, información útil:** las funciones deben ayudar a empezar y ajustar, no añadir más trabajo administrativo.
- **La IA acompaña, no invade:** sus mensajes son breves, configurables y accionables.

## Usuarios iniciales

Personas que organizan su propia jornada y quieren mejorar la ejecución de hábitos, estudio, trabajo o actividades personales. El primer lanzamiento no está pensado para equipos, gestión de proyectos compartidos ni planificación corporativa.

## Funcionalidades

### MVP — primera versión publicable

| Funcionalidad | Descripción |
| --- | --- |
| Calendario cronológico | Vista de día, 3 días, 5 días y semana completa. |
| Bloques de actividad | Crear, editar, eliminar y reprogramar bloques con título, horario y categoría. |
| Bloques recurrentes | Repetir una actividad diaria, en días hábiles, semanal o mensualmente, con fecha opcional de término. |
| Categorías | Colores distinguibles para trabajo, enfoque, salud y actividades personales. |
| Completar en el calendario | Control accesible dentro de cada bloque, sin abrir una pantalla adicional. |
| Celebración de completado | Transición a verde intenso, check y animación breve de estrellas. |
| Deshacer | Revertir un completado accidental. |
| Persistencia local | Los datos siguen disponibles al cerrar y volver a abrir la aplicación en el mismo dispositivo. |
| Progreso básico | Conteo y porcentaje de bloques completados para el día y la semana. |
| Diseño adaptable | Uso correcto en escritorio y móvil. |
| Widget diario de escritorio | Ventana compacta, movible y redimensionable que muestra las actividades de hoy. |

### Después del MVP

| Funcionalidad | Propósito |
| --- | --- |
| Arrastrar y redimensionar | Reprogramar bloques directamente dentro de la grilla. |
| Estado “en curso” | Destacar la actividad activa y facilitar el inicio. |
| Historial y analítica | Mostrar cumplimiento por categoría, día y franja horaria. |
| Bloques recurrentes | Programar hábitos y rutinas. |
| Sincronización y cuenta | Mantener información entre dispositivos. |
| Recordatorios | Ayudar a iniciar, retomar o cerrar bloques. |
| IA configurable | Comentarios de refuerzo, chequeos y recomendaciones contextuales. |

### Fuera de alcance inicial

- Calendarios compartidos, invitados y permisos de equipo.
- Integración con Google Calendar, Outlook u otros calendarios externos.
- Facturación, suscripciones o funciones empresariales.
- Recomendaciones de IA que modifiquen el calendario sin confirmación explícita.
- Notificaciones insistentes, puntuaciones punitivas o mecanismos que generen culpa.

## Historias de usuario

### Calendario y planificación

**HU-01 — Elegir vista temporal**  
Como persona usuaria, quiero elegir entre día, 3 días, 5 días y semana para ver mi planificación con el nivel de detalle que necesito.

**Criterios de aceptación**

- El cambio de vista no elimina ni altera bloques.
- La vista seleccionada se identifica visualmente.
- En móvil se puede recorrer horizontalmente la grilla sin perder la referencia horaria.

**HU-02 — Crear un bloque**  
Como persona usuaria, quiero crear una actividad con nombre, inicio, fin y categoría para reservar tiempo de forma explícita.

**Criterios de aceptación**

- No se pueden guardar bloques sin título o con un fin anterior al inicio.
- Al guardarlo, aparece inmediatamente en la posición cronológica correcta.
- La categoría define el color del bloque planificado.

**HU-03 — Editar o reprogramar un bloque**  
Como persona usuaria, quiero cambiar los datos de una actividad para que el calendario refleje mi día real.

**Criterios de aceptación**

- Editar no crea un duplicado.
- Cambiar fecha u horario reposiciona el bloque.
- El estado de completado se conserva salvo que la persona decida revertirlo.

**HU-03b — Repetir un bloque**  
Como persona usuaria, quiero configurar la repetición de una actividad para no crear manualmente mis rutinas cada vez.

**Criterios de aceptación**

- Al crear o editar un bloque puedo elegir: no repetir, diariamente, días hábiles, semanalmente o mensualmente.
- Puedo definir una fecha de término para una repetición; si no existe, la serie continúa hasta que la detenga.
- El calendario muestra las ocurrencias de la serie solo dentro del período consultado, sin crear un número ilimitado de registros almacenados.
- Al editar o eliminar una ocurrencia recurrente, puedo escoger entre afectar solo esa ocurrencia o toda la serie.
- El completado, omitido o reprogramación de una ocurrencia no altera automáticamente las demás.

### Ejecución

**HU-04 — Completar desde el bloque**  
Como persona usuaria, quiero marcar una actividad como realizada con un clic o toque en el propio bloque para registrar el avance sin interrumpirme.

**Criterios de aceptación**

- El control de completar es accesible por teclado y tiene una etiqueta descriptiva.
- Completar actualiza el bloque a verde intenso y muestra un check.
- Una animación breve de celebración se reproduce una sola vez por acción.
- Se almacena la hora de completado, además del horario originalmente planificado.

**HU-05 — Deshacer un completado**  
Como persona usuaria, quiero revertir una acción accidental para mantener mi historial correcto.

**Criterios de aceptación**

- El bloque vuelve a estado planificado.
- El progreso se recalcula de inmediato.
- La acción no necesita abrir una pantalla adicional.

**HU-06 — Omitir sin castigo**  
Como persona usuaria, quiero indicar que no realicé una actividad para distinguirla de las pendientes, sin recibir mensajes culpabilizantes.

**Criterios de aceptación**

- El estado omitido es visualmente discreto y distinto de planificado y completado.
- La persona puede reprogramar u omitir el bloque más tarde.

### Progreso e IA

**HU-07 — Ver progreso real**  
Como persona usuaria, quiero ver cuánto de mi planificación ejecuté para entender mi avance del día y de la semana.

**Criterios de aceptación**

- Se muestra cantidad completada y porcentaje para el período visible.
- Las métricas se actualizan sin recargar la página.
- Las métricas distinguen entre planificado, completado y omitido cuando exista ese estado.

**HU-08 — Recibir acompañamiento configurable**  
Como persona usuaria, quiero recibir mensajes cortos y opcionales tras completar un bloque para sentir refuerzo o detectar una necesidad práctica.

**Criterios de aceptación**

- El usuario puede desactivar estos mensajes o escoger su intensidad.
- Un mensaje no bloquea la siguiente acción ni exige respuesta.
- La IA nunca crea, borra o reprograma actividades sin confirmación.

### Widget de escritorio

**HU-09 — Consultar mi día desde un widget**  
Como persona usuaria, quiero mantener una ventana pequeña de MyDate visible en el escritorio para revisar y completar mis actividades del día sin abrir el calendario completo.

**Criterios de aceptación**

- El widget muestra todas las actividades de hoy en orden cronológico.
- La actividad actual o la siguiente se distingue visualmente del resto.
- Cada fila muestra hora, título, categoría y estado de completado.
- Se pueden completar y deshacer bloques directamente desde el widget.
- Si hay muchas actividades, la lista conserva un tamaño compacto y permite desplazamiento.
- El widget permite abrir la vista completa del calendario.
- Su tamaño, posición y preferencia de visibilidad se conservan entre sesiones.

**Modos de ventana previstos**

- **Flotante:** permanece sobre otras ventanas, como una nota adhesiva.
- **Anclado al escritorio:** permanece detrás de las ventanas normales y se ve al mostrar el escritorio.
- **Compacto y expandido:** el modo compacto prioriza la actividad actual y las próximas; el expandido muestra toda la lista del día.

## Alcance técnico inicial

- Aplicación web progresiva, local-first.
- Datos guardados localmente mediante IndexedDB; sin cuentas en el MVP.
- Interfaz React + Vite reutilizable tanto en la ventana principal como en el widget diario.
- Empaquetado de escritorio con Tauri después de validar la interfaz y la persistencia local; el widget se implementará como una ventana secundaria nativa.
- Preferencias locales para rango horario, tamaño, posición y modo de visibilidad del widget.
- Dominio separado de la interfaz: `CalendarEvent`, `Category` y sus transiciones de estado no dependen del componente visual.
- Estados iniciales: `planned`, `completed` y `skipped`.
- Una recurrencia se modela como una regla de serie asociada al bloque base, con frecuencia, intervalo, días aplicables y fecha opcional de término; las ocurrencias se generan para el rango visible del calendario.
- Pruebas para las transiciones de estado y cálculos de progreso antes de añadir sincronización.

## Métricas de validación

- Una persona puede crear y completar un bloque en menos de 15 segundos.
- Completar un bloque se entiende sin tutorial.
- Al menos el 80 % de los bloques completados se registran desde la vista de calendario.
- El usuario puede identificar su progreso semanal de un vistazo.

## Orden de implementación restante

1. Modelar y configurar bloques recurrentes.
2. Persistir eventos, recurrencias y estados de completado en IndexedDB.
3. Construir el componente reutilizable del widget “Hoy” dentro de React.
4. Integrar Tauri y presentar ese componente en una ventana secundaria de escritorio.
5. Guardar tamaño, posición y modo de visibilidad del widget.
