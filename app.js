// app.js
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
  runTransaction,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import { db } from "./firebase-config.js";

const IMGBB_API_KEY = "e84ab1cea009540780712f8c85910840";

const $ = (id) => document.getElementById(id);

const GUEST_UID_KEY = "villagedeko_guest_uid";
function getGuestUid() {
  let uid = localStorage.getItem(GUEST_UID_KEY);
  if (!uid) {
    uid = "guest_" + crypto.randomUUID();
    localStorage.setItem(GUEST_UID_KEY, uid);
  }
  return uid;
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function openModal(id) {
  const modal = $(id);
  if (modal) modal.classList.add("is-open");
}

function closeModal(id) {
  const modal = $(id);
  if (modal) modal.classList.remove("is-open");
}

function switchTab(tabId) {
  document.querySelectorAll(".tab-content").forEach(el => el.classList.add("hidden"));
  const active = $("tab-" + tabId);
  if (active) active.classList.remove("hidden");

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.remove("bg-amber-600", "text-white");
    btn.classList.add("text-slate-700");
  });

  const activeBtn = document.querySelector(`[data-tab="${tabId}"]`);
  if (activeBtn) {
    activeBtn.classList.add("bg-amber-600", "text-white");
    activeBtn.classList.remove("text-slate-700");
  }
}

async function logout() {
  await signOut(auth);
}

async function uploadToImgBB(file) {
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch(
    `https://api.imgbb.com/1/upload?key=${encodeURIComponent(IMGBB_API_KEY)}`,
    { method: "POST", body: formData }
  );

  if (!response.ok) {
    throw new Error("Image upload request failed.");
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error("ImgBB upload failed.");
  }

  return data.data.url;
}

async function handleImgBBPhotoPost(event) {
  event.preventDefault();

  const button = $("submitBtn");
  button.disabled = true;
  button.textContent = "Publishing...";

  try {
    const file = $("storyImageFile").files?.[0];
    let imageUrl = "";

    if (file) {
      imageUrl = await uploadToImgBB(file);
    }

    await addDoc(collection(db, "posts"), {
      uid: getGuestUid(),
      author: $("storyAuthor").value.trim(),
      location: $("storyLocation").value.trim(),
      text: $("storyText").value.trim(),
      imageUrl,
      likes: 0,
      createdAt: serverTimestamp()
    });

    $("chaupalPostForm").reset();
    closeModal("addStoryModal");
    await loadChaupalPosts();
    alert("Story successfully published.");
  } catch (error) {
    alert("Upload failed: " + error.message);
  } finally {
    button.disabled = false;
    button.textContent = "Publish Story";
  }
}

async function handleVillageListing(event) {
  event.preventDefault();

  const button = $("listSubmitBtn");
  button.disabled = true;
  button.textContent = "Publishing...";

  try {
    const files = [...($("villageGalleryFiles").files || [])];
    const imageUrls = [];

    for (const file of files) {
      imageUrls.push(await uploadToImgBB(file));
    }

    await addDoc(collection(db, "villagesListings"), {
      uid: getGuestUid(),
      hostName: $("hostName").value.trim(),
      hostWhatsapp: $("hostWhatsapp").value.trim(),
      vName: $("vName").value.trim(),
      vDistrict: $("vDistrict").value.trim(),
      vState: $("vState").value.trim(),
      vDescription: $("vDescription").value.trim(),
      packageName: $("packageName").value.trim(),
      packagePrice: $("packagePrice").value.trim(),
      images: imageUrls,
      likes: 0,
      createdAt: serverTimestamp()
    });

    $("listVillageForm").reset();
    closeModal("listVillageModal");
    await loadVillagesListings();
    alert("Village listing published successfully.");
  } catch (error) {
    alert("Listing failed: " + error.message);
  } finally {
    button.disabled = false;
    button.textContent = "Publish Village & Stay Live";
  }
}

async function loadChaupalPosts() {
  const container = $("chaupalFeedContainer");
  if (!container) return;

  try {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      container.innerHTML =
        `<p class="text-xs text-slate-500 text-center py-4">Abhi koi story nahi hai.</p>`;
      return;
    }

    container.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const id = docSnap.id;

      const card = document.createElement("div");
      card.className = "bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-3";

      card.innerHTML = `
        <div>
          <h4 class="font-extrabold text-slate-900 text-xs">${esc(data.author || "Anonymous")}</h4>
          <p class="text-[10px] text-slate-500">📍 ${esc(data.location || "Village")}</p>
        </div>

        <p class="text-xs text-slate-700 leading-relaxed">${esc(data.text)}</p>

        ${data.imageUrl ? `<img src="${esc(data.imageUrl)}" class="post-image" alt="Village Story">` : ""}

        <div class="flex items-center justify-between border-t border-slate-100 pt-3">
          <button onclick="handleLike('${id}', 'posts')" class="text-xs font-bold text-slate-600">
            ❤️ <span id="likes-count-${id}">${Number(data.likes || 0)}</span>
          </button>

          <div class="flex gap-2">
            <button onclick="handleEdit('${id}', 'posts')" class="text-blue-600 text-xs px-2 py-1 bg-blue-50 rounded font-bold">Edit</button>
            <button onclick="handleDelete('${id}', 'posts')" class="text-red-600 text-xs px-2 py-1 bg-red-50 rounded font-bold">Delete</button>
          </div>
        </div>
      `;

      container.appendChild(card);
    });
  } catch (error) {
    console.error(error);
    container.innerHTML =
      `<p class="text-xs text-red-500 text-center py-4">Stories load nahi ho pa rahi.</p>`;
  }
}

const slideState = new Map();

