import {useCallback,useEffect,useLayoutEffect,useMemo,useReducer,useRef,useState} from "react";
import Sidebar from "./components/Sidebar.jsx";
import {TopBar,Dock,ZoomControls} from "./components/Chrome.jsx";
import ColorPanel from "./components/ColorPanel.jsx";
import MindMapCanvas from "./components/MindMapCanvas.jsx";
import ProjectModal from "./components/ProjectModal.jsx";
import ProjectMenu from "./components/ProjectMenu.jsx";
import {HelpDialog,EmptyState,Toast} from "./components/Overlays.jsx";
import {EXAMPLE,LAYOUT_KEY,THEME_KEY,UNDO_LIMIT} from "./lib/constants.js";
import {bootstrap,persist} from "./lib/storage.js";
import {buildStyleMap,countNodes,deepCopy,expandableIds,indexById,normalizePayload,patchNodes,sanitizeNode,uid} from "./lib/tree.js";
import {layoutTree} from "./lib/layout.js";
import {useViewTransform} from "./hooks/animation.js";

const initial=bootstrap();
const mobileQuery=window.matchMedia("(max-width: 768px)");
const darkQuery=window.matchMedia("(prefers-color-scheme: dark)");
const isTyping=target=>target.closest?.("input,textarea,select")||target.isContentEditable;
const readPref=(key,fallback)=>{try{return localStorage.getItem(key)||fallback}catch{return fallback}};
const writePref=(key,value)=>{try{localStorage.setItem(key,value)}catch{}};
// Applied before the first paint so a dark theme never flashes light.
const initialTheme=readPref(THEME_KEY,darkQuery.matches?"dark":"light");
document.documentElement.dataset.theme=initialTheme;

