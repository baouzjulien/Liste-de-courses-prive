/* =================================================
   CONSTANTES ET ÉLÉMENTS DOM
================================================= */
const API_URL = "https://script.google.com/macros/s/AKfycbyt1rnaburyDKblXGC0BUKh6-1JLtGcOhxrZiNe8Bye09enlV_EU7_37WHFz4Ymo8_W/exec";
const rayonsContainer = document.getElementById('rayons-container');
const ajouterRayonBtn = document.getElementById('btn-ajouter-rayon');
const nomRayonInput = document.getElementById('nouveau-rayon');
const loader = document.getElementById('loader');
const icone = document.getElementById('actu-ico');

let localData = [];

/* =================================================
   UTILITAIRES
================================================= */
function debounce(fn, delay = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(null, args), delay);
  };
}

function normalize(str) {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function showLoader() {
  loader.classList.remove('hidden');
}

function hideLoader() {
  loader.classList.add('hidden');
}

/* =================================================
   SAUVEGARDE LOCALE + SERVEUR
================================================= */
function updateLocalStorage() {
  localStorage.setItem('listeCourses', JSON.stringify(localData));
  debounceSaveServer();
}

let saveTimeout = null;
function debounceSaveServer(delay = 1000) {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => saveToServer(localData), delay);
}

async function saveToServer(data) {
  try {
    await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  } catch (err) {
    console.error("Erreur save API :", err);
  }
}

/* =================================================
   AUTOCOMPLÉTION PRODUITS
================================================= */
function findLocalMatch(rayonId, value) {
  const r = localData.find(r => r.id === rayonId);
  if (!r) return null;
  const v = normalize(value);
  return r.produits
    .slice()
    .sort((a, b) => a.coche - b.coche)
    .find(p => normalize(p.nom).startsWith(v));
}

function findGlobalMatch(value) {
  const v = normalize(value);
  for (const r of localData) {
    const match = r.produits.find(p => normalize(p.nom).startsWith(v));
    if (match) return match;
  }
  return null;
}

/* =================================================
   REBUILD DOM
================================================= */
function rebuildDOM() {
  rayonsContainer.innerHTML = "";
  localData.forEach(r => {
    const rayon = createRayon(r.nom, r.id, r.collapsed);
    const cont = rayon.querySelector('.produits-container');

    r.produits
      .slice()
      .sort((a, b) => a.coche - b.coche)
      .forEach(p => addProduit(cont, p.nom, p.id, p.coche));

    rayonsContainer.appendChild(rayon);
  });
}

/* =================================================
   CHARGEMENT DONNÉES
================================================= */
function loadFromLocal() {
  const saved = localStorage.getItem('listeCourses');
  if (!saved) return false;
  localData = JSON.parse(saved);
  rebuildDOM();
  return true;
}

async function loadFromServer() {
  showLoader();
  const start = performance.now();

  await new Promise(requestAnimationFrame);

  try {
    const res = await fetch(API_URL);
    localData = await res.json();
    rebuildDOM();
    updateLocalStorage();
  } catch (err) {
    console.error(err);
  } finally {
    const elapsed = performance.now() - start;
    const minVisible = 400;

    setTimeout(hideLoader, Math.max(0, minVisible - elapsed));
  }
}

// Actualisation via icone
icone.addEventListener('click', async () => {
  icone.classList.remove('spin');
  icone.offsetWidth; // force reset animation
  icone.classList.add('spin');

  setTimeout(() => {
    icone.classList.remove('spin');
  }, 500);

  await loadFromServer();
});


