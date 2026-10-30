// Pruebas del catálogo y del cotizador de Ecobol (node --test, sin dependencias).
// Regla central: ningún producto se muestra con un precio igual a su SKU.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Cotizador = require('../src/cotizador.js');

const RAIZ = path.join(__dirname, '..');
const leer = (ruta) => fs.readFileSync(path.join(RAIZ, ruta), 'utf8');
const productos = JSON.parse(leer('src/data/products.json'));
const digitos = (valor) => String(valor ?? '').replace(/\D/g, '').replace(/^0+/, '');

// SKU 9999: no coincide con ningún precio usado en estas pruebas.
const producto = (extra) => ({
  id: '9999',
  sku: '9999',
  nombre: 'Bolsa 30 x 35',
  precio_detalle: 1190,
  precio_mayorista: 1000,
  iva_incluido: true,
  ...extra
});
const cotizar = (...items) =>
  Cotizador.calcularCotizacion(items.map(([p, cantidad]) => ({ producto: p, cantidad })));

test('ningún producto del catálogo se muestra con un precio igual a su SKU', (t) => {
  const consultar = { detalle: 0, mayorista: 0 };
  for (const p of productos) {
    const sku = digitos(p.sku || p.id);
    for (const tarifa of ['detalle', 'mayorista']) {
      const texto = Cotizador.textoPrecio(p, tarifa);
      assert.ok(sku === '' || digitos(texto) !== sku, `SKU ${p.sku} (${tarifa}) se muestra como ${texto}`);
      if (texto === Cotizador.TEXTO_SIN_PRECIO) consultar[tarifa]++;
    }
  }
  t.diagnostic(`${productos.length} productos; "Consultar precio": ${consultar.detalle} en detalle, ${consultar.mayorista} en mayorista`);
});

test('un precio igual al SKU, ausente o inválido se muestra "Consultar precio"', () => {
  const sinPrecio = Cotizador.TEXTO_SIN_PRECIO;
  assert.equal(sinPrecio, 'Consultar precio');
  assert.equal(Cotizador.textoPrecio(producto({ sku: '1117', precio_detalle: 1117 }), 'detalle'), sinPrecio);
  assert.equal(Cotizador.textoPrecio(producto({ sku: '1117', precio_detalle: 1117 }), 'mayorista'), sinPrecio);
  assert.equal(Cotizador.textoPrecio(producto({ sku: '10-X40', precio_detalle: 1040 }), 'detalle'), sinPrecio);
  assert.equal(Cotizador.textoPrecio(producto({ sku: '01117', precio_detalle: 1117 }), 'detalle'), sinPrecio);
  assert.equal(Cotizador.textoPrecio(producto({ sku: '', id: '2004', precio_detalle: 2004 }), 'detalle'), sinPrecio);
  for (const malo of [undefined, null, 0, -1190, NaN, Infinity, '1190', '', {}]) {
    assert.equal(Cotizador.textoPrecio(producto({ precio_detalle: malo }), 'detalle'), sinPrecio, String(malo));
  }
  assert.equal(Cotizador.textoPrecio(producto({}), 'detalle'), '$1.190');
  assert.equal(Cotizador.textoPrecio(producto({ sku: 'bolsa navideña', precio_detalle: 890 }), 'detalle'), '$890');
  assert.equal(Cotizador.textoPrecio(null, 'detalle'), sinPrecio);
  assert.equal(Cotizador.textoPrecio(producto({}), 'otra'), sinPrecio);
});

test('un detalle igual al SKU oculta también su mayorista (se calculó desde ese número)', (t) => {
  const esSku = (p, campo) => digitos(p.sku || p.id) !== '' && digitos(p[campo]) === digitos(p.sku || p.id);
  const afectados = productos.filter((p) => esSku(p, 'precio_detalle'));
  for (const p of afectados) {
    assert.equal(Cotizador.textoPrecio(p, 'mayorista'), Cotizador.TEXTO_SIN_PRECIO, `SKU ${p.sku}: mayorista ${p.precio_mayorista}`);
    assert.equal(cotizar([p, 12]).porConfirmar, 1, `SKU ${p.sku} con tarifa mayorista`);
  }
  // Caso del catálogo: SKU 1117 con detalle $1.117 y mayorista $894 (el 80% del SKU).
  const caja = producto({ sku: '1117', precio_detalle: 1117, precio_mayorista: 894 });
  assert.equal(Cotizador.textoPrecio(caja, 'mayorista'), Cotizador.TEXTO_SIN_PRECIO);
  // Al revés no: un mayorista igual al SKU no invalida un detalle distinto del SKU.
  const soloMayorista = producto({ sku: '1000', precio_detalle: 2319, precio_mayorista: 1000 });
  assert.equal(Cotizador.textoPrecio(soloMayorista, 'detalle'), '$2.319');
  assert.equal(Cotizador.textoPrecio(soloMayorista, 'mayorista'), Cotizador.TEXTO_SIN_PRECIO);
  t.diagnostic(`productos con detalle = SKU (sin precio en ninguna tarifa): ${afectados.length}`);
});

