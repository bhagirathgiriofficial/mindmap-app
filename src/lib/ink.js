import {getStroke} from "perfect-freehand";
import {uid} from "./tree.js";

// Pen colors; "ink" follows the theme's text color so it stays readable in light and dark.
export const PEN_COLORS=["ink","#e5484d","#f76b15","#f5c400","#30a46c","#0090ff","#8e4ec6","#e93d82"];
// Sizes are in screen pixels at the zoom the stroke is drawn at.
export const PEN_SIZES=[2,4,7,11,16];
export const ERASER_SIZES=[12,24,40,64];
export const INK_KEY="mindmap_studio_ink_v1";
export const INK_DEFAULTS={color:"ink",size:4,highlighter:false,eraserSize:24,eraserMode:"precise"};

const round=v=>Math.round(v*100)/100;

function strokeOptions(s,last){
  return{
    size:s.size,
    thinning:s.hl?0:s.sim?.32:.62,
    smoothing:.62,
    streamline:s.hl?.6:.45,
    easing:t=>Math.sin(t*Math.PI/2),
    simulatePressure:s.sim,
    start:{taper:s.hl?0:s.size*1.2,cap:true},
    end:{taper:s.hl?0:s.size*1.8,cap:true},
    last
  };
}

// Turns an outline polygon into a smooth closed path using quadratic midpoints.
function outlineToPath(pts){
  const n=pts.length;
  if(!n)return "";
  if(n<3)return `M${pts[0][0]} ${pts[0][1]}Z`;
  const f=v=>v.toFixed(2);
  let d=`M${f(pts[0][0])} ${f(pts[0][1])}Q`;
  for(let i=0;i<n;i++){
    const a=pts[i],b=pts[(i+1)%n];
    d+=`${f(a[0])} ${f(a[1])} ${f((a[0]+b[0])/2)} ${f((a[1]+b[1])/2)} `;
  }
  return d+"Z";
}

// A lone tap still leaves a dot.
function dotPath(s){
  const [x,y]=s.points[0],r=s.size/2;
  return `M${x-r} ${y}a${r} ${r} 0 1 0 ${r*2} 0a${r} ${r} 0 1 0 ${-r*2} 0Z`;
}

const pathCache=new WeakMap();
export function strokePath(s,last=true){
  if(last&&pathCache.has(s))return pathCache.get(s);
  const d=s.points.length<2?dotPath(s):outlineToPath(getStroke(s.points,strokeOptions(s,last)));
  if(last)pathCache.set(s,d);
  return d;
}

export function makeStroke({color,size,highlighter},k,sim){
  // Highlighters are wider and sit under the pen strokes visually via opacity.
  const px=highlighter?size*3+8:size;
  return{id:uid(),color,size:round(px/k),sim,hl:highlighter||undefined,points:[]};
}

// minGap is in world units; skipping sub-pixel jitter keeps stored strokes compact.
export function addPoint(s,x,y,pressure,minGap=0){
  const p=s.points,last=p[p.length-1];
  if(last&&Math.hypot(x-last[0],y-last[1])<minGap)return false;
  p.push(s.sim?[round(x),round(y)]:[round(x),round(y),round(pressure||.5)]);
  return true;
}

export function strokeBounds(s){
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  for(const [x,y] of s.points){if(x<x0)x0=x;if(y<y0)y0=y;if(x>x1)x1=x;if(y>y1)y1=y}
  const r=s.size;
  return{x0:x0-r,y0:y0-r,x1:x1+r,y1:y1+r};
}

export function inkBounds(strokes){
  if(!strokes?.length)return null;
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
  for(const s of strokes){
    const b=strokeBounds(s);
    x0=Math.min(x0,b.x0);y0=Math.min(y0,b.y0);x1=Math.max(x1,b.x1);y1=Math.max(y1,b.y1);
  }
  return{x:x0,y:y0,width:x1-x0,height:y1-y0};
}

function segDist(px,py,ax,ay,bx,by){
  const dx=bx-ax,dy=by-ay,len=dx*dx+dy*dy;
  const t=len?Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/len)):0;
  return Math.hypot(px-(ax+t*dx),py-(ay+t*dy));
}

// Inserts points so no gap is longer than `step`, which keeps partial erasing precise.
function densify(points,step){
  const out=[points[0]];
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],gap=Math.hypot(b[0]-a[0],b[1]-a[1]);
    const n=Math.floor(gap/step);
    for(let j=1;j<=n;j++){
      const t=j/(n+1);
      out.push(a.length>2?[round(a[0]+(b[0]-a[0])*t),round(a[1]+(b[1]-a[1])*t),round(a[2]+(b[2]-a[2])*t)]:[round(a[0]+(b[0]-a[0])*t),round(a[1]+(b[1]-a[1])*t)]);
    }
    out.push(b);
  }
  return out;
}

/*
 * Erases along the segment a→b with radius r (world units).
 * "stroke" mode removes whole strokes it touches; "precise" mode cuts them apart.
 * Returns the same array when nothing changed.
 */
export function eraseSegment(strokes,a,b,r,mode){
  let changed=false;
  const out=[];
  const minX=Math.min(a.x,b.x)-r,maxX=Math.max(a.x,b.x)+r,minY=Math.min(a.y,b.y)-r,maxY=Math.max(a.y,b.y)+r;
  for(const s of strokes){
    const bb=strokeBounds(s);
    if(bb.x1<minX||bb.x0>maxX||bb.y1<minY||bb.y0>maxY){out.push(s);continue}
    const reach=r+s.size/2;
    const hit=([x,y])=>segDist(x,y,a.x,a.y,b.x,b.y)<=reach;
    if(mode==="stroke"){
      const pts=s.points.length>1?densify(s.points,Math.max(1,reach/2)):s.points;
      if(pts.some(hit)){changed=true;continue}
      out.push(s);continue;
    }
    const pts=s.points.length>1?densify(s.points,Math.max(.75,Math.min(reach,s.size)/2)):s.points;
    if(!pts.some(hit)){out.push(s);continue}
    changed=true;
    // Keep the original samples (plus the new cut ends) so the pieces keep their shape and weight.
    const originals=new Set(s.points);
    let run=[];
    const flush=()=>{
      run=run.filter((p,i)=>i===0||i===run.length-1||originals.has(p));
      // Drop crumbs shorter than the pen is wide.
      if(run.length>1||(run.length===1&&s.points.length===1)){
        const len=run.reduce((sum,p,i)=>i?sum+Math.hypot(p[0]-run[i-1][0],p[1]-run[i-1][1]):0,0);
        if(len>=s.size*.6||s.points.length===1)out.push({...s,id:uid(),points:run});
      }
      run=[];
    };
    for(const p of pts){if(hit(p))flush(); else run.push(p)}
    flush();
  }
  return changed?out:strokes;
}

export function loadInkPrefs(){
  try{return{...INK_DEFAULTS,...JSON.parse(localStorage.getItem(INK_KEY)||"{}")}}catch{return{...INK_DEFAULTS}}
}
export function saveInkPrefs(prefs){
  try{localStorage.setItem(INK_KEY,JSON.stringify(prefs))}catch{}
}
