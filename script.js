/* =================================================
   CONSTANTES ET ÉLÉMENTS DOM
================================================= */
const API_URL = "https://script.google.com/macros/s/AKfycbyt1rnaburyDKblXGC0BUKh6-1JLtGcOhxrZiNe8Bye09enlV_EU7_37WHFz4Ymo8_W/exec";
const rayonsContainer = document.getElementById('rayons-container');
const ajouterRayonBtn = document.getElementById('btn-ajouter-rayon');
const nomRayonInput = document.getElementById('nouveau-rayon');

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
  try { await fetch(API_URL,{method:'POST',body:JSON.stringify(data)}); }
  catch(err){ console.error("Erreur save API :", err); }
}

/* =================================================
   AUTOCOMPLÉTION PRODUITS
================================================= */
function findLocalMatch(rayonId, value) {
  const r = localData.find(r => r.id === rayonId);
  if (!r) return null;
  const v = normalize(value);
  return r.produits.slice().sort((a,b)=>a.coche-b.coche).find(p => normalize(p.nom).startsWith(v));
}
function findGlobalMatch(value) {
  const v = normalize(value);
  for(const r of localData){
    const match = r.produits.find(p=>normalize(p.nom).startsWith(v));
    if(match) return match;
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
    r.produits.slice().sort((a,b)=>a.coche-b.coche).forEach(p => addProduit(cont, p.nom, p.id, p.coche));
    rayonsContainer.appendChild(rayon);
  });
}

/* =================================================
   CHARGEMENT DONNÉES
================================================= */
function loadFromLocal() {
  const saved = localStorage.getItem('listeCourses');
  if(!saved) return false;
  localData = JSON.parse(saved);
  rebuildDOM();
  return true;
}
async function loadFromServer() {
  try {
    const res = await fetch(API_URL);
    localData = await res.json();
    rebuildDOM();
    updateLocalStorage();
  } catch(err){ console.error("Erreur load API :", err); }
}

