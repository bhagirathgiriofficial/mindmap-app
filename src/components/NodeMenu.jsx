import {useEffect,useRef} from "react";
import {Pencil,Trash2,Palette} from "lucide-react";

// Right-click / long-press menu for a single node.
export default function NodeMenu({x,y,isRoot,removeCount,onEdit,onColor,onDelete,onClose}){
  const ref=useRef(null);

  useEffect(()=>{
    const close=e=>{if(!ref.current?.contains(e.target))onClose()};
    const esc=e=>{if(e.key==="Escape")onClose()};
    const t=setTimeout(()=>{
      document.addEventListener("pointerdown",close);
      document.addEventListener("wheel",onClose,{passive:true});
    });
    document.addEventListener("keydown",esc);
    ref.current?.querySelector("button")?.focus();
    return()=>{
      clearTimeout(t);
      document.removeEventListener("pointerdown",close);
      document.removeEventListener("wheel",onClose);
      document.removeEventListener("keydown",esc);
    };
  },[onClose]);

  return(
    <div className="menu-pop" role="menu" ref={ref} style={{
      left:Math.max(8,Math.min(window.innerWidth-208,x)),
      top:Math.max(8,Math.min(window.innerHeight-160,y))
    }}>
      <button role="menuitem" onClick={onEdit}><Pencil size={15}/>Edit text<kbd>Enter</kbd></button>
      <button role="menuitem" onClick={onColor}><Palette size={15}/>Color…</button>
      <div className="menu-sep"/>
      <button role="menuitem" className="danger" onClick={onDelete} disabled={isRoot}
        title={isRoot?"The central topic can't be deleted":undefined}>
        <Trash2 size={15}/>
        {isRoot?"Can't delete central topic":removeCount>1?`Delete with ${removeCount-1} below`:"Delete"}
        {!isRoot&&<kbd>Del</kbd>}
      </button>
    </div>
  );
}
