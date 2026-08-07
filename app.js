// Village Deko Application Logic - Poster Theme Enabled

let currentLang = 'hi';
let currentFilter = 'all';
let searchQuery = '';
let cart = []; // Array of { product, quantity }
let selectedStay = null;
let selectedExperience = null;

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  setupEventListeners();
  renderAll();
}

function setupEventListeners() {
  // Language Switcher
  const langToggleBtn = document.getElementById('lang-toggle-btn');
  if (langToggleBtn) {
    langToggleBtn.addEventListener('click', () => {
      currentLang = currentLang === 'hi' ? 'en' : 'hi';
      renderAll();
    });
  }

  // Mobile Menu Toggle
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileNav = document.getElementById('mobile-nav');
  if (mobileMenuBtn && mobileNav) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileNav.classList.toggle('hidden');
    });
  }

  // Hero Search Input & Button
  const heroSearchInput = document.getElementById('hero-search-input');
  const heroSearchBtn = document.getElementById('hero-search-btn');
  
  if (heroSearchInput) {
    heroSearchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      renderVillages();
    });
  }
  if (heroSearchBtn) {
    heroSearchBtn.addEventListener('click', () => {
      scrollToSection('villages-section');
    });
  }

  // Category Filter Buttons
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      filterBtns.forEach(b => {
        b.classList.remove('bg-[#8D2B18]', 'text-amber-100', 'border-2', 'border-[#D49B28]', 'shadow-sm');
        b.classList.add('bg-[#F5EAD4]', 'text-stone-800', 'border', 'border-[#D49B28]/60');
      });
      
      const target = e.currentTarget;
      target.classList.remove('bg-[#F5EAD4]', 'text-stone-800', 'border', 'border-[#D49B28]/60');
      target.classList.add('bg-[#8D2B18]', 'text-amber-100', 'border-2', 'border-[#D49B28]', 'shadow-sm');
      
      currentFilter = target.getAttribute('data-filter');
      renderVillages();
    });
  });

  // Cart Button Triggers
  const cartToggleBtns = document.querySelectorAll('.cart-toggle-btn');
  cartToggleBtns.forEach(btn => {
    btn.addEventListener('click', toggleCartDrawer);
  });

  // Cart Overlay Close
  const cartOverlay = document.getElementById('cart-overlay');
  const cartCloseBtn = document.getElementById('cart-close-btn');
  if (cartOverlay) cartOverlay.addEventListener('click', toggleCartDrawer);
  if (cartCloseBtn) cartCloseBtn.addEventListener('click', toggleCartDrawer);

  // Host Onboarding Modal Trigger
  const hostNavBtn = document.getElementById('nav-host-btn');
  const hostHeroBtn = document.getElementById('hero-host-btn');
  const hostCloseBtn = document.getElementById('host-modal-close');
  const hostOverlay = document.getElementById('host-modal-overlay');

  if (hostNavBtn) hostNavBtn.addEventListener('click', openHostModal);
  if (hostHeroBtn) hostHeroBtn.addEventListener('click', openHostModal);
  if (hostCloseBtn) hostCloseBtn.addEventListener('click', closeHostModal);
  if (hostOverlay) hostOverlay.addEventListener('click', closeHostModal);

  // Host Form Submit
  const hostForm = document.getElementById('host-registration-form');
  if (hostForm) {
    hostForm.addEventListener('submit', handleHostSubmit);
  }

  // Booking Modal Close
  const bookingCloseBtn = document.getElementById('booking-modal-close');
  const bookingOverlay = document.getElementById('booking-modal-overlay');
  if (bookingCloseBtn) bookingCloseBtn.addEventListener('click', closeStayModal);
  if (bookingOverlay) bookingOverlay.addEventListener('click', closeStayModal);

  const stayBookingForm = document.getElementById('stay-booking-form');
  if (stayBookingForm) {
    stayBookingForm.addEventListener('submit', handleStayBookingSubmit);
  }

  // Experience Modal Close
  const expCloseBtn = document.getElementById('exp-modal-close');
  const expOverlay = document.getElementById('exp-modal-overlay');
  if (expCloseBtn) expCloseBtn.addEventListener('click', closeExpModal);
  if (expOverlay) expOverlay.addEventListener('click', closeExpModal);

  const expBookingForm = document.getElementById('exp-booking-form');
  if (expBookingForm) {
    expBookingForm.addEventListener('submit', handleExpBookingSubmit);
  }

  // Checkout Button
  const checkoutBtn = document.getElementById('cart-checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', handleCheckout);
  }
}

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' });
  }
}

