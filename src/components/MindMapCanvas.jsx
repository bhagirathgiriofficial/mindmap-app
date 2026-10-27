import {forwardRef,useEffect,useImperativeHandle,useLayoutEffect,useMemo,useRef,useState} from "react";
import {buildLinks,nodeStyle} from "../lib/layout.js";
import {useTweenedNodes} from "../hooks/animation.js";
import {contrastText} from "../lib/tree.js";
import {addPoint,eraseSegment,makeStroke} from "../lib/ink.js";
import InkLayer from "./InkLayer.jsx";

const PINCH_MIN=.18,PINCH_MAX=3.2;
const TOGGLE_R=10;
const DOUBLE_CLICK_MS=220,LONG_PRESS_MS=520;

/*
 * SVG canvas: renders the laid-out map and owns pointer gestures
 * (pan, wheel zoom, pinch zoom, rectangle selection and ink), plus inline label editing.
 */
const MindMapCanvas=forwardRef(function MindMapCanvas({
  layout,mode,transform,setTransform,transformRef,zoomAt,
  colorMode,selected,onEnterColorMode,onSelectionChange,onSelectNode,onToggleNode,
  editingId,onStartEdit,onCommitEdit,onCancelEdit,onNodeMenu,
  tool,inkPrefs,strokes,onInkChange
},ref){
  const svgRef=useRef(null);
  const viewportRef=useRef(null);
  const pan=useRef(null);
  const selection=useRef(null);
  const suppressClickUntil=useRef(0);
  const [selectionRect,setSelectionRect]=useState(null);
  const [panning,setPanning]=useState(false);
  const clickTimer=useRef(0);
  const longPress=useRef(null);
  const inkRef=useRef(null);
  const cursorRef=useRef(null);
  const ink=useRef(null);
  // After a stylus is used, fingers pan instead of drawing (palm rejection).
  const penSeen=useRef(false);

  const nodes=useTweenedNodes(layout.nodes);
  const links=useMemo(()=>buildLinks(nodes),[nodes]);

  // Latest zoom handler for native listeners that are registered once.
  const latest=useRef({});
  latest.current={zoomAt,cancelInk};

  function cancelInk(){
    const d=ink.current;
    if(!d)return;
    ink.current=null;
    cancelAnimationFrame(d.raf);
    try{svgRef.current.releasePointerCapture(d.pointerId)}catch{}
    inkRef.current?.drawLive(null);
    inkRef.current?.setPreview(null);
  }

  function cancelSelection(){
    if(selection.current){
      try{svgRef.current.releasePointerCapture(selection.current.pointerId)}catch{}
      selection.current=null;
    }
    setSelectionRect(null);
  }

  useImperativeHandle(ref,()=>({svg:svgRef.current,cancelSelection,cancelInk}));

  function toWorld(e){
    return new DOMPoint(e.clientX,e.clientY).matrixTransform(viewportRef.current.getScreenCTM().inverse());
  }

  /* Ink */
  function moveCursor(e,erasing){
    const el=cursorRef.current;
    if(!el)return;
    if(!tool||e.pointerType==="touch"){el.style.opacity="0";return}
    const rect=svgRef.current.getBoundingClientRect();
    const eraser=erasing||tool==="eraser";
    const d=eraser?inkPrefs.eraserSize:inkPrefs.highlighter?inkPrefs.size*3+8:Math.max(4,inkPrefs.size);
    el.className="ink-cursor"+(eraser?" eraser":"")+(inkPrefs.highlighter&&!eraser?" highlighter":"");
    el.style.cssText=`opacity:1;width:${d}px;height:${d}px;transform:translate(${e.clientX-rect.left-d/2}px,${e.clientY-rect.top-d/2}px);`
      +(eraser?"":`--c:${inkPrefs.color==="ink"?"var(--ink)":inkPrefs.color}`);
  }

  function startInk(e){
    const isPen=e.pointerType==="pen";
    if(isPen)penSeen.current=true;
    // The stylus's eraser end (or barrel button) erases while held.
    const erasing=tool==="eraser"||(isPen&&(e.buttons&32||e.button===5));
    const p=toWorld(e),k=transformRef.current.k;
    const d={pointerId:e.pointerId,erasing,k,last:p,raf:0};
    if(erasing){
      d.base=strokes;d.working=strokes;
      d.working=eraseSegment(d.working,p,p,inkPrefs.eraserSize/2/k,inkPrefs.eraserMode);
      if(d.working!==d.base)inkRef.current?.setPreview(d.working);
    }else{
      d.stroke=makeStroke(inkPrefs,k,!isPen);
      addPoint(d.stroke,p.x,p.y,e.pressure);
      inkRef.current?.drawLive(d.stroke);
    }
    ink.current=d;
    moveCursor(e,erasing);
    try{svgRef.current.setPointerCapture(e.pointerId)}catch{}
  }

  function moveInk(e){
    const d=ink.current;
    const events=e.nativeEvent.getCoalescedEvents?.()||[];
    const samples=events.length?events:[e.nativeEvent];
    if(d.erasing){
      let working=d.working;
      for(const ev of samples){
        const p=toWorld(ev);
        working=eraseSegment(working,d.last,p,inkPrefs.eraserSize/2/d.k,inkPrefs.eraserMode);
        d.last=p;
      }
      if(working!==d.working){d.working=working;inkRef.current?.setPreview(working)}
      return;
    }
    let added=false;
    for(const ev of samples){
      const p=toWorld(ev);
      added=addPoint(d.stroke,p.x,p.y,ev.pressure,.5/d.k)||added;
    }
    if(added&&!d.raf)d.raf=requestAnimationFrame(()=>{d.raf=0;if(ink.current===d)inkRef.current?.drawLive(d.stroke)});
  }

  function endInk(){
    const d=ink.current;
    ink.current=null;
    cancelAnimationFrame(d.raf);
    try{svgRef.current.releasePointerCapture(d.pointerId)}catch{}
    if(d.erasing){
      if(d.working===d.base||!onInkChange(d.working))inkRef.current?.setPreview(null);
      return;
    }
    inkRef.current?.drawLive(d.stroke);
    if(!onInkChange([...strokes,d.stroke]))inkRef.current?.drawLive(null);
  }

  // Capture selection gestures before individual cards consume pointer events.
  function handlePointerDownCapture(e){
    if(tool){
      // Touch pans once a stylus has been used; middle-click always pans.
      if(e.button===1||(e.pointerType==="touch"&&penSeen.current))return;
      e.stopPropagation();
      if(!e.isPrimary){cancelInk();return}
      if(e.button!==0&&!(e.pointerType==="pen"&&e.button===5))return;
      if(ink.current)cancelInk();
      startInk(e);
      return;
    }
    if(e.button!==0||(!colorMode&&!e.shiftKey)||!layout.nodes.length)return;
    if(!colorMode)onEnterColorMode();
    if(selection.current){cancelSelection();return}
    selection.current={
      start:toWorld(e),clientX:e.clientX,clientY:e.clientY,pointerId:e.pointerId,
      additive:e.shiftKey,base:e.shiftKey&&colorMode?new Set(selected):new Set(),moved:false
    };
    try{svgRef.current.setPointerCapture(e.pointerId)}catch{}
  }

  function handlePointerDown(e){
    // Start panning only from empty canvas space, never from a node/card.
    if(colorMode||selection.current||ink.current||(e.button!==0&&!(tool&&e.button===1)))return;
    pan.current={x:e.clientX,y:e.clientY,tx:transform.x,ty:transform.y};
    setPanning(true);
    try{svgRef.current.setPointerCapture(e.pointerId)}catch{}
  }

  function handlePointerMove(e){
    if(tool)moveCursor(e,ink.current?.erasing);
    if(ink.current&&e.pointerId===ink.current.pointerId){moveInk(e);return}
    const drag=selection.current;
    if(drag&&e.pointerId===drag.pointerId){
      if(!drag.moved&&Math.hypot(e.clientX-drag.clientX,e.clientY-drag.clientY)<5)return;
      drag.moved=true;
      const p=toWorld(e);
      const x=Math.min(p.x,drag.start.x),y=Math.min(p.y,drag.start.y);
      const width=Math.abs(p.x-drag.start.x),height=Math.abs(p.y-drag.start.y);
      const next=new Set(drag.base);
      for(const n of layout.nodes){
        if(n.x<=x+width&&n.x+n.w>=x&&n.y<=y+height&&n.y+n.h>=y)next.add(n.id);
      }
      onSelectionChange(next);
      setSelectionRect({x,y,width,height});
      return;
    }
    if(pan.current){
      const d=pan.current;
      setTransform(t=>({...t,x:d.tx+(e.clientX-d.x),y:d.ty+(e.clientY-d.y)}));
    }
  }

  function handlePointerUp(e){
    if(ink.current&&e.pointerId===ink.current.pointerId){endInk();return}
    const drag=selection.current;
    if(drag&&e.pointerId===drag.pointerId){
      if(!drag.moved){
        // Pointer capture retargets clicks to the canvas, so hit-test the release.
        const p=toWorld(e);
        const hit=[...layout.nodes].reverse().find(n=>p.x>=n.x&&p.x<=n.x+n.w&&p.y>=n.y&&p.y<=n.y+n.h);
        if(hit)onSelectNode(hit.id,drag.additive);
        else if(!drag.additive)onSelectionChange(new Set());
      }
      suppressClickUntil.current=Date.now()+350;
      cancelSelection();
      return;
    }
    endPan(e);
  }

  function endPan(e){
    pan.current=null;
    setPanning(false);
    try{svgRef.current.releasePointerCapture(e.pointerId)}catch{}
  }

  // Wheel and touch listeners must be non-passive to prevent page scroll/zoom.
  useEffect(()=>{
    const svg=svgRef.current;
    const onWheel=e=>{
      e.preventDefault();
      if(e.ctrlKey||e.metaKey){latest.current.zoomAt(Math.exp(-Math.max(-40,Math.min(40,e.deltaY))*.0075),e.clientX,e.clientY);return}
      setTransform(t=>({...t,x:t.x-e.deltaX,y:t.y-e.deltaY}));
    };

    const pinch={active:false};
    const dist=(a,b)=>Math.max(1,Math.hypot(b.clientX-a.clientX,b.clientY-a.clientY));
    const center=(a,b)=>({x:(a.clientX+b.clientX)/2,y:(a.clientY+b.clientY)/2});
    const onTouchStart=e=>{
      if(e.touches.length!==2)return;
      e.preventDefault();
      cancelSelection();
      latest.current.cancelInk();
      pan.current=null;setPanning(false);
      const [a,b]=e.touches;
      Object.assign(pinch,{active:true,distance:dist(a,b),center:center(a,b),start:{...transformRef.current}});
    };
    const onTouchMove=e=>{
      if(!pinch.active||e.touches.length!==2)return;
      e.preventDefault();
      const [a,b]=e.touches,rect=svg.getBoundingClientRect(),s=pinch.start;
      const k=Math.max(PINCH_MIN,Math.min(PINCH_MAX,s.k*(dist(a,b)/pinch.distance)));
      const wx=(pinch.center.x-rect.left-s.x)/s.k,wy=(pinch.center.y-rect.top-s.y)/s.k;
      const c=center(a,b);
      setTransform({k,x:c.x-rect.left-wx*k,y:c.y-rect.top-wy*k});
    };
    const onTouchEnd=e=>{
      if(!pinch.active||e.touches.length>=2)return;
      pinch.active=false;
      suppressClickUntil.current=Date.now()+350;
    };

    svg.addEventListener("wheel",onWheel,{passive:false});
    svg.addEventListener("touchstart",onTouchStart,{passive:false});
    svg.addEventListener("touchmove",onTouchMove,{passive:false});
    svg.addEventListener("touchend",onTouchEnd,{passive:true});
    svg.addEventListener("touchcancel",onTouchEnd,{passive:true});
    return()=>{
      svg.removeEventListener("wheel",onWheel);
      svg.removeEventListener("touchstart",onTouchStart);
      svg.removeEventListener("touchmove",onTouchMove);
      svg.removeEventListener("touchend",onTouchEnd);
      svg.removeEventListener("touchcancel",onTouchEnd);
    };
  },[setTransform,transformRef]);

  function handleNodeClick(e,n){
    e.stopPropagation();
    if(Date.now()<suppressClickUntil.current)return;
    if(colorMode){onSelectNode(n.id,e.shiftKey);return}
    // Wait briefly so a double-click can edit the label instead of toggling.
    clearTimeout(clickTimer.current);
    if(n.hasChildren&&e.detail<2)clickTimer.current=setTimeout(()=>onToggleNode(n.id),DOUBLE_CLICK_MS);
  }

  function handleToggleClick(e,n){
    e.stopPropagation();
    if(Date.now()<suppressClickUntil.current||colorMode)return;
    clearTimeout(clickTimer.current);
    onToggleNode(n.id);
  }

  function handleDoubleClick(e,n){
    e.stopPropagation();
    clearTimeout(clickTimer.current);
    if(!colorMode)onStartEdit(n.id);
  }

  function handleContextMenu(e,n){
    e.preventDefault();e.stopPropagation();
    clearTimeout(clickTimer.current);
    onNodeMenu(n.id,e.clientX,e.clientY);
  }

  // Touch has no right-click, so a long press opens the node menu.
  function handleNodePointerDown(e,n){
    e.stopPropagation();
    clearTimeout(longPress.current?.timer);
    if(e.pointerType!=="touch")return;
    const {clientX:x,clientY:y}=e;
    longPress.current={x,y,timer:setTimeout(()=>{
      suppressClickUntil.current=Date.now()+600;
      onNodeMenu(n.id,x,y);
    },LONG_PRESS_MS)};
  }
  function cancelLongPress(e){
    const lp=longPress.current;
    if(lp&&(!e||e.type!=="pointermove"||Math.hypot(e.clientX-lp.x,e.clientY-lp.y)>8)){
      clearTimeout(lp.timer);longPress.current=null;
    }
  }
  useEffect(()=>()=>{clearTimeout(clickTimer.current);clearTimeout(longPress.current?.timer)},[]);

  // Grid spacing follows zoom so the dots feel attached to the canvas.
  const grid=24*transform.k;

  const editingNode=editingId&&layout.nodes.find(n=>n.id===editingId);

  return(
    <>
    <svg id="canvas" ref={svgRef} className={[tool?"inking "+tool:colorMode?"selecting":"",panning?"dragging":""].join(" ").trim()}
      aria-label="Interactive mind map"
      onPointerDownCapture={handlePointerDownCapture}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={e=>{if(e.pointerType!=="touch"&&cursorRef.current)cursorRef.current.style.opacity="0"}}
      onPointerCancel={e=>{cancelSelection();cancelInk();endPan(e)}}>
      <defs>
        <pattern id="dotGrid" patternUnits="userSpaceOnUse" width={grid} height={grid}
          x={transform.x%grid} y={transform.y%grid}>
          <circle className="grid-dot" cx={grid/2} cy={grid/2} r={Math.max(.6,Math.min(1.4,transform.k))}/>
        </pattern>
      </defs>
      <rect className="grid-bg" width="100%" height="100%" fill="url(#dotGrid)"/>
      <g ref={viewportRef} transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}>
        <g className="links">
          {links.map(l=><path key={l.id} className="branch" d={l.d} fill={l.color} opacity={l.opacity*.9}/>)}
        </g>
        <g className="nodes">
          {nodes.map(n=><MapNode key={n.id} n={n} mode={mode} selected={selected.has(n.id)} editing={n.id===editingId}
            handlers={{handleNodeClick,handleToggleClick,handleDoubleClick,handleContextMenu,handleNodePointerDown,cancelLongPress}}/>)}
        </g>
        <InkLayer ref={inkRef} strokes={strokes}/>
        {selectionRect&&<rect className="selection-rect" {...selectionRect} pointerEvents="none"/>}
      </g>
    </svg>
    {tool&&<div ref={cursorRef} className="ink-cursor" aria-hidden="true"/>}
    {editingNode&&<NodeEditor key={editingNode.id} node={editingNode} transform={transform}
      onCommit={label=>onCommitEdit(editingNode.id,label)} onCancel={onCancelEdit}/>}
    </>
  );
});

