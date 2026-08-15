import {
  collection, addDoc, getDocs, getDoc, deleteDoc, doc, updateDoc,
  serverTimestamp, query, where, orderBy, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { db, auth } from "./firebase-config.js";
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from "./media-config.js";


const $ = id => document.getElementById(id);
let currentUser = null;
let villages = [];
let allPosts = [];
let currentVillage = null;
let previousView = "homeView";

const STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Andaman and Nicobar Islands","Chandigarh","Dadra and Nagar Haveli and Daman and Diu","Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry"
];

const esc = v => String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
const uid = () => currentUser?.uid || null;

function requireLogin(){
  if (!currentUser) { showLoginGate(); return false; }
  return true;
}

function showLoginGate(){
  $("appShell")?.classList.add("hidden");
  $("loginGate")?.classList.remove("hidden");
}

function showApp(){
  $("loginGate")?.classList.add("hidden");
  $("appShell")?.classList.remove("hidden");
}

function openModal(id){ const m=$(id); if(m){m.classList.add("is-open");m.classList.remove("hidden");} }
function closeModal(id){ const m=$(id); if(m){m.classList.remove("is-open");m.classList.add("hidden");} }
function openDrawer(){ if(!requireLogin())return; $("drawer")?.classList.add("is-open"); }
function closeDrawer(){ $("drawer")?.classList.remove("is-open"); }
function goHome(){ showView("homeView"); loadHome(); }
function showView(id){ ["homeView","stateView","villageView","weddingView","chaupalView"].forEach(v=>$(v)?.classList.add("hidden")); $(id)?.classList.remove("hidden"); window.scrollTo({top:0,behavior:"smooth"}); }
function openWedding(){ if(!requireLogin())return; showView("weddingView"); }
function openChaupal(){ if(!requireLogin())return; showView("chaupalView"); renderPosts(allPosts.filter(p=>p.postType==="chaupal"),$("chaupalFeedContainer")); }
function goBackFromVillage(){ showView(previousView); }

function fillStates(){
  const selects=[$("stateSelect"),$("vState"),$("wState")];
  selects.forEach(s=>{
    if(!s)return;
    const first=s.options[0];
    s.innerHTML="";
    if(first)s.appendChild(first);
    STATES.forEach(st=>{const o=document.createElement("option");o.value=st;o.textContent=st;s.appendChild(o);});
  });
  $("stateCount").textContent=STATES.length;
}

function renderStates(){
  $("statesGrid").innerHTML=STATES.map((st,i)=>`<button onclick="selectState('${esc(st)}')" class="state-card"><span class="state-emoji">${["🌴","🏜️","🏔️","🌾","🌊","🌿"][i%6]}</span><b>${esc(st)}</b><small>Explore villages →</small></button>`).join("");
}

function villageCard(v){
  const img=v.images?.[0];
  const following=currentUser && Array.isArray(v.followers) && v.followers.includes(currentUser.uid);
  return `<article class="village-card">
    <button onclick="openVillage('${esc(v.id)}')" class="w-full text-left">
      ${img?`<img src="${esc(img)}" class="village-cover" loading="lazy">`:`<div class="village-cover placeholder">🌾</div>`}
      <div class="p-4">
        <div class="flex justify-between gap-2"><div><h4 class="font-black text-sm">${esc(v.vName)}</h4><p class="text-[10px] text-slate-500">📍 ${esc(v.vDistrict)}, ${esc(v.vState)}</p></div></div>
        <p class="text-xs text-slate-600 mt-2 line-clamp-2">${esc(v.vDescription)}</p>
        <div class="flex gap-2 mt-3 text-[10px] font-bold text-slate-500"><span>🎯 ${(v.activities||[]).length} activities</span><span>📦 ${(v.packages||[]).length} packages</span><span>🏡 Stay</span></div>
      </div>
    </button>
    <div class="px-4 pb-4 flex gap-2"><button onclick="toggleFollow('${v.id}',event)" class="follow-btn ${following?'following':''}">${following?'✓ Following':'＋ Follow'}</button><button onclick="handleShare('${esc(v.vName)}',event)" class="icon-btn">↗ Share</button></div>
  </article>`;
}

function renderVillageList(list,container){
  if(!container)return;
  if(!list.length){
    container.innerHTML=`<div class="empty">Abhi koi village listed nahi hai. + List Village se pehla gaon add karein.</div>`;
    return;
  }
  container.innerHTML=list.map(v=>{
    const following=currentUser && Array.isArray(v.followers) && v.followers.includes(currentUser.uid);
    return `<div class="flex items-center gap-3 p-3 border border-slate-200 rounded-2xl bg-white hover:bg-slate-50">
      <button onclick="openVillage('${esc(v.id)}',event)" class="flex-1 min-w-0 text-left">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-xl shrink-0">🏘️</div>
          <div class="min-w-0">
            <b class="block text-sm truncate">${esc(v.vName)}</b>
            <span class="block text-[10px] text-slate-500 truncate">📍 ${esc(v.vDistrict)}, ${esc(v.vState)}</span>
            <span class="block text-[10px] text-slate-400 mt-0.5">${v.images?.length||0} photos · ${v.followers?.length||0} followers</span>
          </div>
        </div>
      </button>
      <button onclick="toggleFollow('${esc(v.id)}',event)" class="follow-btn ${following?'following':''} shrink-0">${following?'✓ Following':'＋ Follow'}</button>
    </div>`;
  }).join("");
}

function renderVillageCards(list,container){
  if(!container)return;
  container.innerHTML=list.length?list.map(villageCard).join(""):`<p class="empty">Abhi is area mein village listing nahi hai. Pehla village aap list kar sakte hain.</p>`;
}

function findVillageForPost(p){
  return villages.find(v=>v.id===p.villageId) || villages.find(v=>v.vName===p.villageName) || null;
}

function postCard(p){
  const v=findVillageForPost(p);
  const mine=!p.isGalleryPhoto && currentUser?.uid===p.ownerUid;
  const villageName=v?.vName || p.villageName || p.location || "Village";
  const district=v?.vDistrict || p.vDistrict || "";
  const state=v?.vState || p.vState || "";
  const villageButton=v ? `<button onclick="openVillage('${esc(v.id)}',event)" class="post-village-link">View ${esc(villageName)} →</button>` : "";
  return `<article class="post-card">
    <div class="post-top">
      <div class="mini-avatar">${esc((p.author||"U").charAt(0).toUpperCase())}</div>
      <div class="min-w-0"><b>${esc(p.author||"VillageDeko User")}</b><small>🏘️ <strong>${esc(villageName)}</strong>${district||state?` · 📍 ${esc(district)}${district&&state?', ':''}${esc(state)}`:""}</small></div>
      ${villageButton}
      <button onclick="handleShare('${esc(villageName)}',event)" class="ml-auto icon-btn">↗</button>
    </div>
    ${p.imageUrl?`<img src="${esc(optimizedImageUrl(p.imageUrl,900))}" data-full-src="${esc(p.imageUrl)}" class="post-photo" onclick="openImageViewer(this.dataset.fullSrc)" loading="lazy" decoding="async">`:``}
    ${p.text?`<div class="px-4 pt-3 pb-2"><p class="text-sm leading-relaxed">${esc(p.text)}</p></div>`:``}
    <div class="post-actions">
      ${p.isGalleryPhoto?``:`<><button onclick="toggleLike('${p.id}',event)">❤️ Like</button><button onclick="openComments('${p.id}')">💬 Comment</button></>`}
      <button onclick="handleShare('${esc(villageName)}',event)">↗ Share</button>
      ${mine?`<button onclick="handleEdit('${p.id}',event)" class="owner-edit">Edit</button><button onclick="handleDelete('${p.id}',event)" class="owner-delete">Delete</button>`:``}
    </div>
  </article>`;
}

