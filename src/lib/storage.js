import {STORAGE_KEY,ACTIVE_KEY,EXAMPLE} from "./constants.js";
import {uid,sanitizeNode} from "./tree.js";

function loadProjects(){
  try{
    const v=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");
    return Array.isArray(v)?v:[];
  }catch{return []}
}

// Throws when browser storage is full so callers can roll back.
export function persist(projects,activeId){
  localStorage.setItem(STORAGE_KEY,JSON.stringify(projects));
  if(activeId)localStorage.setItem(ACTIVE_KEY,activeId); else localStorage.removeItem(ACTIVE_KEY);
}

// Loads saved projects, seeding the example project on first run.
export function bootstrap(){
  let projects=loadProjects();
  let activeId=localStorage.getItem(ACTIVE_KEY);
  if(!projects.length){
    const starter={id:uid(),name:EXAMPLE.title,data:sanitizeNode(EXAMPLE.data),createdAt:Date.now(),updatedAt:Date.now()};
    projects=[starter];activeId=starter.id;
    try{persist(projects,activeId)}catch{}
  }
  if(!projects.some(p=>p.id===activeId))activeId=projects[0]?.id||null;
  return{projects,activeId};
}
