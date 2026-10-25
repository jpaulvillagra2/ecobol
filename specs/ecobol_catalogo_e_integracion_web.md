# SPEC FÍSICA CANÓNICA: Reorganización, Análisis Exhaustivo e Integración Web de Ecobol SpA

- **Fecha:** 2026-10-24
- **Proyecto:** `ecobol` (Ruta física de trabajo: `C:\ecobol`)
- **Roles Invocados:** `@architect`, `@developer`, `@reviewer`
- **Skills Magistrales Activas:** `clean-architecture-refactoring`, `adversarial-qa-enforcer`, `ui-ux-pro-max`, `whatsapp-lead-funnel`
- **Minuta Asociada:** `specs/minutas/minuta_ecobol_catalogo_24_oct.md`

---

## 1. Diagnóstico y Objetivo Técnico
Consolidar, depurar y estructurar la materia prima gráfica y documental entregada en `C:\ecobol\Catalogo completo ecobol`, extrayendo imagen por imagen y producto por producto toda la información técnica (SKU, medidas, tela, precios unitarios y mayoristas con IVA). 

Construir la plataforma web definitiva de **Ecobol SpA** con experiencia de usuario fluida, diseño textil orgánico de alto impacto, catálogo interactivo con filtros, carrito cotizador mayorista y embudo a WhatsApp.

**Condición Crítica de Alcance:**
- **Módulo DTF:** En estado `[STATUS: PENDIENTE / CONGELADO]`. No se implementará calculadora de paño DTF en esta fase por instrucción explícita de JP hasta confirmación con el cliente.

---

## 2. Plan de Ejecución Secuencial

### Paso 1: Respaldo y Organización Física del Repositorio
- Crear estructura ordenada en `C:\ecobol\assets_raw\` para aislar y resguardar la materia prima original.
- Eliminar archivos innecesarios de caché (`node_modules\.cache\gh-pages\...` residual) para dejar un workspace liviano y profesional.

### Paso 2: Análisis Forense Imagen por Imagen y Extracción de Precios
- Desarrollar script analizador/extractor (`scripts/audit_and_extract_catalog.py`).
- Extraer del HTML de Canva (`CATALOGO MAYORISTA CON IVA - Invitación (cuadrado) - Canva.html`) todos los textos, tablas de precios, SKUs y relaciones de imágenes.
- Inspeccionar cada una de las imágenes de las series `1000`, `2000`, `3000`, `4000`, `5000`, `6000`, `7000`, `8000`, `9000` y promociones especiales.
- Generar el catálogo canónico consolidado en `C:\ecobol\src\data\products_canonical.json`.

### Paso 3: Pipeline de Optimización de Imágenes (WebP de Alta Fidelidad)
- Script de procesamiento con Pillow (`scripts/optimize_catalog_images.py`):
  - Convertir imágenes PNG (de 4MB-8MB) a WebP optimizado (calidad 85, max 800px) reduciendo el peso en más del 90% sin pérdida visual perceptible.
  - Almacenar en `C:\ecobol\src\assets\products\` con nomenclatura estandarizada por SKU.

### Paso 4: Implementación de la Aplicación Web (`C:\ecobol`)
- **Arquitectura Limpia (<300 líneas por componente):**
  - `Navbar.jsx`: Logo de Ecobol, navegación y badge de carrito cotizador.
  - `Hero.jsx`: Manifiesto textil de Ecobol, propuesta de valor y sellos ecológicos.
  - `CatalogSection.jsx`: Grid de productos con buscador en vivo y filtros por categoría/material.
  - `ProductCard.jsx`: Vista previa, SKU visible, badge de material, precio detalle vs. mayorista y botón de añadir a cotización.
  - `ProductModal.jsx`: Zoom en alta resolución, descripción de medidas, tipo de tela, técnicas recomendadas y selector de cantidades.
  - `QuoteDrawer.jsx`: Carrito cotizador lateral con cálculo dinámico (alerta cuando califica para precio mayorista) y generación de mensaje estructurado a WhatsApp (`+56 9 9894 6593`).
  - `Footer.jsx`: Dirección física (Antonia López de Bello 560, Local 20, Recoleta), horarios, políticas y enlaces directos.

---

## 3. Criterios de Aceptación (DoD Checklist)
- [ ] Materia prima respaldada y clasificada sin pérdida de datos.
- [ ] 100% de productos y SKUs documentados en el catálogo JSON con precios detalle y mayorista.
- [ ] Imágenes convertidas a WebP y asociadas inequívocamente a cada producto.
- [ ] Web funcional, responsiva (validada en 375x812) y sin errores en consola.
- [ ] Carrito cotizador genera correctamente el mensaje de WhatsApp estructurado.
- [ ] Hard Gate 2: Build limpio (`npm run build` o bundle exit code 0).