function renderPosts(posts,container){
  if(!container)return;
  container.innerHTML=posts.length?posts.map(postCard).join(""):`<div class="empty">Abhi koi post nahi hai. Pehli village photo aap post kar sakte ho.</div>`;
}

async function loadHome(){
  const villagePosts=allPosts.filter(p=>p.postType!=="chaupal");
  renderVillageCards(villages,$("homeVillagesList"));
  const postsBox=$("homePostsFeed");
  if(postsBox){
    postsBox.classList.remove("hidden");
    renderPosts(villagePosts,postsBox);
  }
  $("villageCount").textContent=villages.length;
  $("postCount").textContent=allPosts.length;
}

function filterExplore(term){
  const q=String(term||"").trim().toLowerCase();
  const villagesBox=$("homeVillagesList");
  const postsBox=$("homePostsFeed");

  if(!q){
    renderVillageCards(villages,villagesBox);
    if(postsBox){
      postsBox.classList.remove("hidden");
      renderPosts(allPosts.filter(p=>p.postType!=="chaupal"),postsBox);
    }
    return;
  }

  const matchingVillages=villages.filter(v=>{
    const hay=[
      v.vName,v.vDistrict,v.vState,v.vDescription,v.hostName,
      ...(v.activities||[]).map(a=>a.name),
      ...(v.packages||[]).map(p=>p.name)
    ].filter(Boolean).join(" ").toLowerCase();
    return hay.includes(q);
  });

  const matchingPosts=allPosts.filter(p=>{
    if(p.postType==="chaupal")return false;
    const v=findVillageForPost(p);
    const hay=[
      p.text,p.story,p.caption,p.author,p.authorName,p.userName,p.location,
      p.villageName,p.vDistrict,p.vState,
      v?.vName,v?.vDistrict,v?.vState,v?.vDescription,v?.hostName
    ].filter(Boolean).join(" ").toLowerCase();
    return hay.includes(q);
  });

  renderVillageCards(matchingVillages,villagesBox);
  if(postsBox){
    postsBox.classList.remove("hidden");
    postsBox.innerHTML="";
    if(matchingPosts.length){
      renderPosts(matchingPosts,postsBox);
    }else{
      postsBox.innerHTML=`<div class="empty">Is search ke liye koi village post nahi mili.</div>`;
    }
  }
}

async function loadVillages(){
  try{
    const snap=await getDocs(collection(db,"villagesListings"));
    villages=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
  }catch(e){ console.error(e); villages=[]; }
}

async function loadAllPosts(){
  try{
    const snap=await getDocs(query(collection(db,"posts"),orderBy("createdAt","desc")));
    allPosts=snap.docs.map(d=>({id:d.id,...d.data()}));
  }catch(e){
    console.error(e);
    try{ const snap=await getDocs(collection(db,"posts")); allPosts=snap.docs.map(d=>({id:d.id,...d.data()})); }
    catch(_){ allPosts=[]; }
  }
  $("postCount").textContent=allPosts.length;
}

async function selectState(state){
  if(!state){goHome();return;}
  previousView="stateView";
  showView("stateView");
  $("stateTitle").textContent=state;
  $("stateSubtitle").textContent=`${state} ke villages, photos, stays, activities aur packages`;
  const list=villages.filter(v=>v.vState===state);
  $("stateVillageCount").textContent=list.length+" listed";
  renderVillageList(list,$("stateVillages"));
  const posts=allPosts.filter(p=>p.postType!=="chaupal").filter(p=>{const v=findVillageForPost(p);return (v?.vState||p.vState)===state;});
  renderPosts(posts,$("statePostsFeed"));
}

async function openVillage(id,event){
  event?.stopPropagation();
  currentVillage=villages.find(v=>v.id===id);
  if(!currentVillage)return;
  previousView=$("stateView")?.classList.contains("hidden")?"homeView":"stateView";
  showView("villageView");
  renderVillageHeader();
  await loadVillagePosts();
  renderVillageDetails();
  renderVillageDay();
  renderVillageFoodJourney();
  await loadVillagePeople();
  await loadVillageExplore();
  renderVillageExtras();
}

function renderVillageHeader(){
  const v=currentVillage;
  const following=currentUser && Array.isArray(v.followers) && v.followers.includes(currentUser.uid);
  $("villageHeader").innerHTML=`<div class="section-card overflow-hidden p-0"><div class="village-profile-cover">${v.images?.[0]?`<img src="${esc(v.images[0])}">`:``}<div class="cover-gradient"></div><div class="village-profile-info"><div class="avatar">🌾</div><div class="flex-1"><h2 class="text-xl font-black text-white">${esc(v.vName)}</h2><p class="text-[11px] text-white/80">📍 ${esc(v.vDistrict)}, ${esc(v.vState)}</p><p class="text-[10px] text-white/80 mt-1">${v.images?.length||0} photos · ${v.followers?.length||0} followers</p></div><button onclick="toggleFollow('${v.id}',event)" class="profile-follow ${following?'following':''}">${following?'✓ Following':'Follow'}</button></div></div></div>`;
}

async function loadVillagePosts(){
  const c=$("villageSectionFeed");
  if(!c || !currentVillage)return;
  try{
    const snap=await getDocs(query(collection(db,"posts"),where("villageId","==",currentVillage.id)));
    const posts=snap.docs
      .map(d=>({id:d.id,...d.data()}))
      .filter(p=>p.postType!=="chaupal")
      .sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));

    // Also show all photos uploaded while listing the village. The first image is the cover;
    // the remaining gallery images should appear in the village feed as well.
    const galleryImages=Array.isArray(currentVillage.images)?currentVillage.images.filter(Boolean):[];
    const galleryPosts=galleryImages.map((imageUrl,index)=>({
      id:`village-gallery-${currentVillage.id}-${index}`,
      ownerUid:currentVillage.ownerUid||"",
      author:currentVillage.hostName||currentVillage.vName||"VillageDeko",
      location:currentVillage.vName||"Village",
      villageId:currentVillage.id,
      villageName:currentVillage.vName||"",
      vDistrict:currentVillage.vDistrict||"",
      vState:currentVillage.vState||"",
      text:index===0?"Village cover photo":"Village photo",
      imageUrl,
      postType:"village",
      createdAt:currentVillage.createdAt||null,
      isGalleryPhoto:true
    }));

    // Avoid showing a listing photo twice if the same URL was also posted as a post.
    const postImageUrls=new Set(posts.map(p=>p.imageUrl).filter(Boolean));
    const uniqueGalleryPosts=galleryPosts.filter(p=>!postImageUrls.has(p.imageUrl));
    renderPosts([...posts,...uniqueGalleryPosts].sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)),c);
  }catch(e){
    console.error("Village feed load failed",e);
    c.innerHTML=`<div class="empty">Feed load nahi ho paaya.</div>`;
  }
}

