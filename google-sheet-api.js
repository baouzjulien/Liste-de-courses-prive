const SHEET_RAYONS = "Rayons";
const SHEET_PRODUITS = "Produits";

/* --- GET / POST API --- */
function doGet(e) {
  if (e.parameter.ping) {
    // renvoyer un timestamp pour le long-polling
    return ContentService.createTextOutput(JSON.stringify({updated: new Date().getTime()}))
                         .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify(getData()))
                       .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    saveData(data);
    return ContentService.createTextOutput(JSON.stringify({status: "ok"}))
                         .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({status: "error", message: err.message}))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}

/* --- LIRE LES DONNÉES --- */
function getData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const rayonsSheet = ss.getSheetByName(SHEET_RAYONS);
  const produitsSheet = ss.getSheetByName(SHEET_PRODUITS);

  const rayonsData = rayonsSheet.getRange(2,1,rayonsSheet.getLastRow()-1,3).getValues();
  const produitsData = produitsSheet.getRange(2,1,produitsSheet.getLastRow()-1,4).getValues();

  return rayonsData.map(r => ({
    id: r[0],
    nom: r[1],
    collapsed: r[2],
    produits: produitsData
      .filter(p => p[1] === r[0])
      .map(p => ({ id: p[0], nom: p[2], coche: p[3] }))
  }));
}

/* --- ENREGISTRER LES DONNÉES --- */
function saveData(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let rayonsSheet = ss.getSheetByName(SHEET_RAYONS);
  let produitsSheet = ss.getSheetByName(SHEET_PRODUITS);

  // création si manquant
  if(!rayonsSheet) rayonsSheet = ss.insertSheet(SHEET_RAYONS);
  if(!produitsSheet) produitsSheet = ss.insertSheet(SHEET_PRODUITS);

  // Effacer anciennes données
  rayonsSheet.clearContents();
  produitsSheet.clearContents();

  // Ajouter header
  rayonsSheet.getRange(1,1,1,3).setValues([["id","nom","collapsed"]]);
  produitsSheet.getRange(1,1,1,4).setValues([["id","rayonId","nom","coche"]]);

  // Ajouter nouvelles lignes
  const rayonsValues = data.map(r => [r.id, r.nom, r.collapsed]);
  const produitsValues = [];
  data.forEach(r => r.produits.forEach(p => produitsValues.push([p.id, r.id, p.nom, p.coche])));

  if(rayonsValues.length>0) rayonsSheet.getRange(2,1,rayonsValues.length,3).setValues(rayonsValues);
  if(produitsValues.length>0) produitsSheet.getRange(2,1,produitsValues.length,4).setValues(produitsValues);
}
