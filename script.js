const API_URL = "https://script.google.com/macros/s/AKfycbyt1rnaburyDKblXGC0BUKh6-1JLtGcOhxrZiNe8Bye09enlV_EU7_37WHFz4Ymo8_W/exec";
const rayonsContainer = document.getElementById('rayons-container');
const ajouterRayonBtn = document.getElementById('btn-ajouter-rayon');
const nomRayonInput = document.getElementById('nouveau-rayon');

let localData = [];

/* --- UTILITAIRES --- */
function updateLocalStorage() {
  localStorage.setItem('listeCourses', JSON.stringify(localData));
  saveToServer(localData); // backup asynchrone
}

async function saveToServer(data) {
  try {
    await fetch(API_URL, { method: 'POST', body: JSON.stringify(data) });
  } catch(err) { console.error("Erreur save API :", err); }
}

function rebuildDOM() {
  rayonsContainer.innerHTML = "";
  localData.forEach(r => {
    const rayon = createRayon(r.nom, r.id, r.collapsed);
    const cont = rayon.querySelector('.produits-container');
    r.produits.forEach(p => addProduit(cont, p.nom, p.id, p.coche));
    rayonsContainer.appendChild(rayon);
  });
}

/* --- LOAD LOCAL --- */
function loadFromLocal() {
  const saved = localStorage.getItem('listeCourses');
  if (!saved) return false;
  localData = JSON.parse(saved);
  rebuildDOM();
  return true;
}

/* --- LOAD SERVER --- */
async function loadFromServer() {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();
    localData = data;
    rebuildDOM();
    updateLocalStorage(); // sauvegarde locale
  } catch(err) { console.error("Erreur load API :", err); }
}

/* --- CREATE RAYON --- */
function createRayon(nom, id=null, collapsed=false) {
  const rayon = document.createElement('div');
  rayon.className = 'rayon';
  rayon.dataset.id = id || crypto.randomUUID();
  rayon.setAttribute('draggable', 'true');
  rayon.innerHTML = `
    <div class="rayon-header">
      <button class="btn-deplacer-rayon" aria-label="Déplacer le rayon">☰</button>
      <h2>${nom}</h2>
      <div class="rayon-actions">
        <button class="btn-modifier-rayon" aria-label="Modifier le rayon">...</button>
        <button class="btn-supprimer-rayon" aria-label="Supprimer le rayon">x</button>
      </div>
    </div>
    <div class="produits-container"></div>
    <div class="rayon-footer">
      <input type="text" class="nouveau-produit" placeholder="Ajouter un produit">
    </div>
  `;
  if(collapsed) rayon.classList.add('collapsed');

  initRayonActions(rayon);
  initTouchDrag(rayon);
  return rayon;
}

/* --- INIT ACTIONS RAYON --- */
function initRayonActions(rayon) {
  const header = rayon.querySelector('.rayon-header');
  const btnSup = rayon.querySelector('.btn-supprimer-rayon');
  const btnMod = rayon.querySelector('.btn-modifier-rayon');
  const inputProd = rayon.querySelector('.nouveau-produit');
  const contProd = rayon.querySelector('.produits-container');

  header.addEventListener('click', e => {
    if(e.target.closest('button')) return;
    rayon.classList.toggle('collapsed');
    const r = localData.find(r => r.id === rayon.dataset.id);
    if(r) { r.collapsed = rayon.classList.contains('collapsed'); updateLocalStorage(); }
  });

  btnSup.addEventListener('click', () => {
    const idx = localData.findIndex(r => r.id === rayon.dataset.id);
    if(idx !== -1) localData.splice(idx, 1);
    rayon.remove();
    updateLocalStorage();
  });

  btnMod.addEventListener('click', () => {
    const titre = rayon.querySelector('h2');
    const nv = prompt("Nouveau nom:", titre.textContent.trim());
    if(nv) {
      titre.textContent = nv;
      const r = localData.find(r => r.id === rayon.dataset.id);
      if(r) r.nom = nv;
      updateLocalStorage();
    }
  });

  inputProd.addEventListener('keydown', e => {
    if(e.key !== 'Enter') return;
    const val = inputProd.value.trim();
    if(!val) return;
    const r = localData.find(r => r.id === rayon.dataset.id);
    const pObj = { id: crypto.randomUUID(), nom: val, coche: false };
    if(r) r.produits.push(pObj);
    addProduit(contProd, val, pObj.id);
    inputProd.value = '';
    updateLocalStorage();
  });
}

