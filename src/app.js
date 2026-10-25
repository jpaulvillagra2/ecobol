
// Drawer Móvil
window.toggleMobileDrawer = function() {
  const drawer = document.getElementById('mobile-drawer-backdrop');
  if (drawer) {
    drawer.classList.toggle('open');
  }
};

window.closeMobileDrawer = function() {
  const drawer = document.getElementById('mobile-drawer-backdrop');
  if (drawer) {
    drawer.classList.remove('open');
  }
};

window.drawerNav = function(pageId) {
  closeMobileDrawer();
  switchPage(pageId);
  // Actualizar enlaces activos en drawer
  document.querySelectorAll('.drawer-link-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-page') === pageId);
  });
};

// ==========================================================================
// ECOBOL SpA - CATÁLOGO TEXTIL ATÓMICO MOBILE-FIRST & EXPERIENCIA PREMIUM
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

// Navegación Multi-Página
window.switchPage = function(pageId) {
  document.querySelectorAll('.view-page').forEach(page => page.classList.remove('active'));
  document.querySelectorAll('.nav-tab-btn').forEach(btn => btn.classList.remove('active'));

  const targetPage = document.getElementById('page-' + pageId);
  if (targetPage) targetPage.classList.add('active');

  const targetBtn = document.querySelector(`.nav-tab-btn[data-page="${pageId}"]`);
  if (targetBtn) targetBtn.classList.add('active');

  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Carga inicial
async function init() {
  try {
    const res = await fetch('./src/data/products.json');
    allProducts = await res.json();
    filteredProducts = [...allProducts];

    renderCategoryChips();
    filterProducts(); // Actualiza conteo y renderiza catálogo sin textos huérfanos
    setupEventListeners();
  } catch (err) {
    console.error('Error cargando catálogo:', err);
    const countBadge = document.getElementById('catalog-results-count');
    if (countBadge) countBadge.innerText = 'Error al cargar catálogo.';
  }
}

// Chips/Pills táctiles de Categoría (Mobile-First horizontal scroll)
function renderCategoryChips() {
  const container = document.getElementById('catalog-bubbles-container');
  if (!container) return;

  const counts = { all: allProducts.length };
  allProducts.forEach(p => {
    counts[p.categoria] = (counts[p.categoria] || 0) + 1;
  });

  const categories = [
    { id: 'all', label: 'Todo el Catálogo', icon: '✨', count: counts.all },
    { id: 'Bolsas Ecológicas Reutilizables', label: 'Bolsas Ecológicas', icon: '👜', count: counts['Bolsas Ecológicas Reutilizables'] || 0 },
    { id: 'Algodón Sublimable', label: 'Algodón Sublimable', icon: '🎨', count: counts['Algodón Sublimable'] || 0 },
    { id: 'Biestrech & Mochilas', label: 'Biestrech & Morrales', icon: '🎒', count: counts['Biestrech & Mochilas'] || 0 },
    { id: 'Hogar & Cojines', label: 'Hogar & Cojines', icon: '🏡', count: counts['Hogar & Cojines'] || 0 },
    { id: 'Indumentaria & Pecheras', label: 'Pecheras & Delantales', icon: '🎽', count: counts['Indumentaria & Pecheras'] || 0 },
    { id: 'Estuches & Lona', label: 'Estuches & Lona', icon: '👝', count: counts['Estuches & Lona'] || 0 },
    { id: 'Artículos Promocionales', label: 'Promocionales & Tazones', icon: '☕', count: counts['Artículos Promocionales'] || 0 },
    { id: 'Línea Estacional & Eventos', label: 'Navidad & Eventos', icon: '🎄', count: counts['Línea Estacional & Eventos'] || 0 }
  ];

  container.innerHTML = categories.map(b => {
    const isSelected = currentCategory === b.id;
    return `
      <button type="button" class="category-chip ${isSelected ? 'active' : ''}" data-cat="${b.id}">
        <span class="chip-icon">${b.icon}</span>
        <span class="chip-label">${b.label}</span>
        <span class="chip-count">${b.count}</span>
      </button>
    `;
  }).join('');

  container.querySelectorAll('.category-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      currentCategory = btn.getAttribute('data-cat');
      container.querySelectorAll('.category-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterProducts();
    });
  });
}

// Filtrar productos
function filterProducts() {
  const searchInput = document.getElementById('search-input');
  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

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

  // Eliminar inmediatamente el "Cargando productos..."
  const countBadge = document.getElementById('catalog-results-count');
  if (countBadge) {
    countBadge.innerText = `${filteredProducts.length} artículo${filteredProducts.length === 1 ? '' : 's'} disponible${filteredProducts.length === 1 ? '' : 's'}`;
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
              <span class="price-iva">Mayorista: ${formatCLP(prod.precio_mayorista)}</span>
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

// Modal de Detalle con Especificaciones Espaciadas
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

  // Formatear especificaciones con párrafos legibles
  const descEl = document.getElementById('modal-product-desc');
  if (descEl) {
    let cleanDesc = prod.descripcion || '';
    // Separar frases por puntos o barras
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
    setTimeout(() => closeProductModal(), 500);
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

function updateStickyBar() {
  const bar = document.getElementById('sticky-quote-bar');
  const countSpan = document.getElementById('cart-items-count');
  const totalSpan = document.getElementById('cart-total-amount');
  const waBtn = document.getElementById('whatsapp-quote-btn');

  const items = Object.values(cart);
  const totalItems = items.reduce((sum, item) => sum + item.qty, 0);

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

  if (bar) {
    if (totalItems > 0) {
      bar.classList.add('visible');
    } else {
      bar.classList.remove('visible');
    }
  }

  if (waBtn) {
    if (totalItems === 0) {
      waBtn.style.opacity = '0.7';
      waBtn.href = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent('¡Hola EcoBol! Quiero consultar por sus productos textiles del catálogo.')}`;
    } else {
      waBtn.style.opacity = '1';
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
