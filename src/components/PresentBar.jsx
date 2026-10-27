import {ChevronLeft,ChevronRight,X,WandSparkles} from "lucide-react";
import {IconButton} from "./Chrome.jsx";

// Keeps focus off the buttons so Space/Enter only ever step once (via the keyboard handler).
const noFocus=e=>e.preventDefault();

export default function PresentBar({index,total,step,mapName,laser,onPrev,onNext,onExit,onLaser}){
  const title=step.kind==="overview"?mapName:step.kind==="all"?"Full map":step.label;
  const kicker=step.kind==="overview"?"Overview":step.kind==="all"?"Summary":`Branch ${index} of ${total-2}`;
  return(
    <div className="present-bar glass" role="toolbar" aria-label="Presentation">
      <div className="present-progress" style={{"--p":total>1?index/(total-1):1}}/>
      <IconButton icon={ChevronLeft} label="Previous" shortcut="←" disabled={index===0} onClick={onPrev} onMouseDown={noFocus}/>
      <div className="present-title" aria-live="polite">
        <small>{kicker} · {index+1}/{total}</small>
        <strong>{title}</strong>
      </div>
      <IconButton icon={ChevronRight} label="Next" shortcut="→" disabled={index===total-1} onClick={onNext} onMouseDown={noFocus}/>
      <span className="dock-divider"/>
      <IconButton icon={WandSparkles} label="Laser pointer" shortcut="L" active={laser} onClick={onLaser} onMouseDown={noFocus}/>
      <IconButton icon={X} label="End presentation" shortcut="Esc" onClick={onExit} onMouseDown={noFocus}/>
    </div>
  );
}
