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
