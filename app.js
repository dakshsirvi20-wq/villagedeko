// Village Deko Application Logic - Poster Theme Enabled

let currentLang = 'hi';
let currentFilter = 'all';
let searchQuery = '';
let cart = []; // Array of { product, quantity }
let selectedStay = null;
let selectedExperience = null;

// Mock Data Arrays to prevent undefined errors
const translations = {
    hi: {
        perNight: "/ رات",
        viewDetails: "विवरण देखें",
        addToCart: "टोकरी में डालें",
        bookExperience: "अनुभव बुक करें",
        cartEmpty: "आपकी टोकरी खाली है",
        checkoutSuccess: "ऑर्डर सफलतापूर्वक प्लेस हो गया है!"
    },
    en: {
        perNight: "/ night",
        viewDetails: "View Details",
        addToCart: "Add to Basket",
        bookExperience: "Book Experience",
        cartEmpty: "Your basket is empty",
        checkoutSuccess: "Order placed successfully!"
    }
};

const villageStays = [
    {
        id: "stay-1",
        category: "heritage",
        name: { hi: "सिणरी हेरिटेज होमस्टे", en: "Sivri Heritage Homestay" },
        location: { hi: "सिणरी, पाली, राजस्थान", en: "Sivri, Pali, Rajasthan" },
        description: { hi: "असली गांव और संस्कृति का संगम, जहां आपको पारंपरिक राजस्थानी जीवनशैली का अनुभव मिलेगा।", en: "The confluence of real village and culture, offering authentic Rajasthani lifestyle." },
        price: 1200,
        rating: 4.9,
        reviewsCount: 28,
        image: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80",
        tags: [{ hi: "पारंपरिक", en: "Traditional" }, { hi: "जैविक भोजन", en: "Organic Food" }],
        hostName: { hi: "जगदीश सिंह", en: "Jagdish Singh" },
        hostRole: { hi: "गाँव के मुखिया और होस्ट", en: "Village Host & Guide" },
        highlights: [{ hi: "देसी चूल्हे का खाना", en: "Desi chulha food" }, { hi: "ऊंट की सवारी", en: "Camel safari" }]
    }
];

const artisanProducts = [
    {
        id: "prod-1",
        name: { hi: "शुद्ध ऑर्गेनिक सरसों का तेल", en: "Pure Organic Mustard Oil" },
        artisan: { hi: "पारिवारिक खेत, पाली", en: "Family Farm, Pali" },
        price: 180,
        originalPrice: 220,
        badge: { hi: "शुद्ध देसी", en: "100% Pure" },
        image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80"
    }
];

const villageExperiences = [
    {
        id: "exp-1",
        title: { hi: "पारंपरिक कुम्हार कला कार्यशाला", en: "Traditional Pottery Workshop" },
        desc: { hi: "हाथों से चाक पर मिट्टी के बर्तन बनाना सीखें स्थानीय कलाकारों के साथ।", en: "Learn pottery making on wheel with local master artisans." },
        price: 350,
        duration: { hi: "2 घंटे", en: "2 Hours" },
        image: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=600&q=80"
    }
];

const villageStories = [
    {
        id: "story-1",
        speaker: { hi: "सोहन लाल", en: "Sohan Lal" },
        village: { hi: "सिणरी, पाली", en: "Sivri, Pali" },
        title: { hi: "हमारे गांव की पुरानी बावड़ी की कहानी", en: "The tale of our village stepwell" },
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
        audioLength: "1:45"
    }
];

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    setupEventListeners();
    renderAll();
}

function setupEventListeners() {
    const langToggleBtn = document.getElementById('lang-toggle-btn');
    if (langToggleBtn) {
        langToggleBtn.addEventListener('click', () => {
            currentLang = currentLang === 'hi' ? 'en' : 'hi';
            renderAll();
        });
    }

    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileNav = document.getElementById('mobile-nav');
    if (mobileMenuBtn && mobileNav) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileNav.classList.toggle('hidden');
        });
    }

    const heroSearchInput = document.getElementById('hero-search-input');
    if (heroSearchInput) {
        heroSearchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase().trim();
            renderVillages();
        });
    }

    const hostNavBtn = document.getElementById('nav-host-btn');
    const hostCloseBtn = document.getElementById('host-modal-close');
    const hostOverlay = document.getElementById('host-modal-overlay');

    if (hostNavBtn) hostNavBtn.addEventListener('click', openHostModal);
    if (hostCloseBtn) hostCloseBtn.addEventListener('click', closeHostModal);
    if (hostOverlay) hostOverlay.addEventListener('click', closeHostModal);

    const hostForm = document.getElementById('host-registration-form');
    if (hostForm) {
        hostForm.addEventListener('submit', handleHostSubmit);
    }
}

