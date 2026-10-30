import {FONT_FAMILY,buildLinks,labelRows,layoutTree,nodeStyle} from "./layout.js";
import {buildStyleMap,expandableIds} from "./tree.js";
import {inkBounds,strokePath} from "./ink.js";

const MARGIN=40;          // world units around the map
const MAX_SCALE=3;        // image pixels per world unit
const MAX_PIXELS=120e6;   // keeps very large maps to a sensible file size
const TILE=4096;          // canvases have size limits, so the page is built from tiles
const MAX_PAGE=14400;     // 200 inches, the largest page PDF readers accept
const JPEG_QUALITY=.92;

const fontOf=style=>`${style.weight} ${style.size}px ${FONT_FAMILY}`;

// Paints the map in world coordinates; the caller sets the transform.
function drawMap(ctx,{nodes,links,strokes,ink}){
  ctx.globalAlpha=.9;
  for(const l of links){
    ctx.fillStyle=l.color;
    ctx.fill(new Path2D(l.d));
  }
  ctx.globalAlpha=1;
  ctx.textAlign="center";
  for(const n of nodes){
    const style=nodeStyle(n.depth);
    ctx.beginPath();
    ctx.roundRect(n.x,n.y,n.w,n.h,Math.min(style.radius,n.h/2));
    ctx.fillStyle=n.fill;
    ctx.fill();
    if(n.depth>1){
      ctx.strokeStyle=n.border;
      ctx.lineWidth=1;
      ctx.stroke();
    }
    ctx.font=fontOf(style);
    ctx.letterSpacing=(n.root?-.02:-.006)*style.size+"px";
    ctx.fillStyle=n.text;
    const rows=labelRows(n.label,n.depth);
    const {fontBoundingBoxAscent:ascent,fontBoundingBoxDescent:descent}=ctx.measureText("Hg");
    const top=n.y+(n.h-rows.length*style.line)/2;
    rows.forEach((row,i)=>ctx.fillText(row,n.x+n.w/2,top+style.line*(i+.5)+(ascent-descent)/2));
  }
  // Same stacking as the canvas: highlighter below, pen on top.
  const paint=(list,alpha)=>{
    ctx.globalAlpha=alpha;
    for(const s of list){
      ctx.fillStyle=s.color==="ink"?ink:s.color;
      ctx.fill(new Path2D(strokePath(s)));
    }
  };
  paint(strokes.filter(s=>s.hl),.38);
  paint(strokes.filter(s=>!s.hl),1);
  ctx.globalAlpha=1;
}

function canvasToJpeg(canvas){
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>{
    if(blob)resolve(blob.arrayBuffer());
    else reject(new Error("Could not render the map."));
  },"image/jpeg",JPEG_QUALITY));
}

// A PDF text string; UTF-16 keeps any script intact.
function pdfText(text){
  const hex=[...Array(text.length).keys()].map(i=>text.charCodeAt(i).toString(16).padStart(4,"0"));
  return `<FEFF${hex.join("")}>`;
}

