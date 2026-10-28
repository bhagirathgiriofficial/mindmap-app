import {STORAGE_KEY,ACTIVE_KEY,EXAMPLE} from "./constants.js";
import {uid,sanitizeNode} from "./tree.js";

/*
 * Projects live in IndexedDB: one record per project in "projects", plus the
 * sidebar order and the open project in "meta". Only projects that changed are
 * rewritten. Maps saved by older versions in localStorage are moved over once.
 * If IndexedDB can't be opened, localStorage is used instead.
 */
const DB_NAME="mindmap_studio",DB_VERSION=1;

let db=null;
// Projects as last written, so the next save only touches what changed.
// null forces a full rewrite (first save, or after a failed one).
let written=null;

const done=tx=>new Promise((resolve,reject)=>{
  tx.oncomplete=()=>resolve();
  tx.onerror=tx.onabort=()=>reject(tx.error||new Error("IndexedDB write failed"));
});
const result=req=>new Promise((resolve,reject)=>{
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error);
});

function openDb(){
  return new Promise((resolve,reject)=>{
    if(!window.indexedDB){reject(new Error("IndexedDB is not available"));return}
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{
      const d=req.result;
      if(!d.objectStoreNames.contains("projects"))d.createObjectStore("projects",{keyPath:"id"});
      if(!d.objectStoreNames.contains("meta"))d.createObjectStore("meta");
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
    req.onblocked=()=>reject(new Error("IndexedDB is blocked by another tab"));
  });
}

function loadLegacy(){
  try{
    const v=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");
    return{projects:Array.isArray(v)?v:[],activeId:localStorage.getItem(ACTIVE_KEY)};
  }catch{return{projects:[],activeId:null}}
}

function writeLegacy(projects,activeId){
  localStorage.setItem(STORAGE_KEY,JSON.stringify(projects));
  if(activeId)localStorage.setItem(ACTIVE_KEY,activeId); else localStorage.removeItem(ACTIVE_KEY);
}

async function readDb(){
  const tx=db.transaction(["projects","meta"]);
  const [records,order,activeId]=await Promise.all([
    result(tx.objectStore("projects").getAll()),
    result(tx.objectStore("meta").get("order")),
    result(tx.objectStore("meta").get("activeId"))
  ]);
  // Records missing from the saved order (shouldn't happen) go last.
  const rank=new Map((order||[]).map((id,i)=>[id,i]));
  records.sort((a,b)=>(rank.get(a.id)??Infinity)-(rank.get(b.id)??Infinity));
  return{projects:records,activeId:activeId||null};
}

/*
 * Saves projects and the open project id. Resolves once written; rejects when
 * storage is full or unavailable. Writes run in the order they are made.
 */
export function persist(projects,activeId){
  if(!db){
    try{writeLegacy(projects,activeId);return Promise.resolve()}
    catch(err){return Promise.reject(err)}
  }
  const prev=written;
  written=projects;
  try{
    const tx=db.transaction(["projects","meta"],"readwrite");
    const store=tx.objectStore("projects"),meta=tx.objectStore("meta");
    if(prev){
      const before=new Map(prev.map(p=>[p.id,p]));
      for(const p of projects)if(before.get(p.id)!==p)store.put(p);
      const ids=new Set(projects.map(p=>p.id));
      for(const p of prev)if(!ids.has(p.id))store.delete(p.id);
    }else{
      store.clear();
      for(const p of projects)store.put(p);
    }
    meta.put(projects.map(p=>p.id),"order");
    meta.put(activeId||null,"activeId");
    return done(tx).catch(err=>{written=null;throw err});
  }catch(err){
    written=null;
    return Promise.reject(err);
  }
}

// Loads saved projects (moving any from localStorage), seeding the example on first run.
export async function bootstrap(){
  let projects=[],activeId=null,migrated=false;
  try{
    db=await openDb();
    ({projects,activeId}=await readDb());
    written=projects;
    if(!projects.length){
      ({projects,activeId}=loadLegacy());
      migrated=projects.length>0;
    }
  }catch{
    db=null;
    ({projects,activeId}=loadLegacy());
  }
  if(!projects.length){
    const starter={id:uid(),name:EXAMPLE.title,data:sanitizeNode(EXAMPLE.data),createdAt:Date.now(),updatedAt:Date.now()};
    projects=[starter];activeId=starter.id;
  }
  if(!projects.some(p=>p.id===activeId))activeId=projects[0]?.id||null;
  if(db&&!written?.length){
    try{
      await persist(projects,activeId);
      // The old copy is only removed once IndexedDB holds the maps.
      if(migrated){localStorage.removeItem(STORAGE_KEY);localStorage.removeItem(ACTIVE_KEY)}
    }catch{}
  }
  // Ask the browser not to evict saved maps under storage pressure.
  navigator.storage?.persist?.().catch(()=>{});
  return{projects,activeId,backend:db?"indexeddb":"localstorage"};
}
