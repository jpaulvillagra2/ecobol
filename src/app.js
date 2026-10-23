// ==========================================================================
// ECOBOL SpA - APLICACIÓN CORE & COTIZADOR INTERACTIVO
// ==========================================================================

const WHATSAPP_PHONE = '56998946593'; // Número oficial Ecobol SpA

let allProducts = [];
let filteredProducts = [];
let currentCategory = 'Todas';
let cart = {}; // { productId: { product, qty } }

// Formateador de moneda chilena
const formatCLP = (amount) => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(amount);
};

// Carga inicial de datos
async function init() {
  try {
    const res = await fetch('./src/data/products.json');
    allProducts = await res.json();
    filteredProducts = [...allProducts];

    renderCategories();
    renderCatalog();
    setupEventListeners();
  } catch (err) {
    console.error('Error cargando catálogo:', err);
  }
}

// Renderizar botones de filtro por categoría
function renderCategories() {
  const container = document.getElementById('categories-container');
  if (!container) return;

  const categories = ['Todas', ...new Set(allProducts.map(p => p.categoria))];

  container.innerHTML = categories.map(cat => `
    <button class="cat-btn ${cat === currentCategory ? 'active' : ''}" data-cat="${cat}">
      ${cat}
    </button>
  `).join('');

  container.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentCategory = btn.getAttribute('data-cat');
      container.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterProducts();
    });
  });
}

// Filtrar productos por búsqueda y categoría
function filterProducts() {
  const searchVal = document.getElementById('search-input')?.value.toLowerCase().trim() || '';

  filteredProducts = allProducts.filter(p => {
    const matchesCat = (currentCategory === 'Todas' || p.categoria === currentCategory);
    const matchesSearch = !searchVal || 
      p.nombre.toLowerCase().includes(searchVal) ||
      p.material.toLowerCase().includes(searchVal) ||
      p.medidas.toLowerCase().includes(searchVal) ||
      p.descripcion.toLowerCase().includes(searchVal);

    return matchesCat && matchesSearch;
  });

  renderCatalog();
}

// Renderizar tarjetas de catálogo
function renderCatalog() {
  const grid = document.getElementById('catalog-grid');
  if (!grid) return;

  if (filteredProducts.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: var(--color-verde-medio);">
        <h3>No se encontraron productos</h3>
        <p>Prueba buscando con otro término o seleccionando otra categoría.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filteredProducts.map(p => {
    const inCartQty = cart[p.id]?.qty || 0;
    return `
      <div class="product-card" id="card-${p.id}">
        <div class="card-header">
          <span class="product-tag">${p.categoria}</span>
          <h3 class="product-name">${p.nombre}</h3>
          <p class="product-meta">📐 ${p.medidas} | 🧵 ${p.material}</p>
          <p class="product-desc">${p.descripcion}</p>
        </div>
        <div class="card-footer">
          <div class="price-block">
            <span class="price-label">Precio Unitario ${p.iva_incluido ? '(IVA Inc.)' : '(Neto)'}</span>
            <span class="price-amount">${formatCLP(p.precio_detalle)}</span>
          </div>
          <button class="btn-add" onclick="addToCart('${p.id}')">
            ${inCartQty > 0 ? '➕ (' + inCartQty + ')' : '🛒 Agregar'}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Gestión del Carrito
window.addToCart = function(productId) {
  const prod = allProducts.find(p => p.id === productId);
  if (!prod) return;

  if (!cart[productId]) {
    cart[productId] = { product: prod, qty: 1 };
  } else {
    cart[productId].qty++;
  }

  updateStickyBar();
  renderCatalog();
};

window.removeFromCart = function(productId) {
  if (cart[productId]) {
    cart[productId].qty--;
    if (cart[productId].qty <= 0) {
      delete cart[productId];
    }
  }
  updateStickyBar();
  renderCatalog();
  renderCartModal();
};

function updateStickyBar() {
  const countEl = document.getElementById('cart-items-count');
  const totalEl = document.getElementById('cart-total-amount');
  const waBtn = document.getElementById('whatsapp-quote-btn');

  let totalItems = 0;
  let totalPrice = 0;

  Object.values(cart).forEach(item => {
    totalItems += item.qty;
    totalPrice += item.qty * item.product.precio_detalle;
  });

  if (countEl) countEl.innerText = `${totalItems} artículo${totalItems === 1 ? '' : 's'} en cotización`;
  if (totalEl) totalEl.innerText = formatCLP(totalPrice);

  if (waBtn) {
    if (totalItems === 0) {
      waBtn.style.opacity = '0.6';
      waBtn.href = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent('¡Hola Ecobol! Quiero consultar por sus productos textiles y catálogo.')}`;
    } else {
      waBtn.style.opacity = '1';
      let msg = `¡Hola Ecobol! Quiero cotizar el siguiente pedido:\n\n`;
      Object.values(cart).forEach(item => {
        msg += `• ${item.qty}x ${item.product.nombre} (${item.product.medidas}) - ${formatCLP(item.qty * item.product.precio_detalle)}\n`;
      });
      msg += `\n*Total Estimado:* ${formatCLP(totalPrice)}\n\n¿Tienen disponibilidad y precio por volumen para este pedido?`;
      waBtn.href = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(msg)}`;
    }
  }
}

function setupEventListeners() {
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', filterProducts);
  }
}

// Iniciar al cargar el DOM
document.addEventListener('DOMContentLoaded', init);
