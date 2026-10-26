import {useEffect,useRef} from "react";
import {X,Ban,Check,Pipette} from "lucide-react";
import {FILL_SWATCHES,TEXT_SWATCHES} from "../lib/constants.js";
import {contrastText} from "../lib/tree.js";

// Applies only when the native picker commits, so dragging inside it doesn't spam undo steps.
function CustomSwatch({value,label,onCommit}){
  const ref=useRef(null);
  useEffect(()=>{
    const input=ref.current;
    const commit=()=>onCommit(input.value);
    input.addEventListener("change",commit);
    return()=>input.removeEventListener("change",commit);
  },[onCommit]);
  return(
    <label className="swatch custom" data-tip={label}>
      <Pipette size={14} strokeWidth={2}/>
      <input ref={ref} type="color" defaultValue={value} key={value} aria-label={label}/>
    </label>
  );
}

function SwatchRow({title,swatches,current,fallback,onPick}){
  return(
    <div className="swatch-section">
      <div className="swatch-title">{title}</div>
      <div className="swatches">
        <button className={"swatch auto"+(current==="auto"?" on":"")} data-tip="Automatic" aria-label={`${title}: automatic`} onClick={()=>onPick(null)}>
          <Ban size={14} strokeWidth={2}/>
        </button>
        {swatches.map(c=>(
          <button key={c} className={"swatch"+(current===c?" on":"")} style={{"--c":c}} aria-label={`${title} ${c}`} onClick={()=>onPick(c)}>
            {current===c&&<Check size={13} strokeWidth={3} color={contrastText(c)}/>}
          </button>
        ))}
        <CustomSwatch value={/^#/.test(current)?current:fallback} label={`Custom ${title.toLowerCase()} color`} onCommit={onPick}/>
      </div>
    </div>
  );
}

export default function ColorPanel({count,title,current,fallback,onApply,onClose}){
  return(
    <div className="color-panel glass" role="dialog" aria-label="Node colors">
      <div className="color-head">
        <div>
          <strong>{count?title:"Select nodes"}</strong>
          <small>{count?"Changes save instantly and can be undone":"Click a node or drag across several. Shift adds to the selection."}</small>
        </div>
        <button className="icon-btn" aria-label="Done" data-tip="Done · Esc" onClick={onClose}><X size={18}/></button>
      </div>
      <div className={"color-body"+(count?"":" disabled")}>
        <SwatchRow title="Fill" swatches={FILL_SWATCHES} current={current.fill} fallback={fallback.fill}
          onPick={c=>onApply({color:c})}/>
        <SwatchRow title="Text" swatches={TEXT_SWATCHES} current={current.text} fallback={fallback.text}
          onPick={c=>onApply({textColor:c})}/>
      </div>
    </div>
  );
}