async function loadVillagesListings() {
  const container = $("villagesFeedContainer");
  if (!container) return;

  try {
    const q = query(collection(db, "villagesListings"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      container.innerHTML =
        `<p class="text-xs text-slate-500 text-center py-4">Abhi koi village listed nahi hai.</p>`;
      return;
    }

    container.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const id = docSnap.id;
      const images = Array.isArray(data.images) ? data.images : [];

      slideState.set(id, 0);

      const imagesHtml = images.length
        ? images.map((url, index) => `
            <div data-slide="${id}" data-index="${index}" class="${index === 0 ? "" : "hidden"}">
              <img src="${esc(url)}" class="post-image" alt="Village Image">
            </div>
          `).join("")
        : `<div class="p-10 text-center text-xs text-slate-500">No image</div>`;

      const card = document.createElement("div");
      card.className = "bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-3";

      card.innerHTML = `
        <div>
          <h4 class="font-extrabold text-slate-900 text-sm">
            ${esc(data.vName)}, ${esc(data.vDistrict)} (${esc(data.vState)})
          </h4>
          <p class="text-[10px] text-slate-500">Host: ${esc(data.hostName)}</p>
        </div>

        <div class="relative overflow-hidden rounded-xl bg-slate-100">
          ${imagesHtml}
          ${images.length > 1 ? `
            <button onclick="changeSlide('${id}', -1)" class="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 text-white px-3 py-2 rounded-full">‹</button>
            <button onclick="changeSlide('${id}', 1)" class="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 text-white px-3 py-2 rounded-full">›</button>
          ` : ""}
        </div>

        <p class="text-xs text-slate-700 leading-relaxed">${esc(data.vDescription)}</p>

        <div class="flex justify-between text-xs font-bold text-amber-700 bg-amber-50 p-2.5 rounded-xl">
          <span>🏠 ${esc(data.packageName || "Village Stay")}</span>
          <span>₹${esc(data.packagePrice || "0")}/night</span>
        </div>

        <div class="flex justify-between border-t border-slate-100 pt-3">
          <button onclick="handleLike('${id}', 'villagesListings')" class="text-xs font-bold text-slate-600">
            ❤️ <span id="likes-count-${id}">${Number(data.likes || 0)}</span>
          </button>

          <div class="flex gap-2">
            <button onclick="handleEdit('${id}', 'villagesListings')" class="text-blue-600 text-xs px-2 py-1 bg-blue-50 rounded font-bold">Edit</button>
            <button onclick="handleDelete('${id}', 'villagesListings')" class="text-red-600 text-xs px-2 py-1 bg-red-50 rounded font-bold">Delete</button>
          </div>
        </div>
      `;

      container.appendChild(card);
    });
  } catch (error) {
    console.error(error);
    container.innerHTML =
      `<p class="text-xs text-red-500 text-center py-4">Villages load nahi ho pa rahe.</p>`;
  }
}

function changeSlide(id, direction) {
  const slides = [...document.querySelectorAll(`[data-slide="${id}"]`)];
  if (!slides.length) return;

  let current = slideState.get(id) || 0;
  current += direction;

  if (current < 0) current = slides.length - 1;
  if (current >= slides.length) current = 0;

  slides.forEach(slide => slide.classList.add("hidden"));
  slides[current].classList.remove("hidden");
  slideState.set(id, current);
}

async function handleLike(id, collectionName) {
  try {
    const ref = doc(db, collectionName, id);

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ref);
      if (!snap.exists()) throw new Error("Item not found.");

      const likes = Number(snap.data().likes || 0);
      transaction.update(ref, { likes: likes + 1 });
    });

    if (collectionName === "posts") {
      await loadChaupalPosts();
    } else {
      await loadVillagesListings();
    }
  } catch (error) {
    console.error(error);
  }
}

async function handleEdit(id, collectionName) {
  const field = collectionName === "posts" ? "text" : "vDescription";
  const ref = doc(db, collectionName, id);
  const snap = await getDoc(ref);

  if (!snap.exists()) return;

  const current = snap.data()[field] || "";
  const value = prompt("Update karein:", current);

  if (value === null || !value.trim()) return;

  try {
    await updateDoc(ref, { [field]: value.trim() });

    if (collectionName === "posts") {
      await loadChaupalPosts();
    } else {
      await loadVillagesListings();
    }
  } catch (error) {
    alert("Update failed: " + error.message);
  }
}

async function handleDelete(id, collectionName) {
  if (!confirm("Kya aap sach mein delete karna chahte hain?")) return;

  try {
    await deleteDoc(doc(db, collectionName, id));

    if (collectionName === "posts") {
      await loadChaupalPosts();
    } else {
      await loadVillagesListings();
    }
  } catch (error) {
    alert("Delete failed: " + error.message);
  }
}

function handleShare(title) {
  const url = window.location.href;

  if (navigator.share) {
    navigator.share({
      title: "VillageDeko",
      text: `Check out: ${title}`,
      url
    }).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => alert("Link copied!"));
  }
}

window.openModal = openModal;
window.closeModal = closeModal;
window.switchTab = switchTab;
window.handleImgBBPhotoPost = handleImgBBPhotoPost;
window.handleVillageListing = handleVillageListing;
window.changeSlide = changeSlide;
window.handleLike = handleLike;
window.handleEdit = handleEdit;
window.handleDelete = handleDelete;
window.handleShare = handleShare;

document.querySelectorAll(".modal").forEach(modal => {
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      modal.classList.remove("is-open");
    }
  });
});

getGuestUid();

await Promise.all([
  loadChaupalPosts(),
  loadVillagesListings()
]);
