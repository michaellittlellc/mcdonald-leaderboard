import { useState, useEffect } from "react";
import { db } from "./firebase";
import {

doc, setDoc, onSnapshot, collection, addDoc,
query, orderBy, limit, serverTimestamp
} from "firebase/firestore";

const DEFAULT_PASSWORD  = "Password123!";
const MANAGER_PASSWORD  = "Mcdonald123!";
const PRIZE_RESTRICTED_IDS = [10, 9, 12, 8];
const POINT_VALUES = { transfer:1, sold_transfer:1, closed_transfer:2, own_sale:3 };

const ADMIN_MANAGERS = [
{ id:"mgr-tee",     name:"Tee Adams",      role:"Manager", isAdminManager:true },
{ id:"mgr-michael", name:"Michael Little", role:"Manager", isAdminManager:true },
{ id:"mgr-tyler",   name:"Tyler McDonald", role:"Manager", isAdminManager:true },
];

const AGENTS_DEFAULT = [
{ id:1,  name:"Destiny Humphreys", role:"Agent" },
{ id:2,  name:"Hailie Veal",       role:"Agent" },
{ id:3,  name:"Kaitlin Sinclair",  role:"Agent" },
{ id:4,  name:"Edith Spradley",    role:"Agent" },
{ id:5,  name:"Layla Finch",       role:"Agent" },
{ id:6,  name:"Abbie Sanders",     role:"Agent" },
{ id:7,  name:"Beth",              role:"Agent" },
{ id:8,  name:"Christian Kanupke", role:"Agent" },
{ id:9,  name:"Austin Oblow",      role:"Agent" },
{ id:10, name:"Chipper Wiley",     role:"Agent" },
{ id:11, name:"Madison Crowley",   role:"Manager" },
{ id:12, name:"Dana Gordy",        role:"Agent" },
];

const TROPHY_COLORS = {
dark: {
  0: { cup:"#f59e0b", shine:"#fde68a", shadow:"#b45309", glow:"#f59e0b55", label:"GOLD",   border:"#f59e0b66", bg:"linear-gradient(135deg,#1c1500,#0f172a)" },
  1: { cup:"#cbd5e1", shine:"#f1f5f9", shadow:"#64748b", glow:"#94a3b855", label:"SILVER", border:"#94a3b855", bg:"linear-gradient(135deg,#0f1520,#0f172a)" },
  2: { cup:"#c2773a", shine:"#f0a968", shadow:"#7c4a1e", glow:"#c2773a55", label:"BRONZE", border:"#c2773a55", bg:"linear-gradient(135deg,#180e05,#0f172a)" },
},
light: {
  0: { cup:"#b45309", shine:"#92400e", shadow:"#78350f", glow:"#f59e0b44", label:"GOLD",   border:"#f59e0b99", bg:"linear-gradient(135deg,#fef9c3,#fef3c7)" },
  1: { cup:"#475569", shine:"#1e293b", shadow:"#334155", glow:"#94a3b844", label:"SILVER", border:"#94a3b899", bg:"linear-gradient(135deg,#f1f5f9,#e2e8f0)" },
  2: { cup:"#7c4a1e", shine:"#92400e", shadow:"#6b3a16", glow:"#c2773a44", label:"BRONZE", border:"#c2773a99", bg:"linear-gradient(135deg,#fde8d0,#fddbb4)" },
},
};

const BADGES = [
{ id:"first_sale",    label:"First Sale",   icon:"🎯", condition:(s,pts,tdp) => s.own_sale >= 1 },
{ id:"ten_transfers", label:"10 Transfers", icon:"⚡", condition:(s,pts,tdp) => s.transfer >= 10 },
{ id:"hat_trick",     label:"Hat Trick",    icon:"🎩", condition:(s,pts,tdp) => s.own_sale >= 3 },
{ id:"closer",        label:"Closer",       icon:"🔒", condition:(s,pts,tdp) => (s.sold_transfer+s.closed_transfer) >= 5 },
{ id:"mvp",           label:"25 Points",    icon:"👑", condition:(s,pts,tdp) => pts >= 25 },
{ id:"on_fire",       label:"On Fire",      icon:"🔥", condition:(s,pts,tdp) => pts >= 15 || tdp >= 6 },
];

const calcPoints = s => s.transfer*1 + s.sold_transfer*1 + s.closed_transfer*2 + s.own_sale*3;
const calcApps   = s => s.sold_transfer + s.closed_transfer + s.own_sale;
const initStats  = () => ({ transfer:0, sold_transfer:0, closed_transfer:0, own_sale:0 });

const DARK  = { bg:"#0a0f1e", text:"#f1f5f9", muted:"#64748b", cardBg:"#0f172a", border:"#1e3a5f", headerBg:"#0a0f1e", bannerBg:"#0f172a" };
const LIGHT = { bg:"#f1f5f9", text:"#0f172a", muted:"#64748b", cardBg:"#ffffff", border:"#cbd5e1", headerBg:"#ffffff", bannerBg:"#f8fafc" };

