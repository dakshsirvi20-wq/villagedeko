
let firebaseAuth=null, firestoreDb=null, googleProvider=null, firebaseUser=null;
let firebaseReady=false;
async function initFirebase(){
 try{
  const cfg=await import('./villagedeko-config.js');
  const [{initializeApp},{getAuth,GoogleAuthProvider,onAuthStateChanged,signInWithPopup,signOut},{getFirestore,doc,setDoc,getDoc,deleteDoc,collection,getDocs,query,where}]=await Promise.all([
   import('https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js'),
   import('https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js'),
   import('https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js')
  ]);
  const app=initializeApp(cfg.FIREBASE_CONFIG);
  firebaseAuth=getAuth(app); googleProvider=new GoogleAuthProvider(); firestoreDb=getFirestore(app); firebaseReady=true;
  window.VD_FIREBASE={doc,setDoc,getDoc,deleteDoc,collection,getDocs,query,where,signInWithPopup,signOut};
  onAuthStateChanged(firebaseAuth, async user=>{ firebaseUser=user||null; updateAuthUI(); await loadRemoteListing(); });
 }catch(err){console.warn('Firebase unavailable; local mode remains active.',err);}
}
function updateAuthUI(){ const b=document.querySelector('[data-action="google-signin"]'); if(b) b.textContent=firebaseUser?`Google: ${firebaseUser.displayName||firebaseUser.email||'Signed in'}`:'Continue with Google'; }
async function signInGoogle(){
 if(!firebaseReady){openModal('Firebase not ready','Firebase Authentication could not be loaded. Check your deployed domain and Firebase configuration.');return false;}
 try{await window.VD_FIREBASE.signInWithPopup(firebaseAuth,googleProvider);return true;}catch(e){console.error(e);openModal('Google Sign-in failed',e?.message||'Please try again.');return false;}
}
function restoreListingRowsFromFirestore(listing){
 if(!listing||typeof listing!=='object')return listing;
 const out={...listing};
 const rowTypes=['explore','experience','day','food','journey','people','culture'];
 for(const type of rowTypes){
  if(!Array.isArray(out[type]))continue;
  out[type]=out[type].map(row=>{
   if(Array.isArray(row))return row;
   if(row&&typeof row==='object'){
    const keys=Object.keys(row).sort((a,b)=>Number(a)-Number(b));
    if(keys.length&&keys.every((k,i)=>k===String(i)))return keys.map(k=>row[k]);
   }
   return row;
  });
 }
 return out;
}

function makeListingFirestoreSafe(listing){
 if(!listing||typeof listing!=='object')return listing;
 const out={...listing};
 const rowTypes=['explore','experience','day','food','journey','people','culture'];
 // Firestore does not allow arrays directly nested inside arrays. Convert only the
 // repeatable form rows for Firestore; the UI/local data keeps its existing shape.
 for(const type of rowTypes){
  if(!Array.isArray(out[type]))continue;
  out[type]=out[type].map(row=>{
   if(!Array.isArray(row))return row;
   const obj={};
   row.forEach((value,index)=>{obj[String(index)]=value;});
   return obj;
  });
 }
 return out;
}

function dedupeVillagesByIdentity(items){
 const out=[]; const seen=new Set();
 for(const v of Array.isArray(items)?items:[]){
  if(!v)continue;
  const key=v.ownerUid||v.id||`${v.name||''}|${v.district||''}|${v.state||''}`;
  if(seen.has(key))continue;
  seen.add(key); out.push(v);
 }
 return out;
}

async function loadRemoteListing(){
 if(!firestoreDb)return;
 try{
  // Load all published village listings from Firestore so a village does not
  // disappear after refresh, device change, or localStorage loss.
  const snap=await window.VD_FIREBASE.getDocs(window.VD_FIREBASE.collection(firestoreDb,'villages'));
  const remoteVillages=[];
  snap.forEach(docSnap=>{
   const raw=docSnap.data()||{};
   const listing=restoreListingRowsFromFirestore(raw.listing);
   const village=listingToVillage(listing);
   if(village){
    village.id=docSnap.id===''+(firebaseUser?.uid||'')?'my-listing':`remote-${docSnap.id}`;
    village.ownerUid=raw.ownerUid||docSnap.id;
    remoteVillages.push(village);
    if(firebaseUser&&docSnap.id===firebaseUser.uid){
     localStorage.setItem('villagedeko_my_village_listing',JSON.stringify(listing));
    }
   }
  });
  // Replace the previous remote snapshot before merging. This prevents stale
  // remote/my-listing cards from surviving refresh, sign-out, or account changes.
  for(let i=villages.length-1;i>=0;i--){
   if(String(villages[i].id).startsWith('remote-')||villages[i].id==='my-listing')villages.splice(i,1);
  }
  remoteVillages.forEach(v=>villages.unshift(v));
  if(firebaseUser){
   syncSavedListingIntoVillages();
   currentVillage=villages.find(v=>v.id==='my-listing')||currentVillage;
  }else if(currentVillage?.id==='my-listing'){
   currentVillage=villages[0]||null;
  }
  const unique=dedupeVillagesByIdentity(villages);
  villages.splice(0,villages.length,...unique);
  if(currentVillage){
   currentVillage=villages.find(v=>v.id===currentVillage.id||v.ownerUid===currentVillage.ownerUid)||currentVillage;
  }
  renderVillages(selectedState||'all');
  if(currentVillage) renderProfile();
 }catch(e){
  // Never delete local listing data when a remote read temporarily fails.
  console.warn('Remote village load failed; keeping local listing.',e);
  if(firebaseUser)syncSavedListingIntoVillages();
  renderVillages(selectedState||'all');
 }
}
async function getFileFingerprint(file){
 if(!file||!file.size)return '';
 if(window.crypto?.subtle){
  const buffer=await file.arrayBuffer();
  const digest=await crypto.subtle.digest('SHA-256',buffer);
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
 }
 return `${file.name}|${file.size}|${file.lastModified}|${file.type}`;
}

function mediaFingerprintKey(file,fingerprint){
 return `${fingerprint||file?.name||''}|${file?.size||0}|${file?.type||''}`;
}

async function uploadCloudinary(file,fingerprint=''){
 const cfg=await import('./villagedeko-config.js');
 if(!file||!file.size)return null;
 const fd=new FormData(); fd.append('file',file); fd.append('upload_preset',cfg.CLOUDINARY_UPLOAD_PRESET);
 const res=await fetch(`https://api.cloudinary.com/v1_1/${cfg.CLOUDINARY_CLOUD_NAME}/${file.type.startsWith('video/')?'video':'image'}/upload`,{method:'POST',body:fd});
 if(!res.ok)throw new Error('Cloudinary upload failed');
 const j=await res.json();
 return {url:j.secure_url,publicId:j.public_id,resourceType:j.resource_type,width:j.width||null,height:j.height||null,bytes:j.bytes||null,format:j.format||null,fileFingerprint:fingerprint,fileName:file.name,fileType:file.type,fileSize:file.size,fileLastModified:file.lastModified};
}

function sameMediaFile(media,file,fingerprint){
 if(!media||!file)return false;
 if(media.fileFingerprint&&fingerprint)return media.fileFingerprint===fingerprint;
 return !!(media.fileName===file.name && Number(media.fileSize||0)===Number(file.size||0) && media.fileType===file.type);
}

async function reuseOrUploadCloudinary(file,existingMedia=[]){
 if(!file||!file.size)return null;
 const fingerprint=await getFileFingerprint(file);
 const existing=(Array.isArray(existingMedia)?existingMedia:[]).find(m=>sameMediaFile(m,file,fingerprint));
 if(existing?.url)return existing;
 return uploadCloudinary(file,fingerprint);
}