function renderVillageDay(){
  const v=currentVillage;
  const moments=[
    ["05:30 AM","🌅","Gaon ki subah","Suraj ki pehli roshni, galiyon ki khamoshi aur gaon ke din ki shuruaat."],
    ["06:00 AM","🐄","Pashu / Dairy","Pashuon ki dekhbhal, doodh nikalna aur subah ke dairy kaam."],
    ["07:00 AM","🌾","Khet","Khet ki taiyari, fasal dekhna aur din ke farming kaam ki shuruaat."],
    ["09:00 AM","☕","Chai / Nashta","Ghar ya chaupal par chai, nashta aur subah ki baatcheet."],
    ["11:00 AM","🧑‍🌾","Village Work","Kheti, pashupalan, dukaan, karigar aur roz ke gaon ke kaam."],
    ["01:00 PM","🍲","Ghar ka Khana","Local ingredients se bana ghar ka khana aur parivaar ke saath dopahar."],
    ["03:00 PM","🌤️","Dopahar","Thoda aaram, chhote kaam aur gaon ki dheemi dopahari zindagi."],
    ["05:00 PM","🏡","Village Life","Shaam ki halchal, bachche, pashu, kheton se lautte log aur milna-julna."],
    ["07:00 PM","🛕","Mandir / Bhajan","Mandir, bhajan, aarti aur shaam ki samudaayik zindagi."],
    ["09:00 PM","🌙","Gaon ki Raat","Raat ka khana, parivaar aur shaant gaon — agle din ki taiyari." ]
  ];
  $("villageSectionDay").innerHTML=`
    <div class="day-experience-head">
      <p class="day-kicker">VILLAGEDEKO EXPERIENCE</p>
      <h3>🌅 Ek Din Gaon Mein</h3>
      <p>📍 ${esc(v.vName)}, ${esc(v.vDistrict)}, ${esc(v.vState)}</p>
      <span>Gaon ko ek poore din ki rhythm mein samjho.</span>
    </div>
    <div class="day-timeline">${moments.map((m,i)=>`
      <article class="day-moment">
        <div class="day-time">${m[0]}</div>
        <div class="day-line"><span>${m[1]}</span>${i<moments.length-1?'<i></i>':''}</div>
        <div class="day-copy"><h4>${m[2]}</h4><p>${m[3]}</p><small>📍 ${esc(v.vName)} · ${esc(v.vDistrict)} · ${esc(v.vState)}</small></div>
      </article>`).join('')}</div>
    <div class="day-future-note"><b>🌾 Agla connection</b><p>Isi timeline ko future mein real photo, video, local voice aur gaon ke logon ki story se connect kiya jayega.</p></div>`;
}

function renderVillageFoodJourney(category="wheat"){
  const v=currentVillage;
  const journeys={
    wheat:{label:"Gehu",icon:"🌾",intro:"Beej se roti tak gehu ki poori journey — gaon ke khet se ghar ki plate tak.",stages:[
      ["01","🌱","Beej","Achha beej chunna aur agle season ki taiyari."],
      ["02","🚜","Buwai","Khet taiyar karke sahi samay par gehu boya jata hai."],
      ["03","💧","Paani","Fasal ki zarurat ke hisaab se sinchai aur dekhbhal."],
      ["04","🌾","Fasal","Fasal badhti hai; kisan rog, keet aur mausam par nazar rakhta hai."],
      ["05","🌾","Katai","Pakne par gehu ki katai aur dana alag karne ka kaam."],
      ["06","🧺","Mandi","Anaj mandi ya local buyer tak pahunchta hai."],
      ["07","⚙️","Chakki / Processing","Gehu saaf hokar chakki mein pis kar aata banta hai."],
      ["08","🍞","Ghar → Plate","Aata ghar pahunchta hai aur roti ban kar plate tak aata hai."]
    ]},
    vegetables:{label:"Sabzi",icon:"🥕",intro:"Beej/paudha se bazaar aur kitchen tak fresh sabzi ki journey.",stages:[
      ["01","🌱","Beej / Paudha","Season aur mitti ke hisaab se crop select ki jati hai."],
      ["02","🌱","Buwai / Ropai","Khet ya nursery mein paudhe lagaye jate hain."],
      ["03","💧","Paani & Care","Sinchai, ghaas safai aur crop care hoti hai."],
      ["04","🥬","Todai","Sabzi ko sahi size aur freshness par toda jata hai."],
      ["05","🧺","Sorting","Quality ke hisaab se sorting aur packing hoti hai."],
      ["06","🛺","Mandi / Bazaar","Sabzi local mandi, dukaan ya buyer tak jati hai."],
      ["07","🏠","Ghar","City ya village ghar tak fresh produce pahunchta hai."],
      ["08","🍲","Plate","Dhuli, kati aur pakai gayi sabzi meal ka hissa banti hai."]
    ]},
    milk:{label:"Doodh",icon:"🥛",intro:"Pashu ki dekhbhal se doodh collection aur ghar ki chai tak.",stages:[
      ["01","🐄","Pashu ki Dekhbhal","Chara, paani, safai aur daily care."],
      ["02","🥛","Doodh Dohana","Subah/shaam doodh nikala jata hai."],
      ["03","🧪","Quality Check","Doodh ki safai aur quality check ki ja sakti hai."],
      ["04","🧊","Collection","Doodh collection point ya dairy tak pahunchta hai."],
      ["05","🚚","Transport","Cold-chain ya local transport se aage jata hai."],
      ["06","🏭","Processing","Dairy mein chilling aur zarurat ke hisaab se processing."],
      ["07","🏠","Ghar / Dukaan","Milk packet ya local fresh milk consumer tak."],
      ["08","☕","Plate / Cup","Chai, dahi, paneer ya seedha doodh ban kar use hota hai."]
    ]},
    dal:{label:"Dal",icon:"🫘",intro:"Dal ki crop se cleaning, processing aur kitchen tak ka safar.",stages:[
      ["01","🌱","Beej","Dal ki crop ke liye seed selection."],
      ["02","🌾","Khet","Buwai, paani aur crop care."],
      ["03","🌾","Harvest","Pakne par crop ki katai aur threshing."],
      ["04","🧺","Cleaning","Dana saaf aur grade kiya jata hai."],
      ["05","⚙️","Milling","Dal mill mein processing se edible dal taiyar hoti hai."],
      ["06","🛒","Mandi / Market","Dal wholesale ya retail market tak pahunchti hai."],
      ["07","🏠","Ghar","Kitchen mein dal store aur prepare hoti hai."],
      ["08","🍲","Plate","Pak kar dal meal ka hissa banti hai."]
    ]},
    spices:{label:"Masale",icon:"🌶️",intro:"Khet se sukhane, processing aur kitchen tak masalon ki journey.",stages:[
      ["01","🌱","Crop","Masale ki crop season aur soil ke hisaab se ugai jati hai."],
      ["02","🌾","Harvest","Sahi maturity par crop harvest hoti hai."],
      ["03","☀️","Drying","Kai masalon ko drying/sukhaane ki zarurat hoti hai."],
      ["04","🧺","Cleaning","Safai, sorting aur grading hoti hai."],
      ["05","⚙️","Processing","Whole spice ya powder ke roop mein processing."],
      ["06","🛍️","Market","Local market ya packaged supply chain tak."],
      ["07","🏠","Kitchen","Ghar ke kitchen mein masala ready hota hai."],
      ["08","🍛","Plate","Khane ko taste aur aroma dene ke liye use hota hai."]
    ]}
  };
  const data=journeys[category]||journeys.wheat;
  const buttons=Object.entries(journeys).map(([key,item])=>`<button class="food-chip ${key===category?'active':''}" onclick="renderVillageFoodJourney('${key}')">${item.icon} ${item.label}</button>`).join('');
  $("villageSectionFood").innerHTML=`
    <div class="food-journey-head">
      <p class="food-kicker">VILLAGEDEKO FOOD JOURNEY</p>
      <h3>${data.icon} ${data.label}: Khet Se Plate Tak</h3>
      <p>${esc(data.intro)}</p>
      <small>📍 ${esc(v.vName)} · ${esc(v.vDistrict)} · ${esc(v.vState)}</small>
    </div>
    <div class="food-chips">${buttons}</div>
    <div class="food-path">${data.stages.map((stage,i)=>`<article class="food-stage"><div class="food-stage-no">${stage[0]}</div><div class="food-stage-icon">${stage[1]}</div><div class="food-stage-copy"><h4>${stage[2]}</h4><p>${esc(stage[3])}</p><small>📍 ${esc(v.vName)} · ${esc(v.vDistrict)} · ${esc(v.vState)}</small></div>${i<data.stages.length-1?'<div class="food-arrow">↓</div>':''}</article>`).join('')}</div>
    <div class="food-story-note"><b>🌾 VillageDeko ka rule</b><p>Food ko sirf product nahi — farmer, village aur real story ke saath samjhenge. Agle phase mein har stage ko real photo, video aur local voice se connect kiya ja sakta hai.</p></div>`;
}

