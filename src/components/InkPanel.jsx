import {Check,Pipette,PenLine,Highlighter,Trash2,Scissors,Eraser} from "lucide-react";
import {ERASER_SIZES,PEN_COLORS,PEN_SIZES} from "../lib/ink.js";
import {contrastText} from "../lib/tree.js";

const fillOf=c=>c==="ink"?"var(--ink)":c;

// Floating tray above the dock with the active ink tool's options.
export default function InkPanel({tool,prefs,onChange,onClear,hasInk}){
  if(tool==="eraser")return(
    <div className="ink-panel glass" role="toolbar" aria-label="Eraser options">
      <div className="segmented" role="group" aria-label="Eraser type">
        <button className={"seg-btn"+(prefs.eraserMode==="precise"?" active":"")} data-tip="Erase only what you touch"
          aria-pressed={prefs.eraserMode==="precise"} onClick={()=>onChange({eraserMode:"precise"})}>
          <Scissors size={15} strokeWidth={1.9}/><span>Precise</span>
        </button>
        <button className={"seg-btn"+(prefs.eraserMode==="stroke"?" active":"")} data-tip="Erase whole strokes"
          aria-pressed={prefs.eraserMode==="stroke"} onClick={()=>onChange({eraserMode:"stroke"})}>
          <Eraser size={15} strokeWidth={1.9}/><span>Stroke</span>
        </button>
      </div>
      <span className="dock-divider"/>
      <div className="ink-sizes" role="group" aria-label="Eraser size">
        {ERASER_SIZES.map((d,i)=>(
          <button key={d} className={"size-btn"+(prefs.eraserSize===d?" on":"")} aria-label={`Eraser size ${i+1}`}
            aria-pressed={prefs.eraserSize===d} data-tip={`Size ${i+1} · [ ]`} onClick={()=>onChange({eraserSize:d})}>
            <span className="size-ring" style={{width:6+i*5,height:6+i*5}}/>
          </button>
        ))}
      </div>
      <span className="dock-divider"/>
      <button className="pill-btn danger" disabled={!hasInk} onClick={onClear}>
        <Trash2 size={15} strokeWidth={1.9}/><span>Clear ink</span>
      </button>
    </div>
  );

  const color=fillOf(prefs.color);
  return(
    <div className="ink-panel glass" role="toolbar" aria-label="Pen options">
      <div className="segmented" role="group" aria-label="Pen type">
        <button className={"icon-btn"+(!prefs.highlighter?" active":"")} aria-label="Pen" data-tip="Pen"
          aria-pressed={!prefs.highlighter} onClick={()=>onChange({highlighter:false})}><PenLine size={17} strokeWidth={1.9}/></button>
        <button className={"icon-btn"+(prefs.highlighter?" active":"")} aria-label="Highlighter" data-tip="Highlighter · H"
          aria-pressed={prefs.highlighter} onClick={()=>onChange({highlighter:true})}><Highlighter size={17} strokeWidth={1.9}/></button>
      </div>
      <span className="dock-divider"/>
      <div className="ink-colors" role="group" aria-label="Pen color">
        {PEN_COLORS.map((c,i)=>(
          <button key={c} className={"ink-swatch"+(prefs.color===c?" on":"")} style={{"--c":fillOf(c)}}
            aria-label={c==="ink"?"Black / white":`Color ${c}`} aria-pressed={prefs.color===c}
            data-tip={(c==="ink"?"Auto":c)+` · ${i+1}`} onClick={()=>onChange({color:c})}>
            {prefs.color===c&&<Check size={12} strokeWidth={3.2} color={c==="ink"?"var(--bg)":contrastText(c)}/>}
          </button>
        ))}
        <label className={"ink-swatch custom"+(PEN_COLORS.includes(prefs.color)?"":" on")} data-tip="Custom color">
          <Pipette size={12} strokeWidth={2.2}/>
          <input type="color" aria-label="Custom pen color" value={/^#/.test(prefs.color)?prefs.color:"#0090ff"}
            onChange={e=>onChange({color:e.target.value})}/>
        </label>
      </div>
      <span className="dock-divider"/>
      <div className="ink-sizes" role="group" aria-label="Pen size">
        {PEN_SIZES.map((d,i)=>(
          <button key={d} className={"size-btn"+(prefs.size===d?" on":"")} aria-label={`Pen size ${i+1}`}
            aria-pressed={prefs.size===d} data-tip={`Size ${i+1} · [ ]`} onClick={()=>onChange({size:d})}>
            <span className="size-dot" style={{width:Math.max(3,d*(prefs.highlighter?1.4:1)),height:Math.max(3,d*(prefs.highlighter?1.4:1)),
              background:color,borderRadius:prefs.highlighter?2:"50%",opacity:prefs.highlighter?.55:1}}/>
          </button>
        ))}
      </div>
    </div>
  );
}
