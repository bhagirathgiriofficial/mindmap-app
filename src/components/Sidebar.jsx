import {useMemo,useState} from "react";
import {Plus,Search,MoreHorizontal,HardDrive} from "lucide-react";
import {COLORS} from "../lib/constants.js";
import {countNodes} from "../lib/tree.js";

function timeAgo(ts){
  if(!ts)return "";
  const s=Math.max(0,(Date.now()-ts)/1000);
  if(s<60)return "just now";
  const units=[[60,"m"],[24,"h"],[30,"d"],[12,"mo"]];
  let v=s/60;
  for(const [size,unit] of units){
    if(v<size)return `${Math.floor(v)}${unit} ago`;
    v/=size;
  }
  return `${Math.floor(v)}y ago`;
}

export function BrandMark({size=32}){
  return(
    <svg className="brand-mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <linearGradient id="brandGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7c6cff"/><stop offset="1" stopColor="#4f8dff"/>
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#brandGrad)"/>
      <path d="M11 16C15 16 15 9.5 20 9.5M11 16C15 16 15 22.5 20 22.5" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
      <circle cx="10" cy="16" r="3.2" fill="#fff"/>
      <circle cx="22" cy="9.5" r="2.4" fill="#fff" opacity=".85"/>
      <circle cx="22" cy="22.5" r="2.4" fill="#fff" opacity=".85"/>
    </svg>
  );
}

export default function Sidebar({projects,activeId,collapsed,onNew,onSelect,onOpenMenu}){
  const [query,setQuery]=useState("");
  const counts=useMemo(()=>new Map(projects.map(p=>[p.id,countNodes(p.data)])),[projects]);
  const q=query.trim().toLowerCase();
  const visible=q?projects.filter(p=>p.name.toLowerCase().includes(q)):projects;

  return(
    <aside id="sidebar" className={collapsed?"collapsed":""} aria-hidden={collapsed}>
      <div className="side-inner">
        <div className="side-head">
          <div className="brand">
            <BrandMark/>
            <div>MindMap Studio<small>Offline mind maps</small></div>
          </div>
          <button className="primary-btn wide" onClick={onNew}><Plus size={17} strokeWidth={2.2}/>New map</button>
          {projects.length>4&&(
            <label className="search">
              <Search size={15} strokeWidth={2}/>
              <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search maps" aria-label="Search maps"/>
            </label>
          )}
        </div>
        <div className="project-label">Your maps <span>{projects.length}</span></div>
        <div className="projects">
          {!projects.length&&<div className="side-empty">No maps yet. Create one to get started.</div>}
          {q&&!visible.length&&<div className="side-empty">No maps match “{query}”.</div>}
          {visible.map(p=>{
            const i=projects.indexOf(p);
            const color=p.data.children?.[0]?.color||p.data.color||COLORS[i%COLORS.length];
            return(
              <div key={p.id} role="button" tabIndex={0} className={"project"+(p.id===activeId?" active":"")}
                onClick={()=>onSelect(p.id)} onKeyDown={e=>{if(e.key==="Enter")onSelect(p.id)}}>
                <div className="picon" style={{"--c":color}}>{p.name.trim().charAt(0).toUpperCase()||"#"}</div>
                <div className="pinfo">
                  <div className="pname">{p.name}</div>
                  <div className="pmeta">{counts.get(p.id)} nodes{p.updatedAt?` · ${timeAgo(p.updatedAt)}`:""}</div>
                </div>
                <button className="menu" aria-label={`Options for ${p.name}`} onClick={e=>{e.stopPropagation();onOpenMenu(p.id,e.currentTarget)}}>
                  <MoreHorizontal size={17}/>
                </button>
              </div>
            );
          })}
        </div>
        <div className="side-foot">
          <HardDrive size={14} strokeWidth={2}/>
          <span>Saved in this browser only. No account or internet needed.</span>
        </div>
      </div>
    </aside>
  );
}
