const slides=[...document.querySelectorAll('.slide')];
const modal=document.getElementById('modal');
const modalContent=document.getElementById('modal-content');
function showSlide(id){slides.forEach(s=>s.classList.toggle('active',s.id===id));document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.nav===id));window.scrollTo({top:0,behavior:'smooth'});}
function openModal(title,text,button='Close'){modalContent.innerHTML=`<h3>${title}</h3><p>${text}</p><button class="primary" data-action="close">${button}</button>`;modal.classList.add('show');}
function closeModal(){modal.classList.remove('show');}
document.addEventListener('click',e=>{
 const el=e.target.closest('[data-action],[data-nav]'); if(!el)return;
 if(el.dataset.nav){showSlide(el.dataset.nav);return;}
 const a=el.dataset.action;
 if(a==='close'){closeModal();return}
 if(a==='explore'||a==='all-villages')showSlide('slide-explore');
 else if(a==='random')openModal('Discover a Village','A new village discovery flow is ready. In the connected build this will use live village data.');
 else if(a==='village')showSlide('slide-profile');
 else if(a==='photos')openModal('Village Photos','Photo gallery placeholder — connect your Cloudinary media here.');
 else if(a==='videos')openModal('Village Videos','Video gallery placeholder — hosts can add village videos later.');
 else if(a==='plan'||a==='reserve')openModal('Plan Your Visit','Your visit planner is ready. Select dates, guests, experiences and stay options in the next connected step.','Continue');
 else if(a==='book')openModal('Experience Selected','The selected village experience has been added to your trip plan.','View Trip');
 else if(a==='wedding')openModal('Village Destination Weddings','Choose a village destination and enquire about local venue, food, traditions and wedding experiences.');
 else if(a==='product')openModal('Product Details','This marketplace card is interactive and ready to connect with real village products.');
 else if(a==='story'||a==='people')openModal('Village Stories','Real stories and people will appear here from the connected VillageDeko database.');
 else if(a==='search')openModal('Search Villages','Search by village, district or state.');
 else if(a==='menu')openModal('VillageDeko Menu','Explore villages, experiences, stays, weddings, marketplace and stories.');
});
document.querySelectorAll('.filter').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.filter').forEach(b=>b.classList.remove('active'));btn.classList.add('active');const f=btn.dataset.filter;document.querySelectorAll('.experience').forEach(x=>x.style.display=(f==='all'||x.dataset.type===f)?'grid':'none')}));
modal.addEventListener('click',e=>{if(e.target===modal)closeModal()});


const villageData={
  'Kuthar Village':{location:'Jodhpur District · Rajasthan',cover:'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1600&q=85'},
  'Majuli Island':{location:'Majuli District · Assam',cover:'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1600&q=85'},
  'Hampi Village':{location:'Vijayanagara · Karnataka',cover:'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1600&q=85'}
};
function openVillage(name){
 const v=villageData[name]||villageData['Kuthar Village'];
 document.getElementById('village-title').textContent=name||'Village Profile';
 document.getElementById('village-location').textContent=v.location;
 document.getElementById('village-cover').src=v.cover;
 document.querySelectorAll('.vtab').forEach(x=>x.classList.toggle('active',x.dataset.vtab==='overview'));
 document.querySelectorAll('.village-panel').forEach(x=>x.classList.toggle('active',x.dataset.panel==='overview'));
 showSlide('slide-profile');
}
document.querySelectorAll('.village-card').forEach(card=>card.addEventListener('click',e=>{if(e.target.closest('button')){openVillage(card.dataset.village);return;}openVillage(card.dataset.village)}));
document.querySelectorAll('.vtab').forEach(tab=>tab.addEventListener('click',()=>{document.querySelectorAll('.vtab').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.village-panel').forEach(x=>x.classList.remove('active'));tab.classList.add('active');document.querySelector(`[data-panel="${tab.dataset.vtab}"]`).classList.add('active');window.scrollTo({top:0,behavior:'smooth'});}));