function renderAll() {
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
    container.innerHTML = villageStays.map(v => `
        <div class="bg-[#FDF8EE] rounded-3xl overflow-hidden border-2 border-[#D49B28]/60 shadow-md p-4">
            <h3 class="text-xl font-black text-stone-900 mb-1.5 font-poster">${v.name[currentLang]}</h3>
            <p class="text-stone-700 text-xs mb-4">${v.description[currentLang]}</p>
            <button onclick="openStayModal('${v.id}')" class="bg-[#8D2B18] text-amber-100 text-xs font-black px-4 py-2.5 rounded-xl">
                ${t.viewDetails}
            </button>
        </div>
    `).join('');
}

function renderBazaar() {
    const container = document.getElementById('bazaar-grid');
    if (!container) return;
    const t = translations[currentLang];
    container.innerHTML = artisanProducts.map(p => `
        <div class="bg-[#FDF8EE] rounded-2xl p-4 border border-[#D49B28]/50">
            <h4 class="text-sm font-black text-stone-900 mb-1">${p.name[currentLang]}</h4>
            <span class="text-lg font-black text-[#8D2B18]">₹${p.price}</span>
            <button onclick="addToCart('${p.id}')" class="mt-2 bg-[#8D2B18] text-amber-100 text-xs px-3 py-1.5 rounded-xl">🛒 ${t.addToCart}</button>
        </div>
    `).join('');
}

function renderExperiences() {
    const container = document.getElementById('experiences-grid');
    if (!container) return;
    container.innerHTML = villageExperiences.map(e => `
        <div class="bg-[#FDF8EE] rounded-2xl p-4 border border-[#D49B28]/50">
            <h4 class="text-base font-black text-stone-900 mb-2">${e.title[currentLang]}</h4>
            <span class="text-lg font-black text-[#8D2B18]">₹${e.price}</span>
        </div>
    `).join('');
}

function renderStories() {
    const container = document.getElementById('stories-grid');
    if (!container) return;
    container.innerHTML = villageStories.map(s => `
        <div class="bg-[#1B382B] rounded-2xl p-4 text-amber-100">
            <h5 class="text-xs font-bold">${s.title[currentLang]}</h5>
        </div>
    `).join('');
}

function addToCart(productId) {
    const product = artisanProducts.find(p => p.id === productId);
    if (!product) return;
    cart.push({ product, quantity: 1 });
    updateCartBadge();
    showToast(`${product.name.hi} टोकरी में जोड़ा गया!`);
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
            container.innerHTML = `<div class="bg-white p-4 rounded-2xl border text-center text-xs text-slate-500">No stories shared yet. Be the first one!</div>`;
            return;
        }

        querySnapshot.forEach((doc) => {
            const s = doc.data();
            htmlContent += `
                <div class="bg-white p-4 rounded-2xl border shadow-sm space-y-2.5">
                    <h4 class="font-extrabold text-slate-900 text-sm">${s.author} (${s.location})</h4>
                    <p class="text-xs text-slate-700">${s.text}</p>
                    ${s.photo ? `<img src="${s.photo}" class="rounded-xl max-h-48 w-full object-cover" />` : ''}
                </div>
            `;
        });
        container.innerHTML = htmlContent;
    } catch (err) {
        console.error("Error loading feed:", err);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    loadFirebasePhotoStories();
});

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
            e.target.reset();
        } else {
            alert('Kuch dikkat aayi, kripya dobara try karein.');
        }
    } catch (error) {
        alert('Network issue.');
    }
}

function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'bg-[#8D2B18] text-amber-100 text-xs font-bold px-4 py-3 rounded-xl shadow-2xl border-2 border-[#D49B28]';
    toast.innerHTML = `🌾 ${message}`;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3500);
}
