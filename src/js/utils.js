/**
 * PlantLog v4 — UTILS MODULE
 * Utility functions
 * Lines 1973–1989 of original monolithic file
 */

// ═══════ UTILS ═══════
function fmtDate(d){
  if(!d||d==='—'||d==='undefined'||d==='null')return'—';
  try{
    // Strip any existing time part, keep only YYYY-MM-DD
    const dateOnly=String(d).trim().slice(0,10);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly))return String(d);
    const[y,m,day]=dateOnly.split('-').map(Number);
    if(isNaN(y)||isNaN(m)||isNaN(day))return String(d);
    // Use explicit parts to avoid timezone offset issues
    const dt=new Date(y,m-1,day);
    return dt.toLocaleDateString(S.lang==='vi'?'vi-VN':'en-GB',{day:'numeric',month:'short',year:'numeric'});
  }catch(e){return String(d);}
}
function clearAllData(){if(!confirm('Delete ALL data? This cannot be undone.'))return;S={profile:{name:'',title:'',company:'',empid:''},trips:[],reports:{},tasks:[],leaveData:{},machines:[],plans:[],bills:[],templates:['Safety pressure valves','Fire suppression system','Emergency stop buttons','PPE compliance check','Electrical panel condition','Pipe insulation condition'],defaultTeam:[],lang:S.lang};sv();loadProfile();renderDash();renderTripList();renderCalendar();renderTasks();renderDefaultTeam();showToast('Data cleared');}

