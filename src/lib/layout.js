export const FONT_FAMILY='"Inter Variable",Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';

// Typography and box metrics per depth (index 2 applies to all deeper levels).
const NODE_STYLE=[
  {size:20,weight:700,line:26,px:26,py:17,maxText:280,minW:150,radius:22},
  {size:15.5,weight:650,line:21,px:18,py:11,maxText:220,minW:110,radius:14},
  {size:14,weight:500,line:19,px:14,py:9,maxText:240,minW:64,radius:10}
];
const GAP_X=[72,52,40];   // horizontal gap after a node of this depth
const GAP_Y=[22,12,8];    // vertical gap between siblings of this depth
const LINK_WIDTH=[[6,2.6],[3.2,1.7],[2,1.3]]; // [start,end] width by parent depth

const measureCtx=document.createElement("canvas").getContext("2d");

export function nodeStyle(depth){return NODE_STYLE[Math.min(depth,2)]}

// Label measurements keyed by style and text; cleared when the web font finishes loading.
const measureCache=new Map();
export function clearMeasureCache(){measureCache.clear()}

function measureText(text,style){
  const key=style.size+"|"+style.weight+"|"+text;
  let m=measureCache.get(key);
  if(!m){m=wrapText(text,style);measureCache.set(key,m)}
  return m;
}

// Wraps text the way the label <div> will and returns its line count and widest line.
function wrapText(text,style){
  measureCtx.font=`${style.weight} ${style.size}px ${FONT_FAMILY}`;
  const width=s=>measureCtx.measureText(s).width;
  const lines=[];let line="";
  for(const word of text.split(/\s+/)){
    const test=line?line+" "+word:word;
    if(!line||width(test)<=style.maxText)line=test;
    else{lines.push(line);line=word}
  }
  if(line)lines.push(line);
  let count=0,widest=0;
  for(const l of lines){
    const w=width(l);
    count+=Math.max(1,Math.ceil(w/style.maxText)); // overlong words break with overflow-wrap
    widest=Math.max(widest,Math.min(w,style.maxText));
  }
  return{lines:Math.max(1,count),width:widest};
}

/*
 * Lays out the visible part of the tree around the root.
 * mode "balanced" splits top-level branches left and right; "right" keeps them all on the right.
 * Returns pre-ordered `nodes` (parents before children) and the world-space `bounds`.
 */
export function layoutTree(root,expanded,styles,mode="balanced"){
  if(!root)return{nodes:[],bounds:null};

  function build(n,depth,parentId){
    const style=nodeStyle(depth);
    const text=measureText(n.label,style);
    const isExpanded=expanded.has(n.id);
    const item={
      id:n.id,label:n.label,depth,root:depth===0,parentId,
      childCount:n.children?.length||0,hasChildren:!!n.children?.length,expanded:isExpanded,
      w:Math.ceil(Math.max(style.minW,text.width+style.px*2+4)),
      h:text.lines*style.line+style.py*2,
      side:1,...styles.get(n.id)
    };
    item.kids=isExpanded&&n.children?n.children.map(c=>build(c,depth+1,n.id)):[];
    return item;
  }

  const measured=new Map();
  const stackHeight=kids=>kids.reduce((s,c)=>s+measure(c),0)+GAP_Y[Math.min(kids[0]?.depth??2,2)]*Math.max(0,kids.length-1);
  function measure(n){
    if(!measured.has(n))measured.set(n,n.kids.length?Math.max(n.h,stackHeight(n.kids)):n.h);
    return measured.get(n);
  }

  // Places a column of siblings whose inner edge sits at `edge`, starting at `top`.
  function placeStack(kids,edge,top,side){
    const gap=GAP_Y[Math.min(kids[0].depth,2)];
    const centers=[];
    for(const c of kids){
      placeSubtree(c,edge,top,side);
      centers.push(c.y+c.h/2);
      top+=measure(c)+gap;
    }
    return(centers[0]+centers[centers.length-1])/2;
  }

  function placeSubtree(n,edge,top,side){
    const sub=measure(n);
    n.side=side;
    n.x=side>0?edge:edge-n.w;
    if(!n.kids.length){n.y=top+(sub-n.h)/2;return}
    const gap=GAP_X[Math.min(n.depth,2)];
    const kidsTop=top+(sub-stackHeight(n.kids))/2;
    const center=placeStack(n.kids,side>0?n.x+n.w+gap:n.x-gap,kidsTop,side);
    n.y=center-n.h/2;
  }

  const tree=build(root,0,null);
  tree.x=-tree.w/2;tree.y=-tree.h/2;

  if(tree.kids.length){
    let right=tree.kids,left=[];
    if(mode==="balanced"&&tree.kids.length>1){
      // Fill the right side until it holds about half the total height.
      const total=tree.kids.reduce((s,c)=>s+measure(c),0);
      let acc=0,split=0;
      while(split<tree.kids.length-1&&acc+measure(tree.kids[split])/2<total/2){acc+=measure(tree.kids[split]);split++}
      split=Math.max(1,split);
      right=tree.kids.slice(0,split);left=tree.kids.slice(split);
    }
    const gap=GAP_X[0];
    if(right.length)placeStack(right,tree.x+tree.w+gap,-stackHeight(right)/2,1);
    if(left.length)placeStack(left,tree.x-gap,-stackHeight(left)/2,-1);
  }

  const nodes=[];
  const b={minX:Infinity,minY:Infinity,maxX:-Infinity,maxY:-Infinity};
  (function flatten(n){
    nodes.push(n);
    b.minX=Math.min(b.minX,n.x-14);b.maxX=Math.max(b.maxX,n.x+n.w+14);
    b.minY=Math.min(b.minY,n.y);b.maxY=Math.max(b.maxY,n.y+n.h);
    n.kids.forEach(flatten);
  })(tree);

  return{nodes,bounds:{x:b.minX,y:b.minY,width:b.maxX-b.minX,height:b.maxY-b.minY}};
}

// Builds tapered branch shapes from (possibly animated) node positions.
export function buildLinks(nodes){
  const byId=new Map(nodes.map(n=>[n.id,n]));
  const links=[];
  for(const n of nodes){
    const p=byId.get(n.parentId);
    if(!p)continue;
    const [w0,w1]=LINK_WIDTH[Math.min(p.depth,2)];
    const sx=n.side>0?p.x+p.w:p.x,sy=p.y+p.h/2;
    const tx=n.side>0?n.x:n.x+n.w,ty=n.y+n.h/2;
    const c1=sx+(tx-sx)*.5,c2=tx-(tx-sx)*.5;
    const d=`M${sx} ${sy-w0/2}C${c1} ${sy-w0/2},${c2} ${ty-w1/2},${tx} ${ty-w1/2}`+
      `L${tx} ${ty+w1/2}C${c2} ${ty+w1/2},${c1} ${sy+w0/2},${sx} ${sy+w0/2}Z`;
    links.push({id:n.id,d,color:n.topColor,opacity:n.opacity??1});
  }
  return links;
}
