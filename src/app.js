// ==========================================================================
// ECOBOL SpA - CATÁLOGO TEXTIL INTEGRAL, FILTROS Y MODAL DE DETALLE
// ==========================================================================

const WHATSAPP_PHONE = '56998946593'; // Número oficial Ecobol SpA

let allProducts = [];
let filteredProducts = [];
let currentCategory = 'all';
let cart = {}; // { productId: { product, qty } }
let selectedProductForModal = null;

// Formateador de moneda chilena
const formatCLP = (amount) => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(amount || 0);
};

// Navegación Multi-Página SPA
window.switchPage = function(pageId) {
  document.querySelectorAll('.view-page').forEach(page => {
    page.classList.remove('active');
  });
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  const targetPage = document.getElementById('page-' + pageId);
  if (targetPage) {
    targetPage.classList.add('active');
  }
  const targetBtn = document.querySelector(`.nav-tab-btn[data-page="${pageId}"]`);
  if (targetBtn) {
    targetBtn.classList.add('active');
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Carga inicial de datos
async function init() {
  try {
    const res = await fetch('./src/data/products.json');
    allProducts = await res.json();
    filteredProducts = [...allProducts];

    renderCategoryBubbles();
    renderCatalog();
    setupEventListeners();
  } catch (err) {
    console.error('Error cargando catálogo:', err);
  }
}

// Renderizado dinámico de burbujas de categoría según datos reales
function renderCategoryBubbles() {
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
      <button type="button" class="bubble-btn ${isSelected ? 'active' : ''}" data-cat="${b.id}">
        <div class="bubble-circle">
          <span class="bubble-icon">${b.icon}</span>
        </div>
        <span class="bubble-label">${b.label}</span>
        <span class="bubble-count">${b.count} art.</span>
      </button>
    `;
  }).join('');

  container.querySelectorAll('.bubble-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentCategory = btn.getAttribute('data-cat');
      container.querySelectorAll('.bubble-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterProducts();
    });
  });
}

// Filtrar productos por búsqueda y categoría
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

  const countBadge = document.getElementById('catalog-results-count');
  if (countBadge) {
    countBadge.innerText = `${filteredProducts.length} artículo${filteredProducts.length === 1 ? '' : 's'} disponible${filteredProducts.length === 1 ? '' : 's'}`;
  }

  renderCatalog();
}

// Renderizar el catálogo de productos con fotos reales
function renderCatalog() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  if (filteredProducts.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--color-verde-medio);">
        <p style="font-size: 1.2rem; font-weight: 600;">No se encontraron artículos con ese criterio.</p>
        <p style="font-size: 0.9rem; margin-top: 8px;">Intenta con otra palabra clave o selecciona "Todo el Catálogo".</p>
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
          <p class="product-desc">${prod.descripcion}</p>
          <div class="product-footer" onclick="event.stopPropagation()">
            <div class="price-box">
              <span class="price-label">Detalle (1 un.)</span>
              <span class="price-val">${formatCLP(prod.precio_detalle)}</span>
              <span class="price-iva">Mayor: ${formatCLP(prod.precio_mayorista)}</span>
            </div>
            <div class="card-actions">
              ${inCart === 0 ? `
                <button class="btn-add-cart" onclick="addToCart('${prod.id}')">
                  + Cotizar
                </button>
              ` : `
                <div class="qty-selector">
                  <button class="btn-qty" onclick="updateQty('${prod.id}', -1)">-</button>
                  <span class="qty-num">${inCart}</span>
                  <button class="btn-qty" onclick="updateQty('${prod.id}', 1)">+</button>
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
  document.getElementById('modal-product-desc').innerText = prod.descripcion;

  // Resetear cantidad a 1 o la cantidad que ya tenga en el carrito
  const currentInCart = cart[prod.id] ? cart[prod.id].qty : 1;
  const qtyInput = document.getElementById('modal-qty-input');
  if (qtyInput) {
    qtyInput.value = currentInCart;
  }

  const addBtn = document.getElementById('modal-add-btn');
  if (addBtn) {
    addBtn.innerText = `🛒 Añadir a Cotización (${qtyInput ? qtyInput.value : 1} un.)`;
  }

  const modal = document.getElementById('product-modal');
  if (modal) {
    modal.style.display = 'flex';
  }
};

window.closeProductModal = function() {
  const modal = document.getElementById('product-modal');
  if (modal) {
    modal.style.display = 'none';
  }
};

// Controles del selector de cantidad en el modal
window.changeModalQty = function(delta) {
  const input = document.getElementById('modal-qty-input');
  if (!input) return;
  let val = parseInt(input.value) || 1;
  val = Math.max(1, val + delta);
  input.value = val;

  const addBtn = document.getElementById('modal-add-btn');
  if (addBtn) {
    addBtn.innerText = `🛒 Añadir a Cotización (${val} un.)`;
  }
};

window.setModalQty = function(qty) {
  const input = document.getElementById('modal-qty-input');
  if (!input) return;
  input.value = qty;

  const addBtn = document.getElementById('modal-add-btn');
  if (addBtn) {
    addBtn.innerText = `🛒 Añadir a Cotización (${qty} un.)`;
  }
};

window.addModalProductToCart = function() {
  if (!selectedProductForModal) return;
  const input = document.getElementById('modal-qty-input');
  const qty = input ? (parseInt(input.value) || 1) : 1;

  if (!cart[selectedProductForModal.id]) {
    cart[selectedProductForModal.id] = { product: selectedProductForModal, qty: qty };
  } else {
    cart[selectedProductForModal.id].qty = qty;
  }

  updateStickyBar();
  renderCatalog();

  const addBtn = document.getElementById('modal-add-btn');
  if (addBtn) {
    addBtn.innerText = `✅ ¡Listo! ${qty} un. en cotización`;
    setTimeout(() => {
      closeProductModal();
    }, 600);
  }
};

// Carrito y Cotización
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
  if (closeBtn) {
    closeBtn.addEventListener('click', closeProductModal);
  }

  const modalBackdrop = document.getElementById('product-modal');
  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) {
        closeProductModal();
      }
    });
  }

  const qtyInput = document.getElementById('modal-qty-input');
  if (qtyInput) {
    qtyInput.addEventListener('input', () => {
      const val = parseInt(qtyInput.value) || 1;
      const addBtn = document.getElementById('modal-add-btn');
      if (addBtn) {
        addBtn.innerText = `🛒 Añadir a Cotización (${val} un.)`;
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeProductModal();
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