export default function App(){
  const [projects,setProjects]=useState(initial.projects);
  const [activeId,setActiveId]=useState(initial.activeId);
  const active=projects.find(p=>p.id===activeId)||null;
  const data=active?.data||null;

  const [expanded,setExpanded]=useState(()=>new Set(data?[data.id]:[]));
  const {transform,transformRef,set:setTransform,animateTo}=useViewTransform({x:80,y:70,k:1});
  const [colorMode,setColorModeState]=useState(false);
  const [selected,setSelected]=useState(()=>new Set());
  const [modal,setModal]=useState(null);
  const [menu,setMenu]=useState(null);
  const [help,setHelp]=useState(false);
  const [toast,setToast]=useState("");
  const [sidebarCollapsed,setSidebarCollapsed]=useState(mobileQuery.matches);
  const [isMobile,setIsMobile]=useState(mobileQuery.matches);
  const [theme,setTheme]=useState(initialTheme);
  const [mode,setMode]=useState(()=>readPref(LAYOUT_KEY,"balanced"));
  const [fullscreen,setFullscreen]=useState(false);
  const [fontsReady,setFontsReady]=useState(false);
  const [fitToken,requestFit]=useReducer(x=>x+1,0);

  // Undo stacks live for the session only, keyed by project id.
  const undoHistories=useRef(new Map());
  const [,bumpUndo]=useReducer(x=>x+1,0);
  const undoCount=undoHistories.current.get(activeId)?.length||0;

  const workspaceRef=useRef(null);
  const dockRef=useRef(null);
  const canvasRef=useRef(null);
  const toastTimer=useRef(0);
  const firstFit=useRef(true);

  const styles=useMemo(()=>buildStyleMap(data,theme),[data,theme]);
  // fontsReady re-measures labels once the web font replaces the fallback.
  const layout=useMemo(()=>layoutTree(data,expanded,styles,mode),[data,expanded,styles,mode,fontsReady]);
  const layoutRef=useRef(layout);
  layoutRef.current=layout;
  const nodeIndex=useMemo(()=>indexById(data),[data]);

  useEffect(()=>{document.fonts?.ready.then(()=>setFontsReady(true))},[]);
  useEffect(()=>{document.documentElement.dataset.theme=theme},[theme]);

  function showToast(message){
    clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current=setTimeout(()=>setToast(""),2200);
  }

  /* Persistence */
  function commit(nextProjects,nextActiveId=activeId){
    try{persist(nextProjects,nextActiveId)}catch{return false}
    setProjects(nextProjects);setActiveId(nextActiveId);
    return true;
  }

  function recordUndo(id,snapshot){
    const history=undoHistories.current.get(id)||[];
    history.push(snapshot);
    if(history.length>UNDO_LIMIT)history.shift();
    undoHistories.current.set(id,history);
    bumpUndo();
  }

  /* View */
  const fitView=useCallback(()=>{
    const bb=layoutRef.current.bounds,ws=workspaceRef.current;
    if(!bb||!bb.width||!bb.height||!ws)return;
    const w=ws.clientWidth,h=ws.clientHeight;
    // Reserve room for the floating top bar and bottom dock.
    const mobile=mobileQuery.matches;
    const side=mobile?20:72,top=mobile?72:84,bottom=(dockRef.current?.offsetHeight||56)+(mobile?28:44);
    const usableW=Math.max(100,w-side*2),usableH=Math.max(100,h-top-bottom);
    const k=Math.max(.18,Math.min(mobile?1.15:1.25,Math.min(usableW/bb.width,usableH/bb.height)));
    const target={k,x:side+(usableW-bb.width*k)/2-bb.x*k,y:top+(usableH-bb.height*k)/2-bb.y*k};
    if(firstFit.current){firstFit.current=false;setTransform(target)}
    else animateTo(target);
  },[setTransform,animateTo]);

  useLayoutEffect(()=>{if(fitToken)fitView()},[fitToken,fitView]);
  useEffect(()=>{requestFit()},[]);

  const zoomAt=useCallback((factor,cx,cy,animate=false)=>{
    const rect=canvasRef.current.svg.getBoundingClientRect();
    const px=(cx??rect.left+rect.width/2)-rect.left,py=(cy??rect.top+rect.height/2)-rect.top;
    const zoomed=t=>{
      const k=Math.max(.18,Math.min(3,t.k*factor));
      const wx=(px-t.x)/t.k,wy=(py-t.y)/t.k;
      return{k,x:px-wx*k,y:py-wy*k};
    };
    if(animate)animateTo(zoomed(transformRef.current));
    else setTransform(zoomed);
  },[setTransform,animateTo,transformRef]);

  /* Color selection */
  function setColorMode(enabled){
    setColorModeState(enabled);
    setSelected(new Set());
    canvasRef.current?.cancelSelection();
  }

  function selectNode(id,additive){
    const next=additive?new Set(selected):new Set();
    if(additive&&next.has(id))next.delete(id); else next.add(id);
    setSelected(next);
  }

  function selectAllVisible(){
    if(!data)return;
    if(!colorMode)setColorMode(true);
    setSelected(new Set(layout.nodes.map(n=>n.id)));
  }

  // What the swatches show as active: a shared explicit color, "auto", or mixed.
  const colorState=useMemo(()=>{
    const nodes=[...selected].map(id=>nodeIndex.get(id)).filter(Boolean);
    const common=key=>{
      const values=new Set(nodes.map(n=>n[key]||"auto"));
      return values.size===1?[...values][0]:"mixed";
    };
    const first=styles.get(nodes[0]?.id);
    return{
      current:{fill:common("color"),text:common("textColor")},
      fallback:{fill:first?.fill||"#6ea8fe",text:first?.text||"#141826"},
      title:nodes.length===1?nodes[0].label:`${nodes.length} nodes selected`
    };
  },[selected,nodeIndex,styles]);

  function applyStyle(patch){
    if(!selected.size||!active)return;
    const nextData=patchNodes(active.data,selected,patch);
    if(JSON.stringify(nextData)===JSON.stringify(active.data))return;
    const next=projects.map(p=>p.id===active.id?{...p,data:nextData,updatedAt:Date.now()}:p);
    if(!commit(next)){showToast("Could not save colors — browser storage may be full");return}
    recordUndo(active.id,{name:active.name,data:active.data});
  }

  function undoLastEdit(){
    const history=undoHistories.current.get(activeId);
    if(!active||!history?.length)return;
    const snapshot=history[history.length-1];
    const next=projects.map(p=>p.id===active.id?{...p,name:snapshot.name,data:deepCopy(snapshot.data),updatedAt:Date.now()}:p);
    if(!commit(next)){showToast("Could not undo — browser storage may be full");return}
    history.pop();bumpUndo();
    // Expansion is keyed by node id, so it carries over to the restored tree.
    canvasRef.current?.cancelSelection();
    setSelected(new Set());
    showToast("Undone");
  }

  /* Projects */
  function showProject(project){
    setExpanded(new Set(project?[project.data.id]:[]));
    setColorMode(false);
    requestFit();
  }

  function selectProject(id){
    const p=projects.find(x=>x.id===id);
    if(!p)return;
    commit(projects,id);
    if(id!==activeId)showProject(p);
    if(mobileQuery.matches)setTimeout(()=>setSidebarCollapsed(true),80);
  }

  function addProject(project){
    const next=[project,...projects];
    if(!commit(next,project.id))return false;
    showProject(project);
    return true;
  }

  function saveFromModal(name,json){
    try{
      const normalized=normalizePayload(json,name.trim()||"Untitled Mind Map");
      const finalName=name.trim()||normalized.title;
      if(!modal.id){
        const ok=addProject({id:uid(),name:finalName,data:normalized.data,createdAt:Date.now(),updatedAt:Date.now()});
        if(!ok)return "Could not save — browser storage may be full.";
        setModal(null);
        return null;
      }
      const p=projects.find(x=>x.id===modal.id);
      const changed=p.name!==finalName||JSON.stringify(p.data)!==JSON.stringify(normalized.data);
      const project={...p,name:finalName,data:normalized.data,updatedAt:Date.now()};
      if(!commit(projects.map(x=>x.id===p.id?project:x),p.id))return "Could not save — browser storage may be full.";
      if(changed)recordUndo(p.id,{name:p.name,data:deepCopy(p.data)});
      setModal(null);
      showProject(project);
      return null;
    }catch(err){
      return err.message||"Invalid JSON.";
    }
  }

  function createExample(){
    addProject({id:uid(),name:EXAMPLE.title,data:sanitizeNode(EXAMPLE.data),createdAt:Date.now(),updatedAt:Date.now()});
  }

  function openModal(mode,id=null){
    const p=id&&projects.find(x=>x.id===id);
    if(mode==="edit"&&!p)return;
    setModal(p?{mode,id,name:p.name,json:JSON.stringify(p.data,null,2)}:{mode:"new",id:null,name:"",json:""});
  }

  function duplicateProject(id){
    const p=projects.find(x=>x.id===id);if(!p)return;
    addProject({...deepCopy(p),id:uid(),name:p.name+" Copy",createdAt:Date.now(),updatedAt:Date.now()});
  }

  function deleteProject(id){
    const p=projects.find(x=>x.id===id);if(!p)return;
    if(!confirm(`Delete "${p.name}"? This can't be undone.`))return;
    undoHistories.current.delete(id);
    const next=projects.filter(x=>x.id!==id);
    const nextActive=activeId===id?next[0]?.id||null:activeId;
    commit(next,nextActive);
    if(activeId===id)showProject(next.find(x=>x.id===nextActive));
  }

  const closeMenu=useCallback(()=>setMenu(null),[]);
  const closeHelp=useCallback(()=>setHelp(false),[]);

  /* Expand / collapse */
  function toggleNode(id){
    setExpanded(prev=>{
      const next=new Set(prev);
      next.has(id)?next.delete(id):next.add(id);
      return next;
    });
  }
  function expandAll(){
    if(!data)return;
    setExpanded(new Set([data.id,...expandableIds(data)]));requestFit();
  }
  function collapseToRoot(){
    // True collapse-all: leave only the root node visible.
    if(!data)return;
    setExpanded(new Set());requestFit();
  }

  /* Preferences */
  function toggleTheme(){
    const next=theme==="dark"?"light":"dark";
    setTheme(next);writePref(THEME_KEY,next);
  }
  function changeMode(next){
    setMode(next);writePref(LAYOUT_KEY,next);requestFit();
  }

  /* Window-level behavior */
  function toggleSidebar(){
    setSidebarCollapsed(c=>!c);
    setTimeout(requestFit,260);
  }

  async function toggleFullscreen(){
    try{
      if(!document.fullscreenElement)await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    }catch{showToast("Fullscreen isn't available here")}
  }

  useEffect(()=>{
    const ws=workspaceRef.current;
    let timer=0;
    const observer=new ResizeObserver(()=>{
      clearTimeout(timer);timer=setTimeout(requestFit,80);
    });
    observer.observe(ws);
    const onMobileChange=()=>{
      setIsMobile(mobileQuery.matches);
      setSidebarCollapsed(mobileQuery.matches);
    };
    const onFullscreen=()=>setFullscreen(!!document.fullscreenElement);
    mobileQuery.addEventListener("change",onMobileChange);
    document.addEventListener("fullscreenchange",onFullscreen);
    return()=>{
      observer.disconnect();clearTimeout(timer);
      mobileQuery.removeEventListener("change",onMobileChange);
      document.removeEventListener("fullscreenchange",onFullscreen);
    };
  },[]);

  // Keyboard shortcuts read the latest handlers through a ref.
  const keys=useRef(null);
  keys.current={undoLastEdit,selectAllVisible,setColorMode,expandAll,collapseToRoot,fitView,zoomAt,
    colorMode,blocked:!!modal||help,hasData:!!data};
  useEffect(()=>{
    const onKey=e=>{
      const k=keys.current,mod=(e.ctrlKey||e.metaKey)&&!e.altKey,key=e.key.toLowerCase();
      if(k.blocked||isTyping(e.target))return;
      if(mod&&!e.shiftKey&&key==="z"){
        if(k.hasData){e.preventDefault();k.undoLastEdit()}
        return;
      }
      if(mod&&key==="a"){
        if(k.hasData){e.preventDefault();k.selectAllVisible()}
        return;
      }
      if(e.key==="Escape"&&k.colorMode){k.setColorMode(false);return}
      if(mod||e.altKey)return;
      if(e.key==="?"){setHelp(true);return}
      if(!k.hasData)return;
      if(key==="f")k.fitView();
      else if(key==="e")k.expandAll();
      else if(key==="c")k.collapseToRoot();
      else if(key==="="||key==="+")k.zoomAt(1.2,undefined,undefined,true);
      else if(key==="-"||key==="_")k.zoomAt(1/1.2,undefined,undefined,true);
    };
    document.addEventListener("keydown",onKey);
    return()=>document.removeEventListener("keydown",onKey);
  },[]);

  const nodeTotal=useMemo(()=>countNodes(data),[data]);

  return(
    <div id="app">
      <Sidebar projects={projects} activeId={activeId} collapsed={sidebarCollapsed}
        onNew={()=>openModal("new")} onSelect={selectProject}
        onOpenMenu={(id,anchor)=>setMenu({id,anchor})}/>

      <div id="sidebarBackdrop" className={isMobile&&!sidebarCollapsed?"":"hidden"} aria-hidden="true"
        onClick={()=>setSidebarCollapsed(true)}/>

      <main id="workspace" ref={workspaceRef}>
        <MindMapCanvas ref={canvasRef} layout={layout} mode={mode} transform={transform} setTransform={setTransform}
          transformRef={transformRef} zoomAt={zoomAt} colorMode={colorMode} selected={selected}
          onEnterColorMode={()=>setColorMode(true)} onSelectionChange={setSelected}
          onSelectNode={selectNode} onToggleNode={toggleNode}/>

        <TopBar title={active?.name} meta={`${nodeTotal} nodes · saved locally`}
          sidebarOpen={!sidebarCollapsed} onToggleSidebar={toggleSidebar}
          theme={theme} onToggleTheme={toggleTheme} mode={mode} onSetMode={changeMode}
          onEdit={()=>activeId&&openModal("edit",activeId)}
          fullscreen={fullscreen} onFullscreen={toggleFullscreen} hasData={!!data}/>

        {data&&<>
          <Dock ref={dockRef} undoCount={undoCount} colorMode={colorMode} onUndo={undoLastEdit}
            onExpand={expandAll} onCollapse={collapseToRoot}
            onToggleColor={()=>setColorMode(!colorMode)} onFit={fitView} onHelp={()=>setHelp(true)}/>
          <div className="corner-tools">
            <ZoomControls zoom={transform.k} onFit={fitView}
              onZoomIn={()=>zoomAt(1.2,undefined,undefined,true)} onZoomOut={()=>zoomAt(1/1.2,undefined,undefined,true)}/>
          </div>
        </>}

        {colorMode&&<ColorPanel count={selected.size} title={colorState.title}
          current={colorState.current} fallback={colorState.fallback}
          onApply={applyStyle} onClose={()=>setColorMode(false)}/>}

        {!data&&<EmptyState onCreate={()=>openModal("new")} onExample={createExample}/>}
        <Toast message={toast}/>
      </main>

      {modal&&<ProjectModal key={modal.id||"new"} mode={modal.mode} initialName={modal.name} initialJson={modal.json}
        onSave={saveFromModal} onClose={()=>setModal(null)}/>}

      {help&&<HelpDialog onClose={closeHelp}/>}

      {menu&&<ProjectMenu anchor={menu.anchor} onClose={closeMenu}
        onEdit={()=>{setMenu(null);openModal("edit",menu.id)}}
        onDuplicate={()=>{setMenu(null);duplicateProject(menu.id)}}
        onDelete={()=>{setMenu(null);deleteProject(menu.id)}}/>}
    </div>
  );
}