// Text box laid over the node being renamed; follows pan and zoom.
function NodeEditor({node,transform,onCommit,onCancel}){
  const ref=useRef(null);
  const done=useRef(false);
  const [value,setValue]=useState(node.label);
  const style=nodeStyle(node.depth),k=transform.k;

  // preventScroll: focusing a box that pokes past the edge must not scroll the workspace.
  useLayoutEffect(()=>{ref.current.focus({preventScroll:true});ref.current.select()},[]);
  useLayoutEffect(()=>{
    const el=ref.current;
    el.style.height="auto";
    el.style.height=Math.max(node.h*k,el.scrollHeight)+"px";
  },[value,k,node.h]);

  const finish=save=>{
    if(done.current)return;
    done.current=true;
    save?onCommit(value):onCancel();
  };

  return(
    <textarea ref={ref} className="node-editor" value={value} rows={1} spellCheck={false}
      aria-label="Node text"
      onChange={e=>setValue(e.target.value.replace(/\n/g," "))}
      onKeyDown={e=>{
        if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();finish(true)}
        else if(e.key==="Escape"){e.preventDefault();e.stopPropagation();finish(false)}
      }}
      onBlur={()=>finish(true)}
      style={{
        left:node.x*k+transform.x,top:node.y*k+transform.y,width:Math.max(node.w,160)*k,
        fontSize:style.size*k,fontWeight:style.weight,lineHeight:`${style.line*k}px`,
        padding:`${style.py*k}px ${style.px*k}px`,borderRadius:Math.min(style.radius,node.h/2)*k,
        background:node.fill,color:node.text
      }}/>
  );
}

