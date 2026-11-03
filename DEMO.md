# Enseñar la demo desde el móvil

## 1. Publicarla (una sola vez, unos 5 minutos)

La app se publica gratis con **GitHub Pages**. El repositorio ya está preparado en esta carpeta
con un primer commit. Solo falta subirlo a tu cuenta:

1. Entra en https://github.com/new y crea un repositorio llamado `247-tatami`
   (**Public** y **sin** README, .gitignore ni licencia).
2. En una terminal abierta en esta carpeta (cambia `TU-USUARIO` por tu usuario de GitHub):

   ```bash
   git remote add origin https://github.com/TU-USUARIO/247-tatami.git
   ```

   ```bash
   git push -u origin main
   ```

   La primera vez se abrirá el navegador para que inicies sesión en GitHub.
   Hazlo tú: no hace falta darle la contraseña a nadie.
3. En el repositorio entra en **Settings → Pages**. En *Source* elige **Deploy from a branch**,
   después la rama **main** y la carpeta **/ (root)**, y pulsa **Save**.
4. Espera 1 o 2 minutos. La demo quedará en:
   `https://TU-USUARIO.github.io/247-tatami/`

Si prefieres no usar la terminal, en el repositorio vacío elige *uploading an existing file* y
arrastra **todo el contenido de esta carpeta**. El paso 3 es el mismo.

## 2. Preparar el móvil (la noche antes)

- Abre el enlace con internet **una vez**. A partir de ahí funciona aunque en el gimnasio no haya cobertura.
- Instálala como app:
  - **iPhone (Safari):** botón Compartir → *Añadir a pantalla de inicio*.
  - **Android (Chrome):** menú ⋮ → *Instalar app* o *Añadir a pantalla de inicio*.
- Si has estado trasteando, ve a **Ajustes → Datos → Volver a los datos de ejemplo** antes de enseñarla.
  Los datos se generan alrededor de la fecha de hoy, así que siempre se ve "viva".

## 3. Guion para enseñarla (unos 5 minutos)

1. **Lista.** Se abre en la clase que toca a esa hora. Marca a dos o tres alumnos tocando su nombre.
   *"Esto lo hace el profe al empezar la clase: un toque por alumno."*
2. **Cobros.** Arriba aparece lo cobrado y lo pendiente del mes. Debajo, una tarjeta por disciplina
   con su gente y su dinero. *"Así sabéis cuánto mueve cada disciplina, también la que está subcontratada."*
   Entra en una disciplina y cobra a alguien con **Cobrar**: desaparece de pendientes.
3. **Open Mat y Comp Class.** En la Lista de un viernes se puede pasar lista, pero no se cobran
   y no aparecen en Cobros.
4. **Alumnos.** Abre una ficha: estado del mes, últimos meses, cobros y asistencias.
5. **Caja.** El efectivo del mes, lo que lleva cada socio y cada tarifa, y los movimientos día a día.
   Un cobro equivocado se anula con su motivo y nunca se borra.
6. **Ajustes.** Ellos mismos cambian disciplinas, horarios, precios y tarifas combinadas.

Deja claro que **es una demo**: los nombres y los precios son inventados, y cada móvil tiene sus propios datos.
La versión real compartirá los datos entre los tres socios, con una cuenta para cada uno.

## 4. Preguntas para los dueños

- **Disciplina subcontratada:** ¿cuál es? ¿Al profesor se le paga un porcentaje de lo cobrado, una
  cantidad por alumno o un fijo?
- **Tarifas combinadas** (p. ej. BJJ + Grappling): ¿cómo se reparte el dinero entre disciplinas?
  La demo lo reparte según el precio de cada disciplina por separado.
- **Bonos:** ¿caducan al mes? ¿Valen para cualquier disciplina? ¿Se congelan por lesión?
- **Precios reales**, matrícula y descuentos (familias, hermanos…).
- **Cierre de caja:** ¿cada socio entrega su efectivo? ¿Cada cuánto se cuadra?
- ¿Quién pasará lista: los profes, los socios o ambos?
