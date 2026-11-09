# Tatami · cuotas del gimnasio (demo v0.1)

App web instalable (PWA) para llevar la asistencia y las cuotas de un gimnasio de artes marciales.
Pensada para **una tablet** en el gimnasio (Android o iPad), sin tiendas de apps y sin coste.

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
- **Disciplinas**: una tarjeta sencilla por disciplina (icono y nombre). Al entrar salen arriba los
  recuadros del mes (por cobrar, pagados, con bono, sin venir) y el dinero, y debajo los alumnos con su foto.
- **Alumnos**: alta, ficha, historial de cobros y asistencias, anular cobros (nunca se borran).
- **Caja**: efectivo del mes por tarifa y movimientos día a día.
- **Ajustes**: disciplinas (con su icono), clases con su horario, tarifas, datos de protección de datos y copias de seguridad.

## Alta de alumnos

Nombre, primer y segundo apellido, teléfono y una **foto hecha con la cámara de la tablet** dentro de la app.
Debajo, el texto de protección de datos (RGPD y LOPDGDD), la casilla **Autorizo** y un recuadro para
**firmar con el dedo**. Si el alumno tiene menos de 14 años firma su padre, madre o tutor (se pide su nombre).

Con cada alta se guarda el texto aceptado, la firma, quién firma y la fecha y hora. Se consulta en la
ficha del alumno → *Protección de datos firmada… → Ver*. Los alumnos que aún no han firmado salen en
Alumnos → *Sin firma de datos*.

> El texto legal es una plantilla. Que lo revise el asesor del gimnasio y rellenad en Ajustes el titular
> (con NIF/CIF) y dónde se ejercen los derechos.

## Horario cargado (247 Studio)

| Hora | Lunes | Martes | Miércoles | Jueves | Viernes |
|---|---|---|---|---|---|
| 10:00–11:30 | BJJ Gi | | Grappling | | Grappling |
| 17:30–18:30 | Kids 1 (+7) | Kids 2 (3–6) | Kids 1 (+7) | Kids 2 (3–6) | Kids 1 (+7) |
| 18:30–19:30 | MMA | BJJ Fem | MMA | BJJ Fem | MMA |
| 19:30–20:30 | BJJ Gi | Grappling | BJJ Gi | Grappling | Comp Class |
| 20:30–21:30 | Grappling | Lucha | BJJ Gi | Lucha | Open Mat |

Comp Class y Open Mat son **disciplinas libres**: se pasa lista, pero no se cobran, no gastan días de bono
y no salen en Disciplinas. Se cambia en Ajustes → disciplina → *Libre*.

Las tarifas combinadas (BJJ + Grappling…) se reparten entre sus disciplinas según el precio de cada
disciplina suelta. Los bonos se reparten según las clases en que se han gastado.

## Probarla en el ordenador

Necesita un servidor local (los módulos JavaScript no cargan con doble clic):

```bash
python serve.py
```

y abrir http://localhost:8765. En la tablet se instala desde el navegador:
Chrome → menú → *Instalar app*; Safari → compartir → *Añadir a pantalla de inicio*.

## Publicarla gratis (GitHub Pages)

Paso a paso en [DEMO.md](DEMO.md), junto con el guion para enseñarla a los dueños.
No hace falta compilar nada.

## Estructura

```
index.html            entrada
css/styles.css        estilos (modo claro y oscuro)
js/store.js           datos (en la demo: localStorage de la tablet)
js/logic.js           reglas de cobro: qué cubre cada pago, estado del mes
js/seed.js            datos de ejemplo (relativos a la fecha de hoy)
js/media.js           cámara para la foto y panel de firma
js/privacy.js         texto de la autorización de protección de datos
js/views/*.js         pantallas
sw.js                 funcionamiento sin conexión
```

## Limitaciones de la demo (para la versión 1)

- Los datos viven solo en la memoria de la tablet. Las fotos y firmas se guardan pequeñas (unos 8 KB por
  alumno), pero conviene descargar copias de seguridad. Siguiente paso: base de datos con copia en la nube.
- La cámara dentro de la app necesita HTTPS (GitHub Pages lo tiene) o `localhost`. Si el navegador no la
  deja usar, se ofrece la cámara del sistema.
- Pendiente de decidir con el gimnasio: reglas de bonos (¿se congelan por lesión?), matrícula y
  descuentos familiares.
