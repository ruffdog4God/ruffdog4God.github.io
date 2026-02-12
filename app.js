
async function loadConfig(){
  const res = await fetch('./config.json');
  return await res.json();
}
function uid(n=10){
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s="";
  for(let i=0;i<n;i++) s+=chars[Math.floor(Math.random()*chars.length)];
  return s;
}
function getStore(){
  return JSON.parse(localStorage.getItem("sgp_store")||"{}");
}
function setStore(obj){
  localStorage.setItem("sgp_store", JSON.stringify(obj));
}
function resetAll(){
  localStorage.removeItem("sgp_store");
  alert("Prototype data cleared on this device/browser.");
  location.href = "./index.html";
}
function nowISO(){ return new Date().toISOString(); }

function ensureParticipant(store){
  if(!store.participant){
    store.participant = {
      id: uid(12),
      createdAt: nowISO(),
      name: "",
      email: "",
      gifts: { top5:[], top3:[] },
      affirmers: [],
      temperament: "",
      passion: "",
      skills: [],
      journey: "",
      availability: 2
    };
  }
  if(!store.affirmations) store.affirmations = {}; // token -> {participantId, affirmerName, affirmerEmail, top3}
  if(!store.people) store.people = []; // for admin demo: completed records
  return store;
}

function scoreGifts(config, participant){
  // Gift scoring: base points from top3 ranks, plus bonus for top5.
  const points = {};
  config.gifts.forEach(g=>points[g]=0);
  participant.gifts.top3.forEach((g,idx)=>{
    const p = config.rankPoints[idx] ?? 0;
    points[g] += p;
  });
  participant.gifts.top5.forEach(g=>{
    points[g] += config.top5Bonus;
  });

  // Apply sign gift weight
  const coreSet = new Set(config.gifts.slice(0, config.coreGiftCount));
  const weighted = {};
  for(const g of config.gifts){
    const w = coreSet.has(g) ? config.coreWeight : config.signWeight;
    weighted[g] = points[g]*w;
  }
  // Sort
  const sorted = Object.entries(weighted).sort((a,b)=>b[1]-a[1]);
  return { raw: points, weighted, sorted };
}

function scoreAlignment(config, participant, store){
  // Compare self top3 vs affirmers top3. Score 0-100.
  const self = participant.gifts.top3;
  const affs = participant.affirmers
    .map(a=>store.affirmations[a.token]?.top3 || [])
    .filter(x=>Array.isArray(x) && x.length===3);

  if(affs.length===0) return {score:null, details:[]};

  const details = affs.map((aTop3, i)=>{
    let score = 0;
    for(let r=0;r<3;r++){
      const g = aTop3[r];
      const selfIdx = self.indexOf(g);
      if(selfIdx>=0){
        // exact match rank bonus
        score += 30;
        score += Math.max(0, 10 - Math.abs(selfIdx - r)*5);
      }else{
        // not in self top3 but affirmed
        score += 5;
      }
    }
    score = Math.min(100, score);
    return { affirmer: participant.affirmers[i]?.name || "Affirmer", score, top3:aTop3 };
  });

  const avg = Math.round(details.reduce((s,d)=>s+d.score,0)/details.length);
  return {score:avg, details};
}

function recommendPaths(participant){
  // Simple rule-based recommendations (editable later)
  const g = new Set(participant.gifts.top3);
  const rec = [];
  const avail = participant.availability;

  if(g.has("Teaching") && avail>=2) rec.push("Lead a Discovery Bible Study or small group teaching rotation");
  if(g.has("Mercy")) rec.push("Care team: hospital visits, meals, grief support, mercy outreach");
  if(g.has("Evangelism")) rec.push("Neighborhood outreach: prayer-walk + story-sharing + follow-up groups");
  if(g.has("Hospitality")) rec.push("Host a simple gathering / house fellowship / newcomer table");
  if(g.has("Leadership") && avail>=3) rec.push("Lead a ministry team or launch a new simple group");
  if(g.has("Administration")) rec.push("Support ministries with systems, scheduling, and coordination");
  if(g.has("Intercession")) rec.push("Prayer mobilizer: lead prayer rhythms + intercession circles");

  // fallback
  if(rec.length===0) rec.push("Serve alongside a mentor for 4 weeks and retake the pathway with feedback");
  return rec;
}

function qs(name){
  const url = new URL(location.href);
  return url.searchParams.get(name);
}

window.SGP = { loadConfig, uid, getStore, setStore, resetAll, ensureParticipant,
               scoreGifts, scoreAlignment, recommendPaths, qs };