// One-page PDF. Each image is {bytes,pxW,pxH,x,y,w,h} in points from the bottom-left.
function writePdf(images,pageW,pageH,title){
  const encoder=new TextEncoder();
  const parts=[],offsets=[];
  let size=0;
  const push=chunk=>{
    const bytes=typeof chunk==="string"?encoder.encode(chunk):chunk;
    parts.push(bytes);
    size+=bytes.length;
  };
  const object=(id,body,stream)=>{
    offsets[id]=size;
    push(`${id} 0 obj\n${body}\n`);
    if(stream){push("stream\n");push(stream);push("\nendstream\n")}
    push("endobj\n");
  };
  const FIRST_IMAGE=6;
  const names=images.map((_,i)=>`/Im${i} ${FIRST_IMAGE+i} 0 R`).join(" ");
  const content=encoder.encode(images.map((m,i)=>
    `q ${m.w.toFixed(3)} 0 0 ${m.h.toFixed(3)} ${m.x.toFixed(3)} ${m.y.toFixed(3)} cm /Im${i} Do Q`).join("\n"));

  push(new Uint8Array([0x25,0x50,0x44,0x46,0x2d,0x31,0x2e,0x34,0x0a,0x25,0xe2,0xe3,0xcf,0xd3,0x0a])); // %PDF-1.4 and a binary marker
  object(1,"<</Type/Catalog/Pages 2 0 R>>");
  object(2,"<</Type/Pages/Kids[3 0 R]/Count 1>>");
  object(3,`<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${pageW.toFixed(3)} ${pageH.toFixed(3)}]/Contents 4 0 R/Resources<</XObject<<${names}>>>>>>`);
  object(4,`<</Length ${content.length}>>`,content);
  object(5,`<</Title ${pdfText(title)}/Creator(MindMap Studio)>>`);
  images.forEach((m,i)=>object(FIRST_IMAGE+i,
    `<</Type/XObject/Subtype/Image/Width ${m.pxW}/Height ${m.pxH}/ColorSpace/DeviceRGB/BitsPerComponent 8/Filter/DCTDecode/Length ${m.bytes.length}>>`,m.bytes));

  const count=FIRST_IMAGE+images.length,xref=size;
  push(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for(let id=1;id<count;id++)push(String(offsets[id]).padStart(10,"0")+" 00000 n \n");
  push(`trailer\n<</Size ${count}/Root 1 0 R/Info 5 0 R>>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts,{type:"application/pdf"});
}

/*
 * Renders a project with every branch open, whatever is open on screen, onto a
 * single page in the current theme and layout. The map is drawn to images rather
 * than PDF text so any script and the app's font come out exactly as on screen.
 */
export async function buildMapPdf(project,theme,mode){
  const {data,name}=project,strokes=project.ink||[];
  const rootStyles=[0,1,2].map(nodeStyle);
  const allLabels=JSON.stringify(data);
  // Characters outside Latin come from font files the browser loads on demand.
  await Promise.all(rootStyles.map(s=>document.fonts.load(fontOf(s),allLabels))).catch(()=>{});

  const {nodes,bounds}=layoutTree(data,new Set([data.id,...expandableIds(data)]),buildStyleMap(data,theme),mode);
  const area=inkBounds(strokes);
  const x0=Math.min(bounds.x,area?.x??Infinity)-MARGIN,y0=Math.min(bounds.y,area?.y??Infinity)-MARGIN;
  const x1=Math.max(bounds.x+bounds.width,area?area.x+area.width:-Infinity)+MARGIN;
  const y1=Math.max(bounds.y+bounds.height,area?area.y+area.height:-Infinity)+MARGIN;
  const width=x1-x0,height=y1-y0;

  const scale=Math.min(MAX_SCALE,Math.sqrt(MAX_PIXELS/(width*height)));
  const pxW=Math.ceil(width*scale),pxH=Math.ceil(height*scale);
  const pointsPerPx=Math.min(1,MAX_PAGE/Math.max(width,height))/scale;
  const pageW=pxW*pointsPerPx,pageH=pxH*pointsPerPx;

  const css=getComputedStyle(document.documentElement);
  const background=css.getPropertyValue("--bg").trim();
  const scene={nodes,links:buildLinks(nodes),strokes,ink:css.getPropertyValue("--ink").trim()};
  const canvas=document.createElement("canvas");
  const images=[];
  for(let top=0;top<pxH;top+=TILE){
    for(let left=0;left<pxW;left+=TILE){
      // Tiles overlap by a pixel so no hairline shows between them.
      const w=Math.min(TILE+1,pxW-left),h=Math.min(TILE+1,pxH-top);
      canvas.width=w;canvas.height=h;
      const ctx=canvas.getContext("2d",{alpha:false});
      ctx.fillStyle=background;
      ctx.fillRect(0,0,w,h);
      ctx.setTransform(scale,0,0,scale,-left-x0*scale,-top-y0*scale);
      drawMap(ctx,scene);
      images.push({
        bytes:new Uint8Array(await canvasToJpeg(canvas)),pxW:w,pxH:h,
        x:left*pointsPerPx,y:pageH-(top+h)*pointsPerPx,w:w*pointsPerPx,h:h*pointsPerPx
      });
    }
  }
  return writePdf(images,pageW,pageH,name);
}

export function downloadBlob(blob,filename){
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download=filename;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(url),10000);
}

export const pdfFilename=name=>(name.replace(/[\\/:*?"<>|]+/g,"-").trim()||"Mind Map")+".pdf";
