import {useEffect,useMemo,useRef,useState} from "react";
import {X,Sparkles,Wand2,CheckCircle2,AlertCircle,ChevronRight} from "lucide-react";
import {EXAMPLE} from "../lib/constants.js";
import {countNodes,normalizePayload} from "../lib/tree.js";

const MOD=/Mac|iPhone|iPad/.test(navigator.platform)?"⌘":"Ctrl";

export default function ProjectModal({mode,initialName,initialJson,onSave,onClose}){
  const [name,setName]=useState(initialName);
  const [json,setJson]=useState(initialJson);
  const [error,setError]=useState("");
  const nameRef=useRef(null);

  const closeRef=useRef(onClose);
  closeRef.current=onClose;

  useEffect(()=>{
    const t=setTimeout(()=>nameRef.current?.focus(),50);
    const esc=e=>{if(e.key==="Escape")closeRef.current()};
    document.addEventListener("keydown",esc);
    return()=>{clearTimeout(t);document.removeEventListener("keydown",esc)};
  },[]);

  // Live validation while typing.
  const check=useMemo(()=>{
    if(!json.trim())return null;
    try{return{ok:true,count:countNodes(normalizePayload(json).data)}}
    catch(e){return{ok:false,message:e.message}}
  },[json]);

  const save=()=>setError(onSave(name,json)||"");
  const format=()=>{try{setJson(JSON.stringify(JSON.parse(json),null,2))}catch{}};

  return(
    <div className="overlay" onClick={e=>{if(e.target===e.currentTarget)onClose()}}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle"
        onKeyDown={e=>{if((e.metaKey||e.ctrlKey)&&e.key==="Enter")save()}}>
        <div className="modal-head">
          <div>
            <h2 id="modalTitle">{mode==="edit"?"Edit map":"New map"}</h2>
            <p>Paste a JSON tree — it becomes an interactive, expandable map.</p>
          </div>
          <button className="icon-btn" aria-label="Close" onClick={onClose}><X size={18}/></button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label htmlFor="projectName">Name</label>
            <input id="projectName" ref={nameRef} value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Coding Roadmap 2026"/>
          </div>
          <div className="field">
            <div className="field-row">
              <label htmlFor="jsonInput">Map JSON</label>
              <div className="field-actions">
                <button className="ghost-btn" onClick={format} disabled={!check?.ok}><Wand2 size={14}/>Format</button>
                <button className="ghost-btn" onClick={()=>{setName(EXAMPLE.title);setJson(JSON.stringify(EXAMPLE.data,null,2))}}><Sparkles size={14}/>Load example</button>
              </div>
            </div>
            <textarea id="jsonInput" spellCheck={false} value={json} onChange={e=>{setJson(e.target.value);setError("")}}
              placeholder={'{\n  "label": "My idea",\n  "children": [\n    { "label": "First branch" }\n  ]\n}'}/>
            {check&&!error&&(
              <div className={"validity "+(check.ok?"ok":"bad")}>
                {check.ok?<CheckCircle2 size={14}/>:<AlertCircle size={14}/>}
                {check.ok?`Valid · ${check.count} node${check.count===1?"":"s"}`:check.message}
              </div>
            )}
            {error&&<div className="validity bad"><AlertCircle size={14}/>{error}</div>}
          </div>
          <details className="format-help">
            <summary><ChevronRight size={14}/>JSON format</summary>
            <p>Use a root node directly, or wrap it as <code>{'{"title":"Name","data":{...}}'}</code>.
              Each node takes <code>label</code> and optional <code>color</code>, <code>textColor</code> and <code>children</code>.</p>
            <code className="block">{'{"label":"START","children":[{"label":"Foundation","color":"#6ea8fe","children":[{"label":"Internet"}]}]}'}</code>
          </details>
        </div>
        <div className="modal-actions">
          <span className="kbd-hint"><kbd>{MOD}</kbd><kbd>Enter</kbd> to save</span>
          <div>
            <button className="secondary-btn" onClick={onClose}>Cancel</button>
            <button className="primary-btn" onClick={save}>{mode==="edit"?"Save changes":"Create map"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
