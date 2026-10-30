// ==========================================================================
// ECOBOL SpA - CATÁLOGO TEXTIL ATÓMICO MOBILE-FIRST (TOOLBAR COMPACTA & COTIZADOR CONDICIONAL)
// Precios, cantidades, totales y mensaje de WhatsApp: src/cotizador.js (se carga antes).
// ==========================================================================

const WHATSAPP_PHONE = '56998946593';

let allProducts = [];
let filteredProducts = [];
let currentCategory = 'all';
let cart = {};
let selectedProductForModal = null;

// Navegación Multi-Página SPA
window.switchPage = function(pageId) {
  document.querySelectorAll('.view-page').forEach(page => page.classList.remove('active'));
  document.querySelectorAll('.nav-tab-btn').forEach(btn => btn.classList.remove('active'));

  const targetPage = document.getElementById('page-' + pageId);
  if (targetPage) targetPage.classList.add('active');

  const targetBtn = document.querySelector(`.nav-tab-btn[data-page="${pageId}"]`);
  if (targetBtn) targetBtn.classList.add('active');

  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Drawer Móvil
window.toggleMobileDrawer = function() {
  const drawer = document.getElementById('mobile-drawer-backdrop');
  if (drawer) drawer.classList.toggle('open');
};

window.closeMobileDrawer = function() {
  const drawer = document.getElementById('mobile-drawer-backdrop');
  if (drawer) drawer.classList.remove('open');
};

window.drawerNav = function(pageId) {
  closeMobileDrawer();
  switchPage(pageId);
  document.querySelectorAll('.drawer-link-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-page') === pageId);
  });
};

// Carga Inicial
async function init() {
  try {
    const res = await fetch('./src/data/products.json');
    // products.json repite algunos id: cada producto recibe un uid único (p0, p1...).
    allProducts = Cotizador.asignarIdsUnicos(await res.json());
    filteredProducts = [...allProducts];

    populateCategoryDropdown();
    filterProducts();
    setupEventListeners();
    updateStickyBar(); // Se asegura de que la barra inicie 100% oculta en $0
  } catch (err) {
    console.error('Error cargando catálogo:', err);
    const countBadge = document.getElementById('catalog-results-count');
    if (countBadge) countBadge.innerText = 'Error al cargar catálogo.';
  }
}

// Llenar el Dropdown de Categorías Compacto
function populateCategoryDropdown() {
  const select = document.getElementById('category-dropdown-select');
  if (!select) return;

  const counts = { all: allProducts.length };
  allProducts.forEach(p => {
    counts[p.categoria] = (counts[p.categoria] || 0) + 1;
  });

  const categories = [
    { id: 'all', label: 'Todo el Catálogo', count: counts.all },
    { id: 'Bolsas Ecológicas Reutilizables', label: 'Bolsas Ecológicas', count: counts['Bolsas Ecológicas Reutilizables'] || 0 },
    { id: 'Algodón Sublimable', label: 'Algodón Sublimable', count: counts['Algodón Sublimable'] || 0 },
    { id: 'Biestrech & Mochilas', label: 'Biestrech & Morrales', count: counts['Biestrech & Mochilas'] || 0 },
    { id: 'Hogar & Cojines', label: 'Hogar & Cojines', count: counts['Hogar & Cojines'] || 0 },
    { id: 'Indumentaria & Pecheras', label: 'Pecheras & Delantales', count: counts['Indumentaria & Pecheras'] || 0 },
    { id: 'Estuches & Lona', label: 'Estuches & Lona', count: counts['Estuches & Lona'] || 0 },
    { id: 'Artículos Promocionales', label: 'Promocionales & Tazones', count: counts['Artículos Promocionales'] || 0 },
    { id: 'Línea Estacional & Eventos', label: 'Navidad & Eventos', count: counts['Línea Estacional & Eventos'] || 0 }
  ];

  select.innerHTML = categories.map(c => {
    return `<option value="${c.id}">${c.label} (${c.count})</option>`;
  }).join('');
}

window.onCategorySelectChange = function(catId) {
  currentCategory = catId;
  filterProducts();
};

window.clearSearch = function() {
  const input = document.getElementById('search-input');
  const btn = document.getElementById('search-clear-btn');
  if (input) {
    input.value = '';
    if (btn) btn.style.display = 'none';
    filterProducts();
  }
};

