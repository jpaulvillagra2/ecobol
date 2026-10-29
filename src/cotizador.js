// ==========================================================================
// ECOBOL SpA - COTIZADOR: lógica pura (sin DOM) que comparten el navegador y los tests de Node.
// Precio: un valor ausente, no numérico, <= 0 o igual al SKU (comparando solo dígitos) no es un
// precio. Se muestra "Consultar precio", no suma al total y WhatsApp lo lista "precio por confirmar".
// IVA: se desglosa según el campo iva_incluido de cada producto; si falta, no se inventa y el total
// se rotula "precio publicado".
// ==========================================================================

const Cotizador = (() => {
  'use strict';

  const IVA_PORCENTAJE = 19;
  const CANTIDAD_MINIMA = 1;
  const CANTIDAD_MAXIMA = 5000;
  const UMBRAL_MAYORISTA = 12;
  const TEXTO_SIN_PRECIO = 'Consultar precio';
  const TEXTO_POR_CONFIRMAR = 'precio por confirmar';
  const CAMPO_PRECIO = { detalle: 'precio_detalle', mayorista: 'precio_mayorista' };
  const ORIGEN_IVA = {
    incluido: 'precios del catálogo con IVA incluido',
    neto: 'precios del catálogo sin IVA; se suma el 19%',
    mixto: 'precios del catálogo con y sin IVA según el artículo'
  };

  const formatoClp = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  });

  const formatearClp = (monto) => formatoClp.format(monto || 0);

  // Solo dígitos y sin ceros a la izquierda: "10-X40" -> "1040", "01117" -> "1117".
  const soloDigitos = (valor) =>
    valor === null || valor === undefined ? '' : String(valor).replace(/\D/g, '').replace(/^0+/, '');

  const skuDe = (producto) => (producto && (producto.sku || producto.id)) || '';

  function esPrecioValido(precio, sku) {
    if (typeof precio !== 'number' || !Number.isFinite(precio) || precio <= 0) return false;
    const digitosSku = soloDigitos(sku);
    return digitosSku === '' || soloDigitos(precio) !== digitosSku;
  }

  // Precio unitario de la tarifa ('detalle' o 'mayorista'), o null si no hay un precio válido.
  function precioDe(producto, tarifa) {
    const campo = CAMPO_PRECIO[tarifa];
    if (!producto || typeof producto !== 'object' || !campo) return null;
    return esPrecioValido(producto[campo], skuDe(producto)) ? producto[campo] : null;
  }

  function textoPrecio(producto, tarifa) {
    const precio = precioDe(producto, tarifa);
    return precio === null ? TEXTO_SIN_PRECIO : formatearClp(precio);
  }

  // Entero entre 1 y 5.000. Vacío, texto o valores no finitos vuelven al mínimo.
  function normalizarCantidad(valor) {
    const numero = typeof valor === 'number' ? valor : Number(String(valor ?? '').trim());
    if (!Number.isFinite(numero)) return CANTIDAD_MINIMA;
    return Math.min(CANTIDAD_MAXIMA, Math.max(CANTIDAD_MINIMA, Math.trunc(numero)));
  }

  // products.json repite algunos id y SKU: cada producto recibe un uid por su posición
  // ("p0", "p1"...), único y seguro dentro de atributos HTML y onclick.
  function asignarIdsUnicos(productos) {
    if (!Array.isArray(productos)) return [];
    return productos
      .filter((p) => p !== null && typeof p === 'object' && !Array.isArray(p))
      .map((p, indice) => ({ ...p, uid: `p${indice}` }));
  }

  function origenIvaDe(lineasConPrecio) {
    const marcas = new Set(lineasConPrecio.map((linea) => linea.producto.iva_incluido));
    if (marcas.size === 0) return null;
    if ([...marcas].some((marca) => typeof marca !== 'boolean')) return 'sin_dato';
    if (marcas.size === 2) return 'mixto';
    return marcas.has(true) ? 'incluido' : 'neto';
  }

  // Aritmética entera al peso: neto + IVA = total en todos los casos.
  function desglosarIva(lineasConPrecio) {
    let conIva = 0;
    let sinIva = 0;
    lineasConPrecio.forEach((linea) => {
      if (linea.producto.iva_incluido === true) conIva += linea.subtotal;
      else sinIva += linea.subtotal;
    });
    const neto = Math.round((conIva * 100) / (100 + IVA_PORCENTAJE)) + sinIva;
    const total = conIva + Math.round((sinIva * (100 + IVA_PORCENTAJE)) / 100);
    return { neto, iva: total - neto, total };
  }

  // items: [{ producto, cantidad }]. La tarifa mayorista rige desde 12 unidades en total.
  function calcularCotizacion(items) {
    const lineas = (Array.isArray(items) ? items : [])
      .filter((item) => item && item.producto && typeof item.producto === 'object')
      .map((item) => ({ producto: item.producto, cantidad: normalizarCantidad(item.cantidad) }));
    const totalUnidades = lineas.reduce((suma, linea) => suma + linea.cantidad, 0);
    const tarifa = totalUnidades >= UMBRAL_MAYORISTA ? 'mayorista' : 'detalle';

    lineas.forEach((linea) => {
      linea.unitario = precioDe(linea.producto, tarifa);
      linea.subtotal = linea.unitario === null ? null : linea.unitario * linea.cantidad;
    });

    const conPrecio = lineas.filter((linea) => linea.subtotal !== null);
    const origenIva = origenIvaDe(conPrecio);
    return {
      tarifa,
      totalUnidades,
      lineas,
      porConfirmar: lineas.length - conPrecio.length,
      publicado: conPrecio.reduce((suma, linea) => suma + linea.subtotal, 0),
      origenIva,
      desglose: origenIva && origenIva !== 'sin_dato' ? desglosarIva(conPrecio) : null
    };
  }

  function construirMensaje(cotizacion) {
    const { lineas, totalUnidades, tarifa, porConfirmar, publicado, origenIva, desglose } = cotizacion;
    const partes = ['¡Hola EcoBol SpA! Deseo solicitar cotización para los siguientes artículos:', ''];
    lineas.forEach((linea) => {
      const monto = linea.subtotal === null ? TEXTO_POR_CONFIRMAR : formatearClp(linea.subtotal);
      partes.push(`• ${linea.cantidad}x ${linea.producto.nombre || 'Artículo'} (SKU: ${skuDe(linea.producto)}) - ${monto}`);
    });
    partes.push('', `📦 Total artículos: ${totalUnidades} un.${tarifa === 'mayorista' ? ' - Tarifa Mayorista' : ''}`);
    if (desglose) {
      partes.push(`Neto: ${formatearClp(desglose.neto)}`, `IVA 19%: ${formatearClp(desglose.iva)}`);
      partes.push(`💰 Total estimado: ${formatearClp(desglose.total)} (${ORIGEN_IVA[origenIva]})`);
    } else if (publicado > 0) {
      partes.push(`💰 Total estimado: ${formatearClp(publicado)} (precio publicado; el catálogo no indica si incluye IVA)`);
    }
    if (porConfirmar > 0) {
      const uno = porConfirmar === 1;
      partes.push(`${porConfirmar} ${uno ? 'artículo' : 'artículos'} con precio por confirmar (no ${uno ? 'suma' : 'suman'} al total).`);
    }
    partes.push('', '¿Tienen disponibilidad y tiempos de confección/entrega?');
    return partes.join('\n');
  }

  // Total de la barra: nunca muestra $0 cuando hay artículos sin precio.
  function textoTotalBarra(cotizacion) {
    const total = cotizacion.desglose ? cotizacion.desglose.total : cotizacion.publicado;
    if (total <= 0) return cotizacion.porConfirmar > 0 ? 'Por confirmar' : formatearClp(0);
    return cotizacion.porConfirmar > 0 ? `Desde ${formatearClp(total)}` : formatearClp(total);
  }

  const enlaceWhatsApp = (telefono, mensaje) => `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;

  return Object.freeze({
    CANTIDAD_MINIMA,
    CANTIDAD_MAXIMA,
    UMBRAL_MAYORISTA,
    TEXTO_SIN_PRECIO,
    TEXTO_POR_CONFIRMAR,
    formatearClp,
    skuDe,
    esPrecioValido,
    precioDe,
    textoPrecio,
    normalizarCantidad,
    asignarIdsUnicos,
    calcularCotizacion,
    construirMensaje,
    textoTotalBarra,
    enlaceWhatsApp
  });
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Cotizador;