async function loadVillagePeople(){
  const c=$("villageSectionPeople");
  if(!c || !currentVillage)return;
  try{
    const snap=await getDocs(query(collection(db,"villagePeople"),where("villageId","==",currentVillage.id)));
    const people=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
    renderVillagePeople(people);
  }catch(e){
    console.error("Village people load failed",e);
    c.innerHTML='<div class="empty">Log load nahi ho paaye. Firestore rules check karein.</div>';
  }
}

function renderVillagePeople(people=[]){
  const c=$("villageSectionPeople"); if(!c || !currentVillage)return;
  const add=`<div class="people-head"><div><p class="people-kicker">VILLAGEDEKO PEOPLE</p><h3>👨‍🌾 Gaon Ke Log</h3><p>Gaon ke asli log, unka kaam aur unki apni kahani.</p></div><button class="primary" onclick="openAddVillagePerson()">+ Add Person</button></div>`;
  if(!people.length){c.innerHTML=add+'<div class="empty">Abhi is village ke log add nahi kiye gaye. Pehla person aap add kar sakte hain.</div>';return;}
  c.innerHTML=add+`<div class="people-grid">${people.map(p=>`<article class="person-card">${p.photoUrl?`<img src="${esc(optimizedImageUrl(p.photoUrl,700))}" loading="lazy" alt="${esc(p.name)}">`:`<div class="person-photo-placeholder">👨‍🌾</div>`}<div class="person-body"><h4>${esc(p.name)}</h4><b>${esc(p.role)}</b><p class="person-location">📍 ${esc(currentVillage.vName)} · ${esc(currentVillage.vDistrict)} · ${esc(currentVillage.vState)}</p><div class="person-story"><span>“</span>${esc(p.story)}<span>”</span></div>${currentUser?.uid===p.ownerUid?`<button class="person-owner" onclick="deleteVillagePerson('${esc(p.id)}')">Delete</button>`:''}</div></article>`).join('')}</div>`;
}

function openAddVillagePerson(){ if(!requireLogin()||!currentVillage)return; $("personName").value='';$("personRole").value='';$("personStory").value='';$("personPhotoFile").value='';openModal("addPersonModal"); }

async function handleAddVillagePerson(event){
  event.preventDefault(); if(!requireLogin()||!currentVillage)return;
  const btn=$("personSubmitBtn"); btn.disabled=true; btn.textContent="Saving...";
  try{
    const name=$("personName").value.trim(), role=$("personRole").value.trim(), story=$("personStory").value.trim(), file=$("personPhotoFile").files?.[0];
    if(!name||!role||!story)throw new Error("Name, role aur kahani zaroori hai.");
    const photoUrl=file?await uploadImage(file,"people"):"";
    await addDoc(collection(db,"villagePeople"),{name,role,story,photoUrl,ownerUid:uid(),villageId:currentVillage.id,villageName:currentVillage.vName,vDistrict:currentVillage.vDistrict,vState:currentVillage.vState,createdAt:serverTimestamp()});
    closeModal("addPersonModal"); await loadVillagePeople();
  }catch(e){alert(e.message||"Person save nahi hua.");}
  finally{btn.disabled=false;btn.textContent="Save Person";}
}

async function deleteVillagePerson(id){
  if(!requireLogin()||!confirm("Is person ko delete karna hai?"))return;
  try{await deleteDoc(doc(db,"villagePeople",id));await loadVillagePeople();}catch(e){alert(e.message||"Delete failed.");}
}

function renderVillageDetails(){
  const v=currentVillage;
  $("villageSectionDetails").innerHTML=`<div class="space-y-3"><p class="text-sm leading-relaxed">${esc(v.vDescription)}</p><div class="grid grid-cols-2 gap-2"><div class="info-box"><b>Host</b><p>${esc(v.hostName)}</p></div><div class="info-box"><b>Contact</b><p>${esc(v.hostWhatsapp)}</p></div></div>${v.bankDetails?`<p class="text-[10px] text-slate-400">Bank details are kept private.</p>`:``}</div>`;
}

function renderVillageExtras(){
  const v=currentVillage;
  $("villageSectionActivities").innerHTML=(v.activities||[]).length?`<div class="grid gap-2">${v.activities.map(a=>`<div class="info-box"><b>🎯 ${esc(a.name)}</b><p>${esc(a.description||"")}${a.price?` · ₹${esc(a.price)}/person`:``}</p></div>`).join("")}</div>`:`<div class="empty">Activities abhi add nahi ki gayi.</div>`;
  $("villageSectionPackages").innerHTML=(v.packages||[]).length?`<div class="grid gap-2">${v.packages.map(p=>`<div class="package-card"><b>📦 ${esc(p.name)}</b><strong>₹${esc(p.price)}/person</strong><span>${esc(p.days)} days</span><p>${esc(p.description||"")}</p></div>`).join("")}</div>`:`<div class="empty">Packages abhi add nahi kiye gaye.</div>`;
}

function showVillageSection(name,btn){
  ["feed","day","food","people","explore","details","activities","packages"].forEach(x=>$("villageSection"+x.charAt(0).toUpperCase()+x.slice(1)).classList.toggle("hidden",x!==name));
  document.querySelectorAll(".vtab").forEach(b=>b.classList.remove("active"));
  btn?.classList.add("active");
}

async function toggleFollow(id,event){
  event?.stopPropagation();
  if(!requireLogin())return;
  const v=villages.find(x=>x.id===id); if(!v)return;
  const ref=doc(db,"villagesListings",id,"followers",uid());
  const snap=await getDoc(ref);
  if(snap.exists())await deleteDoc(ref);else await setDoc(ref,{uid:uid(),createdAt:serverTimestamp()});
  await refreshVillageFollowers(id);
  renderVillageList(villages,$("stateVillages"));
  renderVillageCards(villages,$("homeVillagesList"));
  if(currentVillage?.id===id)renderVillageHeader();
}

async function refreshVillageFollowers(id){
  const snap=await getDocs(collection(db,"villagesListings",id,"followers"));
  const v=villages.find(x=>x.id===id);
  if(v)v.followers=snap.docs.map(d=>d.id);
}

async function toggleLike(id,event){
  event?.stopPropagation();
  if(!requireLogin())return;
  const ref=doc(db,"posts",id,"likes",uid());
  const snap=await getDoc(ref);
  if(snap.exists()){
    await deleteDoc(ref);
  }else{
    await setDoc(ref,{uid:uid(),createdAt:serverTimestamp()});
  }
  await loadAllPosts();
  if(currentVillage?.id)await loadVillagePosts();
  renderPosts(allPosts.filter(p=>p.postType==="chaupal"),$("chaupalFeedContainer"));
}

async function savePost(id,event){
  event?.stopPropagation();
  if(!requireLogin())return;
  await setDoc(doc(db,"users",uid(),"saved",id),{postId:id,createdAt:serverTimestamp()});
  alert("Post saved.");
}

async function openComments(postId){
  if(!requireLogin())return;
  const snap=await getDocs(collection(db,"posts",postId,"comments"));
  $("genericTitle").textContent="💬 Comments";
  $("genericBody").innerHTML=`<div class="space-y-2">${snap.docs.map(d=>{const x=d.data();return `<div class="info-box"><b>${esc(x.author)}</b><p>${esc(x.text)}</p></div>`}).join("")||`<p class="empty">No comments yet.</p>`}</div><form onsubmit="addComment(event,'${postId}')" class="flex gap-2 mt-3"><input id="commentText" required class="input flex-1" placeholder="Write a comment..."><button class="primary">Post</button></form>`;
  openModal("genericModal");
}

