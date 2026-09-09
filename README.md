# Umbral · Biblioteca de distinciones

Biblioteca estática con 24 cartas, carruseles táctiles, búsqueda, categorías y uso sin conexión. Conserva la recopilación del proyecto: todavía no es el resumen editorial definitivo. Cada ficha indica el documento del que proviene.

## Publicar en GitHub Pages desde la web

1. Creá un repositorio público, por ejemplo `umbral-biblioteca`.
2. Descomprimí el ZIP. Subí **el contenido** de la carpeta `umbral-pages` con **Add file → Upload files**. `index.html` debe quedar en la raíz del repositorio, no dentro de otra carpeta. No subas el ZIP directamente.
3. Guardá los archivos con **Commit changes**.
4. En **Settings → Pages → Build and deployment**, elegí **Deploy from a branch**, rama **main**, carpeta **/(root)** y **Save**.
5. Cuando termine la publicación, Pages mostrará el enlace: `https://TU-USUARIO.github.io/umbral-biblioteca/`.

El sitio ya está preparado: no hay que instalar dependencias ni compilar para esta primera subida. GitHub publica automáticamente los siguientes cambios que subas a `main`.

Instrucciones oficiales: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## Tenerla en el celular

Abrí el enlace publicado y esperá **Biblioteca disponible sin conexión**. Se descarga también el contenido de todas las cartas, aunque todavía no las hayas abierto.

- Android: menú del navegador → Instalar aplicación / Agregar a pantalla principal.
- iPhone: Safari → Compartir → Agregar a pantalla de inicio.

El botón “Tener en mi celular” abre la instalación cuando el navegador la ofrece, o muestra las instrucciones. Requiere HTTPS (GitHub Pages lo ofrece). El almacenamiento del navegador puede ser borrado por el usuario o liberado por el sistema: en ese caso abrí nuevamente con conexión.

## Editar y actualizar

El contenido está en `data.json`; los estilos en `library.css` y `app.css`; las interacciones en `app.js`. No se consulta ninguna API, cuenta ni servidor del proyecto original. Los textos de las fichas son la exportación de la recopilación local; la selección temática sigue siendo editorial y revisable.

Después de modificar cualquier archivo del sitio, ejecutá con Node 22 o posterior:

```sh
npm run build
npm run check
```

Subí también el nuevo `sw.js`. Esto cambia la versión de la descarga offline. Para recibirla, abrí con internet, cerrá todas las ventanas de Umbral y volvé a abrir. Una actualización espera a que cierres la versión anterior para no mezclar contenido y estilos.

## Vista previa local

Con Python instalado, desde esta carpeta:

```sh
python -m http.server 8080
```

Abrí `http://localhost:8080/`. Abrir `index.html` con doble clic no sirve para la carga de datos ni para la instalación.

## Archivos incluidos

Sólo se exporta la biblioteca. El repositorio no necesita Cloudflare, bases de datos, claves, login ni la aplicación del curso. La carpeta original del proyecto conserva los materiales fuente y la lógica que produjo `data.json`. No se concede una licencia de terceros sobre el material del curso por publicarlo aquí.