// Filtrar productos
function filterProducts() {
  const searchInput = document.getElementById('search-input');
  const clearBtn = document.getElementById('search-clear-btn');
  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

  if (clearBtn) {
    clearBtn.style.display = query ? 'flex' : 'none';
  }

  filteredProducts = allProducts.filter(prod => {
    const matchesCat = (currentCategory === 'all') || (prod.categoria === currentCategory);
    const matchesQuery = !query || 
      (prod.nombre && prod.nombre.toLowerCase().includes(query)) ||
      (prod.sku && prod.sku.toLowerCase().includes(query)) ||
      (prod.medidas && prod.medidas.toLowerCase().includes(query)) ||
      (prod.material && prod.material.toLowerCase().includes(query)) ||
      (prod.descripcion && prod.descripcion.toLowerCase().includes(query));

    return matchesCat && matchesQuery;
  });

  const countBadge = document.getElementById('catalog-results-count');
  if (countBadge) {
    countBadge.innerText = `${filteredProducts.length} artículo${filteredProducts.length === 1 ? '' : 's'}`;
  }

  renderCatalog();
}

// Renderizado del Catálogo
function renderCatalog() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  if (filteredProducts.length === 0) {
    grid.innerHTML = `
      <div class="empty-catalog-box">
        <p class="empty-title">No se encontraron artículos con ese filtro.</p>
        <p class="empty-subtitle">Intenta buscando por medida (ej: 35x40) o selecciona "Todo el Catálogo".</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filteredProducts.map(prod => {
    const inCart = cart[prod.uid] ? cart[prod.uid].qty : 0;
    const imgSrc = prod.imagen || './src/assets/logo_ecobol.png';

    return `
      <article class="product-card" id="card-${prod.uid}" onclick="openProductModal('${prod.uid}')">
        <div class="product-image-container">
          <img src="${imgSrc}" alt="${prod.nombre}" class="product-img" loading="lazy" onerror="this.src='./src/assets/logo_ecobol.png'">
          <span class="product-badge-cat">${prod.categoria}</span>
        </div>
        <div class="product-body">
          <div class="product-meta">
            <span class="meta-tag">📐 ${prod.medidas}</span>
            <span class="meta-tag">🧵 ${prod.material}</span>
          </div>
          <h3 class="product-title">${prod.nombre}</h3>
          
          <div class="product-footer" onclick="event.stopPropagation()">
            <div class="price-box">
              <span class="price-label">Detalle (1 un.)</span>
              <span class="price-val">${Cotizador.textoPrecio(prod, 'detalle')}</span>
              <span class="price-iva">Mayor: ${Cotizador.textoPrecio(prod, 'mayorista')}</span>
            </div>

            <div class="card-actions">
              ${inCart === 0 ? `
                <button class="btn-card-add" onclick="addToCart('${prod.uid}')">
                  🛒 + Cotizar
                </button>
              ` : `
                <div class="card-stepper">
                  <button type="button" class="btn-card-step" onclick="updateQty('${prod.uid}', -1)">-</button>
                  <span class="card-qty-num">${inCart}</span>
                  <button type="button" class="btn-card-step" onclick="updateQty('${prod.uid}', 1)">+</button>
                </div>
              `}
            </div>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

// Modal de Detalle de Producto
window.openProductModal = function(uid) {
  const prod = allProducts.find(p => p.uid === uid);
  if (!prod) return;

  selectedProductForModal = prod;

  document.getElementById('modal-product-img').src = prod.imagen || './src/assets/logo_ecobol.png';
  document.getElementById('modal-product-badge').innerText = prod.categoria;
  document.getElementById('modal-product-sku').innerText = 'SKU OFICIAL: ' + Cotizador.skuDe(prod);
  document.getElementById('modal-product-title').innerText = prod.nombre;
  document.getElementById('modal-product-medidas').innerText = '📐 ' + prod.medidas;
  document.getElementById('modal-product-material').innerText = '🧵 ' + prod.material;
  document.getElementById('modal-product-price-det').innerText = Cotizador.textoPrecio(prod, 'detalle');
  document.getElementById('modal-product-price-may').innerText = Cotizador.textoPrecio(prod, 'mayorista');

  const descEl = document.getElementById('modal-product-desc');
  if (descEl) {
    const parts = Cotizador.partesDescripcion(prod.descripcion);
    descEl.innerHTML = parts.length > 1
      ? parts.map(p => `<p class="desc-bullet">• ${p}</p>`).join('')
      : `<p>${parts.join('')}</p>`;
  }

  const qtyInput = document.getElementById('modal-qty-input');
  if (qtyInput) qtyInput.value = cart[prod.uid] ? cart[prod.uid].qty : 1;
  setModalAddLabel(qtyInput ? qtyInput.value : 1);

  const modal = document.getElementById('product-modal');
  if (modal) modal.style.display = 'flex';
};

window.closeProductModal = function() {
  const modal = document.getElementById('product-modal');
  if (modal) modal.style.display = 'none';
};

function setModalAddLabel(qty) {
  const addBtn = document.getElementById('modal-add-btn');
  if (addBtn) addBtn.innerText = `🛒 Añadir a Cotización (${qty} un.)`;
}

// Cantidad del modal: siempre un entero entre 1 y 5.000 (ej.: "-5" -> 1, "99999" -> 5.000).
window.changeModalQty = function(delta) {
  const input = document.getElementById('modal-qty-input');
  if (!input) return;
  input.value = Cotizador.normalizarCantidad(Cotizador.normalizarCantidad(input.value) + delta);
  setModalAddLabel(input.value);
};

window.setModalQty = function(qty) {
  const input = document.getElementById('modal-qty-input');
  if (!input) return;
  input.value = Cotizador.normalizarCantidad(qty);
  setModalAddLabel(input.value);
};

window.addModalProductToCart = function() {
  if (!selectedProductForModal) return;
  const input = document.getElementById('modal-qty-input');
  const qty = Cotizador.normalizarCantidad(input ? input.value : 1);
  if (input) input.value = qty;

  cart[selectedProductForModal.uid] = { product: selectedProductForModal, qty: qty };

  updateStickyBar();
  renderCatalog();

  const addBtn = document.getElementById('modal-add-btn');
  if (addBtn) {
    addBtn.innerText = `✅ ¡Listo! ${qty} un. en cotización`;
    setTimeout(() => closeProductModal(), 450);
  }
};

window.addToCart = function(uid) {
  const prod = allProducts.find(p => p.uid === uid);
  if (!prod) return;

  const actual = cart[uid] ? cart[uid].qty : 0;
  cart[uid] = { product: prod, qty: Cotizador.normalizarCantidad(actual + 1) };

  updateStickyBar();
  renderCatalog();
};

window.updateQty = function(uid, delta) {
  if (!cart[uid]) return;

  // Bajo 1 el artículo sale de la cotización; sobre 5.000 queda en 5.000.
  const nueva = cart[uid].qty + delta;
  if (nueva < Cotizador.CANTIDAD_MINIMA) delete cart[uid];
  else cart[uid].qty = Cotizador.normalizarCantidad(nueva);

  updateStickyBar();
  renderCatalog();
};

// GESTIÓN DETERMINISTA DE LA BARRA STICKY INFERIOR:
// SOLO APARECE SI HAY ARTÍCULOS (CADA CANTIDAD ENTRE 1 Y 5.000). EN VACÍO QUEDA 100% OCULTA.
// Los artículos sin precio válido no suman: el total dice "Desde $X" o "Por confirmar".
function updateStickyBar() {
  const bar = document.getElementById('sticky-quote-bar');
  if (!bar) return;

  const cotizacion = Cotizador.calcularCotizacion(
    Object.values(cart).map(item => ({ producto: item.product, cantidad: item.qty }))
  );

  if (cotizacion.totalUnidades <= 0) {
    bar.style.display = 'none';
    bar.classList.remove('visible');
    return;
  }

  bar.style.display = 'flex';
  bar.classList.add('visible');

  const countSpan = document.getElementById('cart-items-count');
  const totalSpan = document.getElementById('cart-total-amount');
  const waBtn = document.getElementById('whatsapp-quote-btn');
  if (countSpan) {
    const mayorista = cotizacion.tarifa === 'mayorista' ? ' ⭐ Tarifa Mayorista' : '';
    const pendientes = cotizacion.porConfirmar ? ` · ${cotizacion.porConfirmar} por confirmar` : '';
    countSpan.innerText = `${cotizacion.totalUnidades} un.${mayorista}${pendientes}`;
  }
  if (totalSpan) totalSpan.innerText = Cotizador.textoTotalBarra(cotizacion);
  if (waBtn) waBtn.href = Cotizador.enlaceWhatsApp(WHATSAPP_PHONE, Cotizador.construirMensaje(cotizacion));
}

function setupEventListeners() {
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', filterProducts);
  }

  const closeBtn = document.getElementById('btn-close-modal');
  if (closeBtn) closeBtn.addEventListener('click', closeProductModal);

  const modalBackdrop = document.getElementById('product-modal');
  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) closeProductModal();
    });
  }

  const qtyInput = document.getElementById('modal-qty-input');
  if (qtyInput) {
    qtyInput.addEventListener('input', () => setModalAddLabel(Cotizador.normalizarCantidad(qtyInput.value)));
    // Al salir del campo, lo escrito queda corregido al rango 1 a 5.000.
    qtyInput.addEventListener('change', () => window.setModalQty(qtyInput.value));
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeProductModal();
  });
}

document.addEventListener('DOMContentLoaded', init);
