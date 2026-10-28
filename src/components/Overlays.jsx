import {useEffect} from "react";
import {X,Plus,Sparkles} from "lucide-react";

const isMac=/Mac|iPhone|iPad/.test(navigator.platform);
const MOD=isMac?"⌘":"Ctrl";

const SHORTCUTS=[
  ["Navigate",[
    ["Pan","Drag canvas · two-finger scroll"],
    ["Zoom",`${MOD} + scroll · pinch`],
    ["Zoom in / out",["+","−"]],
    ["Fit view",["F"]]
  ]],
  ["Map",[
    ["Open / close a branch","Click a node"],
    ["Expand all (open)",["O"]],
    ["Collapse all",["C"]],
    ["Undo",[MOD,"Z"]]
  ]],
  ["Edit",[
    ["Add a child idea","Hover · click +"],
    ["Add child / sibling while typing",["Tab","⇧Tab"]],
    ["Edit node text","Double-click"],
    ["Node menu","Right-click · long-press"],
    ["Edit selected node",["Enter"]],
    ["Delete selected nodes",["Del"]]
  ]],
  ["Present",[
    ["Start presenting",["F5"]],
    ["Next / previous branch",["→","←"]],
    ["Also next","Space · Enter · ↓"],
    ["First / last step",["Home","End"]],
    ["Jump to a branch","Click it"],
    ["End presentation",["Esc"]]
  ]],
  ["Draw",[
    ["Pen on / off",["P"]],
    ["Eraser on / off",["E"]],
    ["Highlighter",["H"]],
    ["Laser pointer on / off",["L"]],
    ["Pen color",["1","–","8"]],
    ["Smaller / bigger",["[","]"]],
    ["Pan while drawing","Scroll · middle-drag"],
    ["Put the tool down",["Esc"]]
  ]],
  ["Select & color",[
    ["Select nodes","Shift + drag"],
    ["Add / remove a node","Shift + click"],
    ["Select all visible",[MOD,"A"]],
    ["Exit selection",["Esc"]]
  ]]
];

export function HelpDialog({onClose}){
  useEffect(()=>{
    const esc=e=>{if(e.key==="Escape"||e.key==="?")onClose()};
    document.addEventListener("keydown",esc);
    return()=>document.removeEventListener("keydown",esc);
  },[onClose]);
  return(
    <div className="overlay" onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className="modal help" role="dialog" aria-modal="true" aria-labelledby="helpTitle">
        <div className="modal-head">
          <div><h2 id="helpTitle">Keyboard & gestures</h2></div>
          <button className="icon-btn" aria-label="Close" onClick={onClose}><X size={18}/></button>
        </div>
        <div className="modal-body help-grid">
          {SHORTCUTS.map(([group,items])=>(
            <section key={group}>
              <h3>{group}</h3>
              {items.map(([label,keys])=>(
                <div className="shortcut" key={label}>
                  <span>{label}</span>
                  <span>{Array.isArray(keys)?keys.map(k=><kbd key={k}>{k}</kbd>):<em>{keys}</em>}</span>
                </div>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({onCreate,onExample}){
  return(
    <div className="empty">
      <div className="empty-card">
        <svg width="148" height="84" viewBox="0 0 148 84" aria-hidden="true" className="empty-art">
          <path d="M54 42C72 42 70 16 92 16M54 42C72 42 70 68 92 68M54 42H92" stroke="currentColor" strokeWidth="2" fill="none" opacity=".35"/>
          <rect x="8" y="30" width="48" height="24" rx="12" fill="var(--ink)"/>
          <rect x="92" y="6" width="48" height="20" rx="8" fill="#6ea8fe"/>
          <rect x="92" y="32" width="48" height="20" rx="8" fill="#a78bfa"/>
          <rect x="92" y="58" width="48" height="20" rx="8" fill="#43c7a4"/>
        </svg>
        <h2>Start your first mind map</h2>
        <p>Build it node by node, or paste a JSON outline — written by hand or generated with AI — and get an interactive, presentable map.</p>
        <div className="empty-actions">
          <button className="primary-btn" onClick={onCreate}><Plus size={17} strokeWidth={2.2}/>New map</button>
          <button className="secondary-btn" onClick={onExample}><Sparkles size={16}/>Try the example</button>
        </div>
      </div>
    </div>
  );
}

export function Toast({message,action}){
  return(
    <div className={"toast"+(message?" show":"")} role="status" aria-live="polite">
      <span>{message}</span>
      {message&&action&&<button onClick={action.onClick}>{action.label}</button>}
    </div>
  );
}
