import {
  collection, addDoc, getDocs, getDoc, deleteDoc, doc, updateDoc,
  serverTimestamp, query, where, orderBy, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { db, auth } from "./firebase-config.js";

const IMGBB_API_KEY = "e84ab1cea009540780712f8c85910840";
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
      ${v.ownerUid===uid()?`<button onclick="handleDeleteVillage('${esc(v.id)}',event)" class="owner-delete shrink-0">Delete</button>`:""}
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
  const mine=currentUser?.uid===p.ownerUid;
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
    ${p.imageUrl?`<img src="${esc(p.imageUrl)}" class="post-photo" onclick="openImageViewer(this.src)" loading="lazy">`:``}
    <div class="px-4 pt-3 pb-2"><p class="text-sm leading-relaxed">${esc(p.text)}</p></div>
    <div class="post-actions">
      <button onclick="toggleLike('${p.id}',event)">❤️ Like</button>
      <button onclick="openComments('${p.id}')">💬 Comment</button>
      <button onclick="handleShare('${esc(villageName)}',event)">↗ Share</button>
      ${mine?`<button onclick="handleEdit('${p.id}',event)" class="owner-edit">Edit</button><button onclick="handleDelete('${p.id}',event)" class="owner-delete">Delete</button>`:``}
    </div>
  </article>`;
}

function renderPosts(posts,container){
  if(!container)return;
  container.innerHTML=posts.length?posts.map(postCard).join(""):`<div class="empty">Abhi koi post nahi hai. Pehli village photo aap post kar sakte ho.</div>`;
}

async function galleryLikeCount(villageId,index){
  const snap=await getDocs(collection(db,"villagesListings",villageId,"galleryLikes",String(index),"users"));
  return snap.size;
}

async function toggleGalleryLike(villageId,index,event){
  event?.stopPropagation();
  if(!requireLogin())return;
  const ref=doc(db,"villagesListings",villageId,"galleryLikes",String(index),"users",uid());
  const snap=await getDoc(ref);
  if(snap.exists()) await deleteDoc(ref);
  else await setDoc(ref,{uid:uid(),createdAt:serverTimestamp()});
  await loadVillagePosts();
}

async function openGalleryComments(villageId,index){
  if(!requireLogin())return;
  const snap=await getDocs(query(collection(db,"villagesListings",villageId,"galleryComments",String(index),"items"),orderBy("createdAt","desc")));
  $("genericTitle").textContent="💬 Comments";
  $("genericBody").innerHTML=`<div class="space-y-2">${snap.docs.map(d=>{const x=d.data();return `<div class="info-box"><b>${esc(x.author||"User")}</b><p>${esc(x.text||"")}</p></div>`}).join("")||`<p class="empty">No comments yet.</p>`}</div><form onsubmit="addGalleryComment(event,'${villageId}',${index})" class="flex gap-2 mt-3"><input id="galleryCommentText" required class="input flex-1" placeholder="Write a comment..."><button class="primary">Post</button></form>`;
  openModal("genericModal");
}

async function addGalleryComment(e,villageId,index){
  e.preventDefault();
  if(!requireLogin())return;
  const input=$("galleryCommentText");
  const text=input?.value.trim();
  if(!text)return;
  await addDoc(collection(db,"villagesListings",villageId,"galleryComments",String(index),"items"),{
    uid:uid(),author:currentUser.displayName||"User",text,createdAt:serverTimestamp()
  });
  closeModal("genericModal");
  await loadVillagePosts();
}

async function renderVillageGallery(v,c){
  const gallery=v.images||[];
  if(!gallery.length)return "";
  const cards=await Promise.all(gallery.map(async(img,index)=>{
    const likes=await galleryLikeCount(v.id,index);
    const mineRef=doc(db,"villagesListings",v.id,"galleryLikes",String(index),"users",uid()||"guest");
    const mine=uid()? (await getDoc(mineRef)).exists() : false;
    return `<article class="post-card">
      <div class="post-top">
        <div class="mini-avatar">🌾</div>
        <div class="min-w-0"><b>${esc(v.vName)}</b><small>🏘️ ${esc(v.vName)} · 📍 ${esc(v.vDistrict)}, ${esc(v.vState)}</small></div>
      </div>
      <img src="${esc(img)}" class="post-photo" onclick="openImageViewer(this.src)" loading="lazy">
      <div class="post-actions">
        <button onclick="toggleGalleryLike('${esc(v.id)}',${index},event)">❤️ ${mine?"Unlike":"Like"}${likes?` ${likes}`:""}</button>
        <button onclick="openGalleryComments('${esc(v.id)}',${index})">💬 Comment</button>
        <button onclick="handleShare('${esc(v.vName)}',event)">↗ Share</button>
      </div>
    </article>`;
  }));
  return cards.join("");
}

async function loadVillagePosts(){
  const c=$("villageSectionFeed");
  try{
    const snap=await getDocs(query(collection(db,"posts"),where("villageId","==",currentVillage.id)));
    const posts=snap.docs.map(d=>({id:d.id,...d.data()})).filter(p=>p.postType!=="chaupal").sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
    const galleryHtml=await renderVillageGallery(currentVillage,c);
    c.innerHTML=galleryHtml + (posts.length?posts.map(postCard).join(""):`${galleryHtml?"":"<div class='empty'>Abhi koi post nahi hai.</div>"}`);
  }catch(e){console.error(e);c.innerHTML=`<div class="empty">Feed load nahi ho paaya.</div>`;}
}

function filterExplore(term){
  const q=term.trim().toLowerCase();
  if(!q){ renderVillageCards(villages,$("homeVillagesList")); return; }
  const matching=villages.filter(v=>{
    const hay=[v.vName,v.vDistrict,v.vState,v.vDescription,v.hostName,...(v.activities||[]).map(a=>a.name)].join(" ").toLowerCase();
    return hay.includes(q);
  });
  renderVillageCards(matching,$("homeVillagesList"));
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
  renderVillageExtras();
}

function renderVillageHeader(){
  const v=currentVillage;
  const following=currentUser && Array.isArray(v.followers) && v.followers.includes(currentUser.uid);
  $("villageHeader").innerHTML=`<div class="section-card overflow-hidden p-0"><div class="village-profile-cover">${v.images?.[0]?`<img src="${esc(v.images[0])}">`:``}<div class="cover-gradient"></div><div class="village-profile-info"><div class="avatar">🌾</div><div class="flex-1"><h2 class="text-xl font-black text-white">${esc(v.vName)}</h2><p class="text-[11px] text-white/80">📍 ${esc(v.vDistrict)}, ${esc(v.vState)}</p><p class="text-[10px] text-white/80 mt-1">${v.images?.length||0} photos · ${v.followers?.length||0} followers</p></div><button onclick="toggleFollow('${v.id}',event)" class="profile-follow ${following?'following':''}">${following?'✓ Following':'Follow'}</button></div></div></div>`;
}

async function loadVillagePosts(){
  const c=$("villageSectionFeed");
  try{
    const snap=await getDocs(query(collection(db,"posts"),where("villageId","==",currentVillage.id)));
    const posts=snap.docs.map(d=>({id:d.id,...d.data()})).filter(p=>p.postType!=="chaupal").sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
    renderPosts(posts,c);
  }catch(e){c.innerHTML=`<div class="empty">Feed load nahi ho paaya.</div>`;}
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
  ["feed","details","activities","packages"].forEach(x=>$("villageSection"+x.charAt(0).toUpperCase()+x.slice(1)).classList.toggle("hidden",x!==name));
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
  if(snap.exists())await deleteDoc(ref);else await setDoc(ref,{uid:uid(),createdAt:serverTimestamp()});
  if(currentVillage?.id){await loadVillagePosts();}
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

async function uploadToImgBB(file){
  const fd=new FormData();fd.append("image",file);
  const r=await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,{method:"POST",body:fd});
  const d=await r.json();if(!r.ok||!d.success)throw new Error("Image upload failed");return d.data.url;
}

async function handleImgBBPhotoPost(event){
  event.preventDefault();if(!requireLogin())return;
  const btn=$("submitBtn");btn.disabled=true;btn.textContent="Publishing...";
  try{
    const file=$("storyImageFile").files?.[0];
    const imageUrl=file?await uploadToImgBB(file):"";
    const postType=$("postType").value||"village";
    const village=villages.find(v=>v.id===$("storyVillage").value);
    if(postType==="village" && !village)throw new Error("Village select karein.");
    await addDoc(collection(db,"posts"),{
      ownerUid:uid(),author:currentUser.displayName||$("storyAuthor").value.trim(),
      location:$("storyLocation").value.trim()||(village?.vName||"Chaupal"),
      villageId:village?.id||null,villageName:village?.vName||"",
      vDistrict:village?.vDistrict||"",vState:village?.vState||"",
      text:$("storyText").value.trim(),imageUrl,postType,
      createdAt:serverTimestamp()
    });
    $("chaupalPostForm").reset();
    $("postType").value="village";
    $("storyVillage").required=true;
    $("storyText").placeholder="Caption / story";
    closeModal("addStoryModal");
    await loadAllPosts();
    if(village?.id && currentVillage?.id===village.id)await loadVillagePosts();
    loadHome();
    alert("Post published.");
  }catch(e){alert("Post failed: "+e.message);}finally{btn.disabled=false;btn.textContent="Publish Post";}
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

async function handleDeleteVillage(id,event){
  event?.stopPropagation();
  if(!requireLogin())return;
  const v=villages.find(x=>x.id===id);
  if(!v)return;
  if(v.ownerUid!==uid()){alert("Sirf apna listed village delete kar sakte ho.");return;}
  if(!confirm(`${v.vName} village listing delete karni hai?`))return;
  await deleteDoc(doc(db,"villagesListings",id));
  villages=villages.filter(x=>x.id!==id);
  if(currentVillage?.id===id){currentVillage=null;goHome();}
  loadHome();
  alert("Village listing delete ho gayi.");
}

async function handleVillageListing(event){
  event.preventDefault();if(!requireLogin())return;
  const btn=$("listSubmitBtn");btn.disabled=true;btn.textContent="Publishing...";
  try{
    const files=[...($('villageGalleryFiles').files||[])];const images=[];for(const f of files)images.push(await uploadToImgBB(f));
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
    const url=await uploadToImgBB(file);
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

Object.assign(window,{openModal,closeModal,openLogin:showLoginGate,googleLogin,openDrawer,closeDrawer,goHome,selectState,filterExplore,openVillage,goBackFromVillage,toggleFollow,showVillageSection,openPostModal,handleImgBBPhotoPost,handleVillageListing,addActivityRow,addPackageRow,toggleLike,savePost,openComments,addComment,handleEdit,handleDelete,handleDeleteVillage,handleShare,openWedding,openChaupal,submitWedding,showMyListings,showMyHosts,showMyWeddings,openSettings,openPrivacy,saveSetting,logout,openImageViewer,closeImageViewer,handleProfilePhoto,toggleGalleryLike,openGalleryComments,addGalleryComment});

fillStates();renderStates();addActivityRow();addPackageRow();

onAuthStateChanged(auth,async user=>{
  currentUser=user;
  updateAuthUI();
  if(!user){showLoginGate();return;}
  showApp();
  // Render the shell as soon as possible; data fills in progressively.
  await loadVillages();
  loadHome();
  await loadProfilePhoto();
  await loadAllPosts();
  loadHome();
  // Followers are secondary data; update them in the background.
  Promise.all(villages.map(v=>refreshVillageFollowers(v.id).catch(()=>{})))
    .then(()=>{ renderVillageCards(villages,$("homeVillagesList")); });
});
