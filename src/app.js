// ==========================================================================
// ECOBOL SpA - MULTIPÁGINA SPA, CATÁLOGO BURBUJAS & CALCULADORA DTF
// ==========================================================================

const WHATSAPP_PHONE = '56998946593'; // Número oficial Ecobol SpA

let allProducts = [];
let filteredProducts = [];
let currentCategory = 'all';
let cart = {}; // { productId: { product, qty } }

// Formateador de moneda chilena
const formatCLP = (amount) => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(amount);
};

// Navegación Multi-Página SPA
window.switchPage = function(pageId) {
  // Ocultar todas las páginas
  document.querySelectorAll('.view-page').forEach(page => {
    page.classList.remove('active');
  });

  // Desactivar botones de navbar
  document.querySelectorAll('.nav-tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  // Mostrar página objetivo
  const targetPage = document.getElementById('page-' + pageId);
  if (targetPage) {
    targetPage.classList.add('active');
  }

  // Activar botón nav correspondiente
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
    initDtfCalculator();
  } catch (err) {
    console.error('Error cargando catálogo:', err);
  }
}

// Burbujas de Categoría estilo Tu Pon El Mono (con íconos y conteo)
const BUBBLE_DEFINITIONS = [
  { id: 'all', label: 'Todo el Catálogo', icon: '✨', count: 80 },
  { id: 'Crea Cruda 100% Algodón', label: 'Crea Cruda', icon: '👜', count: 14 },
  { id: 'Biestrech Poliéster', label: 'Biestrech', icon: '🎒', count: 9 },
  { id: 'Accesorios & Sacos Crea', label: 'Sacos Crea', icon: '🧵', count: 9 },
  { id: 'Estuches & Cosmetiqueras', label: 'Cosmetiqueras', icon: '👝', count: 8 },
  { id: 'Línea Policotex Negro', label: 'Policotex Negro', icon: '🖤', count: 7 },
  { id: 'Mochilas & Morrales', label: 'Morrales', icon: '🎒', count: 7 },
  { id: 'Hogar & Cojines', label: 'Hogar & Cojines', icon: '🏡', count: 7 },
  { id: 'Línea Estacional & Navidad', label: 'Navidad & Fiestas', icon: '🎄', count: 6 },
  { id: 'Algodón para Sublimación', label: 'Sublimación', icon: '🎨', count: 3 },
  { id: 'Indumentaria & Pecheras', label: 'Pecheras', icon: '🎽', count: 3 }
];

