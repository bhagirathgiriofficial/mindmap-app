const STORAGE_KEY="mindmap_studio_projects_v1";
const ACTIVE_KEY="mindmap_studio_active_v1";

const COLORS=["#6ea8fe","#a78bfa","#43c7a4","#ffb456","#ef83c6","#5fcf82","#56b6d8","#f08a79"];

const EXAMPLE={
  title:"How to Use MindMap Studio",
  data:{
    label:"HOW TO USE MINDMAP STUDIO",
    children:[
      {label:"01 START HERE",color:"#6ea8fe",children:[
        {label:"Click + New JSON Project"},
        {label:"Give your project a name"},
        {label:"Paste your JSON"},
        {label:"Click Save Project"}
      ]},
      {label:"02 CREATE JSON WITH AI",color:"#a78bfa",children:[
        {label:"Write your topic or idea"},
        {label:"Give AI the sample JSON format"},
        {label:"Ask it to generate mind-map JSON"},
        {label:"Copy the JSON here"}
      ]},
      {label:"03 JSON STRUCTURE",color:"#43c7a4",children:[
        {label:"label = node text"},
        {label:"color = branch color"},
        {label:"children = sub-items",children:[
          {label:"Children can have more children"},
          {label:"Build as many levels as needed"}
        ]}
      ]},
      {label:"04 INTERACT",color:"#ffb456",children:[
        {label:"Click a node to expand"},
        {label:"Click again to collapse"},
        {label:"Drag canvas to pan"},
        {label:"Two-finger scroll to pan"},
        {label:"Ctrl / Cmd + scroll to zoom"}
      ]},
      {label:"05 PRESENT",color:"#ef83c6",children:[
        {label:"Fit View"},
        {label:"Expand All"},
        {label:"Collapse All"},
        {label:"Fullscreen mode"},
        {label:"Hide sidebar while presenting"}
      ]},
      {label:"06 MANAGE PROJECTS",color:"#5fcf82",children:[
        {label:"Projects appear in the sidebar"},
        {label:"Switch between projects"},
        {label:"Edit JSON anytime"},
        {label:"Duplicate a project"},
        {label:"Delete projects you no longer need"},
        {label:"Everything saves in localStorage"}
      ]}
    ]
  }
};

const sidebar=document.getElementById("sidebar");
const projectsEl=document.getElementById("projects");
const svg=document.getElementById("canvas");
const workspace=document.getElementById("workspace");
const viewport=document.getElementById("viewport");
const linksG=document.getElementById("links");
const nodesG=document.getElementById("nodes");
const zoomRead=document.getElementById("zoomRead");
const empty=document.getElementById("empty");

const overlay=document.getElementById("overlay");
const modalTitle=document.getElementById("modalTitle");
const projectName=document.getElementById("projectName");
const jsonInput=document.getElementById("jsonInput");
const jsonError=document.getElementById("jsonError");

const menu=document.getElementById("projectMenu");

const NS="http://www.w3.org/2000/svg";
let projects=loadProjects();
let activeId=localStorage.getItem(ACTIVE_KEY);
let currentData=null;
let nodeState=new Map();
let transform={x:80,y:70,k:1};
let dragging=false,dragStart=null;
let editingId=null;
let menuProjectId=null;

function uid(){
  return "p_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,7);
}
function deepCopy(o){return JSON.parse(JSON.stringify(o))}
function loadProjects(){
  try{
    const v=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");
    return Array.isArray(v)?v:[];
  }catch{return []}
}
function persist(){
  localStorage.setItem(STORAGE_KEY,JSON.stringify(projects));
  if(activeId)localStorage.setItem(ACTIVE_KEY,activeId); else localStorage.removeItem(ACTIVE_KEY);
}
function sanitizeNode(node,depth=0,index=0){
  if(!node||typeof node!=="object")throw new Error("Every node must be an object.");
  if(typeof node.label!=="string"||!node.label.trim())throw new Error('Every node needs a non-empty "label".');
  const clean={
    id:node.id||("n_"+Math.random().toString(36).slice(2,10)),
    label:node.label.trim()
  };
  if(node.color)clean.color=node.color;
  if(Array.isArray(node.children))clean.children=node.children.map((c,i)=>sanitizeNode(c,depth+1,i));
  return clean;
}
function normalizePayload(raw,nameFallback){
  let parsed=typeof raw==="string"?JSON.parse(raw):raw;
  let title=nameFallback||"Untitled Mind Map";
  let data=parsed;
  if(parsed && parsed.data && typeof parsed.data==="object"){
    data=parsed.data;
    if(parsed.title)title=String(parsed.title);
  }
  return {title,data:sanitizeNode(data)};
}
function renderProjectList(){
  projectsEl.innerHTML="";
  if(!projects.length){
    projectsEl.innerHTML='<div style="padding:12px;color:#a0a6af;font-size:12px">No projects yet.</div>';
  }
  projects.forEach((p,i)=>{
    const row=document.createElement("div");
    row.className="project"+(p.id===activeId?" active":"");
    row.innerHTML=`<div class="picon" style="color:${p.data.color||COLORS[i%COLORS.length]}">${i+1}</div><div class="pname"></div><button class="menu" title="Project menu">•••</button>`;
    row.querySelector(".pname").textContent=p.name;
    row.addEventListener("click",()=>selectProject(p.id));
    row.querySelector(".menu").addEventListener("click",e=>{
      e.stopPropagation();openProjectMenu(p.id,e.currentTarget);
    });
    projectsEl.appendChild(row);
  });
}
function selectProject(id){
  const p=projects.find(x=>x.id===id);
  if(!p)return;
  activeId=id;persist();renderProjectList();
  loadCurrentProject();
}
function loadCurrentProject(){
  const p=projects.find(x=>x.id===activeId);
  if(!p){
    currentData=null;clear(linksG);clear(nodesG);empty.classList.add("show");return;
  }
  empty.classList.remove("show");
  currentData=deepCopy(p.data);
  indexTree(currentData);
  render();
  setTimeout(fitView,20);
}
function clear(el){while(el.firstChild)el.removeChild(el.firstChild)}