async function persistVillageToFirebase(data){
 if(!firebaseUser||!firestoreDb)throw new Error('Please continue with Google first.');
 const f=document.getElementById('village-listing-form');
 const cover=f?.elements.coverPhoto?.files?.[0]; const photos=[...(f?.elements.galleryPhotos?.files||[])]; const videos=[...(f?.elements.galleryVideos?.files||[])];

 // Always read the latest Firestore listing before uploading. This prevents a refresh,
 // stale localStorage, or a fast repeated save from uploading the same media again.
 let remoteExisting={};
 try{
  const remoteSnap=await window.VD_FIREBASE.getDoc(window.VD_FIREBASE.doc(firestoreDb,'villages',firebaseUser.uid));
  if(remoteSnap.exists())remoteExisting=restoreListingRowsFromFirestore(remoteSnap.data().listing)||{};
 }catch(e){
  console.warn('Could not read existing listing before media upload; using local copy.',e);
 }
 const localExisting=JSON.parse(localStorage.getItem('villagedeko_my_village_listing')||'null')||{};
 const existing=remoteExisting?.media?remoteExisting:(localExisting?.media?localExisting:{});
 const existingMedia=existing.media||{};

 const coverMedia=cover?await reuseOrUploadCloudinary(cover,existingMedia.cover?[existingMedia.cover]:[]):(existingMedia.cover||null);
 const uploadedPhotos=photos.length?await Promise.all(photos.map(file=>reuseOrUploadCloudinary(file,existingMedia.photos||[]))):null;
 const uploadedVideos=videos.length?await Promise.all(videos.map(file=>reuseOrUploadCloudinary(file,existingMedia.videos||[]))):null;

 // De-duplicate the stored arrays by fingerprint/publicId/URL as a second safety net.
 const uniqueMedia=list=>{
  const seen=new Set();
  return (Array.isArray(list)?list:[]).filter(m=>{
   const key=m?.fileFingerprint||m?.publicId||m?.url;
   if(!key||seen.has(key))return false;
   seen.add(key); return true;
  });
 };
 const mergedPhotos=uniqueMedia([...(existingMedia.photos||[]),...(uploadedPhotos||[])]);
 const mergedVideos=uniqueMedia([...(existingMedia.videos||[]),...(uploadedVideos||[])]);

 data.media={
  cover:coverMedia,
  photos:mergedPhotos,
  videos:mergedVideos
 };
 data.ownerUid=firebaseUser.uid; data.ownerName=firebaseUser.displayName||''; data.ownerEmail=firebaseUser.email||''; data.updatedAt=new Date().toISOString();
 const firestoreListing=makeListingFirestoreSafe(data);
 await window.VD_FIREBASE.setDoc(window.VD_FIREBASE.doc(firestoreDb,'villages',firebaseUser.uid),{listing:firestoreListing,ownerUid:firebaseUser.uid,ownerName:data.ownerName,ownerEmail:data.ownerEmail,updatedAt:data.updatedAt},{merge:true});
 return data;
}
initFirebase();
const villages=[
{id:'kuthar',name:'Kuthar Village',district:'Jodhpur District',state:'Rajasthan',cover:'hero-cows.jpg',about:'A living desert village experience with traditional homes, farming, craft, food and warm local hospitality.',best:'Oct – March',reach:'Jodhpur Airport · 85 km',language:'Marwari · Hindi'},
{id:'majuli',name:'Majuli Village',district:'Majuli District',state:'Assam',cover:'hero-cows.jpg',about:'Island village life, river landscapes, mask making, local food and living traditions.',best:'Nov – April',reach:'Jorhat · Ferry',language:'Assamese · Mising'},
{id:'hampi',name:'Hampi Village',district:'Vijayanagara',state:'Karnataka',cover:'hero-cows.jpg',about:'Village life beside historic landscapes, local farms, food, crafts and heritage.',best:'Oct – February',reach:'Hospet · 15 km',language:'Kannada · Hindi'},
{id:'bhuj',name:'Bhujodi Village',district:'Kutch District',state:'Gujarat',cover:'hero-cows.jpg',about:'Textiles, crafts, food and artisan traditions of rural Kutch.',best:'Nov – February',reach:'Bhuj · 10 km',language:'Gujarati · Hindi'},
{id:'punjab',name:'Rural Punjab Village',district:'Amritsar District',state:'Punjab',cover:'hero-cows.jpg',about:'Fields, dairy, Punjabi food, folk music and everyday village hospitality.',best:'Oct – March',reach:'Amritsar · 30 km',language:'Punjabi · Hindi'}];
const stories=[
{title:'40 years of farming, one field at a time.',tag:'Village Life',category:'village-life',person:'Gopal Singh · Farmer',text:'Gopal shares how one family field changed through four decades — from seed and water to harvest and mandi.',img:'hero-cows.jpg'},
{title:'The recipe our village remembers.',tag:'Local Food Story',category:'local-food',person:'Sita Devi · Local Cook',text:'A traditional meal, cooked slowly and explained by the person who has carried the recipe through generations.',img:'hero-cows.jpg'},
{title:'Clay, hands and a living craft.',tag:'People & Culture',category:'people-culture',person:'Hukamram · Potter',text:'Meet a village artisan and understand how local clay becomes everyday objects and keeps an old skill alive.',img:'hero-cows.jpg'},
{title:'The traditions that bring the village together.',tag:'Festivals / Traditions',category:'festivals-traditions',person:'Village Elders · Community Story',text:'A look at the shared customs, music, food and gatherings that keep village traditions alive across generations.',img:'hero-cows.jpg'},
{title:'My field, my life, my story.',tag:'Gaon Ke Log',category:'gaon-ke-log',person:'Ramesh ji · Farmer',text:'A farmer explains what a normal day in the field looks like, why each season matters and what farming means to his family.',img:'hero-cows.jpg'},
{title:'The animals are part of our family.',tag:'Gaon Ke Log',category:'gaon-ke-log',person:'Kamla Devi · Pashupalak',text:'A village livestock keeper shares the daily rhythm of feeding, caring for animals and the role dairy plays in village life.',img:'hero-cows.jpg'},
{title:'Keeping an old craft alive.',tag:'Gaon Ke Log',category:'gaon-ke-log',person:'Mohan ji · Local Artisan',text:'A local artisan shares how a traditional skill is learned, practiced and passed from one generation to the next.',img:'hero-cows.jpg'}
];
const experiences=[
['activities','Farm Visit','2 Hours · Sow, harvest, feed animals and walk the fields','700','hero-cows.jpg'],
['activities','Pottery Workshop','1.5 Hours · Shape clay with a local village artisan','800','hero-cows.jpg'],
['food','Traditional Thali','2 Hours · Help prepare and eat a traditional local meal','450','hero-cows.jpg'],
['culture','Folk Evening','2 Hours · Music, dance, stories and local traditions','500','hero-cows.jpg']
];
const villageExperiences={
'kuthar':experiences,
'majuli':[['activities','Island Farming','2 Hours · Walk the fields and learn local farming','650','hero-cows.jpg'],['food','Assamese Cooking','2 Hours · Cook a traditional village meal with a host','500','hero-cows.jpg'],['culture','Folk Culture Evening','2 Hours · Music, dance and village stories','550','hero-cows.jpg']],
'kuttanad':[['activities','Backwater Village Walk','2 Hours · Walk village paths and meet local families','700','hero-cows.jpg'],['food','Kerala Home Cooking','2 Hours · Prepare a traditional local lunch','600','hero-cows.jpg'],['culture','Village Life Evening','2 Hours · Local stories, music and traditions','500','hero-cows.jpg']]
};
function getVillageExperiences(){return villageExperiences[currentVillage?.id]||experiences;}