/* =================================================
   COMPOSANT RAYON
================================================= */
function createRayon(nom, id = null, collapsed = false) {
  const rayon = document.createElement('div');
  rayon.className = 'rayon';
  rayon.dataset.id = id || crypto.randomUUID();
  rayon.setAttribute('draggable', 'true');

  rayon.innerHTML = `
    <div class="rayon-header">
      <button class="btn-deplacer-rayon">☰</button>
      <h2>${nom}</h2>
      <div class="rayon-actions">
        <button class="btn-supprimer-rayon">×</button>
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

/* =================================================
   ACTIONS SUR RAYON
================================================= */
function initRayonActions(rayon){
  const header = rayon.querySelector('.rayon-header');
  const btnSup = rayon.querySelector('.btn-supprimer-rayon');
  const inputProd = rayon.querySelector('.nouveau-produit');
  const contProd = rayon.querySelector('.produits-container');
  const actions = rayon.querySelector('.rayon-actions');
  const titre = rayon.querySelector('h2');

  // Collapse / expand
  header.addEventListener('click', e=>{
    if(e.target.closest('button')) return;
    rayon.classList.toggle('collapsed');
    const r = localData.find(r=>r.id===rayon.dataset.id);
    if(r) r.collapsed = rayon.classList.contains('collapsed');
    updateLocalStorage();
  });

  // Affichage suppression sur click
  header.addEventListener('click', e=>{
    if(!actions.classList.contains('show')) actions.classList.add('show');
  });

  // Supprimer rayon
  btnSup.addEventListener('click', ()=>{
    localData = localData.filter(r=>r.id!==rayon.dataset.id);
    rayon.remove();
    updateLocalStorage();
  });

  // Edition inline rayon
  titre.addEventListener('dblclick', ()=>{
    titre.contentEditable = "true";
    titre.focus();
    document.execCommand('selectAll', false, null);
  });

  // Validation / annulation
  titre.addEventListener('keydown', e=>{
    if(e.key === "Enter"){
      e.preventDefault();
      titre.contentEditable = "false";
      const nv = titre.textContent.trim();
      if(!nv) return;
      const r = localData.find(r=>r.id===rayon.dataset.id);
      if(r) r.nom = nv;
      updateLocalStorage();
    }
    if(e.key === "Escape"){
      e.preventDefault();
      titre.contentEditable = "false";
      titre.textContent = localData.find(r=>r.id===rayon.dataset.id).nom;
    }
  });
  titre.addEventListener('blur', ()=>{
    titre.contentEditable = "false";
    const nv = titre.textContent.trim();
    if(!nv) return;
    const r = localData.find(r=>r.id===rayon.dataset.id);
    if(r) r.nom = nv;
    updateLocalStorage();
  });

  // Autocomplétion produit
  let lastSuggestion = null;
  const debouncedAutocomplete = debounce(()=>{
    const value = inputProd.value;
    if(!value) return;
    const match =
      findLocalMatch(rayon.dataset.id, value) ||
      findGlobalMatch(value);
    if(!match) return;
    lastSuggestion = match.nom;
    inputProd.value = match.nom;
    inputProd.setSelectionRange(value.length, match.nom.length);
  });

  inputProd.addEventListener('input', debouncedAutocomplete);

  inputProd.addEventListener('keydown', e=>{
    if(e.key==='Tab' && lastSuggestion){
      e.preventDefault();
      inputProd.value = lastSuggestion;
      inputProd.setSelectionRange(lastSuggestion.length,lastSuggestion.length);
    }
  });

  inputProd.addEventListener('keydown', e=>{
    if(e.key!=='Enter') return;
    const val = inputProd.value.trim();
    if(!val) return;
    const r = localData.find(r=>r.id===rayon.dataset.id);
    if(!r) return;
    const exists = r.produits.some(p => normalize(p.nom)===normalize(val));
    if(exists){
      inputProd.value='';
      lastSuggestion=null;
      return;
    }
    const pObj = { id: crypto.randomUUID(), nom: val, coche:false };
    r.produits.push(pObj);
    addProduit(contProd, val, pObj.id);
    inputProd.value='';
    lastSuggestion=null;
    updateLocalStorage();
  });
}

/* =================================================
   COMPOSANT PRODUIT
================================================= */
function addProduit(container, nom, id=null, coche=false){
  const p = document.createElement('div');
  p.className='produit';
  p.dataset.id = id||crypto.randomUUID();

  p.innerHTML = `
    <input type="checkbox" class="produit-checkbox">
    <span class="produit-nom">${nom}</span>
    <div class="produit-actions">
      <button class="btn-supprimer-produit"> </button>
    </div>
  `;

  const cb = p.querySelector('.produit-checkbox');
  const nomSpan = p.querySelector('.produit-nom');
  const actions = p.querySelector('.produit-actions');

  cb.checked = coche;
  p.classList.toggle('produit-coche', coche);

  // Toggle suppression sur click produit
  p.addEventListener('click', ()=>{
    if(!actions.classList.contains('show')) actions.classList.add('show');
  });

  // Edition inline produit
  nomSpan.addEventListener('dblclick', ()=>{
    nomSpan.contentEditable = "true";
    nomSpan.focus();
    document.execCommand('selectAll', false, null);
  });

  // Validation / annulation
  nomSpan.addEventListener('keydown', e=>{
    if(e.key==="Enter"){
      e.preventDefault();
      nomSpan.contentEditable = "false";
      const nv = nomSpan.textContent.trim();
      if(!nv) return;
      const r = localData.find(r=>r.produits.some(pObj=>pObj.id===p.dataset.id));
      if(r){
        const prod = r.produits.find(pObj=>pObj.id===p.dataset.id);
        if(prod) prod.nom = nv;
      }
      updateLocalStorage();
    }
    if(e.key==="Escape"){
      e.preventDefault();
      nomSpan.contentEditable = "false";
      const r = localData.find(r=>r.produits.some(pObj=>pObj.id===p.dataset.id));
      if(r){
        const prod = r.produits.find(pObj=>pObj.id===p.dataset.id);
        if(prod) nomSpan.textContent = prod.nom;
      }
    }
  });

  nomSpan.addEventListener('blur', ()=>{
    nomSpan.contentEditable = "false";
    const nv = nomSpan.textContent.trim();
    if(!nv) return;
    const r = localData.find(r=>r.produits.some(pObj=>pObj.id===p.dataset.id));
    if(r){
      const prod = r.produits.find(pObj=>pObj.id===p.dataset.id);
      if(prod) prod.nom = nv;
    }
    updateLocalStorage();
  });

  // Changement état coché
  cb.addEventListener('change', ()=>{
    const rayonEl = p.closest('.rayon');
    const r = localData.find(r=>r.id===rayonEl.dataset.id);
    if(!r) return;
    const prod = r.produits.find(x=>x.id===p.dataset.id);
    if(prod) prod.coche = cb.checked;

    p.classList.toggle('produit-coche', cb.checked);

    r.produits.sort((a,b)=>a.coche-b.coche);

    const cont = rayonEl.querySelector('.produits-container');
    r.produits.forEach(pObj=>{
      const el = cont.querySelector(`.produit[data-id="${pObj.id}"]`);
      if(el) cont.appendChild(el);
    });

    updateLocalStorage();
  });

  // Supprimer produit
  p.querySelector('.btn-supprimer-produit').addEventListener('click', ()=>{
    const r = localData.find(r=>r.produits.some(pObj=>pObj.id===p.dataset.id));
    if(r) r.produits = r.produits.filter(x=>x.id!==p.dataset.id);
    p.remove();
    updateLocalStorage();
  });

  container.appendChild(p);
}

/* =================================================
   DRAG & DROP
================================================= */
rayonsContainer.addEventListener('dragstart', e=>e.target.classList.add('dragging'));
rayonsContainer.addEventListener('dragend', e=>{
  e.target.classList.remove('dragging');
  const order = [...rayonsContainer.children].map(r=>r.dataset.id);
  localData.sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id));
  updateLocalStorage();
});

rayonsContainer.addEventListener('dragover', e=>{
  e.preventDefault();
  const dragging = document.querySelector('.dragging');
  const after=[...rayonsContainer.children]
    .find(r=>e.clientY < r.getBoundingClientRect().top + r.offsetHeight/2);
  after ? rayonsContainer.insertBefore(dragging, after)
        : rayonsContainer.appendChild(dragging);
});

function initTouchDrag(rayon){
  const btn = rayon.querySelector('.btn-deplacer-rayon');
  let dragging=false;

  btn.addEventListener('touchstart', e=>{
    dragging=true;
    rayon.classList.add('dragging');
    e.preventDefault();
  },{passive:false});

  btn.addEventListener('touchmove', e=>{
    if(!dragging) return;
    const after=[...rayonsContainer.children]
      .find(r=>e.touches[0].clientY < r.getBoundingClientRect().top + r.offsetHeight/2);
    after ? rayonsContainer.insertBefore(rayon, after)
          : rayonsContainer.appendChild(rayon);
    e.preventDefault();
  },{passive:false});

  btn.addEventListener('touchend', ()=>{
    dragging=false;
    rayon.classList.remove('dragging');
    updateLocalStorage();
  });
}

/* =================================================
   INTERACTIONS GLOBALES (clic en dehors pour masquer les croix)
================================================= */
document.addEventListener('click', e => {
  document.querySelectorAll('.rayon-actions.show').forEach(btns => {
    const rayon = btns.closest('.rayon');
    if (!rayon.contains(e.target)) btns.classList.remove('show');
  });
  document.querySelectorAll('.produit-actions.show').forEach(btns => {
    const produit = btns.closest('.produit');
    if (!produit.contains(e.target)) btns.classList.remove('show');
  });
});

/* =================================================
   INIT
================================================= */
document.addEventListener('DOMContentLoaded', async () => {
  await loadFromServer(); // Charge les données serveur à l'ouverture ou reload
});


/* =================================================
   AJOUT RAYON
================================================= */
ajouterRayonBtn.addEventListener('click', ()=>{
  const nom = nomRayonInput.value.trim();
  if(!nom) return;
  const r={id:crypto.randomUUID(),nom,collapsed:false,produits:[]};
  localData.push(r);
  rayonsContainer.appendChild(createRayon(nom,r.id));
  nomRayonInput.value='';
  updateLocalStorage();
});

nomRayonInput.addEventListener('keydown', e=>{
  if(e.key==='Enter') ajouterRayonBtn.click();
});