function indexTree(root){
  nodeState=new Map();
  function walk(n,parent=null,topColor=null,depth=0,idx=0){
    n.parent=parent;n.depth=depth;
    if(depth===0){n.root=true;n.expanded=true;n.topColor="#22252a";}
    else{
      n.topColor=depth===1?(n.color||COLORS[idx%COLORS.length]):topColor;
      if(n.expanded===undefined)n.expanded=false;
    }
    nodeState.set(n.id,n);
    (n.children||[]).forEach((c,i)=>walk(c,n,n.topColor,depth+1,i));
  }
  walk(root);
}
function visibleChildren(n){return(n.children&&n.expanded)?n.children:[]}
function nodeSize(n){
  if(n.root)return{w:315,h:92};
  if(n.depth===1)return{w:230,h:58};
  const len=n.label.length;
  return{w:Math.max(190,Math.min(300,138+len*5.8)),h:52};
}
const LEVEL_X=[0,390,760,1090,1400,1710];
function measure(n){
  const kids=visibleChildren(n),own=nodeSize(n).h;
  if(!kids.length)return Math.max(own,62);
  const gap=n.depth===0?28:18;
  const total=kids.reduce((s,c)=>s+measure(c),0)+gap*(kids.length-1);
  return Math.max(own,total);
}
function layout(n,x,yTop){
  const size=nodeSize(n),subH=measure(n),kids=visibleChildren(n);
  let y;
  if(!kids.length)y=yTop+(subH-size.h)/2;
  else{
    const gap=n.depth===0?28:18;let cy=yTop;const centers=[];
    kids.forEach(c=>{
      const h=measure(c);
      layout(c,LEVEL_X[Math.min(c.depth,LEVEL_X.length-1)],cy);
      centers.push(c._y+nodeSize(c).h/2);cy+=h+gap;
    });
    y=(centers[0]+centers[centers.length-1])/2-size.h/2;
  }
  n._x=x;n._y=y;n._w=size.w;n._h=size.h;
}
function shade(hex,amt){
  if(!/^#[0-9a-f]{6}$/i.test(hex))return hex;
  const num=parseInt(hex.slice(1),16);
  let r=(num>>16)+amt,g=((num>>8)&255)+amt,b=(num&255)+amt;
  r=Math.max(0,Math.min(255,r));g=Math.max(0,Math.min(255,g));b=Math.max(0,Math.min(255,b));
  return "#"+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
}
function render(){
  if(!currentData)return;
  layout(currentData,0,0);clear(linksG);clear(nodesG);drawLinks(currentData);drawNodes(currentData);applyTransform();
}
function drawLinks(n){
  visibleChildren(n).forEach(c=>{
    const p=document.createElementNS(NS,"path");
    const sx=n._x+n._w,sy=n._y+n._h/2,tx=c._x,ty=c._y+c._h/2;
    const dx=Math.max(90,(tx-sx)*.48);
    p.setAttribute("d",`M ${sx} ${sy} C ${sx+dx} ${sy}, ${tx-dx} ${ty}, ${tx} ${ty}`);
    p.setAttribute("class","connector");p.setAttribute("stroke",c.topColor||"#b4bac4");
    linksG.appendChild(p);drawLinks(c);
  });
}
function drawNodes(n){
  const g=document.createElementNS(NS,"g");
  g.setAttribute("class",`node depth-${n.depth}${n.root?" root":""}`);
  g.setAttribute("transform",`translate(${n._x},${n._y})`);
  const rect=document.createElementNS(NS,"rect");
  rect.setAttribute("class","box");rect.setAttribute("width",n._w);rect.setAttribute("height",n._h);
  if(n.root){rect.setAttribute("fill","#22252a");rect.setAttribute("stroke","#22252a")}
  else{
    const fill=n.depth===1?n.topColor:shade(n.topColor,62);
    rect.setAttribute("fill",fill);rect.setAttribute("stroke",n.depth===1?shade(n.topColor,-18):shade(n.topColor,12));
  }
  g.appendChild(rect);
  const fo=document.createElementNS(NS,"foreignObject");
  fo.setAttribute("x","0");fo.setAttribute("y","0");fo.setAttribute("width",n._w);fo.setAttribute("height",n._h);
  const div=document.createElement("div");div.setAttribute("xmlns","http://www.w3.org/1999/xhtml");div.className="label";div.textContent=n.label;
  fo.appendChild(div);g.appendChild(fo);
  if(n.children&&n.children.length){
    const cx=n._w+13,cy=n._h/2;
    const badge=document.createElementNS(NS,"circle");badge.setAttribute("cx",cx);badge.setAttribute("cy",cy);badge.setAttribute("r","11");badge.setAttribute("class","badge-circle");
    badge.setAttribute("stroke",n.root?"#22252a":n.topColor);badge.style.pointerEvents="all";g.appendChild(badge);
    const txt=document.createElementNS(NS,"text");txt.setAttribute("x",cx);txt.setAttribute("y",cy+.3);txt.setAttribute("class","badge-text");
    txt.setAttribute("fill",n.root?"#22252a":shade(n.topColor,-40));txt.textContent=n.expanded?"−":"+";g.appendChild(txt);
  }
  // Node interactions must win over canvas drag/pointer capture.
  g.addEventListener("pointerdown",e=>e.stopPropagation());
  g.addEventListener("click",e=>{e.stopPropagation();if(n.children&&n.children.length){n.expanded=!n.expanded;render()}});
  nodesG.appendChild(g);visibleChildren(n).forEach(drawNodes);
}
function applyTransform(){
  viewport.setAttribute("transform",`translate(${transform.x} ${transform.y}) scale(${transform.k})`);
  zoomRead.textContent=Math.round(transform.k*100)+"%";
}
function zoomAt(factor,cx=workspace.clientWidth/2,cy=workspace.clientHeight/2){
  const oldK=transform.k,newK=Math.max(.24,Math.min(2.6,oldK*factor));
  const rect=svg.getBoundingClientRect(),px=cx-rect.left,py=cy-rect.top;
  const wx=(px-transform.x)/oldK,wy=(py-transform.y)/oldK;
  transform.k=newK;transform.x=px-wx*newK;transform.y=py-wy*newK;applyTransform();
}
svg.addEventListener("wheel",e=>{
  e.preventDefault();
  if(e.ctrlKey||e.metaKey){zoomAt(e.deltaY<0?1.08:.92,e.clientX,e.clientY);return}
  transform.x-=e.deltaX;transform.y-=e.deltaY;applyTransform();
},{passive:false});
svg.addEventListener("pointerdown",e=>{
  // Start panning only from empty canvas space, never from a node/card.
  if(e.button!==0 || e.target.closest?.(".node"))return;dragging=true;svg.classList.add("dragging");
  dragStart={x:e.clientX,y:e.clientY,tx:transform.x,ty:transform.y};svg.setPointerCapture(e.pointerId);
});
svg.addEventListener("pointermove",e=>{
  if(!dragging)return;transform.x=dragStart.tx+(e.clientX-dragStart.x);transform.y=dragStart.ty+(e.clientY-dragStart.y);applyTransform();
});
svg.addEventListener("pointerup",e=>{dragging=false;svg.classList.remove("dragging");try{svg.releasePointerCapture(e.pointerId)}catch{}});
svg.addEventListener("pointercancel",()=>{dragging=false;svg.classList.remove("dragging")});

function fitView(){
  if(!currentData)return;render();
  const bb=viewport.getBBox(),pad=90,w=workspace.clientWidth,h=workspace.clientHeight;
  const k=Math.max(.24,Math.min(1.28,Math.min((w-pad*2)/bb.width,(h-pad*2)/bb.height)));
  transform.k=k;transform.x=(w-bb.width*k)/2-bb.x*k;transform.y=(h-bb.height*k)/2-bb.y*k;applyTransform();
}
function setAll(expanded){
  if(!currentData)return;
  nodeState.forEach(n=>{if(n.children&&n.children.length)n.expanded=expanded});
  currentData.expanded=true;render();setTimeout(fitView,20);
}
function collapseToRoot(){
  if(!currentData)return;
  nodeState.forEach(n=>{
    if(n.children&&n.children.length)n.expanded=false;
  });
  // True collapse-all: leave only the root node visible.
  currentData.expanded=false;
  render();
  setTimeout(fitView,20);
}

/* Modal */
function openModal(mode,id=null){
  editingId=id;jsonError.classList.remove("show");jsonError.textContent="";
  if(mode==="edit"&&id){
    const p=projects.find(x=>x.id===id);if(!p)return;
    modalTitle.textContent="Edit JSON Project";projectName.value=p.name;jsonInput.value=JSON.stringify(p.data,null,2);
  }else{
    modalTitle.textContent="New JSON Project";projectName.value="";jsonInput.value="";
  }
  overlay.classList.add("show");setTimeout(()=>projectName.focus(),50);
}
function closeModal(){overlay.classList.remove("show");editingId=null}
function saveFromModal(){
  try{
    const name=projectName.value.trim()||"Untitled Mind Map";
    const normalized=normalizePayload(jsonInput.value,name);
    const finalName=projectName.value.trim()||normalized.title;
    if(editingId){
      const p=projects.find(x=>x.id===editingId);p.name=finalName;p.data=normalized.data;p.updatedAt=Date.now();activeId=p.id;
    }else{
      const p={id:uid(),name:finalName,data:normalized.data,createdAt:Date.now(),updatedAt:Date.now()};
      projects.unshift(p);activeId=p.id;
    }
    persist();renderProjectList();closeModal();loadCurrentProject();
  }catch(err){
    jsonError.textContent=err.message||"Invalid JSON.";jsonError.classList.add("show");
  }
}
function openProjectMenu(id,anchor){
  menuProjectId=id;
  const r=anchor.getBoundingClientRect();
  menu.style.left=Math.min(window.innerWidth-155,r.right-145)+"px";
  menu.style.top=Math.min(window.innerHeight-130,r.bottom+5)+"px";
  menu.classList.add("show");
}
document.addEventListener("click",e=>{if(!menu.contains(e.target))menu.classList.remove("show")});

/* Project menu actions */
document.getElementById("menuEdit").onclick=()=>{menu.classList.remove("show");openModal("edit",menuProjectId)};
document.getElementById("menuDuplicate").onclick=()=>{
  const p=projects.find(x=>x.id===menuProjectId);if(!p)return;
  const copy={...deepCopy(p),id:uid(),name:p.name+" Copy",createdAt:Date.now(),updatedAt:Date.now()};
  projects.unshift(copy);activeId=copy.id;persist();renderProjectList();loadCurrentProject();menu.classList.remove("show");
};
document.getElementById("menuDelete").onclick=()=>{
  const p=projects.find(x=>x.id===menuProjectId);if(!p)return;
  if(!confirm(`Delete "${p.name}"?`))return;
  projects=projects.filter(x=>x.id!==menuProjectId);
  if(activeId===menuProjectId)activeId=projects[0]?.id||null;
  persist();renderProjectList();loadCurrentProject();menu.classList.remove("show");
};

/* Controls */
document.getElementById("newProject").onclick=()=>openModal("new");
document.getElementById("emptyCreate").onclick=()=>openModal("new");
document.getElementById("editBtn").onclick=()=>{if(activeId)openModal("edit",activeId)};
document.getElementById("closeModal").onclick=closeModal;
document.getElementById("cancelModal").onclick=closeModal;
document.getElementById("saveProject").onclick=saveFromModal;
document.getElementById("loadExample").onclick=()=>{
  projectName.value=EXAMPLE.title;jsonInput.value=JSON.stringify(EXAMPLE.data,null,2);
};
overlay.addEventListener("click",e=>{if(e.target===overlay)closeModal()});

document.getElementById("zoomIn").onclick=()=>zoomAt(1.15);
document.getElementById("zoomOut").onclick=()=>zoomAt(.87);
document.getElementById("fitBtn").onclick=fitView;
document.getElementById("expandBtn").onclick=()=>setAll(true);
document.getElementById("collapseBtn").onclick=collapseToRoot;
document.getElementById("toggleSidebar").onclick=()=>{
  sidebar.classList.toggle("collapsed");setTimeout(fitView,240);
};
document.getElementById("fullBtn").onclick=async()=>{
  if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen();
  setTimeout(fitView,200);
};
window.addEventListener("resize",()=>setTimeout(fitView,80));
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"&&overlay.classList.contains("show"))closeModal();
});

/* First run */
if(!projects.length){
  const starter={id:uid(),name:EXAMPLE.title,data:sanitizeNode(EXAMPLE.data),createdAt:Date.now(),updatedAt:Date.now()};
  projects=[starter];activeId=starter.id;persist();
}
if(!projects.some(p=>p.id===activeId))activeId=projects[0]?.id||null;
renderProjectList();loadCurrentProject();