const ekDinGaonMein=[
['05:30 AM','Gaon ki subah','Pehli roshni ke saath gaon jaagta hai — galiyon, aangan aur kheton mein din ki shuruaat.','🌅'],
['06:00 AM','Pashu / Dairy','Pashuon ki dekhbhal, doodh nikalna aur subah ke dairy kaam ko paas se samjho.','🐄'],
['07:00 AM','Khet','Khet mein din ka kaam — fasal, mitti, paani aur kisani ki asli zindagi.','🌾'],
['09:00 AM','Chai / Nashta','Ghar ki chai aur nashta — local ingredients ke saath gaon ki subah ka swaad.','☕'],
['11:00 AM','Village Work','Gaon mein din ke alag-alag kaam: kheti, ghar, pashupalan aur local kaarigari.','🧺'],
['01:00 PM','Ghar ka khana','Ghar mein bana local khana aur uske peeche ki ingredients ki kahani.','🍲'],
['03:00 PM','Dopahar','Dopahar ki shaanti — aangan, chaupal aur rozmarra ki dheemi gaon ki zindagi.','🌤️'],
['05:00 PM','Village Life','Shaam ke waqt logon ki mulaqat, bachchon ki khel, pashu aur gaon ki raunak.','🏡'],
['07:00 PM','Mandir / Bhajan','Mandir, bhajan aur shaam ki paramparaon ke saath gaon ki community life.','🛕'],
['09:00 PM','Gaon ki raat','Din dheere-dheere khatam hota hai — shaant galiyan, gharon ki roshni aur gaon ki raat.','🌙']
];
function renderEkDinGaonMein(){
 const root=document.getElementById('experience-list'); if(!root)return;
 root.innerHTML=`<article class="ek-din-card"><div class="ek-din-head"><div><span class="eyebrow">EK DIN GAON MEIN</span><h3>Gaon ka ek poora din</h3><p>Subah ki pehli roshni se gaon ki raat tak — ek din ko step by step dekho, samjho aur experience karo.</p></div><span class="ek-din-time">05:30 AM → 09:00 PM</span></div><div class="ek-din-timeline">${ekDinGaonMein.map((x,i)=>`<button class="ek-din-slot${i===0?' active':''}" data-action="ek-din-slot" data-ekdin="${i}"><span class="ek-din-icon">${x[3]}</span><small>${x[0]}</small><strong>${x[1]}</strong><span class="ek-din-arrow">→</span></button>`).join('')}</div><div class="ek-din-detail" id="ek-din-detail"><span>${ekDinGaonMein[0][0]}</span><h4>${ekDinGaonMein[0][1]}</h4><p>${ekDinGaonMein[0][2]}</p><b>📍 ${currentVillage.name} · ${currentVillage.district} · ${currentVillage.state}</b></div></article>`;
}

