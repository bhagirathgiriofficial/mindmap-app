import {forwardRef,useEffect,useImperativeHandle,useMemo,useRef,useState} from "react";
import {buildLinks,nodeStyle} from "../lib/layout.js";
import {useTweenedNodes} from "../hooks/animation.js";
import {contrastText} from "../lib/tree.js";

const PINCH_MIN=.18,PINCH_MAX=3.2;
const TOGGLE_R=10;

/*
 * SVG canvas: renders the laid-out map and owns pointer gestures
 * (pan, wheel zoom, pinch zoom and rectangle selection).
 */
const MindMapCanvas=forwardRef(function MindMapCanvas({
  layout,mode,transform,setTransform,transformRef,zoomAt,
  colorMode,selected,onEnterColorMode,onSelectionChange,onSelectNode,onToggleNode
},ref){
  const svgRef=useRef(null);
  const viewportRef=useRef(null);
  const pan=useRef(null);
  const selection=useRef(null);
  const suppressClickUntil=useRef(0);
  const [selectionRect,setSelectionRect]=useState(null);
  const [panning,setPanning]=useState(false);

  const nodes=useTweenedNodes(layout.nodes);
  const links=useMemo(()=>buildLinks(nodes),[nodes]);

  // Latest zoom handler for native listeners that are registered once.
  const latest=useRef({});
  latest.current={zoomAt};

  function cancelSelection(){
    if(selection.current){
      try{svgRef.current.releasePointerCapture(selection.current.pointerId)}catch{}
      selection.current=null;
    }
    setSelectionRect(null);
  }

  useImperativeHandle(ref,()=>({svg:svgRef.current,cancelSelection}));

  function toWorld(e){
    return new DOMPoint(e.clientX,e.clientY).matrixTransform(viewportRef.current.getScreenCTM().inverse());
  }

  // Capture selection gestures before individual cards consume pointer events.
  function handlePointerDownCapture(e){
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
    if(colorMode||selection.current||e.button!==0)return;
    pan.current={x:e.clientX,y:e.clientY,tx:transform.x,ty:transform.y};
    setPanning(true);
    try{svgRef.current.setPointerCapture(e.pointerId)}catch{}
  }

  function handlePointerMove(e){
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
    if(n.hasChildren)onToggleNode(n.id);
  }

  // Grid spacing follows zoom so the dots feel attached to the canvas.
  const grid=24*transform.k;

  return(
    <svg id="canvas" ref={svgRef} className={colorMode?"selecting":panning?"dragging":""} aria-label="Interactive mind map"
      onPointerDownCapture={handlePointerDownCapture}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={e=>{cancelSelection();endPan(e)}}>
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
          {nodes.map(n=><MapNode key={n.id} n={n} mode={mode} selected={selected.has(n.id)} onClick={handleNodeClick}/>)}
        </g>
        {selectionRect&&<rect className="selection-rect" {...selectionRect} pointerEvents="none"/>}
      </g>
    </svg>
  );
});

function MapNode({n,mode,selected,onClick}){
  const style=nodeStyle(n.depth);
  const radius=Math.min(style.radius,n.h/2);
  // The root's toggle only appears when it would not sit on top of a branch.
  const showToggle=n.hasChildren&&(!n.root||!n.expanded||mode==="right");
  const tx=n.side>0?n.w+TOGGLE_R+3:-TOGGLE_R-3,ty=n.h/2;
  return(
    <g className={`node depth-${Math.min(n.depth,2)}${n.root?" root":""}${selected?" selected":""}`}
      transform={`translate(${n.x},${n.y})`} opacity={n.opacity??1}
      onPointerDown={e=>e.stopPropagation()}
      onClick={e=>onClick(e,n)}>
      <g className="node-body">
        {selected&&<rect className="select-ring" x={-5} y={-5} width={n.w+10} height={n.h+10} rx={radius+5}/>}
        <rect className="box" width={n.w} height={n.h} rx={radius} fill={n.fill} stroke={n.border}/>
        <foreignObject width={n.w} height={n.h}>
          <div className="label" style={{
            color:n.text,fontSize:style.size,fontWeight:style.weight,lineHeight:`${style.line}px`,
            padding:`${style.py}px ${style.px}px`
          }}>{n.label}</div>
        </foreignObject>
      </g>
      {showToggle&&(
        <g className={"toggle"+(n.expanded?"":" collapsed")} transform={`translate(${tx},${ty})`}>
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