function renderCategoryBubbles() {
  const container = document.getElementById('catalog-bubbles-container');
  if (!container) return;

  container.innerHTML = BUBBLE_DEFINITIONS.map(b => {
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
      prod.nombre.toLowerCase().includes(query) ||
      prod.medidas.toLowerCase().includes(query) ||
      prod.material.toLowerCase().includes(query) ||
      prod.descripcion.toLowerCase().includes(query);

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
        <p style="font-size: 0.9rem; margin-top: 8px;">Intenta con otra medida (ej: 35x40) o selecciona "Todo el Catálogo".</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filteredProducts.map(prod => {
    const inCart = cart[prod.id] ? cart[prod.id].qty : 0;
    const imgSrc = prod.imagen || './src/assets/products/media_1792785228216.png';

    return `
      <article class="product-card" id="card-${prod.id}">
        <div class="product-image-container">
          <img src="${imgSrc}" alt="${prod.nombre}" class="product-img" loading="lazy" onerror="this.src='./src/assets/products/media_1792785228216.png'">
          <span class="product-badge-cat">${prod.categoria}</span>
        </div>
        <div class="product-body">
          <div class="product-meta">
            <span class="meta-tag">📐 ${prod.medidas}</span>
            <span class="meta-tag">🧵 ${prod.material}</span>
          </div>
          <h3 class="product-title">${prod.nombre}</h3>
          <p class="product-desc">${prod.descripcion}</p>
          <div class="product-footer">
            <div class="price-box">
              <span class="price-label">Precio Detalle</span>
              <span class="price-val">${formatCLP(prod.precio_detalle)}</span>
              <span class="price-iva">${prod.iva_incluido ? 'IVA Incluido' : '+ IVA'}</span>
            </div>
            <div class="card-actions">
              ${inCart === 0 ? `
                <button class="btn-add-cart" onclick="addToCart('${prod.id}')">
                  + Cotizar
                </button>
              ` : `
                <div class="qty-control">
                  <button class="btn-qty" onclick="removeFromCart('${prod.id}')">-</button>
                  <span class="qty-count">${inCart}</span>
                  <button class="btn-qty" onclick="addToCart('${prod.id}')">+</button>
                </div>
              `}
            </div>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

// Lógica de Carrito de Cotización
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
      waBtn.style.opacity = '0.7';
      waBtn.href = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent('¡Hola EcoBol! Quiero consultar por sus productos textiles y servicio DTF.')}`;
    } else {
      waBtn.style.opacity = '1';
      let msg = `¡Hola EcoBol! Quiero cotizar el siguiente pedido estructurado:\n\n`;
      Object.values(cart).forEach(item => {
        msg += `• ${item.qty}x ${item.product.nombre} (${item.product.medidas}) - ${formatCLP(item.qty * item.product.precio_detalle)}\n`;
      });
      msg += `\n*Total Estimado:* ${formatCLP(totalPrice)}\n\n¿Tienen disponibilidad y valor mayorista para este volumen? Quedo atenta/o a su confirmación.`;
      waBtn.href = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(msg)}`;
    }
  }
}

// Calculadora Interactiva de Paño DTF 56 cm
function initDtfCalculator() {
  const btn = document.getElementById('btn-run-calc');
  const widthInput = document.getElementById('calc-width');
  const heightInput = document.getElementById('calc-height');
  const metersInput = document.getElementById('calc-meters');
  const resultBox = document.getElementById('calc-result');

  if (!btn || !widthInput || !heightInput || !metersInput || !resultBox) return;

  function runCalc() {
    const w = parseFloat(widthInput.value) || 10;
    const h = parseFloat(heightInput.value) || 10;
    const meters = parseFloat(metersInput.value) || 1;

    const usefulWidth = 56; // cm de ancho de film DTF
    const lengthCm = meters * 100;
    const gap = 0.5; // margen de seguridad entre logos

    // Opción normal: sin rotar
    const cols1 = Math.floor((usefulWidth + gap) / (w + gap));
    const rows1 = Math.floor((lengthCm + gap) / (h + gap));
    const total1 = Math.max(0, cols1 * rows1);

    // Opción rotada: girando 90 grados
    const cols2 = Math.floor((usefulWidth + gap) / (h + gap));
    const rows2 = Math.floor((lengthCm + gap) / (w + gap));
    const total2 = Math.max(0, cols2 * rows2);

    const isRotated = total2 > total1;
    const bestTotal = isRotated ? total2 : total1;
    const bestCols = isRotated ? cols2 : cols1;
    const bestRows = isRotated ? rows2 : rows1;

    resultBox.innerHTML = `
      <div class="result-summary">
        <span class="result-highlight">🔥 Caben aprox. <strong>${bestTotal} logos</strong> en ${meters}m lineal${meters > 1 ? 'es' : ''}</span>
        <span class="result-details">Distribución estimada: ${bestCols} columnas x ${bestRows} filas (${isRotated ? 'Orientación rotada' : 'Orientación directa'}). Ancho útil 56 cm con margen de 0.5 cm.</span>
      </div>
      <div class="result-cta">
        <a href="https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent('¡Hola EcoBol! Quiero cotizar ' + meters + ' metro(s) de DTF 56cm para aproximadamente ' + bestTotal + ' logos de ' + w + 'x' + h + ' cm.')}" target="_blank" rel="noopener" class="btn-calc-quote">
          💬 Cotizar este Paño DTF por WhatsApp
        </a>
      </div>
    `;
  }

  btn.addEventListener('click', runCalc);
  widthInput.addEventListener('input', runCalc);
  heightInput.addEventListener('input', runCalc);
  metersInput.addEventListener('input', runCalc);

  runCalc(); // Primera ejecución
}

function setupEventListeners() {
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', filterProducts);
  }
}

// Iniciar al cargar el DOM
document.addEventListener('DOMContentLoaded', init);
