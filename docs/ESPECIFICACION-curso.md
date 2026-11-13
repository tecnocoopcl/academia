# Especificación: `curso.json`

Cada curso publica junto a su material un `curso.json`. Es lo único que
academia necesita: con él arma la tarjeta del catálogo y la ficha del curso.
El contenido del curso no pasa por academia.

Las claves van en inglés (como `catalogo.json` de música); los textos, en el
idioma del curso. Lo valida `src/catalogo/validar.js`.

## Ejemplo

```json
{
  "id": "sintesis-basica",
  "title": "Síntesis básica",
  "summary": "Cómo nace un sonido electrónico, escuchando y moviendo perillas.",
  "description": "Un manual en PDF y una página donde cada concepto se puede tocar.",
  "teacher": {
    "name": "Alejandro",
    "webId": "https://…/profile/card#me",
    "contact": "mailto:…",
    "url": "https://…"
  },
  "status": "available",
  "formats": ["pdf", "web", "interactive"],
  "topics": ["sonido", "síntesis"],
  "url": "./",
  "cover": "portada.svg",
  "pdf": "manual.pdf",
  "classes": {
    "calendar": "https://…/calendario/clases/",
    "duration": "60 min",
    "price": "A convenir"
  }
}
```

## Campos

| Campo | Obligatorio | Qué es |
| --- | --- | --- |
| `id` | sí | Slug único en el catálogo: minúsculas, números y guiones. Da la URL de la ficha: `/catalogo/<id>`. |
| `title` | sí | Nombre del curso. |
| `summary` | sí | Una o dos frases para la tarjeta. |
| `description` | no | Párrafo más largo para la ficha. |
| `teacher.name` | sí | Quién dicta el curso (persona o la cooperativa). |
| `teacher.webId` | no | WebID del profe: lo usará la reserva de clases. |
| `teacher.contact` | no | URL absoluta de contacto (`mailto:`, `https:`). |
| `teacher.url` | no | Sitio del profe, para quien quiera conocer su trabajo. |
| `status` | no | `available` (por defecto) o `preparing`. |
| `formats` | sí | Uno o más de `web`, `pdf`, `interactive`, `kit`, `video`, `live`. |
| `topics` | no | Lista de temas. |
| `url` | si `available` | Dónde empieza el curso. |
| `cover` | no | Imagen 16:9 para la tarjeta (SVG, PNG, JPG, WebP). |
| `pdf` | no | Material descargable principal. |
| `kit` | no | Texto: qué kit físico necesita el curso y dónde conseguirlo. |
| `classes` | no | Si el profe ofrece clases: `duration`, `price` (texto libre) y `calendar` (ver abajo). |

Las URL pueden ser **relativas al propio `curso.json`** (`"./"`,
`"portada.svg"`): así el curso se puede mudar de dominio sin reescribirlas.

## Alta en el catálogo

`cursos/registro.json` es la lista curada de cursos:

```json
{ "courses": ["sintesis-basica/curso.json", "https://sintesis.tecnocooperativa.cl/curso.json"] }
```

Dar de alta un curso es un PR que agrega su URL. El curso puede estar en
cualquier dominio; para cursos de la cooperativa lo recomendado es un
subdominio de `tecnocooperativa.cl`. El sitio que lo aloja tiene que permitir
la lectura desde otro origen (`Access-Control-Allow-Origin`), cosa que
GitHub Pages ya hace.

Un curso que no responde o no valida no rompe el catálogo: se omite y se
avisa en la consola.

## `classes.calendar` (fase 2)

URL de un calendario de espacio en el pod del profe, con lectura pública
(p. ej. `calendario/clases/`), donde cada `schema:Event` es un bloque
disponible (ADR-010 de espacio). La reserva con WebID lo usará; ver
[ADR-001](ADR-001-academia.md).