async function addComment(e,postId){
  e.preventDefault();if(!requireLogin())return;
  const text=$("commentText").value.trim();if(!text)return;
  await addDoc(collection(db,"posts",postId,"comments"),{uid:uid(),author:currentUser.displayName||"User",text,createdAt:serverTimestamp()});
  closeModal("genericModal");
  if(currentVillage?.id)await loadVillagePosts();
}

function openPostModal(source="village"){
  if(!requireLogin())return;
  openModal("addStoryModal");
  populateVillageSelect();
  $("storyAuthor").value=currentUser.displayName||"";
  $("postType").value=source==="chaupal"?"chaupal":"village";
  $("storyVillage").required=source!=="chaupal";
  $("storyText").placeholder=source==="chaupal"?"Chaupal ki baat, announcement ya story likhein...":"Caption / story";
}

function populateVillageSelect(){
  $("storyVillage").innerHTML='<option value="">Select village</option>'+villages.map(v=>`<option value="${v.id}">${esc(v.vName)} — ${esc(v.vDistrict)}, ${esc(v.vState)}</option>`).join("");
}

async function uploadImage(file,folder="uploads"){
  if(!file?.type?.startsWith("image/"))throw new Error("Sirf image upload karein.");
  if(file.size>8*1024*1024)throw new Error("Image 8MB se chhoti honi chahiye.");
  if(!CLOUDINARY_CLOUD_NAME || CLOUDINARY_CLOUD_NAME==="YOUR_CLOUD_NAME" ||
     !CLOUDINARY_UPLOAD_PRESET || CLOUDINARY_UPLOAD_PRESET==="YOUR_UNSIGNED_UPLOAD_PRESET"){
    throw new Error("Cloudinary setup pending: media-config.js mein Cloud Name aur Upload Preset set karein.");
  }

  const fd=new FormData();
  fd.append("file",file);
  fd.append("upload_preset",CLOUDINARY_UPLOAD_PRESET);
  fd.append("folder",`villagedeko/${folder}/${uid()}`);

  const r=await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(CLOUDINARY_CLOUD_NAME)}/image/upload`,{
    method:"POST",body:fd
  });
  const d=await r.json();
  if(!r.ok || !d.secure_url) throw new Error(d.error?.message||"Image upload failed.");

  // Store the original Cloudinary URL; delivery is optimized through Cloudinary's CDN.
  return d.secure_url;
}

function optimizedImageUrl(url,width=900){
  if(!url || !url.includes("res.cloudinary.com/")) return url;
  return url.replace("/image/upload/","/image/upload/f_auto,q_auto,c_limit,w_"+Math.round(width)+"/");
}

async function handleCloudinaryPhotoPost(event){
  event.preventDefault();if(!requireLogin())return;
  const btn=$("submitBtn");btn.disabled=true;btn.textContent="Publishing...";
  try{
    const file=$("storyImageFile").files?.[0];
    if(file){
      if(!file.type.startsWith("image/"))throw new Error("Sirf image upload karein.");
      if(file.size>8*1024*1024)throw new Error("Image 8MB se chhoti honi chahiye.");
    }
    const text=$("storyText").value.trim();
    if(!text)throw new Error("Caption / story likhein.");
    const imageUrl=file?await uploadImage(file,"posts"):"";
    const postType=$("postType").value||"village";
    const village=villages.find(v=>v.id===$("storyVillage").value);
    if(postType==="village" && !village)throw new Error("Village select karein.");
    await addDoc(collection(db,"posts"),{
      ownerUid:uid(),author:currentUser.displayName||$("storyAuthor").value.trim(),
      location:$("storyLocation").value.trim()||(village?.vName||"Chaupal"),
      villageId:village?.id||null,villageName:village?.vName||"",
      vDistrict:village?.vDistrict||"",vState:village?.vState||"",
      text,imageUrl,postType,likesCount:0,
      createdAt:serverTimestamp(),updatedAt:serverTimestamp()
    });
    $("chaupalPostForm").reset();
    $("postType").value="village";
    $("storyVillage").required=true;
    $("storyText").placeholder="Caption / story";
    closeModal("addStoryModal");
    await loadAllPosts();
    // For Chaupal posts there is no village object. Do not access village.id here.
    if(village?.id && currentVillage?.id===village.id)await loadVillagePosts();
    loadHome();
    alert("Post published.");
  }catch(e){
    console.error("Post failed",e);
    alert("Post failed: "+(e?.message||"Unknown error"));
  }finally{btn.disabled=false;btn.textContent="Publish Post";}
}

function addActivityRow(data={}){
  const id=crypto.randomUUID();const el=document.createElement("div");el.className="repeat-row";el.id="activity-"+id;
  el.innerHTML=`<input data-field="name" value="${esc(data.name||"")}" placeholder="Activity name" class="input"><input data-field="price" value="${esc(data.price||"")}" placeholder="₹ per person (optional)" class="input"><input data-field="description" value="${esc(data.description||"")}" placeholder="Details" class="input"><button type="button" onclick="document.getElementById('activity-${id}').remove()" class="remove-btn">×</button>`;
  $("activitiesRows").appendChild(el);
}

function addPackageRow(data={}){
  const id=crypto.randomUUID();const el=document.createElement("div");el.className="repeat-row";el.id="package-"+id;
  el.innerHTML=`<input data-field="name" value="${esc(data.name||"")}" placeholder="Package name" class="input"><input data-field="days" value="${esc(data.days||"")}" placeholder="Days" type="number" min="1" class="input"><input data-field="price" value="${esc(data.price||"")}" placeholder="₹ per person" class="input"><button type="button" onclick="document.getElementById('package-${id}').remove()" class="remove-btn">×</button><input data-field="description" value="${esc(data.description||"")}" placeholder="Package details" class="input repeat-description">`;
  $("packagesRows").appendChild(el);
}

function collectRows(id){return [...$(id).children].map(row=>Object.fromEntries([...row.querySelectorAll("[data-field]")].map(i=>[i.dataset.field,i.value.trim()]))).filter(x=>x.name);}

async function handleVillageListing(event){
  event.preventDefault();if(!requireLogin())return;
  const btn=$("listSubmitBtn");btn.disabled=true;btn.textContent="Publishing...";
  try{
    const files=[...($('villageGalleryFiles').files||[])];const images=[];for(const f of files)images.push(await uploadImage(f,"village-gallery"));
    const bank={bankName:$("bankName").value.trim(),accountName:$("accountName").value.trim(),accountNumber:$("accountNumber").value.trim(),ifsc:$("ifsc").value.trim()};
    const bankDetails=Object.values(bank).some(Boolean)?bank:null;
    await addDoc(collection(db,"villagesListings"),{ownerUid:uid(),hostName:$("hostName").value.trim(),hostWhatsapp:$("hostWhatsapp").value.trim(),vName:$("vName").value.trim(),vDistrict:$("vDistrict").value.trim(),vState:$("vState").value,vDescription:$("vDescription").value.trim(),images,activities:collectRows("activitiesRows"),packages:collectRows("packagesRows"),bankDetails,createdAt:serverTimestamp()});
    $("listVillageForm").reset();$("activitiesRows").innerHTML="";$("packagesRows").innerHTML="";addActivityRow();addPackageRow();closeModal("listVillageModal");
    await loadVillages();loadHome();alert("Village listed successfully.");
  }catch(e){alert("Listing failed: "+e.message);}finally{btn.disabled=false;btn.textContent="Publish Village Live";}
}

async function handleEdit(id,event){
  event?.stopPropagation();if(!requireLogin())return;
  const ref=doc(db,"posts",id);const snap=await getDoc(ref);
  if(!snap.exists()||snap.data().ownerUid!==uid()){alert("Sirf apni post edit kar sakte ho.");return;}
  const text=prompt("Caption update karein",snap.data().text||"");if(text===null||!text.trim())return;
  await updateDoc(ref,{text:text.trim(),updatedAt:serverTimestamp()});
  await loadAllPosts();loadHome();if(currentVillage?.id)await loadVillagePosts();
}

async function handleDelete(id,event){
  event?.stopPropagation();if(!requireLogin())return;
  const ref=doc(db,"posts",id);const snap=await getDoc(ref);
  if(!snap.exists()||snap.data().ownerUid!==uid()){alert("Sirf apni post delete kar sakte ho.");return;}
  if(!confirm("Apni post delete karni hai?"))return;
  await deleteDoc(ref);await loadAllPosts();loadHome();if(currentVillage?.id)await loadVillagePosts();
}

async function handleShare(title,event){
  event?.stopPropagation();const url=location.href;
  if(navigator.share){try{await navigator.share({title:"VillageDeko",text:title,url});}catch{}}
  else{await navigator.clipboard?.writeText(url);alert("Link copied.");}
}

async function submitWedding(e){
  e.preventDefault();if(!requireLogin())return;
  await addDoc(collection(db,"weddingInquiries"),{ownerUid:uid(),name:$("wName").value,phone:$("wPhone").value,state:$("wState").value,guests:$("wGuests").value,date:$("wDate").value,message:$("wMessage").value,createdAt:serverTimestamp()});
  e.target.reset();alert("Wedding inquiry submitted.");
}

async function showMyListings(){if(!requireLogin())return;await showOwned("villagesListings","My Village Listings",v=>`${v.vName}, ${v.vDistrict} — ${v.vState}`);}
async function showMyHosts(){if(!requireLogin())return;await showOwned("villagesListings","My Host Listings",v=>`${v.hostName} · ${v.vName} · ${v.hostWhatsapp}`);}
async function showMyWeddings(){if(!requireLogin())return;await showOwned("weddingInquiries","My Wedding Listings",v=>`${v.state||"India"} · ${v.date||""} · ${v.guests||""} guests`);}
async function showOwned(col,title,format){const snap=await getDocs(query(collection(db,col),where("ownerUid","==",uid())));$("genericTitle").textContent=title;$("genericBody").innerHTML=snap.docs.length?snap.docs.map(d=>`<div class="info-box mb-2"><b>${esc(format(d.data()))}</b></div>`).join(""):`<div class="empty">Kuch nahi mila.</div>`;openModal("genericModal");}
function openSettings(){ $("settingEmail").checked=localStorage.getItem("showEmail")==="true";$("settingNotifications").checked=localStorage.getItem("notifications")!=="false";openModal("settingsModal"); }
function openPrivacy(){openModal("privacyModal");}
function saveSetting(k,v){localStorage.setItem(k,v);}

async function googleLogin(){
  const buttons=[$("googleLoginGateBtn")];
  buttons.forEach(b=>{if(b){b.disabled=true;b.textContent="Connecting...";}});
  $("loginError")?.classList.add("hidden");$("loginModalError")?.classList.add("hidden");
  try{
    const provider=new GoogleAuthProvider();
    await signInWithPopup(auth,provider);
    closeModal("loginModal");
  }catch(e){
    const msg="Google login failed: "+(e?.message||"Unknown error");
    [$("loginError"),$("loginModalError")].forEach(el=>{if(el){el.textContent=msg;el.classList.remove("hidden");}});
  }finally{buttons.forEach(b=>{if(b){b.disabled=false;b.innerHTML='<span class="google-g">G</span> Continue with Google';}});}
}

async function logout(){await signOut(auth);closeDrawer();}
async function loadProfilePhoto(){
  if(!currentUser)return;
  try{
    const snap=await getDoc(doc(db,"users",uid()));
    const photo=snap.exists()?(snap.data().photoURL||currentUser.photoURL||""):(currentUser.photoURL||"");
    setProfilePhotoUI(photo);
  }catch(e){console.error("Profile load failed",e);}
}

function setProfilePhotoUI(url){
  const topImg=$("topProfilePhoto"), topEmoji=$("topProfileEmoji");
  const drawerImg=$("drawerProfilePhoto"), drawerEmoji=$("drawerProfileEmoji");
  [topImg,drawerImg].forEach(img=>{if(img){img.src=url||"";img.classList.toggle("hidden",!url);}});
  [topEmoji,drawerEmoji].forEach(el=>{if(el)el.classList.toggle("hidden",!!url);});
}

async function handleProfilePhoto(event){
  if(!requireLogin())return;
  const file=event.target.files?.[0];
  if(!file)return;
  if(!file.type.startsWith("image/")){alert("Sirf image upload karein.");event.target.value="";return;}
  const input=event.target;
  try{
    input.disabled=true;
    const url=await uploadImage(file,"profile");
    await setDoc(doc(db,"users",uid()),{uid:uid(),displayName:currentUser.displayName||"",email:currentUser.email||"",photoURL:url,updatedAt:serverTimestamp()},{merge:true});
    setProfilePhotoUI(url);
    alert("Profile photo update ho gayi.");
  }catch(e){alert("Profile photo upload failed: "+e.message);}
  finally{input.disabled=false;input.value="";}
}

function updateAuthUI(){
  const logged=!!currentUser;
  $("drawerName").textContent=logged?(currentUser.displayName||"VillageDeko User"):"Guest";
  $("drawerEmail").textContent=logged?(currentUser.email||""):"";
  $("drawerProfileLabel").textContent=logged?(currentUser.displayName||"Your Profile"):"Your Profile";
  if(!logged)setProfilePhotoUI("");
}

function openImageViewer(url){$("imageViewerImg").src=url;$("imageViewerModal").classList.add("is-open");document.body.style.overflow="hidden";}
function closeImageViewer(e){if(e)e.stopPropagation();$("imageViewerModal").classList.remove("is-open");$("imageViewerImg").src="";document.body.style.overflow="";}

document.querySelectorAll(".modal").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)m.classList.remove("is-open");}));
$("drawer")?.addEventListener("click",e=>{if(e.target===$("drawer"))closeDrawer();});

Object.assign(window,{openModal,closeModal,openLogin:showLoginGate,googleLogin,openDrawer,closeDrawer,goHome,selectState,filterExplore,openVillage,goBackFromVillage,toggleFollow,showVillageSection,openAddVillagePerson,handleAddVillagePerson,deleteVillagePerson,openPostModal,handleCloudinaryPhotoPost,handleVillageListing,addActivityRow,addPackageRow,toggleLike,savePost,openComments,addComment,handleEdit,handleDelete,handleShare,openWedding,openChaupal,submitWedding,showMyListings,showMyHosts,showMyWeddings,openSettings,openPrivacy,saveSetting,logout,openImageViewer,closeImageViewer,handleProfilePhoto});

fillStates();renderStates();addActivityRow();addPackageRow();

onAuthStateChanged(auth,async user=>{
  currentUser=user;
  updateAuthUI();
  if(!user){showLoginGate();return;}
  showApp();
  await loadVillages();
  await loadProfilePhoto();
  await Promise.all(villages.map(v=>refreshVillageFollowers(v.id).catch(()=>{})));
  await loadAllPosts();
  loadHome();
});


const EXPLORE_SECTIONS = [
  {icon:"🌾", name:"Khet", hint:"Farming, fasal aur kheti ki kahani"},
  {icon:"🐄", name:"Dairy", hint:"Pashu, doodh aur pashupalak ki zindagi"},
  {icon:"🏠", name:"Ghar & Daily Life", hint:"Rozmarra ki village life"},
  {icon:"🛕", name:"Mandir", hint:"Mandir, parampara aur aastha"},
  {icon:"💧", name:"Paani", hint:"Kuan, talab aur paani ki kahani"},
  {icon:"🏫", name:"School", hint:"School aur village education"},
  {icon:"🛍️", name:"Local Market", hint:"Haat, dukaan aur local bazaar"},
  {icon:"🍲", name:"Local Food", hint:"Gaon ka khaana aur recipes"},
  {icon:"🎵", name:"Culture", hint:"Geet, utsav aur traditions"},
  {icon:"🎨", name:"Local Art", hint:"Hunar, handicraft aur kala"}
];
let villageExploreStories=[];

async function loadVillageExplore(){
  if(!currentVillage){ villageExploreStories=[]; return; }
  try{
    const snap=await getDocs(collection(db,"villagesListings",currentVillage.id,"exploreStories"));
    villageExploreStories=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
  }catch(e){ console.error("Explore load failed",e); villageExploreStories=[]; }
  renderVillageExplore();
}

function renderVillageExplore(){
  const c=$("villageSectionExplore"); if(!c||!currentVillage)return;
  const cards=EXPLORE_SECTIONS.map(sec=>{
    const stories=villageExploreStories.filter(x=>x.section===`${sec.icon} ${sec.name}` || x.section===sec.name);
    const storyHtml=stories.length?stories.map(st=>`<article class="explore-story-card">${st.imageUrl?`<img src="${esc(optimizedImageUrl(st.imageUrl,700))}" loading="lazy" alt="${esc(st.title||sec.name)}">`:``}<div class="p-3"><b class="text-sm">${esc(st.title||sec.name)}</b><p class="text-xs text-slate-600 mt-1 leading-relaxed">${esc(st.story||"")}</p><small class="text-[10px] text-slate-400">${esc(st.author||"VillageDeko Contributor")}</small></div></article>`).join(""):`<div class="explore-empty">Abhi is section ki story add nahi hui.</div>`;
    return `<section class="explore-section"><div class="explore-section-head"><div><h4>${sec.icon} ${sec.name}</h4><p>${sec.hint}</p></div><button class="add-btn" onclick="openExploreStoryModal('${esc(sec.icon+" "+sec.name)}')">+ Story</button></div><div class="explore-stories-grid">${storyHtml}</div></section>`;
  }).join("");
  c.innerHTML=`<div class="explore-intro"><div><p class="text-[10px] font-black uppercase tracking-widest text-amber-700">EXPLORE VILLAGE</p><h3 class="text-lg font-black mt-1">${esc(currentVillage.vName)} ko section-by-section samjho</h3><p class="text-xs text-slate-500 mt-1">Village → Section → Story. Har section mein real village context aur kahani add ki ja sakti hai.</p></div><button class="primary" onclick="openExploreStoryModal()">+ Add Story</button></div>${cards}`;
}

function openExploreStoryModal(section=""){
  if(!requireLogin())return;
  $("exploreSection").value=section||"";
  $("exploreTitle").value=""; $("exploreStory").value=""; $("exploreImageFile").value="";
  openModal("addExploreStoryModal");
}

async function handleAddExploreStory(e){
  e.preventDefault(); if(!requireLogin()||!currentVillage)return;
  const btn=$("exploreSubmitBtn"); btn.disabled=true; btn.textContent="Saving...";
  try{
    const file=$("exploreImageFile")?.files?.[0];
    const imageUrl=file?await uploadImage(file):"";
    await addDoc(collection(db,"villagesListings",currentVillage.id,"exploreStories"),{
      ownerUid:uid(), villageId:currentVillage.id, villageName:currentVillage.vName,
      vDistrict:currentVillage.vDistrict, vState:currentVillage.vState,
      section:$("exploreSection").value, title:$("exploreTitle").value.trim(),
      story:$("exploreStory").value.trim(), imageUrl, author:currentUser?.displayName||"VillageDeko Contributor",
      createdAt:serverTimestamp()
    });
    closeModal("addExploreStoryModal"); await loadVillageExplore(); alert("Explore story added.");
  }catch(err){ alert("Story save failed: "+err.message); }
  finally{ btn.disabled=false; btn.textContent="Save Story"; }
}


/* ===== STEP 7 — REAL VILLAGE FEED ===== */
function normalizeVillagePostForFeed(post = {}) {
  return { ...post, village: post.village || post.villageName || "", district: post.district || "", state: post.state || "", story: post.story || post.caption || post.description || "", personName: post.personName || post.authorName || post.userName || "Village contributor", imageUrl: post.imageUrl || post.image || post.photoURL || "" };
}
function getVillageFeedContext(post) {
  const p=normalizeVillagePostForFeed(post);
  return { story:p.story, personName:p.personName, location:[p.village,p.district,p.state].filter(Boolean).join(" · "), imageUrl:p.imageUrl, postId:p.id || p.postId || "" };
}
function getVillageFeedNavigation(post) {
  const p=normalizeVillagePostForFeed(post);
  return { village:p.village, district:p.district, state:p.state, villageId:p.villageId || p.villageRef || "" };
}


/* ===== STEP 8 — REAL EK DIN GAON MEIN ===== */
const EK_DIN_MOMENTS = [
  { id:"05-30", time:"05:30 AM", title:"Gaon ki subah", icon:"🌅" },
  { id:"06-00", time:"06:00 AM", title:"Pashu / Dairy", icon:"🐄" },
  { id:"07-00", time:"07:00 AM", title:"Khet", icon:"🌾" },
  { id:"09-00", time:"09:00 AM", title:"Chai / Nashta", icon:"☕" },
  { id:"11-00", time:"11:00 AM", title:"Village Work", icon:"🧑‍🌾" },
  { id:"13-00", time:"01:00 PM", title:"Ghar ka Khana", icon:"🍲" },
  { id:"15-00", time:"03:00 PM", title:"Dopahar", icon:"🌤️" },
  { id:"17-00", time:"05:00 PM", title:"Village Life", icon:"🏡" },
  { id:"19-00", time:"07:00 PM", title:"Mandir / Bhajan", icon:"🛕" },
  { id:"21-00", time:"09:00 PM", title:"Gaon ki Raat", icon:"🌙" }
];

function normalizeEkDinMoment(item = {}) {
  return {
    ...item,
    time: item.time || "",
    title: item.title || "",
    photoUrl: item.photoUrl || item.imageUrl || item.image || "",
    videoUrl: item.videoUrl || "",
    audioUrl: item.audioUrl || "",
    voiceUrl: item.voiceUrl || "",
    explanation: item.explanation || item.description || "",
    personName: item.personName || item.authorName || "",
    village: item.village || item.villageName || "",
    district: item.district || "",
    state: item.state || ""
  };
}

function getEkDinMomentContext(moment = {}) {
  const m = normalizeEkDinMoment(moment);
  return {
    id: m.id || "",
    time: m.time,
    title: m.title,
    photoUrl: m.photoUrl,
    videoUrl: m.videoUrl,
    audioUrl: m.audioUrl || m.voiceUrl,
    explanation: m.explanation,
    personName: m.personName,
    location: [m.village,m.district,m.state].filter(Boolean).join(" · ")
  };
}

/* ===== STEP 9 — REAL FOOD JOURNEY ===== */
const REAL_FOOD_JOURNEYS = {
  gehu: {
    name: "Gehu",
    icon: "🌾",
    stages: [
      "Beej","Khet","Buwai","Paani","Fasal","Katai","Mandi","Chakki","Aata","Roti"
    ]
  },
  sabzi: {
    name: "Sabzi",
    icon: "🥕",
    stages: [
      "Beej / Ropai","Khet","Paani","Crop Care","Todai","Sorting","Mandi","Ghar","Plate"
    ]
  },
  doodh: {
    name: "Doodh",
    icon: "🥛",
    stages: [
      "Pashu","Doodh","Collection","Transport","Processing","Ghar","Cup / Plate"
    ]
  },
  dal: {
    name: "Dal",
    icon: "🫘",
    stages: [
      "Beej","Khet","Harvest","Cleaning","Milling","Market","Ghar","Plate"
    ]
  },
  masale: {
    name: "Masale",
    icon: "🌶️",
    stages: [
      "Crop","Harvest","Drying","Cleaning","Processing","Market","Kitchen","Plate"
    ]
  }
};

function normalizeFoodJourneyStage(stage = {}, index = 0) {
  return {
    ...stage,
    order: stage.order ?? index + 1,
    title: stage.title || "",
    explanation: stage.explanation || stage.description || "",
    farmerName: stage.farmerName || stage.personName || "",
    village: stage.village || "",
    district: stage.district || "",
    state: stage.state || "",
    photoUrl: stage.photoUrl || stage.imageUrl || "",
    videoUrl: stage.videoUrl || "",
    audioUrl: stage.audioUrl || stage.voiceUrl || ""
  };
}

function getFoodJourneyLocation(stage = {}) {
  return [stage.village, stage.district, stage.state].filter(Boolean).join(" · ");
}

/* ===== STEP 10 — INDIA VILLAGE MAP ===== */
const VILLAGE_NAV_LEVELS = ["India","State","District","Village"];

function normalizeVillageLocation(v = {}) {
  return {
    ...v,
    village: v.village || v.villageName || v.name || "",
    district: v.district || "",
    state: v.state || "",
    latitude: v.latitude ?? v.lat ?? null,
    longitude: v.longitude ?? v.lng ?? null,
    imageUrl: v.imageUrl || v.photoUrl || ""
  };
}

function getVillageHierarchy(v = {}) {
  const item = normalizeVillageLocation(v);
  return {
    state: item.state,
    district: item.district,
    village: item.village
  };
}

function villageLocationLabel(v = {}) {
  const item = normalizeVillageLocation(v);
  return [item.village,item.district,item.state].filter(Boolean).join(" · ");
}

/* ===== STEP 11 — VISIT THIS VILLAGE ===== */
const VILLAGE_VISIT_EXPERIENCES = [
  "Homestay",
  "Farming Experience",
  "Dairy Experience",
  "Local Food",
  "Culture",
  "Temple",
  "Local Guide"
];

const FAMILY_VILLAGE_PLAN = {
  day1: ["Village","Farming","Food","Culture"],
  day2: ["Dairy","Market","Local Life"]
};

function normalizeVillageVisit(v = {}) {
  return {
    ...v,
    village: v.village || v.villageName || "",
    district: v.district || "",
    state: v.state || "",
    homestay: v.homestay || null,
    experiences: v.experiences || [],
    localGuide: v.localGuide || null
  };
}

function getVillageVisitLocation(v = {}) {
  const item = normalizeVillageVisit(v);
  return [item.village,item.district,item.state].filter(Boolean).join(" · ");
}

/* ===== STEP 12 — FAMILY VILLAGE EXPERIENCE ===== */
const FAMILY_LEARNING_STOPS = [
  { id:"seed", title:"Beej", icon:"🌱", lesson:"Beej se fasal ki shuruaat hoti hai." },
  { id:"field", title:"Khet", icon:"🌾", lesson:"Khet mein fasal grow hoti hai." },
  { id:"milk", title:"Doodh", icon:"🐄", lesson:"Doodh animal se aata hai." },
  { id:"farmer", title:"Farmer", icon:"👨‍🌾", lesson:"Farmer food journey ka important hissa hai." },
  { id:"food", title:"Local Food", icon:"🍲", lesson:"Local food ke peeche village ki mehnat aur story hoti hai." },
  { id:"culture", title:"Culture", icon:"🎵", lesson:"Culture ko logon ki stories aur traditions se samjha ja sakta hai." }
];

const FAMILY_LESSONS = [
  "Roti supermarket mein nahi ugti.",
  "Doodh packet se pehle animal se aata hai."
];

function normalizeFamilyVillageExperience(data = {}) {
  return {
    ...data,
    village: data.village || data.villageName || "",
    district: data.district || "",
    state: data.state || "",
    stops: data.stops || FAMILY_LEARNING_STOPS,
    lessons: data.lessons || FAMILY_LESSONS
  };
}

/* ===== STEP 13 — VILLAGE STORIES ===== */
const VILLAGE_STORY_TYPES = [
  {id:"farmer", title:"Kheti ki Kahani", icon:"👨‍🌾"},
  {id:"old-village", title:"Purane Gaon ki Yaadein", icon:"🧓"},
  {id:"recipe", title:"Local Recipe", icon:"👩‍🍳"},
  {id:"temple", title:"Mandir ki Kahani", icon:"🛕"},
  {id:"old-new", title:"Old Village → New Village", icon:"📸"}
];

function normalizeVillageStory(story = {}) {
  return {
    ...story,
    title: story.title || "",
    story: story.story || story.description || "",
    personName: story.personName || story.authorName || "",
    village: story.village || story.villageName || "",
    district: story.district || "",
    state: story.state || "",
    photoUrl: story.photoUrl || story.imageUrl || "",
    videoUrl: story.videoUrl || "",
    audioUrl: story.audioUrl || story.voiceUrl || "",
    oldPhotoUrl: story.oldPhotoUrl || "",
    currentPhotoUrl: story.currentPhotoUrl || ""
  };
}

/* ===== STEP 14 — RURAL CULTURE ===== */
const RURAL_CULTURE_CATEGORIES=[
{id:"folk-songs",title:"Lok Geet",icon:"🎶"},{id:"instruments",title:"Local Instruments",icon:"🥁"},
{id:"bhajan",title:"Bhajan / Kirtan",icon:"🛕"},{id:"folk-dance",title:"Lok Nritya",icon:"💃"},
{id:"festivals",title:"Festivals",icon:"🎉"},{id:"marriage",title:"Marriage Traditions",icon:"👰"},
{id:"old-stories",title:"Old Stories",icon:"🧓"},{id:"food-traditions",title:"Food Traditions",icon:"🍲"},
{id:"clothes",title:"Traditional Clothes",icon:"👗"},{id:"local-art",title:"Local Art",icon:"🎨"}];
function normalizeRuralCultureStory(item={}){return {...item,title:item.title||"",category:item.category||"",story:item.story||item.description||"",personName:item.personName||item.authorName||"",village:item.village||item.villageName||"",district:item.district||"",state:item.state||"",photoUrl:item.photoUrl||item.imageUrl||"",videoUrl:item.videoUrl||"",audioUrl:item.audioUrl||item.voiceUrl||""};}

/* ===== STEP 15 — KISAN SE SEEKHO ===== */
const KISAN_LEARNING_STEPS=[{id:"land",title:"Land Preparation",icon:"🚜"},{id:"seed",title:"Seed",icon:"🌱"},{id:"sowing",title:"Sowing",icon:"🌾"},{id:"water",title:"Water",icon:"💧"},{id:"care",title:"Crop Care",icon:"🌿"},{id:"harvest",title:"Harvest",icon:"🌾"},{id:"mandi",title:"Mandi",icon:"🛒"},{id:"food",title:"Food",icon:"🍲"}];
const KISAN_KIDS_QUESTIONS=["Fasal ko paani kyun chahiye?","Tractor kya karta hai?","Kisan mandi kyun jaata hai?"];
function normalizeKisanLesson(lesson={}){return {...lesson,title:lesson.title||"",explanation:lesson.explanation||lesson.description||"",farmerName:lesson.farmerName||lesson.personName||"",village:lesson.village||lesson.villageName||"",district:lesson.district||"",state:lesson.state||"",photoUrl:lesson.photoUrl||lesson.imageUrl||"",videoUrl:lesson.videoUrl||"",audioUrl:lesson.audioUrl||lesson.voiceUrl||""};}