function Trophy({ rank, size=48 }) {
const c = TROPHY_COLORS.dark[rank];
if (!c) return null;
return (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <defs>
      <radialGradient id={`glow${rank}`} cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor={c.shine} stopOpacity="0.9"/>
        <stop offset="100%" stopColor={c.cup} stopOpacity="0.6"/>
      </radialGradient>
    </defs>
    <rect x="14" y="40" width="20" height="3" rx="1.5" fill={c.shadow}/>
    <rect x="20" y="34" width="8" height="7" rx="1" fill={c.cup}/>
    <path d="M10 16 Q6 16 6 22 Q6 28 12 28" stroke={c.cup} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
    <path d="M38 16 Q42 16 42 22 Q42 28 36 28" stroke={c.cup} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
    <path d="M12 10 L36 10 L32 30 Q28 34 24 34 Q20 34 16 30 Z" fill={`url(#glow${rank})`}/>
    <path d="M16 13 Q18 11 22 12" stroke={c.shine} strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.7"/>
    <text x="24" y="25" textAnchor="middle" fontSize="10" fill={c.shadow} fontWeight="bold">★</text>
  </svg>
);
}

function Confetti({ active }) {
const colors = ["#f59e0b","#60a5fa","#34d399","#f472b6","#a78bfa","#fb923c"];
if (!active) return null;
return (
  <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:9999,overflow:"hidden"}}>
    {Array.from({length:60}).map((_,i) => {
      const left=Math.random()*100, delay=Math.random()*1.5, dur=2+Math.random()*1.5;
      const color=colors[i%colors.length], sz=6+Math.random()*8;
      return <div key={i} style={{position:"absolute",left:`${left}%`,top:"-20px",width:sz,height:sz,background:color,borderRadius:Math.random()>0.5?"50%":"2px",animation:`fall ${dur}s ${delay}s linear forwards`}}/>;
    })}
    <style>{`@keyframes fall{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(110vh) rotate(720deg);opacity:0}}`}</style>
  </div>
);
}