/* =================================================
   COMPOSANT RAYON
================================================= */
function createRayon(nom,id=null,collapsed=false){
  const rayon = document.createElement('div');
  rayon.className='rayon';
  rayon.dataset.id=id||crypto.randomUUID();
  rayon.setAttribute('draggable','true');

  rayon.innerHTML=`
    <div class="rayon-header">
      <button class="btn-deplacer-rayon">☰</button>
      <h2>${nom}</h2>
      <div class="rayon-actions">
        <button class="btn-supprimer-rayon">✖</button>
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
  const titre = rayon.querySelector('h2');

  // Collapse / expand
  header.addEventListener('click', e=>{
    if(e.target.closest('button')) return;
    rayon.classList.toggle('collapsed');
    const r = localData.find(r=>r.id===rayon.dataset.id);
    if(r) r.collapsed=rayon.classList.contains('collapsed');
    updateLocalStorage();
  });

  // Supprimer rayon
  btnSup.addEventListener('click', ()=>{
    localData = localData.filter(r=>r.id!==rayon.dataset.id);
    rayon.remove();
    updateLocalStorage();
  });

  // Apparition croix au clic
  header.addEventListener('click', ()=> {
    rayon.querySelector('.rayon-actions').classList.add('show');
    setTimeout(()=>rayon.querySelector('.rayon-actions').classList.remove('show'), 3000);
  });

  // Modification inline double clic
  let editing=false;
  titre.addEventListener('dblclick', ()=>{
    if(editing) return;
    editing=true;
    const old = titre.textContent;
    titre.contentEditable=true;
    titre.focus();
    document.execCommand('selectAll',false,null);
  });
  titre.addEventListener('keydown', e=>{
    if(e.key==='Enter'){
      e.preventDefault();
      const newVal = titre.textContent.trim();
      if(newVal){
        const r=localData.find(r=>r.id===rayon.dataset.id);
        if(r) r.nom=newVal;
        updateLocalStorage();
      }
      titre.contentEditable=false;
      editing=false;
    }
  });

  /* ========= AUTOCOMPLÉTION PRODUITS ========= */
  let lastSuggestion=null;
  const debouncedAutocomplete = debounce(()=>{
    const value=inputProd.value;
    if(!value) return;
    const match = findLocalMatch(rayon.dataset.id,value) || findGlobalMatch(value);
    if(!match) return;
    lastSuggestion=match.nom;
    inputProd.value=match.nom;
    inputProd.setSelectionRange(value.length, match.nom.length);
  });
  inputProd.addEventListener('input', debouncedAutocomplete);
  inputProd.addEventListener('keydown', e=>{
    if(e.key==='Tab' && lastSuggestion){
      e.preventDefault();
      inputProd.value=lastSuggestion;
      inputProd.setSelectionRange(lastSuggestion.length,lastSuggestion.length);
    }
  });
  inputProd.addEventListener('keydown', e=>{
    if(e.key!=='Enter') return;
    const val=inputProd.value.trim();
    if(!val) return;
    const r=localData.find(r=>r.id===rayon.dataset.id);
    if(!r) return;
    const exists = r.produits.some(p=>normalize(p.nom)===normalize(val));
    if(exists){
      inputProd.value='';
      lastSuggestion=null;
      return;
    }
    const pObj={id:crypto.randomUUID(),nom:val,coche:false};
    r.produits.push(pObj);
    addProduit(contProd,val,pObj.id);
    inputProd.value='';
    lastSuggestion=null;
    updateLocalStorage();
  });
}

/* =================================================
   COMPOSANT PRODUIT
================================================= */
function addProduit(container,nom,id=null,coche=false){
  const p=document.createElement('div');
  p.className='produit';
  p.dataset.id=id||crypto.randomUUID();
  p.innerHTML=`
    <input type="checkbox" class="produit-checkbox">
    <span class="produit-nom">${nom}</span>
    <div class="produit-actions">
      <button class="btn-supprimer-produit">✖</button>
    </div>
  `;

  const cb=p.querySelector('.produit-checkbox');
  const nomSpan=p.querySelector('.produit-nom');
  cb.checked=coche;
  p.classList.toggle('produit-coche',coche);

  // Clic sur nom = modification inline double clic
  let editing=false;
  nomSpan.addEventListener('dblclick', ()=>{
    if(editing) return;
    editing=true;
    nomSpan.contentEditable=true;
    nomSpan.focus();
    document.execCommand('selectAll',false,null);
  });
  nomSpan.addEventListener('keydown', e=>{
    if(e.key==='Enter'){
      e.preventDefault();
      const newVal=nomSpan.textContent.trim();
      if(newVal){
        const r=localData.find(r=>r.id===p.closest('.rayon').dataset.id);
        if(!r) return;
        const prod=r.produits.find(x=>x.id===p.dataset.id);
        if(prod) prod.nom=newVal;
        updateLocalStorage();
      }
      nomSpan.contentEditable=false;
      editing=false;
    }
  });

  cb.addEventListener('change', ()=>{
    const rayonEl=p.closest('.rayon');
    const r=localData.find(r=>r.id===rayonEl.dataset.id);
    if(!r) return;
    const prod=r.produits.find(x=>x.id===p.dataset.id);
    if(prod) prod.coche=cb.checked;
    p.classList.toggle('produit-coche',cb.checked);
    r.produits.sort((a,b)=>a.coche-b.coche);
    const cont=rayonEl.querySelector('.produits-container');
    r.produits.forEach(pObj=>{
      const el=cont.querySelector(`.produit[data-id="${pObj.id}"]`);
      if(el) cont.appendChild(el);
    });
    updateLocalStorage();
  });

  // Apparition suppression au clic
  p.addEventListener('click', ()=> {
    p.querySelector('.produit-actions').classList.add('show');
    setTimeout(()=>p.querySelector('.produit-actions').classList.remove('show'),3000);
  });

  p.querySelector('.btn-supprimer-produit').addEventListener('click', ()=>{
    const r=localData.find(r=>r.id===p.closest('.rayon').dataset.id);
    if(r) r.produits=r.produits.filter(x=>x.id!==p.dataset.id);
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
  const order=[...rayonsContainer.children].map(r=>r.dataset.id);
  localData.sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id));
  updateLocalStorage();
});
rayonsContainer.addEventListener('dragover', e=>{
  e.preventDefault();
  const dragging=document.querySelector('.dragging');
  const after=[...rayonsContainer.children].find(r=>e.clientY<r.getBoundingClientRect().top+r.offsetHeight/2);
  after?rayonsContainer.insertBefore(dragging,after):rayonsContainer.appendChild(dragging);
});
function initTouchDrag(rayon){
  const btn=rayon.querySelector('.btn-deplacer-rayon');
  let dragging=false;
  btn.addEventListener('touchstart', e=>{dragging=true; rayon.classList.add('dragging'); e.preventDefault();},{passive:false});
  btn.addEventListener('touchmove', e=>{
    if(!dragging) return;
    const after=[...rayonsContainer.children].find(r=>e.touches[0].clientY<r.getBoundingClientRect().top+r.offsetHeight/2);
    after?rayonsContainer.insertBefore(rayon,after):rayonsContainer.appendChild(rayon);
    e.preventDefault();
  },{passive:false});
  btn.addEventListener('touchend', ()=>{dragging=false; rayon.classList.remove('dragging'); updateLocalStorage();});
}

/* =================================================
   INIT
================================================= */
document.addEventListener('DOMContentLoaded', ()=>{
  if(!loadFromLocal()) loadFromServer();
});

/* =================================================
   AJOUT RAYON
================================================= */
ajouterRayonBtn.addEventListener('click', ()=>{
  const nom=nomRayonInput.value.trim();
  if(!nom) return;
  const r={id:crypto.randomUUID(),nom,collapsed:false,produits:[]};
  localData.push(r);
  rayonsContainer.appendChild(createRayon(nom,r.id));
  nomRayonInput.value='';
  updateLocalStorage();
});
nomRayonInput.addEventListener('keydown', e=>{if(e.key==='Enter') ajouterRayonBtn.click();});
