import {forwardRef,memo,useImperativeHandle,useLayoutEffect,useRef,useState} from "react";
import {strokePath} from "../lib/ink.js";

const fillOf=c=>c==="ink"?"var(--ink)":c;

/*
 * Renders freehand strokes in world coordinates. The stroke being drawn is
 * written straight to a <path> so drawing never re-renders the map, and the
 * eraser previews its result here until the parent saves it.
 */
const InkLayer=memo(forwardRef(function InkLayer({strokes},ref){
  const liveRef=useRef(null);
  const [preview,setPreview]=useState(null);

  useImperativeHandle(ref,()=>({
    drawLive(stroke){
      const el=liveRef.current;
      if(!el)return;
      if(!stroke){el.setAttribute("d","");return}
      el.setAttribute("d",strokePath(stroke,false));
      el.setAttribute("fill",fillOf(stroke.color));
      el.setAttribute("opacity",stroke.hl?".38":"1");
    },
    setPreview
  }),[]);

  // Once saved strokes arrive, the live path and eraser preview are redundant.
  useLayoutEffect(()=>{
    liveRef.current?.setAttribute("d","");
    setPreview(null);
  },[strokes]);

  const shown=preview||strokes;
  return(
    <g className="ink" pointerEvents="none">
      <g className="ink-highlights" opacity=".38">
        {shown.map(s=>s.hl&&<path key={s.id} d={strokePath(s)} fill={fillOf(s.color)}/>)}
      </g>
      {shown.map(s=>!s.hl&&<path key={s.id} d={strokePath(s)} fill={fillOf(s.color)}/>)}
      <path ref={liveRef} d=""/>
    </g>
  );
}));

export default InkLayer;