function renderAll() {
  const t = translations[currentLang];

  // Language Toggle Button Text
  const langToggleBtn = document.getElementById('lang-toggle-btn');
  if (langToggleBtn) {
    langToggleBtn.innerHTML = `
      <span class="flex items-center gap-1 font-bold text-xs">
        <svg class="w-4 h-4 text-[#8D2B18]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016 12c-2.433 0-4.71-.532-6.75-1.488M12 21a9 9 0 100-18 9 9 0 000 18z"></path></svg>
        ${currentLang === 'hi' ? 'English' : 'हिंदी'}
      </span>
    `;
  }

  // Update i18n text attributes
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key]) {
      if (key === 'heroTitle') {
        el.innerHTML = t[key];
      } else {
        el.textContent = t[key];
      }
    }
  });

  // Placeholder updates
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (t[key]) {
      el.placeholder = t[key];
    }
  });

  // Render components
  renderVillages();
  renderBazaar();
  renderExperiences();
  renderStories();
  updateCartBadge();
}

function renderVillages() {
  const container = document.getElementById('villages-grid');
  if (!container) return;

  const t = translations[currentLang];

  const filtered = villageStays.filter(v => {
    const matchesCategory = currentFilter === 'all' || v.category === currentFilter;
    const nameMatch = v.name[currentLang].toLowerCase().includes(searchQuery);
    const locMatch = v.location[currentLang].toLowerCase().includes(searchQuery);
    const descMatch = v.description[currentLang].toLowerCase().includes(searchQuery);
    return matchesCategory && (nameMatch || locMatch || descMatch);
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-16 text-center text-stone-600 bg-[#F5EAD4]/80 rounded-3xl border-2 border-dashed border-[#D49B28]">
        <svg class="w-12 h-12 mx-auto text-[#8D2B18]/60 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
        <p class="text-lg font-bold font-poster text-[#8D2B18]">${currentLang === 'hi' ? 'कोई गांव या होमस्टे नहीं मिला।' : 'No villages found matching your search.'}</p>
        <p class="text-xs font-semibold text-stone-600 mt-1">${currentLang === 'hi' ? 'कृपया अन्य राज्य या फ़िल्टर का चयन करें।' : 'Try searching for Rajasthan, Himachal, or Kerala.'}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(v => `
    <div class="bg-[#FDF8EE] rounded-3xl overflow-hidden border-2 border-[#D49B28]/60 shadow-md card-hover poster-card flex flex-col justify-between">
      <div>
        <div class="relative h-60 overflow-hidden border-b-2 border-[#D49B28]/40">
          <img src="${v.image}" alt="${v.name[currentLang]}" class="w-full h-full object-cover transition-transform duration-700 hover:scale-105" />
          <div class="absolute top-3 left-3 bg-[#12261D]/90 backdrop-blur-xs text-amber-200 text-[11px] px-3 py-1 rounded-full font-bold flex items-center gap-1 border border-[#D49B28]">
            📍 ${v.location[currentLang]}
          </div>
          <div class="stamp-seal absolute top-3 right-3 text-xs px-3 py-1 rounded-full flex items-center gap-1">
            ★ ${v.rating} <span class="text-amber-100 font-normal">(${v.reviewsCount})</span>
          </div>
        </div>

        <div class="p-5">
          <div class="flex flex-wrap gap-1.5 mb-3">
            ${v.tags.map(tag => `
              <span class="bg-[#8D2B18] text-amber-100 text-[11px] px-2.5 py-0.5 rounded-md font-bold border border-[#D49B28]/40">
                ${tag[currentLang]}
              </span>
            `).join('')}
          </div>

          <h3 class="text-xl font-black text-stone-900 mb-1.5 font-poster">${v.name[currentLang]}</h3>
          <p class="text-stone-700 text-xs line-clamp-2 mb-4 leading-relaxed font-semibold">${v.description[currentLang]}</p>

          <div class="border-t border-[#D49B28]/30 pt-3 flex items-center justify-between text-xs text-stone-600">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-full bg-[#8D2B18] text-amber-200 border border-[#D49B28] flex items-center justify-center font-black text-xs">
                ${v.hostName[currentLang].charAt(0)}
              </div>
              <div>
                <p class="font-bold text-stone-900">${v.hostName[currentLang]}</p>
                <p class="text-stone-500 text-[10px] font-medium">${v.hostRole[currentLang]}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="px-5 pb-5 pt-2 border-t border-[#D49B28]/20 flex items-center justify-between bg-[#F5EAD4]/40">
        <div>
          <span class="text-2xl font-black text-[#8D2B18] font-poster">₹${v.price}</span>
          <span class="text-[11px] text-stone-600 font-bold">${t.perNight}</span>
        </div>
        <button onclick="openStayModal('${v.id}')" class="bg-[#8D2B18] hover:bg-[#6D1E0E] text-amber-100 text-xs font-black px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1 border border-[#D49B28]">
          ${t.viewDetails}
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
        </button>
      </div>
    </div>
  `).join('');
}

function renderBazaar() {
  const container = document.getElementById('bazaar-grid');
  if (!container) return;

  const t = translations[currentLang];

  container.innerHTML = artisanProducts.map(p => {
    const inCartItem = cart.find(ci => ci.product.id === p.id);

    return `
      <div class="bg-[#FDF8EE] rounded-2xl overflow-hidden border-2 border-[#D49B28]/50 shadow-sm card-hover poster-card flex flex-col justify-between">
        <div>
          <div class="relative h-48 overflow-hidden bg-stone-100 border-b border-[#D49B28]/30">
            <img src="${p.image}" alt="${p.name[currentLang]}" class="w-full h-full object-cover transition-transform duration-700 hover:scale-105" />
            <div class="absolute top-2.5 left-2.5 bg-[#1B382B] text-amber-200 text-[10px] font-bold px-2.5 py-0.5 rounded-md border border-[#D49B28]">
              ✨ ${p.badge[currentLang]}
            </div>
          </div>

          <div class="p-4">
            <h4 class="text-sm font-black text-stone-900 mb-1 font-poster line-clamp-1">${p.name[currentLang]}</h4>
            <p class="text-xs text-stone-600 mb-3 flex items-center gap-1 font-semibold">
              <span>🧑‍🎨</span> ${p.artisan[currentLang]}
            </p>
          </div>
        </div>

        <div class="p-4 pt-0 flex items-center justify-between border-t border-[#D49B28]/20 bg-[#F5EAD4]/30">
          <div>
            <span class="text-lg font-black text-[#8D2B18] font-poster">₹${p.price}</span>
            <span class="text-xs text-stone-400 line-through ml-1">₹${p.originalPrice}</span>
          </div>

          ${inCartItem ? `
            <div class="flex items-center gap-2 bg-[#8D2B18] text-amber-100 px-3 py-1 rounded-xl border border-[#D49B28]">
              <button onclick="updateCartQty('${p.id}', -1)" class="font-black text-sm hover:text-white">-</button>
              <span class="text-xs font-extrabold px-1">${inCartItem.quantity}</span>
              <button onclick="updateCartQty('${p.id}', 1)" class="font-black text-sm hover:text-white">+</button>
            </div>
          ` : `
            <button onclick="addToCart('${p.id}')" class="bg-[#8D2B18] hover:bg-[#6D1E0E] text-amber-100 text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center gap-1 border border-[#D49B28]">
              🛒 ${t.addToCart}
            </button>
          `}
        </div>
      </div>
    `;
  }).join('');
}

function renderExperiences() {
  const container = document.getElementById('experiences-grid');
  if (!container) return;

  const t = translations[currentLang];

  container.innerHTML = villageExperiences.map(e => `
    <div class="bg-[#FDF8EE] rounded-2xl overflow-hidden border-2 border-[#D49B28]/50 shadow-sm card-hover poster-card flex flex-col justify-between">
      <div>
        <div class="relative h-44 overflow-hidden border-b border-[#D49B28]/30">
          <img src="${e.image}" alt="${e.title[currentLang]}" class="w-full h-full object-cover transition-transform duration-700 hover:scale-105" />
          <div class="absolute bottom-2 left-2 bg-[#12261D]/90 text-amber-200 text-[11px] px-2.5 py-1 rounded-md font-bold border border-[#D49B28]">
            ⏱️ ${e.duration[currentLang]}
          </div>
        </div>

        <div class="p-4">
          <h4 class="text-base font-black text-stone-900 mb-2 font-poster">${e.title[currentLang]}</h4>
          <p class="text-stone-700 text-xs leading-relaxed mb-3 line-clamp-3 font-semibold">${e.desc[currentLang]}</p>
        </div>
      </div>

      <div class="px-4 pb-4 pt-0 flex items-center justify-between">
        <div>
          <span class="text-lg font-black text-[#8D2B18] font-poster">₹${e.price}</span>
          <span class="text-[11px] text-stone-500 font-bold">/ व्यक्ति</span>
        </div>
        <button onclick="openExpModal('${e.id}')" class="border-2 border-[#8D2B18] text-[#8D2B18] hover:bg-[#8D2B18] hover:text-amber-100 text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all">
          ${t.bookExperience}
        </button>
      </div>
    </div>
  `).join('');
}

function renderStories() {
  const container = document.getElementById('stories-grid');
  if (!container) return;

  container.innerHTML = villageStories.map(s => `
    <div class="bg-[#1B382B] rounded-2xl p-4 border border-[#D49B28]/50 shadow-sm flex items-center gap-4 hover:border-[#D49B28] transition-all">
      <img src="${s.image}" alt="${s.speaker[currentLang]}" class="w-16 h-16 rounded-xl object-cover border-2 border-[#D49B28]" />
      <div class="flex-1">
        <div class="flex items-center justify-between text-xs text-amber-300 font-bold mb-1">
          <span>${s.speaker[currentLang]}</span>
          <span class="text-amber-100/60 font-semibold">📍 ${s.village[currentLang]}</span>
        </div>
        <h5 class="text-xs font-bold text-amber-100 font-heading line-clamp-1 mb-2.5">${s.title[currentLang]}</h5>
        <div class="flex items-center gap-2">
          <button onclick="playAudioStory('${s.id}')" class="bg-[#8D2B18] text-amber-100 text-[11px] px-3 py-1 rounded-full font-bold flex items-center gap-1 hover:bg-[#6D1E0E] border border-[#D49B28]">
            ▶ ${currentLang === 'hi' ? 'कहानी सुनें' : 'Listen Story'} (${s.audioLength})
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function playAudioStory(id) {
  const story = villageStories.find(s => s.id === id);
  if (story) {
    showToast(currentLang === 'hi' ? `ऑडियो चल रहा है: ${story.speaker.hi}` : `Playing audio story from ${story.speaker.en}`);
  }
}

// Cart Functions
function addToCart(productId) {
  const product = artisanProducts.find(p => p.id === productId);
  if (!product) return;

  const existing = cart.find(item => item.product.id === productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ product, quantity: 1 });
  }

  renderBazaar();
  updateCartBadge();
  renderCartDrawer();
  showToast(currentLang === 'hi' ? `${product.name.hi} टोकरी में जोड़ा गया!` : `${product.name.en} added to basket!`);
}

function updateCartQty(productId, delta) {
  const item = cart.find(ci => ci.product.id === productId);
  if (!item) return;

  item.quantity += delta;
  if (item.quantity <= 0) {
    cart = cart.filter(ci => ci.product.id !== productId);
  }

  renderBazaar();
  updateCartBadge();
  renderCartDrawer();
}

function updateCartBadge() {
  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const badge = document.getElementById('cart-count-badge');
  if (badge) {
    if (totalCount > 0) {
      badge.textContent = totalCount;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }
}

function toggleCartDrawer() {
  const drawer = document.getElementById('cart-drawer');
  const overlay = document.getElementById('cart-overlay');
  if (drawer && overlay) {
    drawer.classList.toggle('translate-x-full');
    overlay.classList.toggle('hidden');
    renderCartDrawer();
  }
}

function renderCartDrawer() {
  const container = document.getElementById('cart-items-container');
  const totalEl = document.getElementById('cart-total-amount');
  const t = translations[currentLang];

  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="py-12 text-center text-stone-600 font-semibold">
        <svg class="w-12 h-12 mx-auto text-stone-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
        <p class="text-xs font-bold font-poster">${t.cartEmpty}</p>
      </div>
    `;
    if (totalEl) totalEl.textContent = '₹0';
    return;
  }

  let grandTotal = 0;

  container.innerHTML = cart.map(item => {
    const itemTotal = item.product.price * item.quantity;
    grandTotal += itemTotal;

    return `
      <div class="flex items-center justify-between bg-[#F5EAD4] p-3 rounded-xl border border-[#D49B28]">
        <img src="${item.product.image}" class="w-12 h-12 object-cover rounded-lg border border-[#D49B28]" alt="" />
        <div class="flex-1 mx-3">
          <p class="text-xs font-black text-stone-900 line-clamp-1 font-poster">${item.product.name[currentLang]}</p>
          <p class="text-xs text-[#8D2B18] font-bold">₹${item.product.price} x ${item.quantity}</p>
        </div>
        <div class="flex items-center gap-1 bg-[#8D2B18] text-amber-100 rounded-lg px-2 py-0.5 border border-[#D49B28]">
          <button onclick="updateCartQty('${item.product.id}', -1)" class="text-xs font-black px-1">-</button>
          <span class="text-xs font-bold px-1">${item.quantity}</span>
          <button onclick="updateCartQty('${item.product.id}', 1)" class="text-xs font-black px-1">+</button>
        </div>
      </div>
    `;
  }).join('');

  if (totalEl) totalEl.textContent = `₹${grandTotal}`;
}

function handleCheckout() {
  if (cart.length === 0) return;
  const t = translations[currentLang];
  cart = [];
  renderBazaar();
  updateCartBadge();
  renderCartDrawer();
  toggleCartDrawer();
  alert(t.checkoutSuccess);
}

// Stay Modal Functions
function openStayModal(stayId) {
  const stay = villageStays.find(v => v.id === stayId);
  if (!stay) return;
  selectedStay = stay;

  const modal = document.getElementById('stay-modal');
  const content = document.getElementById('stay-modal-content');
  if (!modal || !content) return;

  const t = translations[currentLang];

  content.innerHTML = `
    <div class="relative h-64 sm:h-80 rounded-2xl overflow-hidden mb-6 border-2 border-[#D49B28]">
      <img src="${stay.image}" class="w-full h-full object-cover" alt="${stay.name[currentLang]}" />
      <div class="absolute bottom-3 left-3 bg-[#12261D]/90 text-amber-200 text-xs px-3 py-1.5 rounded-full backdrop-blur-md border border-[#D49B28] font-bold">
        📍 ${stay.location[currentLang]}
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
      <h2 class="text-2xl font-black text-[#8D2B18] font-poster">${stay.name[currentLang]}</h2>
      <div class="text-xl font-black text-[#8D2B18] font-poster">₹${stay.price} <span class="text-xs font-normal text-stone-600">${t.perNight}</span></div>
    </div>

    <p class="text-stone-700 text-xs sm:text-sm leading-relaxed mb-6 font-semibold">${stay.description[currentLang]}</p>

    <div class="bg-[#F5EAD4] border-2 border-[#D49B28] rounded-2xl p-4 mb-6">
      <h4 class="text-xs font-black uppercase tracking-wider text-[#8D2B18] mb-2 font-poster">${currentLang === 'hi' ? 'विशेष अनुभव & खासियतें' : 'Key Highlights'}</h4>
      <ul class="space-y-1.5 text-xs text-stone-800 font-bold">
        ${stay.highlights.map(h => `<li class="flex items-center gap-2"><span class="text-[#8D2B18]">✓</span> ${h[currentLang]}</li>`).join('')}
      </ul>
    </div>
  `;

  document.getElementById('stay-modal-price').textContent = `₹${stay.price}`;
  modal.classList.remove('hidden');
}

function closeStayModal() {
  const modal = document.getElementById('stay-modal');
  if (modal) modal.classList.add('hidden');
}

function handleStayBookingSubmit(e) {
  e.preventDefault();
  const t = translations[currentLang];
  closeStayModal();
  alert(t.bookingSuccess);
}

// Experience Modal Functions
function openExpModal(expId) {
  const exp = villageExperiences.find(e => e.id === expId);
  if (!exp) return;
  selectedExperience = exp;

  const modal = document.getElementById('exp-modal');
  const titleEl = document.getElementById('exp-modal-title');
  const descEl = document.getElementById('exp-modal-desc');
  const priceEl = document.getElementById('exp-modal-price');

  if (titleEl) titleEl.textContent = exp.title[currentLang];
  if (descEl) descEl.textContent = exp.desc[currentLang];
  if (priceEl) priceEl.textContent = `₹${exp.price}`;

  if (modal) modal.classList.remove('hidden');
}

function closeExpModal() {
  const modal = document.getElementById('exp-modal');
  if (modal) modal.classList.add('hidden');
}

function handleExpBookingSubmit(e) {
  e.preventDefault();
  closeExpModal();
  showToast(currentLang === 'hi' ? 'अनुभव बुकिंग की पुष्टि हो गई है!' : 'Experience booking confirmed!');
}

// Host Onboarding Modal
function openHostModal() {
  const modal = document.getElementById('host-modal');
  if (modal) modal.classList.remove('hidden');
}

function closeHostModal() {
  const modal = document.getElementById('host-modal');
  if (modal) modal.classList.add('hidden');
}

async function handleHostSubmit(e) {
  e.preventDefault();
  const formData = new FormData(e.target);

  try {
    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (data.success) {
      closeHostModal();
      document.getElementById('successModal').classList.remove('hidden');
      document.getElementById('successModal').classList.add('flex');
      e.target.reset();
    } else {
      alert('Kuch dikkat aayi, kripya dobara try karein.');
    }
  } catch (error) {
    alert('Network issue. Kripya apna internet check karein.');
  }
}
// Chaupal Firebase Functions
      function handleFirebasePhotoPost(e) {
        e.preventDefault();
        const author = document.getElementById('storyAuthor').value;
        const location = document.getElementById('storyLocation').value;
        const text = document.getElementById('storyText').value;
        const fileInput = document.getElementById('storyPhotoFile');

        if (fileInput.files && fileInput.files[0]) {
          const reader = new FileReader();
          reader.onload = async function(uploadEvent) {
            const base64Image = uploadEvent.target.result;
            await saveToFirebaseDB(author, location, text, base64Image);
          };
          reader.readAsDataURL(fileInput.files[0]);
        } else {
          saveToFirebaseDB(author, location, text, null);
        }
      }

      async function saveToFirebaseDB(author, location, text, photo) {
        try {
          await window.addDoc(window.collection(window.db, "chaupal_posts"), {
            author: author,
            location: location,
            text: text,
            photo: photo,
            createdAt: window.serverTimestamp()
          });

          alert('Story & Photo published live globally for everyone!');
          closeModal('addStoryModal');
          document.getElementById('chaupalPostForm').reset();
          loadFirebasePhotoStories();
        } catch (error) {
          console.error("Error saving: ", error);
          alert('Error publishing. Please try again.');
        }
      }

      async function loadFirebasePhotoStories() {
        const container = document.getElementById('chaupalFeedContainer');
        if(!container) return;

        try {
          const querySnapshot = await window.getDocs(window.collection(window.db, "chaupal_posts"));
          let htmlContent = "";
          
          if(querySnapshot.empty) {
            container.innerHTML = `<div class="bg-white p-4 rounded-2xl border border-slate-200 text-center text-xs text-slate-500 font-medium">No stories shared yet. Be the first one!</div>`;
            return;
          }

          querySnapshot.forEach((doc) => {
            const s = doc.data();
            htmlContent += `
              <div class="bg-white p-4 rounded-2xl border border-slate-200 custom-shadow space-y-2.5">
                <div class="flex justify-between items-start">
                  <div>
                    <h4 class="font-extrabold text-slate-900 text-sm">${s.author}</h4>
                    <p class="text-[11px] text-amber-700 font-bold">📍 ${s.location}</p>
                  </div>
                  <span class="text-[10px] text-slate-400 font-medium">Global Live</span>
                </div>
                <p class="text-xs text-slate-700 leading-relaxed font-medium">${s.text}</p>
                ${s.photo ? `<div class="mt-2"><img src="${s.photo}" class="rounded-xl max-h-48 w-full object-cover border border-slate-100 shadow-sm" /></div>` : ''}
              </div>
            `;
          });
          container.innerHTML = htmlContent;
        } catch (err) {
          console.error("Error loading feed:", err);
        }
      }

      // Page load hote hi stories load karne ke liye
      window.addEventListener('DOMContentLoaded', () => {
        loadFirebasePhotoStories();
      });
// Helper Toast Notification
function showToast(message) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'bg-[#8D2B18] text-amber-100 text-xs font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-poster-toast border-2 border-[#D49B28]';
  toast.innerHTML = `
    <span class="text-amber-300">🌾</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3500);
}
