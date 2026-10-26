import {COLORS,THEME_COLORS} from "./constants.js";

export function uid(){
  return "p_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,7);
}
export function deepCopy(o){return JSON.parse(JSON.stringify(o))}

export function sanitizeNode(node){
  if(!node||typeof node!=="object")throw new Error("Every node must be an object.");
  if(typeof node.label!=="string"||!node.label.trim())throw new Error('Every node needs a non-empty "label".');
  const clean={
    id:node.id||("n_"+Math.random().toString(36).slice(2,10)),
    label:node.label.trim()
  };
  if(node.color)clean.color=node.color;
  if(node.textColor)clean.textColor=node.textColor;
  if(Array.isArray(node.children))clean.children=node.children.map(sanitizeNode);
  return clean;
}
export function normalizePayload(raw,nameFallback){
  const parsed=typeof raw==="string"?JSON.parse(raw):raw;
  let title=nameFallback||"Untitled Mind Map";
  let data=parsed;
  if(parsed&&parsed.data&&typeof parsed.data==="object"){
    data=parsed.data;
    if(parsed.title)title=String(parsed.title);
  }
  return {title,data:sanitizeNode(data)};
}

export function shade(hex,amt){
  if(!/^#[0-9a-f]{6}$/i.test(hex))return hex;
  const num=parseInt(hex.slice(1),16);
  let r=(num>>16)+amt,g=((num>>8)&255)+amt,b=(num&255)+amt;
  r=Math.max(0,Math.min(255,r));g=Math.max(0,Math.min(255,g));b=Math.max(0,Math.min(255,b));
  return "#"+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
}
export function contrastText(fill){
  if(!/^#[0-9a-f]{6}$/i.test(fill))return "#1b1d22";
  const rgb=fill.slice(1).match(/../g).map(v=>{
    const c=parseInt(v,16)/255;
    return c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4);
  });
  return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]>.179?"#1b1d22":"#ffffff";
}

// Blends hex color `a` toward `b`; amount 0 keeps `a`, 1 gives `b`.
export function mix(a,b,amount){
  if(!/^#[0-9a-f]{6}$/i.test(a)||!/^#[0-9a-f]{6}$/i.test(b))return a;
  const pa=parseInt(a.slice(1),16),pb=parseInt(b.slice(1),16);
  const ch=shift=>Math.round(((pa>>shift)&255)*(1-amount)+((pb>>shift)&255)*amount);
  return "#"+((1<<24)+(ch(16)<<16)+(ch(8)<<8)+ch(0)).toString(16).slice(1);
}

/*
 * Resolves branch colors, fills, borders and text colors for every node
 * (visible or not). Nodes without an explicit color get a theme-aware tint.
 */
export function buildStyleMap(root,theme="light"){
  const map=new Map();
  if(!root)return map;
  const {surface,root:rootFill}=THEME_COLORS[theme];
  const tint=theme==="dark"?.78:.84;
  function walk(n,topColor,depth,idx){
    const top=depth===0?(n.color||rootFill):(n.color||(depth===1?COLORS[idx%COLORS.length]:topColor));
    const fill=n.color||(depth===0?rootFill:depth===1?top:mix(top,surface,tint));
    const border=n.color||depth<2?shade(fill,-14):mix(top,surface,.45);
    map.set(n.id,{topColor:top,fill,border,text:n.textColor||contrastText(fill)});
    (n.children||[]).forEach((c,i)=>walk(c,top,depth+1,i));
  }
  walk(root,null,0,0);
  return map;
}

export function countNodes(root){
  if(!root)return 0;
  return 1+(root.children||[]).reduce((s,c)=>s+countNodes(c),0);
}

export function indexById(root){
  const map=new Map();
  (function walk(n){map.set(n.id,n);(n.children||[]).forEach(walk)})(root||{id:null});
  map.delete(null);
  return map;
}

export function expandableIds(root){
  const ids=[];
  (function walk(n){
    if(n.children?.length)ids.push(n.id);
    (n.children||[]).forEach(walk);
  })(root);
  return ids;
}

// Returns a new tree where every node in `ids` has `patch` merged in.
// A `null` value in the patch removes that property.
export function patchNodes(root,ids,patch){
  return (function walk(n){
    const next={...n};
    if(ids.has(n.id)){
      for(const [key,value] of Object.entries(patch)){
        if(value==null)delete next[key]; else next[key]=value;
      }
    }
    if(n.children)next.children=n.children.map(walk);
    return next;
  })(root);
}
