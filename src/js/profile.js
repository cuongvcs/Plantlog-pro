/**
 * PlantLog v4 — PROFILE MODULE
 * Profile
 * Lines 259–282 of original monolithic file
 */

// ═══════ PROFILE ═══════
function loadProfile(){
  document.getElementById('pref-name').value=S.profile.name||'';
  document.getElementById('pref-title').value=S.profile.title||'';
  document.getElementById('pref-company').value=S.profile.company||'';
  document.getElementById('pref-empid').value=S.profile.empid||'';
  updateProfileDisplay();
}
function saveProfile(){
  S.profile.name=document.getElementById('pref-name').value;
  S.profile.title=document.getElementById('pref-title').value;
  S.profile.company=document.getElementById('pref-company').value;
  S.profile.empid=document.getElementById('pref-empid').value;
  sv();updateProfileDisplay();
}
function updateProfileDisplay(){
  const n=S.profile.name||'PL';
  const ini=n.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  document.getElementById('home-av').textContent=ini;
  document.getElementById('settings-av').textContent=ini;
  document.getElementById('s-name-d').textContent=S.profile.name||'Set your name';
  document.getElementById('s-title-d').textContent=[S.profile.title,S.profile.company].filter(Boolean).join(' · ')||'Add title & company';
}
