import {useEffect,useRef} from "react";
import {FileJson,Copy,Trash2} from "lucide-react";

export default function ProjectMenu({anchor,onEdit,onDuplicate,onDelete,onClose}){
  const ref=useRef(null);
  const r=anchor.getBoundingClientRect();

  useEffect(()=>{
    const close=e=>{if(!ref.current?.contains(e.target))onClose()};
    const esc=e=>{if(e.key==="Escape")onClose()};
    // Defer so the click that opened the menu doesn't immediately close it.
    const t=setTimeout(()=>document.addEventListener("click",close));
    document.addEventListener("keydown",esc);
    return()=>{clearTimeout(t);document.removeEventListener("click",close);document.removeEventListener("keydown",esc)};
  },[onClose]);

  return(
    <div className="menu-pop" role="menu" ref={ref} style={{
      left:Math.max(8,Math.min(window.innerWidth-188,r.right-180)),
      top:Math.min(window.innerHeight-150,r.bottom+6)
    }}>
      <button role="menuitem" onClick={onEdit}><FileJson size={15}/>Edit JSON</button>
      <button role="menuitem" onClick={onDuplicate}><Copy size={15}/>Duplicate</button>
      <div className="menu-sep"/>
      <button role="menuitem" className="danger" onClick={onDelete}><Trash2 size={15}/>Delete</button>
    </div>
  );
}
