/* =================================================
   CONSTANTES
================================================= */
const SHEET_RAYONS = "Rayons";
const SHEET_PRODUITS = "Produits";

/* =================================================
   API GET / POST
   Gestion des requêtes HTTP depuis le frontend
================================================= */

// GET : renvoie les données ou un ping pour le long-polling
function doGet(e) {
  if (e.parameter.ping) {
    // ping : renvoyer un timestamp
    return ContentService.createTextOutput(
      JSON.stringify({updated: new Date().getTime()})
    ).setMimeType(ContentService.MimeType.JSON);
  }

  // sinon renvoyer toutes les données
  return ContentService.createTextOutput(
    JSON.stringify(getData())
  ).setMimeType(ContentService.MimeType.JSON);
}

// POST : sauvegarde des données envoyées depuis le frontend
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    saveData(data);
    return ContentService.createTextOutput(
      JSON.stringify({status: "ok"})
    ).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(
      JSON.stringify({status: "error", message: err.message})
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/* =================================================
   LECTURE DES DONNÉES (Sheets → JS)
================================================= */
function getData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const rayonsSheet = ss.getSheetByName(SHEET_RAYONS);
  const produitsSheet = ss.getSheetByName(SHEET_PRODUITS);

  // Récupération des données existantes (hors header)
  const rayonsData = rayonsSheet.getRange(2,1,rayonsSheet.getLastRow()-1,3).getValues();
  const produitsData = produitsSheet.getRange(2,1,produitsSheet.getLastRow()-1,4).getValues();

  // Transformation en objets JS imbriqués
  return rayonsData.map(r => ({
    id: r[0],
    nom: r[1],
    collapsed: r[2],
    produits: produitsData
      .filter(p => p[1] === r[0])
      .map(p => ({ id: p[0], nom: p[2], coche: p[3] }))
  }));
}

/* =================================================
   SAUVEGARDE DES DONNÉES (JS → Sheets)
================================================= */
function saveData(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let rayonsSheet = ss.getSheetByName(SHEET_RAYONS);
  let produitsSheet = ss.getSheetByName(SHEET_PRODUITS);

  // Création des sheets si elles n'existent pas
  if(!rayonsSheet) rayonsSheet = ss.insertSheet(SHEET_RAYONS);
  if(!produitsSheet) produitsSheet = ss.insertSheet(SHEET_PRODUITS);

  // Effacement des anciennes données
  rayonsSheet.clearContents();
  produitsSheet.clearContents();

  // Ajout des headers
  rayonsSheet.getRange(1,1,1,3).setValues([["id","nom","collapsed"]]);
  produitsSheet.getRange(1,1,1,4).setValues([["id","rayonId","nom","coche"]]);

  // Préparation des nouvelles valeurs
  const rayonsValues = data.map(r => [r.id, r.nom, r.collapsed]);
  const produitsValues = [];
  data.forEach(r => r.produits.forEach(p => 
    produitsValues.push([p.id, r.id, p.nom, p.coche])
  ));

  // Écriture des données dans les sheets
  if(rayonsValues.length>0) rayonsSheet.getRange(2,1,rayonsValues.length,3).setValues(rayonsValues);
  if(produitsValues.length>0) produitsSheet.getRange(2,1,produitsValues.length,4).setValues(produitsValues);
}