test('tope: productos con precio igual a su SKU en products.json (solo puede bajar)', (t) => {
  const igualesAlSku = (campo) =>
    productos.filter((p) => digitos(p.sku || p.id) !== '' && digitos(p[campo]) === digitos(p.sku || p.id)).length;
  const detalle = igualesAlSku('precio_detalle');
  const mayorista = igualesAlSku('precio_mayorista');
  t.diagnostic(`precio = SKU en los datos: ${detalle} en detalle (tope 110), ${mayorista} en mayorista (tope 19)`);
  assert.ok(detalle <= 110, `${detalle} productos con precio detalle igual al SKU: el tope es 110 y solo puede bajar`);
  assert.ok(mayorista <= 19, `${mayorista} productos con precio mayorista igual al SKU: el tope es 19 y solo puede bajar`);
});

test('cantidad entera entre 1 y 5.000 (bordes y entradas inválidas)', () => {
  const casos = [
    [-5, 1], ['-5', 1], [0, 1], [1, 1], [2, 2], [4999, 4999], [5000, 5000], [5001, 5000],
    [99999, 5000], ['12', 12], [' 7 ', 7], [2.9, 2], ['1e3', 1000], ['', 1], ['abc', 1],
    [null, 1], [undefined, 1], [NaN, 1], [Infinity, 1]
  ];
  for (const [entrada, esperado] of casos) {
    assert.equal(Cotizador.normalizarCantidad(entrada), esperado, `entrada ${String(entrada)}`);
  }
});

test('un "-5" no deja la cotización en 0 unidades (la barra no se oculta)', () => {
  const c = cotizar([producto({}), -5]);
  assert.equal(c.totalUnidades, 1);
  assert.equal(c.lineas[0].cantidad, 1);
  assert.equal(cotizar([producto({}), 99999]).totalUnidades, 5000);
});

test('ids únicos: los id repetidos del JSON abren su propio producto', (t) => {
  const conUid = Cotizador.asignarIdsUnicos(productos);
  assert.equal(conUid.length, productos.length);
  assert.equal(new Set(conUid.map((p) => p.uid)).size, conUid.length);
  for (const p of conUid) assert.match(p.uid, /^p\d+$/, 'uid seguro para atributos y onclick');
  const repetidos = [...new Set(productos.map((p) => p.id).filter((id, i, ids) => ids.indexOf(id) !== i))];
  for (const id of repetidos) {
    const grupo = conUid.filter((p) => p.id === id);
    assert.ok(grupo.length >= 2, id);
    for (const p of grupo) assert.equal(conUid.find((q) => q.uid === p.uid), p);
  }
  assert.ok(!('uid' in productos[0]), 'no modifica el arreglo original');
  assert.deepEqual(Cotizador.asignarIdsUnicos(null), []);
  assert.equal(Cotizador.asignarIdsUnicos([null, 'x', [], producto({})]).length, 1);
  t.diagnostic(`ids repetidos en products.json: ${repetidos.join(', ') || 'ninguno'}`);
});

test('el total suma solo precios válidos; tarifa mayorista desde 12 unidades', () => {
  const valido = producto({});
  const skuComoPrecio = producto({ id: 'B', sku: '1117', nombre: 'Caja tazón', precio_detalle: 1117, precio_mayorista: 894 });

  let c = cotizar([valido, 2], [skuComoPrecio, 1]);
  assert.equal(c.tarifa, 'detalle');
  assert.equal(c.publicado, 2380);
  assert.equal(c.porConfirmar, 1);
  assert.equal(c.lineas[1].subtotal, null);

  // Con 12 unidades rige el mayorista, pero el $894 de 1117 salió del SKU (80%): sigue por confirmar.
  assert.equal(cotizar([valido, 11]).tarifa, 'detalle');
  c = cotizar([valido, 11], [skuComoPrecio, 1]);
  assert.equal(c.tarifa, 'mayorista');
  assert.equal(c.publicado, 11 * 1000);
  assert.equal(c.porConfirmar, 1);
  assert.equal(c.lineas[1].subtotal, null);

  // Un mayorista igual al SKU no cae al precio detalle: queda por confirmar.
  c = cotizar([producto({ sku: '1000', precio_detalle: 2319, precio_mayorista: 1000 }), 12]);
  assert.equal(c.porConfirmar, 1);
  assert.equal(c.publicado, 0);
  assert.equal(c.desglose, null);

  assert.equal(Cotizador.calcularCotizacion(null).totalUnidades, 0);
  assert.equal(Cotizador.calcularCotizacion([null, { producto: null, cantidad: 3 }]).lineas.length, 0);
});

