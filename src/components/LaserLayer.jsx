import {forwardRef,useEffect,useImperativeHandle,useRef} from "react";

// After the pointer lifts, a trail holds briefly and then fades out, gone within a second.
const HOLD=250;
const FADE=650;
const COLOR="255,59,48";

/*
 * Screen-space overlay for the laser pointer. A trail stays fully visible while
 * the pointer is down and fades away as a whole once it lifts; nothing here is ever saved.
 */
const LaserLayer=forwardRef(function LaserLayer({size=5},ref){
  const canvasRef=useRef(null);
  const state=useRef({trails:[],current:null,raf:0});
  const sizeRef=useRef(size);
  sizeRef.current=size;

  function frame(){
    const s=state.current,canvas=canvasRef.current;
    s.raf=0;
    if(!canvas)return;
    const ctx=canvas.getContext("2d"),dpr=window.devicePixelRatio||1,now=performance.now();
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,canvas.width/dpr,canvas.height/dpr);
    ctx.lineCap="round";ctx.lineJoin="round";

    const alphaOf=t=>t.ended==null?1:Math.max(0,1-(now-t.ended-HOLD)/FADE);
    s.trails=s.trails.filter(t=>alphaOf(t)>0);

    let fading=false;
    for(const trail of s.trails){
      const a=alphaOf(trail),pts=trail.points;
      if(trail.ended!=null)fading=true;
      ctx.globalAlpha=a;
      if(pts.length===1){
        drawDot(ctx,pts[0],trail.size);
        continue;
      }
      // One path per trail, so the translucent glow never doubles up where it overlaps itself.
      ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);
      // Midpoint curves keep the line smooth between sampled points.
      for(let i=1;i<pts.length-1;i++){
        const p=pts[i],n=pts[i+1];
        ctx.quadraticCurveTo(p.x,p.y,(p.x+n.x)/2,(p.y+n.y)/2);
      }
      const last=pts[pts.length-1];
      ctx.lineTo(last.x,last.y);
      // Soft glow, bright core, then a hot white center.
      const w=trail.size;
      ctx.strokeStyle=`rgba(${COLOR},.22)`;ctx.lineWidth=w+9;ctx.stroke();
      ctx.strokeStyle=`rgba(${COLOR},.9)`;ctx.lineWidth=w;ctx.stroke();
      ctx.strokeStyle="rgba(255,235,232,.85)";ctx.lineWidth=Math.max(1,w*.35);ctx.stroke();
    }
    ctx.globalAlpha=1;
    if(fading)s.raf=requestAnimationFrame(frame);
  }

  function drawDot(ctx,p,w){
    ctx.beginPath();ctx.arc(p.x,p.y,w/2+4.5,0,Math.PI*2);ctx.fillStyle=`rgba(${COLOR},.25)`;ctx.fill();
    ctx.beginPath();ctx.arc(p.x,p.y,w/2,0,Math.PI*2);ctx.fillStyle=`rgb(${COLOR})`;ctx.fill();
  }

  const schedule=()=>{if(!state.current.raf)state.current.raf=requestAnimationFrame(frame)};

  useImperativeHandle(ref,()=>({
    start(x,y){
      const s=state.current,trail={points:[{x,y}],size:sizeRef.current,ended:null};
      if(s.current)s.current.ended=performance.now();
      s.current=trail;s.trails.push(trail);schedule();
    },
    move(x,y){
      const trail=state.current.current;
      if(!trail)return;
      const last=trail.points[trail.points.length-1];
      if(Math.hypot(x-last.x,y-last.y)<1.5)return;
      trail.points.push({x,y});schedule();
    },
    // Lifting starts the fade; the trail stays put until then.
    end(){
      const s=state.current;
      if(s.current)s.current.ended=performance.now();
      s.current=null;schedule();
    }
  }),[]);

  useEffect(()=>{
    const canvas=canvasRef.current;
    const resize=()=>{
      const dpr=window.devicePixelRatio||1;
      canvas.width=Math.round(canvas.clientWidth*dpr);canvas.height=Math.round(canvas.clientHeight*dpr);
      schedule();
    };
    resize();
    const observer=new ResizeObserver(resize);
    observer.observe(canvas);
    return()=>{observer.disconnect();cancelAnimationFrame(state.current.raf);state.current.raf=0};
  },[]);

  return <canvas ref={canvasRef} className="laser-layer" aria-hidden="true"/>;
});

export default LaserLayer;