function LoginScreen({ agents, onLogin }) {
const all = [...ADMIN_MANAGERS, ...agents].sort((a,b)=>a.name.localeCompare(b.name));
const [selId,setSelId] = useState("");
const [pw,setPw]       = useState("");
const [err,setErr]     = useState("");
const [show,setShow]   = useState(false);

const doLogin = () => {
  if (!selId) { setErr("Please select your name."); return; }
  const acct = all.find(a=>String(a.id)===String(selId));
  if (!acct)  { setErr("Account not found."); return; }
  const correct = acct.isAdminManager ? MANAGER_PASSWORD : DEFAULT_PASSWORD;
  if (pw !== correct) { setErr("Incorrect password."); return; }
  onLogin(acct);
};

return (
  <div style={L.root}>
    <div style={L.bg}/>
    <div style={L.card}>
      <div style={L.eye}>McDONALD GROUP</div>
      <div style={L.ttl}>LEADERBOARD</div>
      <div style={L.sub}>Sign in to your account</div>
      <div style={L.field}>
        <label style={L.lbl}>YOUR NAME</label>
        <select value={selId} onChange={e=>{setSelId(e.target.value);setErr("");}} style={L.sel}>
          <option value="">— Choose your name —</option>
          {all.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
      <div style={L.field}>
        <label style={L.lbl}>PASSWORD</label>
        <div style={{display:"flex",gap:8}}>
          <input type={show?"text":"password"} value={pw}
            onChange={e=>{setPw(e.target.value);setErr("");}}
            onKeyDown={e=>e.key==="Enter"&&doLogin()}
            placeholder="Enter password" style={L.inp}/>
          <button onClick={()=>setShow(p=>!p)} style={L.eyeBtn}>{show?"🙈":"👁️"}</button>
        </div>
      </div>
      {err && <div style={L.err}>{err}</div>}
      <button onClick={doLogin} style={L.btn}>Sign In →</button>
    </div>
  </div>
);
}

const L = {
root:{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#0a0f1e",position:"relative"},
bg:{position:"fixed",inset:0,background:"radial-gradient(ellipse at 30% 30%,#1e3a5f44,transparent 60%),radial-gradient(ellipse at 70% 70%,#1a1f4488,transparent 60%)",pointerEvents:"none"},
card:{position:"relative",zIndex:1,background:"#0f172a",border:"1px solid #1e3a5f",borderRadius:20,padding:"40px 36px",width:"100%",maxWidth:400,display:"flex",flexDirection:"column",gap:16},
eye:{fontSize:24,letterSpacing:8,color:"#3949ff",fontWeight:700,textAlign:"center",fontFamily:"Georgia,'Times New Roman',serif",textShadow:"0 2px 8px #3949ff44"},
ttl:{fontSize:28,fontWeight:900,background:"linear-gradient(135deg,#f59e0b,#fbbf24,#fff)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:2,textAlign:"center"},
sub:{fontSize:13,color:"#64748b",textAlign:"center",marginBottom:8},
field:{display:"flex",flexDirection:"column",gap:6},
lbl:{fontSize:10,letterSpacing:2,color:"#64748b",fontWeight:700},
sel:{padding:"11px 14px",borderRadius:10,border:"1px solid #1e3a5f",background:"#0a0f1e",color:"#f1f5f9",fontSize:14,outline:"none"},
inp:{flex:1,padding:"11px 14px",borderRadius:10,border:"1px solid #1e3a5f",background:"#0a0f1e",color:"#f1f5f9",fontSize:14,outline:"none"},
eyeBtn:{padding:"0 12px",borderRadius:10,border:"1px solid #1e3a5f",background:"#0a0f1e",cursor:"pointer",fontSize:16},
err:{background:"#7f1d1d44",border:"1px solid #b91c1c",borderRadius:8,padding:"9px 14px",fontSize:13,color:"#fca5a5"},
btn:{padding:"13px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#2563eb,#1d4ed8)",color:"#fff",fontSize:15,fontWeight:800,cursor:"pointer",letterSpacing:1,marginTop:4},
};

function ChangePwModal({ user, onClose }) {
const [cur,setCur]   = useState("");
const [nw,setNw]     = useState("");
const [conf,setConf] = useState("");
const [err,setErr]   = useState("");
const [ok,setOk]     = useState(false);

const save = async () => {
  const correct = user.isAdminManager ? MANAGER_PASSWORD : DEFAULT_PASSWORD;
  if (cur !== correct) { setErr("Current password is incorrect."); return; }
  if (nw.length < 6)   { setErr("New password must be at least 6 characters."); return; }
  if (nw !== conf)      { setErr("Passwords do not match."); return; }
  try {
    await setDoc(doc(db,"passwords", String(user.id)), { password: nw });
    setOk(true);
    setTimeout(onClose, 1500);
  } catch(e) { setErr("Failed to save. Try again."); }
};

return (
  <div style={{position:"fixed",inset:0,background:"#000a",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
    <div style={{background:"#0f172a",border:"1px solid #1e3a5f",borderRadius:16,padding:"28px",width:"100%",maxWidth:360}}>
      <div style={{fontSize:18,fontWeight:900,color:"#f1f5f9",marginBottom:20}}>Change Password</div>
      {ok ? <div style={{fontSize:15,color:"#34d399",textAlign:"center",padding:"20px 0"}}>✅ Password updated!</div> : <>
        {[["Current Password",cur,setCur],["New Password",nw,setNw],["Confirm New Password",conf,setConf]].map(([lbl,val,set])=>(
          <div key={lbl} style={{display:"flex",flexDirection:"column",gap:5,marginBottom:12}}>
            <label style={L.lbl}>{lbl.toUpperCase()}</label>
            <input type="password" value={val} onChange={e=>{set(e.target.value);setErr("");}} style={{...L.inp,background:"#0f172a"}}/>
          </div>
        ))}
        {err && <div style={L.err}>{err}</div>}
        <div style={{display:"flex",gap:10,marginTop:8}}>
          <button onClick={save} style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#2563eb,#1d4ed8)",color:"#fff",fontWeight:800,cursor:"pointer"}}>Save</button>
          <button onClick={onClose} style={{flex:1,padding:"10px",borderRadius:10,border:"1px solid #334155",background:"transparent",color:"#94a3b8",cursor:"pointer",fontWeight:700}}>Cancel</button>
        </div>
      </>}
    </div>
  </div>
);
}

export default function App() {
const [agents,setAgents]           = useState(AGENTS_DEFAULT);
const [stats,setStats]             = useState(() => Object.fromEntries(AGENTS_DEFAULT.map(a=>[a.id,initStats()])));
const [actLog,setActLog]           = useState([]);
const [currentUser,setUser]        = useState(null);
const [view,setView]               = useState("board");
const [flash,setFlash]             = useState(null);
const [confetti,setConfetti]       = useState(false);
const [loaded,setLoaded]           = useState(false);
const [newName,setNewName]         = useState("");
const [announcement,setAnn]       = useState("");
const [editAnn,setEditAnn]         = useState(false);
const [annDraft,setAnnDraft]       = useState("");
const [prizes,setPrizes]           = useState({ gold:"", silver:"", bronze:"" });
const [editPrize,setEditPrize]     = useState(false);
const [prizeDraft,setPrizeDraft]   = useState({ gold:"", silver:"", bronze:"" });
const [theme,setTheme]             = useState("dark");
const [showPwModal,setShowPwModal] = useState(false);
const [weekLabel,setWeekLabel]     = useState("");

const todayStr = new Date().toDateString();
const getTodayPoints = (agentId) =>
  actLog.filter(e=>e.agentId===agentId && new Date(e.time?.toDate?.()??e.time).toDateString()===todayStr)
        .reduce((sum,e)=>sum+(POINT_VALUES[e.type]||0),0);

useEffect(()=>{
  const unsubSettings = onSnapshot(doc(db,"settings","main"), snap=>{
    if(snap.exists()){
      const d = snap.data();
      if(d.agents)                     setAgents(d.agents);
      if(d.stats)                      setStats(d.stats);
      if(d.announcement !== undefined) setAnn(d.announcement);
      if(d.prizes)                     setPrizes(d.prizes);
      if(d.theme)                      setTheme(d.theme);
      if(d.weekLabel !== undefined)    setWeekLabel(d.weekLabel);
    }
    setLoaded(true);
  });
  const logQ = query(collection(db,"activityLog"), orderBy("time","desc"), limit(200));
  const unsubLog = onSnapshot(logQ, snap=>{
    setActLog(snap.docs.map(d=>({ id:d.id, ...d.data() })));
  });
  return ()=>{ unsubSettings(); unsubLog(); };
},[]);

const saveSettings = async (patch) => {
  try { await setDoc(doc(db,"settings","main"), patch, { merge:true }); }
  catch(e){ console.error(e); }
};

const isManager    = currentUser?.role === "Manager";
const canSeePrizes = currentUser && !PRIZE_RESTRICTED_IDS.includes(currentUser.id);
const T            = theme==="dark" ? DARK : LIGHT;

const addActivity = async (agentId, type) => {
  const agent   = agents.find(a=>a.id===agentId);
  const prev    = stats[agentId] || initStats();
  const prevPts = calcPoints(prev);
  const prevTdp = getTodayPoints(agentId);
  const newStat = { ...prev, [type]:(prev[type]||0)+1 };
  const newPts  = calcPoints(newStat);
  const newTdp  = prevTdp + (POINT_VALUES[type]||0);
  const newStats = { ...stats, [agentId]:newStat };
  setStats(newStats);
  setFlash({ agentId, type });
  setTimeout(()=>setFlash(null),1200);
  await saveSettings({ stats: newStats });
  await addDoc(collection(db,"activityLog"),{
    time: serverTimestamp(), agentId, agentName:agent?.name, type, by:currentUser.name
  });
  const milestone = BADGES.find(b=>b.condition(newStat,newPts,newTdp)&&!b.condition(prev,prevPts,prevTdp));
  if(milestone){ setConfetti(true); setTimeout(()=>setConfetti(false),3500); }
};

const removeActivity = async (agentId, type) => {
  const prev = stats[agentId] || initStats();
  const newStat = { ...prev, [type]:Math.max(0,(prev[type]||0)-1) };
  const newStats = { ...stats, [agentId]:newStat };
  setStats(newStats);
  await saveSettings({ stats: newStats });
};

const addAgent = async () => {
  if(!newName.trim()) return;
  const id = Date.now();
  const newAgents = [...agents, {id, name:newName.trim(), role:"Agent"}];
  const newStats  = { ...stats, [id]:initStats() };
  setAgents(newAgents); setStats(newStats); setNewName("");
  await saveSettings({ agents:newAgents, stats:newStats });
};

const removeAgent = async (id) => {
  const newAgents = agents.filter(a=>a.id!==id);
  setAgents(newAgents);
  await saveSettings({ agents:newAgents });
};

const resetAll = async () => {
  if(!window.confirm("Reset all points? This cannot be undone.")) return;
  const newStats = Object.fromEntries(agents.map(a=>[a.id,initStats()]));
  setStats(newStats);
  await saveSettings({ stats:newStats });
};

const ranked = [...agents]
  .map(a=>({...a, stats:stats[a.id]||initStats()}))
  .map(a=>({...a, points:calcPoints(a.stats), apps:calcApps(a.stats)}))
  .sort((a,b)=>b.points-a.points);

const totPts   = ranked.reduce((s,a)=>s+a.points,0);
const totApps  = ranked.reduce((s,a)=>s+a.apps,0);
const totTrans = ranked.reduce((s,a)=>s+a.stats.transfer,0);

const actTypes = [
  {type:"transfer",        label:"Sent Transfer",     color:"#3b82f6", pts:1},
  {type:"sold_transfer",   label:"Sent & Closed",     color:"#8b5cf6", pts:1},
  {type:"closed_transfer", label:"Received & Closed", color:"#f59e0b", pts:2},
  {type:"own_sale",        label:"Own Sale",           color:"#10b981", pts:3},
];

const fmtTime   = ts => { const d=new Date(ts?.toDate?.()??ts); return d.toLocaleDateString()+' '+d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}); };
const typeLabel = t => actTypes.find(a=>a.type===t)?.label||t;
const typeColor = t => actTypes.find(a=>a.type===t)?.color||"#fff";
const entryAgents = isManager ? ranked : ranked.filter(a=>a.id===currentUser?.id);
const navItems    = ["board","entry","stats",...(isManager?["feed","manage"]:[])];
const myData      = ranked.find(a=>a.id===currentUser?.id);
const myRank      = myData ? ranked.indexOf(myData)+1 : null;
const myBadges    = myData ? BADGES.filter(b=>b.condition(myData.stats,myData.points,getTodayPoints(myData.id))) : [];

if(!loaded) return (
  <div style={{minHeight:"100vh",background:"#0a0f1e",display:"flex",alignItems:"center",justifyContent:"center",color:"#60a5fa",fontSize:18,fontWeight:700,fontFamily:"'Trebuchet MS',sans-serif"}}>
    Loading McDonald Group Leaderboard...
  </div>
);

if(!currentUser) return <LoginScreen agents={agents} onLogin={setUser}/>;

return (
  <div style={{...S.root,background:T.bg,color:T.text}}>
    <Confetti active={confetti}/>
    {showPwModal && <ChangePwModal user={currentUser} onClose={()=>setShowPwModal(false)}/>}

    {(announcement||isManager) && (
      <div style={{...S.banner,background:T.bannerBg,borderBottom:`1px solid ${T.border}`}}>
        {editAnn ? (
          <div style={{display:"flex",gap:8,flex:1,flexWrap:"wrap"}}>
            <input value={annDraft} onChange={e=>setAnnDraft(e.target.value)} placeholder="Type announcement..."
              style={{...S.inlineInput,background:T.cardBg,color:T.text,border:`1px solid ${T.border}`}}/>
            <button onClick={async()=>{setAnn(annDraft);setEditAnn(false);await saveSettings({announcement:annDraft});}} style={S.saveBtn}>Save</button>
            <button onClick={()=>setEditAnn(false)} style={S.cancelBtn}>Cancel</button>
          </div>
        ) : (
          <>
            <span style={{fontSize:13,color:"#fbbf24",flex:1}}>📢 {announcement||"No announcement set."}</span>
            {isManager && <button onClick={()=>{setAnnDraft(announcement);setEditAnn(true);}} style={S.editAnnBtn}>Edit</button>}
          </>
        )}
      </div>
    )}

    <div style={{...S.header,background:T.headerBg,borderBottom:`1px solid ${T.border}`}}>
      <div>
        <div style={{fontSize:11,letterSpacing:4,color:"#60a5fa",fontWeight:700,marginBottom:2}}>McDONALD GROUP</div>
        <div style={S.title}>LEADERBOARD</div>
      </div>
      <div style={S.headerRight}>
        <div style={S.headerNav}>
          {navItems.map(v=>(
            <button key={v} onClick={()=>setView(v)}
              style={{...S.navBtn,border:`1px solid ${T.border}`,color:T.muted,...(view===v?{background:"#1e3a5f",color:"#f1f5f9",borderColor:"#3b82f6"}:{})}}>
              {v==="board"?"🏆 Board":v==="entry"?"➕ Log":v==="stats"?"📈 Stats":v==="feed"?"📋 Feed":"⚙️ Manage"}
            </button>
          ))}
          <button onClick={async()=>{const t=theme==="dark"?"light":"dark";setTheme(t);await saveSettings({theme:t});}}
            style={{...S.navBtn,border:`1px solid ${T.border}`,color:T.muted}}>
            {theme==="dark"?"☀️":"🌙"}
          </button>
        </div>
        <div style={{...S.userBadge,background:T.cardBg,border:`1px solid ${T.border}`}}>
          <div style={S.userIcon}>{currentUser.name[0]}</div>
          <span style={{fontSize:13,fontWeight:700,color:T.text}}>{currentUser.name}</span>
          {isManager && <span style={S.mgrTag}>MGR</span>}
          <button onClick={()=>setShowPwModal(true)} style={{...S.signOutBtn,color:T.muted,border:`1px solid ${T.border}`}}>🔑</button>
          <button onClick={()=>{setUser(null);setView("board");}} style={{...S.signOutBtn,color:T.muted,border:`1px solid ${T.border}`}}>Sign out</button>
        </div>
      </div>
    </div>

    {canSeePrizes && (prizes.gold||prizes.silver||prizes.bronze||isManager) && (
      <div style={{...S.prizeBanner,background:T.cardBg,borderBottom:`1px solid ${T.border}`}}>
        {editPrize ? (
          <div style={{display:"flex",gap:10,flex:1,flexWrap:"wrap",alignItems:"center"}}>
            {["gold","silver","bronze"].map(p=>(
              <input key={p} value={prizeDraft[p]} onChange={e=>setPrizeDraft(d=>({...d,[p]:e.target.value}))}
                placeholder={`${p.charAt(0).toUpperCase()+p.slice(1)} prize...`}
                style={{...S.inlineInput,flex:1,minWidth:120,background:T.cardBg,color:T.text,border:`1px solid ${T.border}`}}/>
            ))}
            <button onClick={async()=>{setPrizes(prizeDraft);setEditPrize(false);await saveSettings({prizes:prizeDraft});}} style={S.saveBtn}>Save</button>
            <button onClick={()=>setEditPrize(false)} style={S.cancelBtn}>Cancel</button>
          </div>
        ) : (
          <>
            <span style={{fontSize:12,color:"#94a3b8",fontWeight:700,letterSpacing:2,marginRight:8}}>{weekLabel||"THIS WEEK'S PRIZES"}</span>
            {prizes.gold   && <span style={S.prizeItem}>🥇 {prizes.gold}</span>}
            {prizes.silver && <span style={S.prizeItem}>🥈 {prizes.silver}</span>}
            {prizes.bronze && <span style={S.prizeItem}>🥉 {prizes.bronze}</span>}
            {isManager && (
              <>
                <input value={weekLabel} onChange={e=>setWeekLabel(e.target.value)}
                  onBlur={async()=>await saveSettings({weekLabel})}
                  placeholder="Week label..." style={{...S.inlineInput,width:140,marginLeft:12,background:T.cardBg,color:T.text,border:`1px solid ${T.border}`}}/>
                <button onClick={()=>{setPrizeDraft(prizes);setEditPrize(true);}} style={S.editAnnBtn}>Edit Prizes</button>
              </>
            )}
          </>
        )}
      </div>
    )}

    <div style={{display:"flex",gap:12,padding:"14px 24px",flexWrap:"wrap"}}>
      {[{label:"TOTAL POINTS",value:totPts},{label:"APPS WRITTEN",value:totApps},{label:"TRANSFERS",value:totTrans},{label:"ACTIVE AGENTS",value:agents.length}].map(s=>(
        <div key={s.label} style={{flex:"1 1 110px",background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 14px",textAlign:"center"}}>
          <div style={{fontSize:26,fontWeight:900,color:"#f59e0b",lineHeight:1}}>{s.value}</div>
          <div style={{fontSize:10,letterSpacing:2,color:T.muted,marginTop:4,fontWeight:700}}>{s.label}</div>
        </div>
      ))}
    </div>

    {view==="board" && (
      <div style={S.content}>
        <div style={{display:"flex",gap:10,marginBottom:18,flexWrap:"wrap"}}>
          {[{label:"Sent Transfer",pts:1,color:"#60a5fa"},{label:"Sent & Closed",pts:1,color:"#a78bfa"},{label:"Received & Closed",pts:2,color:"#f59e0b"},{label:"Own Sale",pts:3,color:"#34d399"}].map(item=>(
            <div key={item.label} style={{display:"flex",alignItems:"center",gap:6,background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:20,padding:"5px 12px"}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:item.color}}/>
              <span style={{fontSize:12,color:T.muted}}>{item.label}</span>
              <span style={{fontSize:12,fontWeight:800,color:item.color}}>+{item.pts} pts</span>
            </div>
          ))}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {ranked.map((agent,idx)=>{
            const isMe=agent.id===currentUser.id, isFlash=flash?.agentId===agent.id;
            const maxPts=ranked[0]?.points||1, pct=maxPts>0?(agent.points/maxPts)*100:0;
            const tc=TROPHY_COLORS[theme][idx], isTop3=idx<3;
            const agentBadges=BADGES.filter(b=>b.condition(agent.stats,agent.points,getTodayPoints(agent.id)));
            return (
              <div key={agent.id} style={{display:"flex",alignItems:"center",gap:16,borderRadius:12,padding:"14px 18px",transition:"all .3s",
                background:isTop3?tc.bg:T.cardBg,
                border:isTop3?`1px solid ${tc.border}`:isMe?`1px solid #2563eb66`:`1px solid ${T.border}`,
                boxShadow:isTop3?`0 0 18px ${tc.glow}`:isMe?"0 0 14px #2563eb33":"none",
                ...(isFlash?{background:"#1a3a1a",border:"1px solid #34d399"}:{})}}>
                <div style={{width:52,textAlign:"center",flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                  {isTop3?<><Trophy rank={idx} size={44}/><span style={{fontSize:9,fontWeight:900,letterSpacing:1,color:tc.cup}}>{tc.label}</span></>:<span style={{fontSize:18,fontWeight:900,color:T.muted}}>{idx+1}</span>}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:16,fontWeight:800,color:isTop3?tc.shine:T.text,display:"flex",alignItems:"center",gap:6,marginBottom:4,flexWrap:"wrap"}}>
                    {agent.name}
                    {agent.role==="Manager"&&isManager&&<span style={S.mgrTag}>MGR</span>}
                    {isMe&&<span style={S.meBadge}>YOU</span>}
                    {agentBadges.map(b=>(
                      <span key={b.id} style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,background:"#1e293b",border:"1px solid #f59e0b66",color:"#fbbf24",whiteSpace:"nowrap"}}>
                        {b.icon} {b.label}
                      </span>
                    ))}
                  </div>
                  <div style={{height:6,background:theme==="dark"?"#1e293b":"#e2e8f0",borderRadius:3,overflow:"hidden",marginBottom:6}}>
                    <div style={{height:"100%",borderRadius:3,width:`${pct}%`,transition:"width .6s cubic-bezier(.4,0,.2,1)",background:isTop3?`linear-gradient(90deg,${tc.cup},${tc.shine})`:"linear-gradient(90deg,#2563eb,#60a5fa)"}}/>
                  </div>
                  <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                    <span style={{fontSize:11,color:"#60a5fa"}}>⟶ {agent.stats.transfer} transfers</span>
                    <span style={{fontSize:11,color:"#a78bfa"}}>✓ {agent.stats.sold_transfer} s&c</span>
                    <span style={{fontSize:11,color:"#f59e0b"}}>⊕ {agent.stats.closed_transfer} r&c</span>
                    <span style={{fontSize:11,color:"#34d399"}}>★ {agent.stats.own_sale} own</span>
                    <span style={{fontSize:11,color:"#f59e0b",fontWeight:700}}>{agent.apps} apps</span>
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0}}>
                  <span style={{fontSize:isTop3?36:32,fontWeight:900,color:isTop3?tc.cup:"#60a5fa",lineHeight:1}}>{agent.points}</span>
                  <span style={{fontSize:10,color:T.muted,letterSpacing:2,fontWeight:700}}>PTS</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    )}

    {view==="entry" && (
      <div style={S.content}>
        <div style={{fontSize:20,fontWeight:900,color:T.text,marginBottom:6,letterSpacing:1}}>Log Activity</div>
        <p style={{fontSize:13,color:T.muted,marginBottom:20}}>{isManager?"Log activity for any agent.":"Log your own activity below."}</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:14}}>
          {entryAgents.map(agent=>(
            <div key={agent.id} style={{background:T.cardBg,border:`1px solid ${agent.id===currentUser.id?"#2563eb66":T.border}`,boxShadow:agent.id===currentUser.id?"0 0 12px #2563eb22":"none",borderRadius:12,padding:"14px 16px"}}>
              <div style={{fontSize:15,fontWeight:800,color:T.text,marginBottom:2,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                {agent.name}{agent.id===currentUser.id&&<span style={S.meBadge}>YOU</span>}
              </div>
              <div style={{fontSize:12,color:"#f59e0b",fontWeight:700,marginBottom:12}}>{agent.points} pts</div>
              <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:10}}>
                {actTypes.map(act=>(
                  <div key={act.type} style={{display:"flex",gap:6}}>
                    <button onClick={()=>addActivity(agent.id,act.type)} style={{flex:1,padding:"7px 0",borderRadius:7,border:"none",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer",background:act.color}}>
                      +{act.pts} {act.label}
                    </button>
                    <button onClick={()=>removeActivity(agent.id,act.type)} style={{padding:"7px 10px",borderRadius:7,border:`1px solid ${T.border}`,background:T.cardBg,color:T.muted,fontWeight:900,fontSize:14,cursor:"pointer"}}>−</button>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",gap:8,fontSize:11,color:T.muted,flexWrap:"wrap"}}>
                <span>{agent.stats.transfer} sent</span><span>{agent.stats.sold_transfer} s&c</span>
                <span>{agent.stats.closed_transfer} r&c</span><span>{agent.stats.own_sale} own</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

    {view==="stats" && (
      <div style={S.content}>
        <div style={{fontSize:20,fontWeight:900,color:T.text,marginBottom:20,letterSpacing:1}}>{myData?`${currentUser.name}'s Stats`:"Team Stats"}</div>
        {myData && (
          <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:28}}>
            {[{label:"Your Rank",value:`#${myRank}`},{label:"Total Points",value:myData.points},{label:"Apps Written",value:myData.apps},{label:"Transfers",value:myData.stats.transfer}].map(s=>(
              <div key={s.label} style={{flex:"1 1 100px",background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 14px",textAlign:"center"}}>
                <div style={{fontSize:26,fontWeight:900,color:"#60a5fa",lineHeight:1}}>{s.value}</div>
                <div style={{fontSize:10,letterSpacing:2,color:T.muted,marginTop:4,fontWeight:700}}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
        {myData && (
          <div style={{marginBottom:28}}>
            <div style={{fontSize:14,fontWeight:800,color:T.text,marginBottom:12,letterSpacing:1}}>YOUR BADGES</div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              {BADGES.map(b=>{
                const earned=b.condition(myData.stats,myData.points,getTodayPoints(myData.id));
                return (
                  <div key={b.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px",borderRadius:20,background:T.cardBg,border:`1px solid ${earned?"#f59e0b66":T.border}`,opacity:earned?1:0.35}}>
                    <span style={{fontSize:18}}>{b.icon}</span>
                    <span style={{fontSize:13,fontWeight:700,color:earned?"#fbbf24":T.muted}}>{b.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div style={{fontSize:14,fontWeight:800,color:T.text,marginBottom:12,letterSpacing:1}}>TEAM BREAKDOWN</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {ranked.map((agent,idx)=>(
            <div key={agent.id} style={{display:"flex",alignItems:"center",gap:16,borderRadius:12,padding:"12px 16px",background:T.cardBg,border:`1px solid ${T.border}`}}>
              <div style={{width:28,fontWeight:900,color:T.muted,fontSize:14}}>{idx+1}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:800,color:T.text,marginBottom:6}}>{agent.name}</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {actTypes.map(at=>(
                    <div key={at.type} style={{fontSize:11,padding:"3px 8px",borderRadius:10,background:at.color+"22",color:at.color,fontWeight:700}}>
                      {at.label.split(" ")[0]}: {agent.stats[at.type]}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
                <span style={{fontSize:24,fontWeight:900,color:"#60a5fa"}}>{agent.points}</span>
                <span style={{fontSize:9,color:T.muted,letterSpacing:2}}>PTS</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

    {view==="feed" && isManager && (
      <div style={S.content}>
        <div style={{fontSize:20,fontWeight:900,color:T.text,marginBottom:20,letterSpacing:1}}>Activity Feed</div>
        {actLog.length===0 && <div style={{color:T.muted,fontSize:14}}>No activity logged yet.</div>}
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {actLog.slice(0,100).map((e,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 16px",borderRadius:10,background:T.cardBg,border:`1px solid ${T.border}`}}>
              <div style={{width:10,height:10,borderRadius:"50%",background:typeColor(e.type),flexShrink:0}}/>
              <div style={{flex:1}}>
                <span style={{fontWeight:800,color:T.text}}>{e.agentName}</span>
                <span style={{color:T.muted,fontSize:13}}> · {typeLabel(e.type)}</span>
                {e.by&&e.by!==e.agentName&&<span style={{color:T.muted,fontSize:12}}> (logged by {e.by})</span>}
              </div>
              <div style={{fontSize:11,color:T.muted}}>{fmtTime(e.time)}</div>
            </div>
          ))}
        </div>
      </div>
    )}

    {view==="manage" && isManager && (
      <div style={S.content}>
        <div style={{fontSize:20,fontWeight:900,color:T.text,marginBottom:16,letterSpacing:1}}>Manage Agents</div>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
          {agents.map(a=>(
            <div key={a.id} style={{display:"flex",alignItems:"center",gap:12,background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 16px"}}>
              <span style={{flex:1,fontSize:14,fontWeight:700,color:T.text}}>{a.name}</span>
              <span style={{fontSize:12,color:T.muted}}>{a.role}</span>
              <button onClick={()=>removeAgent(a.id)} style={{padding:"5px 12px",borderRadius:6,border:"1px solid #7f1d1d",background:"transparent",color:"#f87171",fontSize:12,cursor:"pointer",fontWeight:600}}>Remove</button>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:10,marginBottom:16}}>
          <input value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addAgent()}
            placeholder="New agent name..." style={{flex:1,padding:"10px 14px",borderRadius:8,border:`1px solid ${T.border}`,background:T.cardBg,color:T.text,fontSize:14,outline:"none"}}/>
          <button onClick={addAgent} style={{padding:"10px 20px",borderRadius:8,border:"none",background:"#2563eb",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>Add Agent</button>
        </div>
        <button onClick={resetAll} style={{padding:"10px 20px",borderRadius:8,border:"1px solid #7f1d1d",background:"transparent",color:"#f87171",fontSize:13,fontWeight:700,cursor:"pointer"}}>🔄 Reset All Points</button>
      </div>
    )}
  </div>
);
}

const S = {
root:{minHeight:"100vh",fontFamily:"'Trebuchet MS',sans-serif",position:"relative",overflow:"hidden"},
banner:{display:"flex",alignItems:"center",gap:12,padding:"8px 24px",flexWrap:"wrap"},
prizeBanner:{display:"flex",alignItems:"center",gap:12,padding:"8px 24px",flexWrap:"wrap"},
prizeItem:{fontSize:13,fontWeight:700,color:"#f1f5f9",background:"#1e293b",padding:"4px 12px",borderRadius:20},
header:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 24px 10px",flexWrap:"wrap",gap:12,position:"relative",zIndex:1},
title:{fontSize:22,fontWeight:900,background:"linear-gradient(135deg,#f59e0b,#fbbf24,#fff)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:2},
headerRight:{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:8},
headerNav:{display:"flex",gap:6,flexWrap:"wrap"},
navBtn:{padding:"7px 13px",borderRadius:8,background:"transparent",cursor:"pointer",fontSize:12,fontWeight:600},
userBadge:{display:"flex",alignItems:"center",gap:8,borderRadius:20,padding:"5px 12px"},
userIcon:{width:24,height:24,borderRadius:"50%",background:"#2563eb",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:900,color:"#fff"},
mgrTag:{fontSize:9,background:"#1e3a5f",color:"#60a5fa",padding:"2px 6px",borderRadius:4,letterSpacing:1,fontWeight:700},
meBadge:{fontSize:9,background:"#1e3a8a",color:"#93c5fd",padding:"2px 6px",borderRadius:4,letterSpacing:1,fontWeight:700},
signOutBtn:{padding:"4px 10px",borderRadius:6,background:"transparent",fontSize:11,cursor:"pointer",fontWeight:600},
content:{padding:"16px 24px 40px",position:"relative",zIndex:1},
inlineInput:{padding:"5px 10px",borderRadius:7,fontSize:13,outline:"none"},
saveBtn:{padding:"5px 14px",borderRadius:7,border:"none",background:"#2563eb",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"},
cancelBtn:{padding:"5px 14px",borderRadius:7,border:"1px solid #334155",background:"transparent",color:"#94a3b8",fontSize:13,cursor:"pointer"},
editAnnBtn:{padding:"4px 12px",borderRadius:6,border:"1px solid #334155",background:"transparent",color:"#94a3b8",fontSize:12,cursor:"pointer",fontWeight:600},
};