function MapNode({n,mode,selected,editing,handlers:h}){
  const style=nodeStyle(n.depth);
  const radius=Math.min(style.radius,n.h/2);
  // The root's toggle only appears when it would not sit on top of a branch.
  const showToggle=n.hasChildren&&(!n.root||!n.expanded||mode==="right");
  const tx=n.side>0?n.w+TOGGLE_R+3:-TOGGLE_R-3,ty=n.h/2;
  return(
    <g className={`node depth-${Math.min(n.depth,2)}${n.root?" root":""}${selected?" selected":""}`}
      transform={`translate(${n.x},${n.y})`} opacity={n.opacity??1}
      onPointerDown={e=>h.handleNodePointerDown(e,n)}
      onPointerMove={h.cancelLongPress} onPointerUp={h.cancelLongPress} onPointerCancel={h.cancelLongPress}
      onClick={e=>h.handleNodeClick(e,n)} onDoubleClick={e=>h.handleDoubleClick(e,n)}
      onContextMenu={e=>h.handleContextMenu(e,n)}>
      <g className="node-body">
        {selected&&<rect className="select-ring" x={-5} y={-5} width={n.w+10} height={n.h+10} rx={radius+5}/>}
        <rect className="box" width={n.w} height={n.h} rx={radius} fill={n.fill} stroke={n.border}/>
        <foreignObject width={n.w} height={n.h}>
          <div className="label" style={{visibility:editing?"hidden":undefined,
            color:n.text,fontSize:style.size,fontWeight:style.weight,lineHeight:`${style.line}px`,
            padding:`${style.py}px ${style.px}px`
          }}>{n.label}</div>
        </foreignObject>
      </g>
      {showToggle&&(
        <g className={"toggle"+(n.expanded?"":" collapsed")} transform={`translate(${tx},${ty})`}
          onClick={e=>h.handleToggleClick(e,n)} onDoubleClick={e=>e.stopPropagation()}>
          <title>{n.expanded?"Collapse":`Expand ${n.childCount} item${n.childCount===1?"":"s"}`}</title>
          <circle r={TOGGLE_R} fill={n.expanded?"var(--surface)":n.topColor} stroke={n.topColor}/>
          {n.expanded
            ?<path d="M-4 0H4" stroke={n.topColor}/>
            :<text fill={contrastText(n.topColor)} className="toggle-count">{n.childCount>99?"99+":n.childCount}</text>}
        </g>
      )}
    </g>
  );
}

export default MindMapCanvas;
