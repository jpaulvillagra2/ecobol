// ==========================================================================
// ECOBOL SpA - CATÁLOGO TEXTIL ATÓMICO MOBILE-FIRST (TOOLBAR COMPACTA & COTIZADOR CONDICIONAL)
// ==========================================================================

const WHATSAPP_PHONE = '56998946593';

let allProducts = [];
let filteredProducts = [];
let currentCategory = 'all';
let cart = {};
let selectedProductForModal = null;

const formatCLP = (amount) => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(amount || 0);
};

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
    allProducts = await res.json();
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
    const inCart = cart[prod.id] ? cart[prod.id].qty : 0;
    const imgSrc = prod.imagen || './src/assets/logo_ecobol.png';

    return `
      <article class="product-card" id="card-${prod.id}" onclick="openProductModal('${prod.id}')">
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
              <span class="price-val">${formatCLP(prod.precio_detalle)}</span>
              <span class="price-iva">Mayor: ${formatCLP(prod.precio_mayorista)}</span>
            </div>
            
            <div class="card-actions">
              ${inCart === 0 ? `
                <button class="btn-card-add" onclick="addToCart('${prod.id}')">
                  🛒 + Cotizar
                </button>
              ` : `
                <div class="card-stepper">
                  <button type="button" class="btn-card-step" onclick="updateQty('${prod.id}', -1)">-</button>
                  <span class="card-qty-num">${inCart}</span>
                  <button type="button" class="btn-card-step" onclick="updateQty('${prod.id}', 1)">+</button>
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
window.openProductModal = function(productId) {
  const prod = allProducts.find(p => p.id === productId);
  if (!prod) return;

  selectedProductForModal = prod;

  document.getElementById('modal-product-img').src = prod.imagen || './src/assets/logo_ecobol.png';
  document.getElementById('modal-product-badge').innerText = prod.categoria;
  document.getElementById('modal-product-sku').innerText = 'SKU OFICIAL: ' + (prod.sku || prod.id);
  document.getElementById('modal-product-title').innerText = prod.nombre;
  document.getElementById('modal-product-medidas').innerText = '📐 ' + prod.medidas;
  document.getElementById('modal-product-material').innerText = '🧵 ' + prod.material;
  document.getElementById('modal-product-price-det').innerText = formatCLP(prod.precio_detalle);
  document.getElementById('modal-product-price-may').innerText = formatCLP(prod.precio_mayorista);

  const descEl = document.getElementById('modal-product-desc');
  if (descEl) {
    let cleanDesc = prod.descripcion || '';
    const parts = cleanDesc.split(/[.|]/).map(s => s.trim()).filter(s => s.length > 2);
    if (parts.length > 1) {
      descEl.innerHTML = parts.map(p => `<p class="desc-bullet">• ${p}</p>`).join('');
    } else {
      descEl.innerHTML = `<p>${cleanDesc}</p>`;
    }
  }

  const currentInCart = cart[prod.id] ? cart[prod.id].qty : 1;
  const qtyInput = document.getElementById('modal-qty-input');
  if (qtyInput) qtyInput.value = currentInCart;

  const addBtn = document.getElementById('modal-add-btn');
  if (addBtn) {
    addBtn.innerText = `🛒 Añadir a Cotización (${qtyInput ? qtyInput.value : 1} un.)`;
  }

  const modal = document.getElementById('product-modal');
  if (modal) modal.style.display = 'flex';
};

window.closeProductModal = function() {
  const modal = document.getElementById('product-modal');
  if (modal) modal.style.display = 'none';
};

window.changeModalQty = function(delta) {
  const input = document.getElementById('modal-qty-input');
  if (!input) return;
  let val = parseInt(input.value) || 1;
  val = Math.max(1, val + delta);
  input.value = val;

  const addBtn = document.getElementById('modal-add-btn');
  if (addBtn) addBtn.innerText = `🛒 Añadir a Cotización (${val} un.)`;
};