/* --- PRODUIT --- */
function addProduit(container, nom, id=null, coche=false) {
  const p = document.createElement('div');
  p.className = 'produit';
  p.dataset.id = id || crypto.randomUUID();
  p.innerHTML = `
    <input type="checkbox" class="produit-checkbox" aria-label="Produit ${nom}">
    <span class="produit-nom">${nom}</span>
    <div class="produit-actions">
      <button class="btn-modifier-produit" aria-label="Modifier le produit">...</button>
      <button class="btn-supprimer-produit" aria-label="Supprimer le produit">x</button>
    </div>
  `;
  const cb = p.querySelector('.produit-checkbox');
  const nomSpan = p.querySelector('.produit-nom');
  cb.checked = coche;
  p.classList.toggle('produit-coche', coche);
  cb.setAttribute('aria-checked', cb.checked);

  cb.addEventListener('change', () => {
    const r = localData.find(r => r.id === p.closest('.rayon').dataset.id);
    if(r){
      const prod = r.produits.find(x => x.id === p.dataset.id);
      if(prod){
        prod.coche = cb.checked;
        p.classList.toggle('produit-coche', cb.checked);
      }
    }
    if(cb.checked) container.appendChild(p); else container.prepend(p);
    updateLocalStorage();
  });

  p.querySelector('.btn-supprimer-produit').addEventListener('click', () => {
    const r = localData.find(r => r.id === p.closest('.rayon').dataset.id);
    if(r) r.produits = r.produits.filter(x => x.id !== p.dataset.id);
    p.remove();
    updateLocalStorage();
  });

  p.querySelector('.btn-modifier-produit').addEventListener('click', () => {
    const nv = prompt("Nouveau nom:", nomSpan.textContent);
    if(nv){
      nomSpan.textContent = nv;
      const r = localData.find(r => r.id === p.closest('.rayon').dataset.id);
      if(r){
        const prod = r.produits.find(x => x.id === p.dataset.id);
        if(prod) prod.nom = nv;
      }
      updateLocalStorage();
    }
  });

  container.appendChild(p);
}

/* --- DRAG PC --- */
rayonsContainer.addEventListener('dragover', e => {
  e.preventDefault();
  const dragging = rayonsContainer.querySelector('.dragging');
  const after = getAfterElement(rayonsContainer, e.clientY);
  if(!after) rayonsContainer.appendChild(dragging);
  else rayonsContainer.insertBefore(dragging, after);
});

function getAfterElement(container, y) {
  return [...container.querySelectorAll('.rayon:not(.dragging)')]
    .reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height/2;
      if(offset < 0 && offset > closest.offset) return { offset, element: child };
      return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

/* --- DRAG MOBILE --- */
function initTouchDrag(rayon){
  const btn = rayon.querySelector('.btn-deplacer-rayon');
  let isDragging = false;

  btn.addEventListener('touchstart', e=>{
    if(e.touches.length!==1) return;
    isDragging=true; rayon.classList.add('dragging'); e.preventDefault();
  }, {passive:false});

  btn.addEventListener('touchmove', e=>{
    if(!isDragging) return;
    const after = getAfterElement(rayonsContainer, e.touches[0].clientY);
    if(!after) rayonsContainer.appendChild(rayon); else rayonsContainer.insertBefore(rayon, after);
    e.preventDefault();
  }, {passive:false});

  btn.addEventListener('touchend', ()=>{
    if(!isDragging) return;
    isDragging=false;
    rayon.classList.remove('dragging');
    const idx = localData.findIndex(r=>r.id===rayon.dataset.id);
    if(idx!==-1){
      const newOrder = [...rayonsContainer.querySelectorAll('.rayon')].map(r=>r.dataset.id);
      localData.sort((a,b)=>newOrder.indexOf(a.id)-newOrder.indexOf(b.id));
      updateLocalStorage();
    }
  });
}

/* --- INIT --- */
document.addEventListener('DOMContentLoaded', ()=>{
  // Chargement local d'abord, sinon serveur
  if(!loadFromLocal()) loadFromServer();

  // Service Worker pour PWA et offline
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('Service Worker enregistré', reg))
      .catch(err => console.error('Erreur enregistrement SW', err));
  }
});

// Ajout rayon par input
ajouterRayonBtn.addEventListener('click', ()=>{
  const nom = nomRayonInput.value.trim();
  if(!nom) return;
  const rayonObj = { id: crypto.randomUUID(), nom, collapsed: false, produits: [] };
  localData.push(rayonObj);
  const rayonEl = createRayon(nom, rayonObj.id);
  rayonsContainer.appendChild(rayonEl);
  nomRayonInput.value = '';
  updateLocalStorage();
});

nomRayonInput.addEventListener('keydown', e=>{
  if(e.key==='Enter') ajouterRayonBtn.click();
});