test('IVA 19% según el campo iva_incluido: neto + IVA = total, sin inventar IVA', () => {
  let c = cotizar([producto({ precio_detalle: 11900 }), 1]);
  assert.deepEqual(c.desglose, { neto: 10000, iva: 1900, total: 11900 });
  assert.equal(c.origenIva, 'incluido');

  c = cotizar([producto({ precio_detalle: 10000, iva_incluido: false }), 1]);
  assert.deepEqual(c.desglose, { neto: 10000, iva: 1900, total: 11900 });
  assert.equal(c.origenIva, 'neto');

  c = cotizar([producto({ precio_detalle: 11900 }), 1], [producto({ id: 'B', sku: 'B', precio_detalle: 10000, iva_incluido: false }), 1]);
  assert.deepEqual(c.desglose, { neto: 20000, iva: 3800, total: 23800 });
  assert.equal(c.origenIva, 'mixto');

  for (const precio of [1, 99, 894, 1932, 2319, 7485]) {
    const d = cotizar([producto({ precio_detalle: precio }), 3]).desglose;
    assert.equal(d.neto + d.iva, d.total, `precio ${precio}`);
    assert.equal(d.total, precio * 3);
  }

  c = cotizar([producto({ iva_incluido: undefined }), 1]);
  assert.equal(c.desglose, null);
  assert.equal(c.origenIva, 'sin_dato');
});

test('mensaje de WhatsApp: neto, IVA 19% y total por separado; "precio por confirmar" no suma', () => {
  const c = cotizar(
    [producto({ sku: '2002B' }), 2],
    [producto({ id: 'B', sku: '1117', nombre: 'Caja tazón', precio_detalle: 1117 }), 1]
  );
  const m = Cotizador.construirMensaje(c);
  assert.match(m, /• 2x Bolsa 30 x 35 \(SKU: 2002B\) - \$2\.380/);
  assert.match(m, /• 1x Caja tazón \(SKU: 1117\) - precio por confirmar/);
  assert.match(m, /\nNeto: \$2\.000\n/);
  assert.match(m, /\nIVA 19%: \$380\n/);
  assert.match(m, /Total estimado: \$2\.380 \(precios del catálogo con IVA incluido\)/);
  assert.match(m, /1 artículo con precio por confirmar/);
  assert.doesNotMatch(m, /\$1\.117/, 'el SKU nunca aparece como monto');
  assert.equal(Cotizador.textoTotalBarra(c), 'Desde $2.380');

  const url = new URL(Cotizador.enlaceWhatsApp('56998946593', m));
  assert.equal(url.origin + url.pathname, 'https://wa.me/56998946593');
  assert.equal(url.searchParams.get('text'), m);

  const sinDato = Cotizador.construirMensaje(cotizar([producto({ iva_incluido: undefined }), 1]));
  assert.match(sinDato, /Total estimado: \$1\.190 \(precio publicado; el catálogo no indica si incluye IVA\)/);
  assert.doesNotMatch(sinDato, /Neto:|IVA 19%/);

  const todoPorConfirmar = cotizar([producto({ sku: '1117', precio_detalle: 1117 }), 1]);
  assert.equal(Cotizador.textoTotalBarra(todoPorConfirmar), 'Por confirmar');
  assert.doesNotMatch(Cotizador.construirMensaje(todoPorConfirmar), /Neto:|Total estimado|\$0/);
  assert.equal(Cotizador.textoTotalBarra(cotizar([producto({}), 2])), '$2.380');
});

test('app.js no lee precios del JSON: todo precio pasa por src/cotizador.js', () => {
  assert.doesNotMatch(leer('src/app.js'), /precio_detalle|precio_mayorista/);
});

test('cotizador.js no supera 300 líneas y app.js (monolito heredado) no crece', () => {
  const lineas = (ruta) => leer(ruta).trimEnd().split('\n').length;
  assert.ok(lineas('src/cotizador.js') <= 300, 'src/cotizador.js supera 300 líneas');
  assert.ok(lineas('src/app.js') <= 358, 'src/app.js solo puede achicarse (regla 21 del hub)');
});

test('.vercelignore no publica el manifiesto, specs, tests ni .md internos', () => {
  const reglas = leer('.vercelignore')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
  for (const regla of ['/MANIFIESTO_MARCA_ECOBOL.txt', '/specs/', '/tests/', '*.md']) {
    assert.ok(reglas.includes(regla), `falta la regla ${regla}`);
  }
  // Nada de lo que el sitio usa: index.html, favicons y src/ (código, estilos, datos e imágenes).
  for (const regla of reglas) {
    assert.doesNotMatch(regla, /^!|^\/?\*$|^\/?(index\.html|favicon|src)\b|^\*\.(html|js|css|json|png|webp|jpe?g|ico)$/, regla);
  }
});

test('index.html carga src/cotizador.js antes que src/app.js', () => {
  const html = leer('index.html');
  const cotizador = html.indexOf('<script src="./src/cotizador.js"></script>');
  const app = html.indexOf('<script src="./src/app.js"></script>');
  assert.ok(cotizador > -1 && app > -1 && cotizador < app);
});