window.setModalQty = function(qty) {
  const input = document.getElementById('modal-qty-input');
  if (!input) return;
  input.value = qty;

  const addBtn = document.getElementById('modal-add-btn');
  if (addBtn) addBtn.innerText = `🛒 Añadir a Cotización (${qty} un.)`;
};

window.addModalProductToCart = function() {
  if (!selectedProductForModal) return;
  const input = document.getElementById('modal-qty-input');
  const qty = input ? (parseInt(input.value) || 1) : 1;

  cart[selectedProductForModal.id] = { product: selectedProductForModal, qty: qty };

  updateStickyBar();
  renderCatalog();

  const addBtn = document.getElementById('modal-add-btn');
  if (addBtn) {
    addBtn.innerText = `✅ ¡Listo! ${qty} un. en cotización`;
    setTimeout(() => closeProductModal(), 450);
  }
};

window.addToCart = function(productId) {
  const prod = allProducts.find(p => p.id === productId);
  if (!prod) return;

  if (!cart[productId]) {
    cart[productId] = { product: prod, qty: 1 };
  } else {
    cart[productId].qty += 1;
  }

  updateStickyBar();
  renderCatalog();
};

window.updateQty = function(productId, delta) {
  if (!cart[productId]) return;

  cart[productId].qty += delta;
  if (cart[productId].qty <= 0) {
    delete cart[productId];
  }

  updateStickyBar();
  renderCatalog();
};

// GESTIÓN DETERMINISTA DE LA BARRA STICKY INFERIOR:
// SOLO APARECE SI TOTALITEMS > 0. EN VACÍO QUEDA 100% OCULTA.
function updateStickyBar() {
  const bar = document.getElementById('sticky-quote-bar');
  const countSpan = document.getElementById('cart-items-count');
  const totalSpan = document.getElementById('cart-total-amount');
  const waBtn = document.getElementById('whatsapp-quote-btn');

  const items = Object.values(cart);
  const totalItems = items.reduce((sum, item) => sum + item.qty, 0);

  if (!bar) return;

  if (totalItems <= 0) {
    // 100% OCULTO EN ESTADO VACÍO
    bar.style.display = 'none';
    bar.classList.remove('visible');
    return;
  }

  // Si hay al menos 1 producto: mostrar barra animada
  bar.style.display = 'flex';
  bar.classList.add('visible');

  const isWholesale = totalItems >= 12;
  const totalPrice = items.reduce((sum, item) => {
    const p = isWholesale ? (item.product.precio_mayorista || item.product.precio_detalle) : item.product.precio_detalle;
    return sum + (p * item.qty);
  }, 0);

  if (countSpan) {
    countSpan.innerText = `${totalItems} un. ${isWholesale ? '⭐ Tarifa Mayorista' : ''}`;
  }
  if (totalSpan) {
    totalSpan.innerText = formatCLP(totalPrice);
  }

  if (waBtn) {
    let message = `¡Hola EcoBol SpA! Deseo solicitar cotización para los siguientes artículos:\n\n`;
    items.forEach(item => {
      const unitPrice = isWholesale ? (item.product.precio_mayorista || item.product.precio_detalle) : item.product.precio_detalle;
      message += `• ${item.qty}x ${item.product.nombre} (SKU: ${item.product.sku || item.product.id}) - ${formatCLP(unitPrice * item.qty)}\n`;
    });
    message += `\n📦 Total artículos: ${totalItems} un.`;
    message += `\n💰 Total estimado: ${formatCLP(totalPrice)} (IVA incluido ${isWholesale ? '- Tarifa Mayorista' : ''})`;
    message += `\n\n¿Tienen disponibilidad y tiempos de confección/entrega?`;

    waBtn.href = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;
  }
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
    qtyInput.addEventListener('input', () => {
      const val = parseInt(qtyInput.value) || 1;
      const addBtn = document.getElementById('modal-add-btn');
      if (addBtn) addBtn.innerText = `🛒 Añadir a Cotización (${val} un.)`;
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeProductModal();
  });
}

document.addEventListener('DOMContentLoaded', init);
