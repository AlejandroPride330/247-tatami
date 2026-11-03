# Tatami · cuotas del gimnasio (demo v0.1)

App web instalable (PWA) para llevar la asistencia y las cuotas de un gimnasio de artes marciales.
Funciona en Android e iPhone, sin tiendas de apps y sin coste.

## La idea

El profesor **pasa lista** en clase. Quien ha venido este mes y no ha pagado aparece **por cobrar**;
quien no ha venido no debe nada. Cada mes empieza de cero.

| Estado | Cuándo |
|---|---|
| Sin actividad | No ha venido este mes |
| Por cobrar | Ha venido y no tiene el mes (o la clase) cubierto |
| Pagado | Tiene la cuota mensual pagada |
| Bono | Sus asistencias las cubre un bono (descuenta 1 día por fecha) |

## Pantallas

- **Lista**: muestra el horario del día y se abre en la clase en curso (o la siguiente).
  Se tocan los presentes. Las clases de otros días están en "Otra clase".
- **Cobros**: lo cobrado y lo pendiente del mes, con una tarjeta por disciplina (alumnos, pagados,
  con bono, por cobrar y dinero). Al entrar en una disciplina salen sus alumnos y el botón de cobrar.
- **Alumnos**: alta, ficha, historial de cobros y asistencias, anular cobros (nunca se borran).
- **Caja**: efectivo del mes por socio y por tarifa, movimientos día a día.
- **Ajustes**: disciplinas, clases con su horario (día y hora), tarifas (mensuales y bonos), socios, copias de seguridad.

## Horario cargado (247 Studio)

| Hora | Lunes | Martes | Miércoles | Jueves | Viernes |
|---|---|---|---|---|---|
| 10:00–11:30 | BJJ Gi | | Grappling | | Grappling |
| 17:30–18:30 | Kids 1 (+7) | Kids 2 (3–6) | Kids 1 (+7) | Kids 2 (3–6) | Kids 1 (+7) |
| 18:30–19:30 | MMA | BJJ Fem | MMA | BJJ Fem | MMA |
| 19:30–20:30 | BJJ Gi | Grappling | BJJ Gi | Grappling | Comp Class |
| 20:30–21:30 | Grappling | Lucha | BJJ Gi | Lucha | Open Mat |

Comp Class y Open Mat son **disciplinas libres**: se pasa lista, pero no se cobran, no gastan días de bono
y no salen en Cobros. Se cambia en Ajustes → disciplina → *Libre*.

Las tarifas combinadas (BJJ + Grappling…) se reparten entre sus disciplinas según el precio de cada
disciplina suelta. Los bonos se reparten según las clases en que se han gastado.

## Probarla en el ordenador

Necesita un servidor local (los módulos JavaScript no cargan con doble clic):

```bash
python serve.py
```

y abrir http://localhost:8765. En el móvil se instala desde el navegador:
Chrome → menú → *Instalar app*; Safari → compartir → *Añadir a pantalla de inicio*.

## Publicarla gratis (GitHub Pages)

Paso a paso en [DEMO.md](DEMO.md), junto con el guion para enseñarla a los dueños.
No hace falta compilar nada.

## Estructura

```
index.html            entrada
css/styles.css        estilos (modo claro y oscuro)
js/store.js           datos (en la demo: localStorage del móvil)
js/logic.js           reglas de cobro: qué cubre cada pago, estado del mes
js/seed.js            datos de ejemplo (relativos a la fecha de hoy)
js/views/*.js         pantallas
sw.js                 funcionamiento sin conexión
```

## Limitaciones de la demo (para la versión 1)

- Los datos viven solo en el móvil donde se usa: no se comparten entre los 3 socios.
  Siguiente paso: base de datos compartida (Firebase, plan gratuito) con una cuenta por socio.
- Sin login: el socio se elige arriba a la derecha.
- Pendiente de decidir con el gimnasio: reglas de bonos (¿se congelan por lesión?), matrícula,
  descuentos familiares y cierre de caja entre socios.