const tripPackages={
  'kuthar':[{name:'Kuthar Village Essentials',duration:'1 Day',stay:'Local village homestay',food:'Breakfast + traditional lunch',culture:'Village walk, local stories and everyday village life',included:['Farm Visit','Traditional Thali','Village host & local guide'],notIncluded:['Transport to Kuthar','Personal shopping','Travel insurance'],host:'Kuthar Village Host Collective',availability:'Available Oct – March',price:2450},{name:'Kuthar Farming & Culture Escape',duration:'2 Days / 1 Night',stay:'Heritage mud-house homestay',food:'Breakfast, lunch & dinner',culture:'Farming life, folk evening and local traditions',included:['Farm Visit','Pottery Workshop','Traditional Thali','Folk Evening','1 night stay'],notIncluded:['Travel to/from village','Alcoholic drinks','Personal expenses'],host:'Kuthar Village Host Collective',availability:'Available Oct – March',price:5200},{name:'Kuthar Full Village Immersion',duration:'3 Days / 2 Nights',stay:'Heritage mud-house homestay',food:'All village meals',culture:'Farming, craft, food, music and daily village life',included:['Farm Visit','Pottery Workshop','Traditional Thali','Folk Evening','2 nights stay','Local host support'],notIncluded:['Transport to/from village','Shopping','Insurance'],host:'Kuthar Village Host Collective',availability:'Available Oct – March',price:7600}],
  'majuli':[{name:'Majuli Village Day',duration:'1 Day',stay:'Local family homestay',food:'Breakfast + Assamese village lunch',culture:'Island village walk and local stories',included:['Island Farming','Assamese Cooking','Folk Culture Evening'],notIncluded:['Ferry/transport to Majuli','Personal expenses','Insurance'],host:'Majuli Village Host Collective',availability:'Available Nov – April',price:2200},{name:'Majuli Living Culture',duration:'2 Days / 1 Night',stay:'Local family homestay',food:'All local meals',culture:'Farming, cooking, music and living island traditions',included:['Island Farming','Assamese Cooking','Folk Culture Evening','1 night stay'],notIncluded:['Jorhat travel','Personal shopping','Insurance'],host:'Majuli Village Host Collective',availability:'Available Nov – April',price:4700}],
  'hampi':[{name:'Hampi Village Day',duration:'1 Day',stay:'Village homestay',food:'Breakfast + local lunch',culture:'Village paths, farms and heritage-side village life',included:['Farm Visit','Traditional Thali','Local village guide'],notIncluded:['Transport to Hampi','Entry tickets where applicable','Personal expenses'],host:'Hampi Village Host Collective',availability:'Available Oct – February',price:2400}],
  'bhuj':[{name:'Bhujodi Craft & Food Day',duration:'1 Day',stay:'Artisan village homestay',food:'Breakfast + local Gujarati meal',culture:'Craft traditions, artisan life and village food',included:['Pottery Workshop','Traditional Thali','Local artisan host'],notIncluded:['Transport to Bhujodi','Shopping purchases','Insurance'],host:'Bhujodi Village Host Collective',availability:'Available Nov – February',price:2500}],
  'punjab':[{name:'Rural Punjab Village Day',duration:'1 Day',stay:'Punjabi village homestay',food:'Breakfast + Punjabi village meal',culture:'Fields, dairy, folk music and village hospitality',included:['Farm Visit','Traditional Thali','Folk Evening'],notIncluded:['Transport to village','Personal expenses','Insurance'],host:'Rural Punjab Village Host Collective',availability:'Available Oct – March',price:2600}]
};
function getTrips(){return tripPackages[currentVillage?.id]||[{name:`${currentVillage?.name||'Village'} Village Escape`,duration:'1 Day',stay:'Local village homestay',food:'Breakfast + traditional local meal',culture:'Local village life, stories and activities',included:getVillageExperiences().slice(0,3).map(e=>e[1]),notIncluded:['Transport to the village','Personal expenses','Insurance'],host:'Local Village Host',availability:`Available ${currentVillage?.best||'seasonal'}`,price:2500}];}
function renderTrips(){const title=document.getElementById('trip-village-title');if(title)title.textContent=`Trips in ${currentVillage.name}`;const grid=document.getElementById('trip-grid');if(!grid)return;grid.innerHTML=getTrips().map((t,i)=>`<article class="trip-card"><div class="trip-image"><img src="${currentVillage.cover}" alt="${t.name}"><span>${t.duration}</span></div><div class="trip-body"><span class="trip-label">COMPLETE VILLAGE PACKAGE</span><h3>${t.name}</h3><p class="trip-location">${currentVillage.name} · ${currentVillage.district} · ${currentVillage.state}</p><div class="trip-facts"><span><b>Stay</b>${t.stay}</span><span><b>Food</b>${t.food}</span><span><b>Host</b>${t.host}</span><span><b>Availability</b>${t.availability}</span></div><div class="trip-block"><b>Experiences / Activities</b><div class="trip-chips">${t.included.slice(0,4).map(x=>`<span>${x}</span>`).join('')}</div></div><div class="trip-columns"><div><b>What's Included</b><ul>${t.included.map(x=>`<li>${x}</li>`).join('')}</ul></div><div><b>What's Not Included</b><ul>${t.notIncluded.map(x=>`<li>${x}</li>`).join('')}</ul></div></div><div class="trip-footer"><div><small>Total Trip Price</small><strong>₹${t.price.toLocaleString('en-IN')}</strong></div><button class="primary" data-action="book-trip" data-trip="${i}">Book Trip</button></div></div></article>`).join('');}
const products=[['Handmade Pottery','Made by local artisans','650','hero-cows.jpg'],['Local Textiles','Village-made craft','750','hero-cows.jpg'],['Organic Honey','From village farms','550','hero-cows.jpg']];
const states=['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry'];
let currentVillage=villages[0], selectedState='all';
const slides=[...document.querySelectorAll('.slide')],modal=document.getElementById('modal'),modalContent=document.getElementById('modal-content');
function showSlide(id){
const target=document.getElementById(id);if(!target)return;
// HARD NAVIGATION RULE: exactly one main slide is visible at a time.
// Home is the only slide allowed to display the photographic cows hero.
slides.forEach(s=>{
  const isTarget=s===target;
  s.classList.toggle('active',isTarget);
  s.setAttribute('aria-hidden',isTarget?'false':'true');
  s.hidden=!isTarget;
  s.style.setProperty('display',isTarget?(s.id==='slide-home'?'flex':'block'):'none','important');
});
// Extra guard: the Home hero background/copy can never render on non-Home pages.
if(target.id!=='slide-home'){
  const home=document.getElementById('slide-home');
  if(home){
    home.hidden=true;
    home.classList.remove('active');
    home.setAttribute('aria-hidden','true');
    home.style.setProperty('display','none','important');
  }
}
document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.nav===id));
window.scrollTo({top:0,behavior:'auto'});
}
function openModal(title,text,extra=''){modalContent.innerHTML=`<h3>${title}</h3><p>${text}</p>${extra}<button class="primary" data-action="close">Done</button>`;modal.classList.add('show')}
function closeModal(){modal.classList.remove('show')}
function renderStates(){document.getElementById('state-slider').innerHTML=`<button class="state-card active" data-state="all"><span class="state-no">ALL INDIA</span><h3>All India</h3><p>${states.length} regions</p></button>`+states.map((s,i)=>`<button class="state-card" data-state="${s}"><span class="state-no">${String(i+1).padStart(2,'0')}</span><h3>${s}</h3><p>Explore villages</p></button>`).join('')}
function populateStateFilter(){const el=document.getElementById('state-filter');if(!el)return;el.innerHTML='<option value="all">All states</option>'+states.map(s=>`<option value="${s}">${s}</option>`).join('')}
function getVillageFilters(){return {search:(document.getElementById('village-search')?.value||'').trim().toLowerCase(),state:(document.getElementById('state-filter')?.value||'all')}}
function renderVillages(state='all'){if(firebaseUser)syncSavedListingIntoVillages();const unique=dedupeVillagesByIdentity(villages);if(unique.length!==villages.length)villages.splice(0,villages.length,...unique);const uiState=document.getElementById('state-filter')?.value||'all';if(uiState!=='all'&&uiState!==state)state=uiState;selectedState=state;const {search}=getVillageFilters();let list=state==='all'?villages:villages.filter(v=>v.state===state);if(search)list=list.filter(v=>`${v.name} ${v.district} ${v.state}`.toLowerCase().includes(search));document.getElementById('selected-state-label').textContent=state==='all'?'All India':state;const empty=document.getElementById('empty-state');empty.hidden=list.length>0;empty.innerHTML=list.length?empty.innerHTML:`<strong>No villages found.</strong><p>Try another village name or district, choose another state, or clear the filters.</p>`;document.getElementById('village-grid').innerHTML=list.map(v=>`<article class="village-card" data-action="village" data-id="${v.id}" role="button" tabindex="0" aria-label="Open ${v.name} village profile"><img src="${v.cover}" alt="${v.name}"><div><span>${v.state}</span><h3>${v.name}</h3><p>${v.district} · ${v.state}</p><button type="button" data-action="village" data-id="${v.id}">Explore Village</button></div></article>`).join('');document.querySelectorAll('.state-card').forEach(x=>x.classList.toggle('active',x.dataset.state===state));const sf=document.getElementById('state-filter');if(sf)sf.value=state;document.getElementById('village-grid').scrollLeft=0}
function clearVillageFilters(){const q=document.getElementById('village-search');const sf=document.getElementById('state-filter');if(q)q.value='';if(sf)sf.value='all';renderVillages('all')}
function getSavedListing(){
 try{return JSON.parse(localStorage.getItem('villagedeko_my_village_listing')||'null')}catch(e){return null}
}
function esc(v=''){
 return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function listingToVillage(d){
 if(!d?.villageName)return null;
 const reach=[d.airport,d.railway,d.busRoad,d.localTransport,d.travelTime].filter(Boolean).join(' · ');
 const coverMedia=d.media?.cover;
 const coverUrl=typeof coverMedia==='string' ? coverMedia : (coverMedia?.url||'hero-cows.jpg');
 return {
  id:'my-listing',name:d.villageName,district:d.district||'',state:d.state||'',cover:coverUrl,
  about:d.about||'Village profile information provided by the village host.',
  best:d.bestTime||'Not listed',reach:reach||'Visit information not listed',language:d.languages||'Not listed',
  listing:d,fromListing:true
 };
}
function syncSavedListingIntoVillages(){
 const saved=listingToVillage(getSavedListing());
 if(!saved)return;
 const existingIndex=villages.findIndex(v=>v.id==='my-listing'||(v.ownerUid&&firebaseUser&&v.ownerUid===firebaseUser.uid));
 const normalized={...saved,id:'my-listing',ownerUid:firebaseUser?.uid||saved.ownerUid};
 if(existingIndex>=0){
  villages[existingIndex]=normalized;
 }else{
  villages.unshift(normalized);
 }
 // Remove any stale remote copy of the same owner's listing.
 for(let i=villages.length-1;i>=0;i--){
  if(villages[i]!==normalized && firebaseUser && villages[i]?.ownerUid===firebaseUser.uid)villages.splice(i,1);
 }
}
function profile6(v){return `<div class="profile-backbar"><button class="back-btn" data-action="back-to-explore">← Back to Explore</button></div><div class="profile-banner"><img src="${esc(v.cover)}" alt="${esc(v.name)}"><div class="profile-overlay"><span class="eyebrow">VILLAGE PROFILE</span><h2>${esc(v.name)}</h2><p>${esc(v.district)} · ${esc(v.state)}</p></div></div><div class="profile-body"><div><h3>About ${esc(v.name)}</h3><p>${esc(v.about)}</p></div><div class="facts"><span>☀ Best time<br><b>${esc(v.best)}</b></span><span>⌖ How to reach<br><b>${esc(v.reach)}</b></span><span>◉ Languages<br><b>${esc(v.language)}</b></span></div></div><div class="profile-tabs" id="profile-tabs"><button class="profile-tab active" data-p="1">1 · Overview</button><button class="profile-tab" data-p="2">2 · Explore</button><button class="profile-tab" data-p="3">3 · Experiences</button><button class="profile-tab" data-p="4">4 · Food</button><button class="profile-tab" data-p="5">5 · People & Stories</button><button class="profile-tab" data-p="6">6 · Stay & Wedding</button></div><div id="profile-pages">${profilePage(1,v)}</div>`}
function ensureProfileMediaStyles(){
 if(document.getElementById('villagedeko-profile-media-runtime-styles'))return;
 const s=document.createElement('style');
 s.id='villagedeko-profile-media-runtime-styles';
 s.textContent=`
 .profile-media-section{margin-top:22px}
 .profile-cover-media{width:100%;aspect-ratio:16/9;overflow:hidden;border-radius:20px;margin-bottom:18px;background:#eee}
 .profile-cover-media img{width:100%;height:100%;display:block;object-fit:cover}
 .profile-media-heading{display:flex;justify-content:space-between;align-items:center;margin:16px 0 10px;font-size:.78rem;letter-spacing:.08em}
 .profile-media-heading strong{font-size:.82rem;letter-spacing:0}
 .profile-media-grid,.profile-video-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
 .profile-media-item{margin:0;border-radius:16px;overflow:hidden;background:#eee;aspect-ratio:1/1}
 .profile-media-item img,.profile-media-item video{width:100%;height:100%;display:block;object-fit:cover}
 @media(max-width:640px){
   .profile-cover-media{border-radius:16px}
   .profile-media-grid,.profile-video-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
   .profile-media-item{border-radius:13px}
 }
 `;
 document.head.appendChild(s);
}
ensureProfileMediaStyles();
function profilePage(n,v){
 const common=`<div class="profile-page">`, d=v.listing||null;
 if(!d)return legacyProfilePage(n,v,common);
 if(n===1){
  const media=d.media||{};
  const cover=typeof media.cover==='string' ? media.cover : (media.cover?.url||'');
  const photos=Array.isArray(media.photos)?media.photos:[];
  const videos=Array.isArray(media.videos)?media.videos:[];
  const photoItems=photos.map((m,i)=>{
    const url=typeof m==='string'?m:(m?.url||'');
    return url?`<figure class="profile-media-item"><img src="${esc(url)}" alt="${esc(v.name)} photo ${i+1}" loading="lazy"></figure>`:'';
  }).join('');
  const videoItems=videos.map((m,i)=>{
    const url=typeof m==='string'?m:(m?.url||'');
    return url?`<figure class="profile-media-item"><video controls playsinline preload="metadata"><source src="${esc(url)}" type="${esc(m?.resourceType==='video'?'video/mp4':'video/mp4')}">Your browser does not support video playback.</video></figure>`:'';
  }).join('');
  const mediaBlock=(cover||photoItems||videoItems)?`
    <section class="profile-media-section">
      ${cover?`<div class="profile-cover-media"><img src="${esc(cover)}" alt="${esc(v.name)} cover photo" loading="lazy"></div>`:''}
      ${photoItems?`<div class="profile-media-heading"><span>PHOTOS</span><strong>${photos.length}</strong></div><div class="profile-media-grid">${photoItems}</div>`:''}
      ${videoItems?`<div class="profile-media-heading"><span>VIDEOS</span><strong>${videos.length}</strong></div><div class="profile-video-grid">${videoItems}</div>`:''}
    </section>`:'';
  return common+`<span class="eyebrow">SLIDE 1 · OVERVIEW</span><h3>${esc(v.name)}</h3><p>${esc(d.about||'Village overview')}</p><div class="mini-grid"><div class="profile-data-card"><small>PIN CODE</small><strong>${esc(d.pin||'Not listed')}</strong></div><div class="profile-data-card"><small>BEST TIME</small><strong>${esc(d.bestTime||'Not listed')}</strong></div><div class="profile-data-card"><small>LANGUAGES</small><strong>${esc(d.languages||'Not listed')}</strong></div><div class="profile-data-card"><small>VISIT INFO</small><strong>${esc(d.travelTime||d.airport||'Not listed')}</strong></div></div>${mediaBlock}<div class="form-note">This Overview and village media are coming directly from the village listing form.</div></div>`;
}
 if(n===2){const rows=d.explore||[];return common+`<span class="eyebrow">SLIDE 2 · EXPLORE</span><h3>Explore ${esc(v.name)}</h3><p>Real places added in the village listing form.</p><div class="mini-grid village-explore-grid">${rows.length?rows.map((x,i)=>`<article class="profile-data-card clickable-data" data-action="listing-place" data-index="${i}"><span class="data-icon">📍</span><small>${esc(x[1]||'Village Place')}</small><h4>${esc(x[0]||'Place')}</h4><p>${esc(x[2]||'')}</p></article>`).join(''):`<div class="empty-profile-data"><strong>No Explore places added yet.</strong><p>The village owner can add places from the Village Listing form.</p></div>`}</div></div>`}
 if(n===3){const rows=d.experience||[];return common+`<span class="eyebrow">SLIDE 3 · EXPERIENCES</span><h3>Experiences & Activities</h3><div class="experience-list">${rows.length?rows.map((x,i)=>`<article class="experience profile-form-experience" data-action="listing-experience" data-index="${i}"><div><span class="experience-kicker">${esc(x[1]||'EXPERIENCE')}</span><h3>${esc(x[0]||'Experience')}</h3><p>${esc(x[4]||'')}</p><small>${esc(x[2]||'')}</small></div><strong>₹${esc(x[3]||'0')} <small>/ person</small></strong></article>`).join(''):`<div class="empty-profile-data"><strong>No experiences added yet.</strong><p>Add activities from the Village Listing form.</p></div>`}</div></div>`}
 if(n===4){const foods=d.food||[], journey=d.journey||[];return common+`<span class="eyebrow">SLIDE 4 · FOOD</span><h3>Food Journey</h3><p>Local food and its journey are taken from the village listing form.</p><div class="journey">${journey.length?journey.map((x,i)=>`<button class="journey-stage" data-action="listing-journey" data-index="${i}">${esc(x[0]||'Stage')}${i<journey.length-1?' →':''}</button>`).join(''):`<span class="empty-inline">No journey stages added yet.</span>`}</div><div class="food-dishes">${foods.length?foods.map(x=>`<article class="profile-data-card"><small>${esc(x[1]||'LOCAL FOOD')}</small><h4>🍲 ${esc(x[0]||'Dish')}</h4><p>${esc(x[2]||'')}</p></article>`).join(''):`<div class="empty-profile-data"><strong>No local dishes added yet.</strong><p>Add dishes and journey stages from the Village Listing form.</p></div>`}</div></div>`}
 if(n===5){const people=d.people||[], culture=d.culture||[];return common+`<span class="eyebrow">SLIDE 5 · PEOPLE & STORIES</span><h3>People, Stories & Culture</h3><div class="story-mini-grid">${people.length?people.map((x,i)=>`<article class="profile-data-card clickable-data" data-action="listing-story" data-index="${i}"><span>${esc(x[1]||'Village Person')}</span><h3>${esc(x[2]||x[0]||'Village Story')}</h3><p>${esc(x[0]||'')}</p><p>${esc(x[3]||'')}</p></article>`).join(''):`<div class="empty-profile-data"><strong>No people or stories added yet.</strong><p>Add people and stories from the Village Listing form.</p></div>`}</div><div class="culture-strip"><b>Rural Culture</b>${culture.length?culture.map(x=>`<span>${esc(x[0]||'Culture')}</span>`).join(''):`<span>No culture items added yet</span>`}</div></div>`}
 return common+`<span class="eyebrow">SLIDE 6 · STAY & WEDDING</span><h3>Stay, Visit & Village Wedding</h3><div class="mini-grid"><div class="profile-data-card"><small>STAY</small><h4>${esc(d.stayAvailable||'Not listed')}</h4><p>${esc(d.stayDetails||'Stay details not added.')}</p>${d.stayPrice?`<strong>₹${esc(d.stayPrice)}</strong>`:''}</div><div class="profile-data-card"><small>WEDDING / EVENTS</small><h4>${esc(d.weddingAvailable||'Not listed')}</h4><p>${esc(d.weddingDetails||'Wedding/event details not added.')}</p>${d.weddingPrice?`<strong>₹${esc(d.weddingPrice)}</strong>`:''}</div></div><p class="form-note">Stay and Wedding information shown here is taken directly from the listing form.</p></div>`;
}
function legacyProfilePage(n,v,common){if(n===1)return common+`<span class="eyebrow">SLIDE 1</span><h3>Welcome to ${esc(v.name)}</h3><p>Explore the village as a tourism experience — its landscape, homes, people, daily life and places worth visiting.</p><div class="mini-grid"><button class="secondary" data-action="photos">Village Photos</button><button class="secondary" data-action="videos">Village Videos</button><button class="primary" data-action="plan">Plan Your Visit</button></div></div>`;if(n===2)return common+`<span class="eyebrow">SLIDE 2</span><h3>Explore the Village</h3><p>Discover this village section by section — places, daily life, food and culture.</p><div class="mini-grid village-explore-grid"><button class="secondary" data-action="place" data-place="Khet">🌾 Khet</button><button class="secondary" data-action="place" data-place="Dairy">🐄 Dairy</button><button class="secondary" data-action="place" data-place="Ghar & Daily Life">🏠 Ghar & Daily Life</button><button class="secondary" data-action="place" data-place="Mandir">🛕 Mandir</button><button class="secondary" data-action="place" data-place="Paani">💧 Paani</button><button class="secondary" data-action="place" data-place="School">🏫 School</button><button class="secondary" data-action="place" data-place="Local Market">🛍️ Local Market</button><button class="secondary" data-action="place" data-place="Local Food">🍲 Local Food</button><button class="secondary" data-action="place" data-place="Culture">🎵 Culture</button><button class="secondary" data-action="place" data-place="Local Art">🎨 Local Art</button></div></div>`;if(n===3)return common+`<span class="eyebrow">SLIDE 3</span><h3>Experiences & Activities</h3><div class="experience-list">${getVillageExperiences().map(e=>`<article class="experience"><img src="${esc(e[4])}"><div><h3>${esc(e[1])}</h3><p>${esc(e[2])}</p></div><strong>₹${esc(e[3])}</strong><button data-action="book">Book</button></article>`).join('')}</div></div>`;if(n===4)return common+`<span class="eyebrow">SLIDE 4</span><h3>Food Journey</h3><p>See how local food moves from village to your plate.</p><div class="journey">Seed <b>→</b> Field <b>→</b> Harvest <b>→</b> Mandi <b>→</b> Processing <b>→</b> Home <b>→</b> Plate</div><button class="primary" data-action="foodstory">Explore Local Food Stories</button></div>`;if(n===5)return common+`<span class="eyebrow">SLIDE 5</span><h3>People, Stories & Culture</h3><div class="story-mini-grid">${stories.map((s,i)=>`<article><img src="${esc(s.img)}"><span>${esc(s.tag)}</span><h3>${esc(s.title)}</h3><p>${esc(s.person)}</p><button class="secondary" data-action="story" data-story="${i}">Read Story</button></article>`).join('')}</div><div class="culture-strip"><b>Rural Culture</b><span>Folk Music</span><span>Festivals</span><span>Marriage Traditions</span><span>Local Art</span></div></div>`;return common+`<span class="eyebrow">SLIDE 6</span><h3>Stay, Visit & Village Wedding</h3><div class="mini-grid"><button class="secondary" data-action="reserve">Village Stay</button><button class="secondary" data-action="plan">Plan Village Visit</button><button class="primary" data-action="wedding">Village Wedding</button></div><p>Hosts can list stays, activities and wedding experiences and set their own prices.</p></div>`}
function foodJourneyMarkup(){
 return `<article class="experience food-journey-experience-card" data-type="food-journey" data-action="food-journey-open" role="button" tabindex="0"><div class="food-journey-card-icon">🌾</div><div><span class="experience-kicker">FOOD JOURNEY · KNOWLEDGE</span><h3>Khaana gaon se hamari plate tak kaise pahunchta hai?</h3><p>Beej se lekar plate tak khaane ka poora safar step by step samjho.</p></div><strong>9 stages</strong><button data-action="food-journey-open">Explore</button></article>`;
}

function renderFoodJourneyModal(){
 const stages=[['🌱','Beej','Sahi beej se kheti ka safar shuru hota hai.'],['🌾','Khet / Buwai','Beej mitti mein boya jaata hai aur fasal ugne lagti hai.'],['💧','Paani & Dekhbhal','Paani, mitti aur fasal ki dekhbhal zaroori hoti hai.'],['🌿','Fasal','Fasal pakti hai aur katai ke liye taiyaar hoti hai.'],['🌾','Katai','Pakki fasal ko khet se kaat kar jama kiya jaata hai.'],['🏪','Mandi','Fasal mandi tak pahunchti hai aur aage buyers/processors tak jaati hai.'],['⚙️','Processing','Anaj ya ingredient ko saaf, peesa ya process kiya jaata hai.'],['🏠','Ghar','Food ghar tak pahunchta hai aur rasoi mein taiyaar hota hai.'],['🍞','Plate','Aakhir mein poora safar hamari plate par complete hota hai.']];
 openModal('Food Journey — Knowledge', `<div class="food-journey-modal"><p class="modal-lead">Khaana sirf supermarket se shuru nahi hota. Uske peeche beej, khet, kisan aur poori journey hoti hai.</p><div class="journey">${stages.map((x,i)=>`<button class="journey-stage" data-action="food-journey-stage-modal" data-stage="${i}">${x[0]} ${x[1]}</button>${i<stages.length-1?'<b>→</b>':''}`).join('')}</div><div class="food-journey-detail" id="food-journey-modal-detail"><span>01</span><h4>${stages[0][1]}</h4><p>${stages[0][2]}</p></div><p class="knowledge-note">Ye abhi knowledge experience hai. Real farmer, real village, photo/video/voice ko future ke Real Food Journey step mein connect kiya jayega.</p></div>`);
}
function renderExperiences(filter='all'){
 const list=getVillageExperiences();
 const title=document.getElementById('experience-village-title');
 const root=document.getElementById('experience-list');
 if(title)title.textContent=`Experiences in ${currentVillage.name}`;
 if(!root)return;
 if(filter==='ek-din'){renderEkDinGaonMein();return;}
 if(filter==='food-journey'){root.innerHTML=foodJourneyMarkup();return;}
 const filtered=filter==='all'?list:list.filter(e=>e[0]===filter);
 const cards=filtered.map(e=>`<article class="experience" data-type="${e[0]}"><img src="${e[4]}"><div><h3>${e[1]}</h3><p>${e[2]}</p></div><strong>₹${e[3]} <small>/ person</small></strong><button data-action="book">Book</button></article>`).join('');
 const ek=filter==='all'?`<article class="experience ek-din-experience-card" data-type="ek-din" data-action="filter-ek-din" role="button" tabindex="0"><div class="ek-din-card-icon">🌅</div><div><span class="experience-kicker">EK DIN GAON MEIN</span><h3>Gaon ka ek poora din</h3><p>05:30 AM → 09:00 PM · Subah se raat tak gaon ki poori zindagi step by step.</p></div><strong>10 moments</strong><button data-action="filter-ek-din">Explore</button></article>`:'';
 const food=(filter==='food'||filter==='all')?foodJourneyMarkup():'';
 root.innerHTML=ek+food+cards;
}

function renderStories(filter='all'){const grid=document.getElementById('story-grid');if(!grid)return;const list=filter==='all'?stories:stories.filter(s=>s.category===filter);grid.innerHTML=list.map((s)=>{const i=stories.indexOf(s);return `<article class="story-card" data-category="${s.category}" data-action="story" data-story="${i}" role="button" tabindex="0"><img src="${s.img}" alt="${s.tag}"><div class="story-card-body"><span>${s.tag}</span><h3>${s.title}</h3><p>${s.person}</p><button class="primary" data-action="story" data-story="${i}">Read Story</button></div></article>`}).join('')}
function openStoryReader(index){const s=stories[index];if(!s)return;openModal('Story Reader',`<div class="story-reader"><button class="back-btn" data-action="back-to-stories">← Back to Stories</button><img src="${s.img}" alt="${s.tag}"><span class="story-reader-tag">${s.tag}</span><h2>${s.title}</h2><p class="story-reader-person">${s.person}</p><p>${s.text}</p><p>Read the story slowly, then discover more village experiences, people and places connected to this story.</p></div>`)}
function renderMarket(){document.getElementById('market-grid').innerHTML=products.map((p,i)=>`<article><img src="${p[3]}"><h3>${p[0]}</h3><p>${p[1]} · ₹${p[2]}</p><button data-action="product" data-product="${i}">View Product</button></article>`).join('')}
function renderProfile(){document.getElementById('profile-root').innerHTML=profile6(currentVillage)}
renderStates();populateStateFilter();renderVillages();renderExperiences();renderTrips();renderStories();renderMarket();renderProfile();
syncSavedListingIntoVillages();
showSlide('slide-home');
function scrollByCard(id,direction){const el=document.getElementById(id);if(!el)return;const card=el.firstElementChild;if(!card){return}const gap=parseFloat(getComputedStyle(el).gap)||0;const step=card.getBoundingClientRect().width+gap;el.scrollBy({left:direction*step,behavior:'smooth'})}
// Mobile navigation is controlled by the bottom navigation and buttons.
// Horizontal sliders use native touch scrolling and do not trigger section changes.
document.addEventListener('keydown',e=>{const card=e.target.closest('.village-card[data-action="village"]');if(card&&e.key==='Enter'){e.preventDefault();card.click();}});
document.addEventListener('click',e=>{const el=e.target.closest('[data-action],[data-nav],[data-state],[data-filter],[data-story-filter],[data-p]');if(!el)return;if(el.dataset.nav){showSlide(el.dataset.nav);return}if(el.dataset.state){renderVillages(el.dataset.state);return}if(el.dataset.filter){document.querySelectorAll('[data-filter]').forEach(x=>x.classList.remove('active'));el.classList.add('active');renderExperiences(el.dataset.filter);return}if(el.dataset.action==='filter-ek-din'){document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',b.dataset.filter==='ek-din'));renderExperiences('ek-din');return}if(el.dataset.action==='ek-din-slot'){const i=Number(el.dataset.ekdin),x=ekDinGaonMein[i];if(!x)return;document.querySelectorAll('.ek-din-slot').forEach(b=>b.classList.toggle('active',b===el));const d=document.getElementById('ek-din-detail');if(d)d.innerHTML=`<span>${x[0]}</span><h4>${x[1]}</h4><p>${x[2]}</p><b>📍 ${currentVillage.name} · ${currentVillage.district} · ${currentVillage.state}</b>`;return}if(el.dataset.storyFilter){document.querySelectorAll('.story-filter').forEach(x=>x.classList.remove('active'));el.classList.add('active');renderStories(el.dataset.storyFilter);return}if(el.dataset.p){document.querySelectorAll('.profile-tab').forEach(x=>x.classList.remove('active'));el.classList.add('active');document.getElementById('profile-pages').innerHTML=profilePage(+el.dataset.p,currentVillage);return}const a=el.dataset.action;if(a==='close'){closeModal();return}if(a==='explore'||a==='all-villages'){showSlide('slide-explore');return}if(a==='all-stories'){showSlide('slide-stories');return}if(a==='back-to-stories'){closeModal();showSlide('slide-stories');return}if(a==='state-prev'){scrollByCard('state-slider',-1);return}if(a==='state-next'){scrollByCard('state-slider',1);return}if(a==='village-prev'){scrollByCard('village-grid',-1);return}if(a==='village-next'){scrollByCard('village-grid',1);return}if(a==='village'){currentVillage=villages.find(v=>v.id===el.dataset.id)||villages[0];renderProfile();renderExperiences();renderTrips();showSlide('slide-profile');return}if(a==='back-to-explore'){showSlide('slide-explore');return}if(a==='random'){currentVillage=villages[Math.floor(Math.random()*villages.length)];renderProfile();renderExperiences();renderTrips();showSlide('slide-profile');return}if(a==='menu'){openModal('VillageDeko Menu','Choose an option.',`<div class="menu-actions"><button class="secondary" data-action="profile">Profile</button><button class="secondary" data-action="listing">Village Listing</button><button class="secondary" data-action="host">Host Your Village</button><button class="secondary" data-action="settings">Settings</button></div>`);return}if(a==='listing'||a==='host'){showSlide('slide-listing');closeModal();return}if(a==='google-signin'){if(firebaseUser)openModal('Google Account',`Signed in as <b>${esc(firebaseUser.displayName||firebaseUser.email||'Google user')}</b><br><br><button class="secondary" data-action="google-signout">Sign out</button>`);else signInGoogle();return}if(a==='google-signout'){window.VD_FIREBASE?.signOut(firebaseAuth).then(()=>openModal('Signed out','You have been signed out of VillageDeko.')).catch(console.warn);return}if(a==='profile'){openModal('Profile','Your traveller profile and saved village trips will appear here.');return}if(a==='settings'){openModal('Settings','Account, privacy, notifications and app settings will appear here.');return}if(a==='search'){showSlide('slide-explore');setTimeout(()=>{const q=document.getElementById('village-search');q?.focus();q?.scrollIntoView({behavior:'smooth',block:'center'});},80);return}if(a==='photos'){openModal('Village Photos','The host can keep one separate cover photo and add multiple gallery photos for this village.');return}if(a==='videos'){openModal('Village Videos','Hosts can add village videos later. Videos will appear inside the village experience.');return}if(a==='plan'||a==='reserve'){openModal(a==='reserve'?'Reserve Stay':'Plan Your Visit','Select dates, guests, stay and activities.');return}if(a==='book'){openModal('Experience Selected','This village experience is ready to be booked. The host-set price will be used in the connected version.');return}if(a==='trip-current'){showSlide('slide-stay');return}if(a==='book-trip'){const t=getTrips()[+(el.dataset.trip||0)];openModal('Book Trip',`${t.name} · ${t.duration}. Total trip price: ₹${t.price.toLocaleString('en-IN')}. Host: ${t.host}. Availability: ${t.availability}.`, `<div class="trip-book-summary"><b>Village</b><span>${currentVillage.name}, ${currentVillage.district}, ${currentVillage.state}</span><b>Stay</b><span>${t.stay}</span><b>Food</b><span>${t.food}</span></div>`);return}if(a==='wedding'){openModal('Village Destination Wedding','Find an Indian village where you can attend a listed wedding or plan your own village wedding.');return}if(a==='story'){openStoryReader(+(el.dataset.story||0));return}if(a==='story-prev'){scrollByCard('story-grid',-1);return}if(a==='story-next'){scrollByCard('story-grid',1);return}if(a==='food-journey-open'){renderFoodJourneyModal();return}if(a==='food-journey-stage'||a==='food-journey-stage-modal'){const stages=[['🌱','Beej','Sahi beej se kheti ka safar shuru hota hai.'],['🌾','Khet / Buwai','Beej mitti mein boya jaata hai aur fasal ugne lagti hai.'],['💧','Paani & Dekhbhal','Paani, mitti aur fasal ki dekhbhal zaroori hoti hai.'],['🌿','Fasal','Fasal pakti hai aur katai ke liye taiyaar hoti hai.'],['🌾','Katai','Pakki fasal ko khet se kaat kar jama kiya jaata hai.'],['🏪','Mandi','Fasal mandi tak pahunchti hai aur aage buyers/processors tak jaati hai.'],['⚙️','Processing','Anaj ya ingredient ko saaf, peesa ya process kiya jaata hai.'],['🏠','Ghar','Food ghar tak pahunchta hai aur rasoi mein taiyaar hota hai.'],['🍞','Plate','Aakhir mein poora safar hamari plate par complete hota hai.']];const i=Number(el.dataset.stage||0),x=stages[i];if(!x)return;const id=a==='food-journey-stage'?'food-journey-detail':'food-journey-modal-detail';const d=document.getElementById(id);if(d){d.innerHTML=`<span>${String(i+1).padStart(2,'0')}</span><h4>${x[1]}</h4><p>${x[2]}</p>`;}return}if(a==='foodstory'){openModal('Local Food Story','Follow a real ingredient from seed and field through harvest, mandi, processing and finally the local plate.');return}if(a==='product'){const p=products[+(el.dataset.product||0)];openModal(p[0],`${p[1]}. Price ₹${p[2]}. Product → Maker → Village → Story.`);return}if(a==='listing-place'){const d=currentVillage.listing;const x=d?.explore?.[+(el.dataset.index||0)];if(x)openModal(x[0]||'Village Place',`<b>${esc(x[1]||'')}</b><p>${esc(x[2]||'')}</p>`);return}if(a==='listing-experience'){const x=currentVillage.listing?.experience?.[+(el.dataset.index||0)];if(x)openModal(x[0]||'Experience',`<b>${esc(x[1]||'')}</b><p>${esc(x[4]||'')}</p><p>${esc(x[2]||'')} · ₹${esc(x[3]||'0')} / person</p>`);return}if(a==='listing-journey'){const x=currentVillage.listing?.journey?.[+(el.dataset.index||0)];if(x)openModal(x[0]||'Food Journey Stage',`<p>${esc(x[1]||'')} → ${esc(x[2]||'')}</p><p>${esc(x[3]||'')}</p>`);return}if(a==='listing-story'){const x=currentVillage.listing?.people?.[+(el.dataset.index||0)];if(x)openModal(x[2]||x[0]||'Village Story',`<b>${esc(x[0]||'')} · ${esc(x[1]||'')}</b><p>${esc(x[3]||'')}</p>`);return}if(a==='place'){const place=el.dataset.place||'Village Section';openModal(place,`${place} — ${currentVillage.name}. Explore this part of the village through future real photos, videos, local stories and practical information.`);return}if(a==='cover'){openModal('Village Cover Photo','Cover photo is separate from the village gallery. In the connected form, the host will select one cover image.');return}if(a==='media'){openModal('Village Media','The host can add multiple photos and videos to the village profile.');return}if(a==='save-listing'){openModal('Village Listing Saved','Your village listing form is ready. Firebase will store the village details and Cloudinary will store media in the connected build.');return}});
const listingFormState={step:1,total:11,initialized:false};
const listingTemplates={
 explore:[['Place name','text','e.g. Village temple'],['Category','select',['Khet','Ghar','Dairy','Mandir','Market','Nature','Craft','Other']],['Description','textarea','What can visitors discover here?']],
 experience:[['Experience name','text','e.g. Farm Visit'],['Category','select',['Activities','Food','Culture','Nature','Farming','Craft','Other']],['Duration','text','e.g. 2 Hours'],['Price per person','number','₹'],['Description','textarea','What will visitors do?']],
 day:[['Time','text','e.g. 05:30 AM'],['Activity','text','e.g. Gaon ki subah'],['Description','textarea','What happens at this time?']],
 food:[['Dish name','text','e.g. Bajre ki roti'],['Type','text','e.g. Breakfast / Lunch'],['Description','textarea','What makes this food local?']],
 journey:[['Stage name','text','e.g. Beej / Khet / Katai'],['From','text','Where does this stage start?'],['To','text','Where does it go next?'],['Description','textarea','Explain this part of the food journey.']],
 people:[['Person name','text','e.g. Gopal Singh'],['Role','text','e.g. Farmer / Artisan'],['Story title','text','e.g. 40 years of farming'],['Story','textarea','Tell their story.']],
 culture:[['Culture item','text','e.g. Gangaur Festival'],['Type','select',['Festival','Tradition','Folk Music','Dance','Craft','Marriage','Other']],['Description','textarea','Explain the local tradition.']]
};
function populateListingState(){const s=document.getElementById('listing-state');if(!s||s.options.length>1)return;s.innerHTML='<option value="">Select state</option>'+states.map(x=>`<option value="${x}">${x}</option>`).join('')}
function listingFieldHtml(def){const [label,type,extra]=def;if(type==='select')return `<label>${label}<select>${extra.map(x=>`<option>${x}</option>`).join('')}</select></label>`;return `<label>${label}<${type==='textarea'?'textarea':'input'} ${type!=='textarea'?`type="${type}"`:''} placeholder="${extra||''}" ${type==='textarea'?'rows="3"':''}></${type==='textarea'?'textarea':'input'}></label>`}
function addListingRow(type,values={}){const root=document.getElementById(`${type}-repeat`);if(!root)return;const defs=listingTemplates[type];const card=document.createElement('div');card.className='repeat-card';card.dataset.repeat=type;card.innerHTML=`<div class="repeat-card-head"><strong>${type==='explore'?'Explore place':type==='experience'?'Experience':type==='day'?'Day time slot':type==='food'?'Local dish':type==='journey'?'Food Journey stage':type==='people'?'Person & Story':'Culture item'}</strong><button type="button" class="remove-row">Remove</button></div><div class="repeat-grid">${defs.map((d,i)=>listingFieldHtml(d)).join('')}</div>`;root.appendChild(card);const fields=card.querySelectorAll('input,select,textarea');fields.forEach((f,i)=>{if(values[i]!=null)f.value=values[i]});card.querySelector('.remove-row').addEventListener('click',()=>card.remove())}
function ensureListingRows(){for(const type of Object.keys(listingTemplates)){const root=document.getElementById(`${type}-repeat`);if(root&&root.children.length===0)addListingRow(type)}for(const type of Object.keys(listingTemplates)){const add=document.querySelector(`[data-add="${type}"]`);if(add&&!add.dataset.bound){add.dataset.bound='1';add.addEventListener('click',()=>addListingRow(type))}}
}
function getListingData(){const f=document.getElementById('village-listing-form');if(!f)return{};const fd=new FormData(f),data={};for(const [k,v] of fd.entries()){if(v instanceof File){if(v.name)data[k]=v.name;continue}data[k]=v}for(const type of Object.keys(listingTemplates)){data[type]=[...document.querySelectorAll(`#${type}-repeat .repeat-card`)].map(card=>[...card.querySelectorAll('input,select,textarea')].map(x=>x.value))}return data}
function renderListingReview(){const root=document.getElementById('listing-review');if(!root)return;const d=getListingData();const cards=[['Village',d.villageName||'Not added',`${d.district||''} · ${d.state||''}`],['About',d.about||'Not added',''],['Visit',d.bestTime||'Not added',`${d.airport||''} · ${d.railway||''}`],['Explore',`${d.explore?.length||0} places`,''],['Experiences',`${d.experience?.length||0} experiences`,''],['Ek Din Gaon Mein',`${d.day?.length||0} time slots`,''],['Food',`${d.food?.length||0} dishes · ${d.journey?.length||0} journey stages`,''],['People & Stories',`${d.people?.length||0} people / stories`,''],['Culture',`${d.culture?.length||0} culture items`,''],['Stay & Wedding',`${d.stayAvailable||'Not listed'} · ${d.weddingAvailable||'Not listed'}`,'']];root.innerHTML=cards.map(x=>`<div class="review-card"><small>${x[0]}</small><strong>${x[1]}</strong><p>${x[2]}</p></div>`).join('')}
function renderListingProgress(){const root=document.getElementById('listing-progress');if(!root)return;const names=['Overview','Identity','Explore','Experiences','Ek Din','Food','People & Stories','Culture','Visit Info','Stay & Wedding','Review'];root.innerHTML=names.map((n,i)=>`<button type="button" class="${i+1===listingFormState.step?'active':''}" data-listing-step="${i+1}">${String(i+1).padStart(2,'0')} · ${n}</button>`).join('')}
function goListingStep(n){n=Math.max(1,Math.min(listingFormState.total,n));listingFormState.step=n;document.querySelectorAll('.listing-step').forEach(x=>x.classList.toggle('active',Number(x.dataset.step)===n));document.getElementById('listing-step-count').textContent=`Step ${n} of ${listingFormState.total}`;document.getElementById('listing-prev').disabled=n===1;document.getElementById('listing-next').textContent=n===listingFormState.total?'Finish review →':'Next →';renderListingProgress();if(n===listingFormState.total)renderListingReview();}
// Do not scroll the whole listing page when changing steps. The active step stays at the user's current position on desktop and mobile.
function fillListingFormFromSaved(d){
 if(!d)return;
 const f=document.getElementById('village-listing-form');if(!f)return;
 Object.keys(d).forEach(k=>{if(listingTemplates[k]||k==='coverPhoto'||k==='galleryPhotos'||k==='galleryVideos')return;const el=f.elements[k];if(el&&typeof d[k]==='string')el.value=d[k]});
 for(const type of Object.keys(listingTemplates)){
  const root=document.getElementById(`${type}-repeat`);if(!root)continue;root.innerHTML='';(d[type]||[]).forEach(row=>addListingRow(type,row));
  if(!root.children.length)addListingRow(type);
 }
}
function initListingForm(){if(!document.getElementById('village-listing-form'))return;populateListingState();ensureListingRows();fillListingFormFromSaved(getSavedListing());renderListingProgress();goListingStep(1);listingFormState.initialized=true}
async function saveVillageListing(){const f=document.getElementById('village-listing-form');if(!f.checkValidity()){f.reportValidity();return}const data=getListingData();
 if(!firebaseUser){const ok=await signInGoogle();if(!ok)return;}
 try{const saved=await persistVillageToFirebase(data);localStorage.setItem('villagedeko_my_village_listing',JSON.stringify(saved));syncSavedListingIntoVillages();currentVillage=villages.find(v=>v.id==='my-listing')||currentVillage;renderVillages(selectedState||'all');renderProfile();renderExperiences();renderTrips();openModal('Village Listing Saved','Village data Firebase mein save ho gaya hai aur photos/videos Cloudinary CDN par upload ho gaye hain.');}
 catch(e){console.error(e);openModal('Could not save listing',e?.message||'Please try again.');}}
async function deleteVillageListing(){
 if(!localStorage.getItem('villagedeko_my_village_listing')&&!firebaseUser){openModal('No saved listing','There is no saved village listing on this device yet.');return;}
 if(!confirm('Delete your saved VillageDeko listing? This cannot be undone.'))return;
 try{
  if(firebaseUser&&firestoreDb){
   await window.VD_FIREBASE.deleteDoc(window.VD_FIREBASE.doc(firestoreDb,'villages',firebaseUser.uid));
  }
  localStorage.removeItem('villagedeko_my_village_listing');
  const i=villages.findIndex(v=>v.id==='my-listing');
  if(i>=0)villages.splice(i,1);
  if(currentVillage?.id==='my-listing')currentVillage=villages[0]||currentVillage;
  document.getElementById('village-listing-form')?.reset();
  for(const type of Object.keys(listingTemplates)){const root=document.getElementById(`${type}-repeat`);if(root)root.innerHTML=''}
  ensureListingRows();
  goListingStep(1);
  renderVillages(selectedState||'all');
  openModal('Village Listing Deleted','Your VillageDeko listing has been removed successfully.');
 }catch(e){
  console.error('Village listing delete failed',e);
  openModal('Could not delete listing',e?.message||'Firebase did not allow the listing to be deleted. Your listing was kept safe.');
 }
}

// Listing form navigation and repeatable sections.
document.getElementById('village-search')?.addEventListener('input',()=>renderVillages(selectedState||'all'));
document.getElementById('state-filter')?.addEventListener('change',e=>renderVillages(e.target.value||'all'));
document.getElementById('clear-village-filters')?.addEventListener('click',clearVillageFilters);

document.addEventListener('click',e=>{const step=e.target.closest('[data-listing-step]');if(step){goListingStep(Number(step.dataset.listingStep));return}if(e.target.id==='listing-prev'){goListingStep(listingFormState.step-1);return}if(e.target.id==='listing-next'){goListingStep(listingFormState.step+1);return}const action=e.target.closest('[data-action]')?.dataset.action;if(action==='save-listing-form'){saveVillageListing();return}if(action==='delete-listing-form'){deleteVillageListing();return}});

initListingForm();

modal.addEventListener('click',e=>{if(e.target===modal)closeModal()});
