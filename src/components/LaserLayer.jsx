import {forwardRef,useEffect,useImperativeHandle,useRef} from "react";

// How long each part of the trail stays before it has fully faded.
const LIFE=650;
const COLOR="255,59,48";

/*
 * Screen-space overlay for the laser pointer. Trail points carry a timestamp
 * and fade out on their own; nothing here is ever saved.
 */
const LaserLayer=forwardRef(function LaserLayer(_,ref){
  const canvasRef=useRef(null);
  const state=useRef({trails:[],current:null,raf:0});

  function frame(){
    const s=state.current,canvas=canvasRef.current;
    s.raf=0;
    if(!canvas)return;
    const ctx=canvas.getContext("2d"),dpr=window.devicePixelRatio||1,now=performance.now();
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,canvas.width/dpr,canvas.height/dpr);
    // Butt caps: midpoint curves meet tangentially, and round caps would stack
    // translucent overlaps into visible beads.
    ctx.lineCap="butt";ctx.lineJoin="round";

    for(const trail of s.trails){
      while(trail.length&&now-trail[0].t>LIFE)trail.shift();
    }
    s.trails=s.trails.filter(t=>t.length||t===s.current);

    for(const trail of s.trails){
      if(!trail.length)continue;
      if(trail.length===1){
        const a=1-(now-trail[0].t)/LIFE;
        drawDot(ctx,trail[0],a);
        continue;
      }
      // Each segment fades and thins with its age, through midpoint curves for smoothness.
      for(let i=1;i<trail.length;i++){
        const p0=trail[i-2]||trail[i-1],p1=trail[i-1],p2=trail[i];
        const a=Math.max(0,1-(now-p2.t)/LIFE);
        if(a<=0)continue;
        const sx=(p0.x+p1.x)/2,sy=(p0.y+p1.y)/2,ex=(p1.x+p2.x)/2,ey=(p1.y+p2.y)/2;
        const path=()=>{ctx.beginPath();ctx.moveTo(i===1?p1.x:sx,i===1?p1.y:sy);ctx.quadraticCurveTo(p1.x,p1.y,ex,ey)};
        const w=2+a*4;
        path();ctx.strokeStyle=`rgba(${COLOR},${a*.22})`;ctx.lineWidth=w+9;ctx.stroke();
        path();ctx.strokeStyle=`rgba(${COLOR},${a*.9})`;ctx.lineWidth=w;ctx.stroke();
        path();ctx.strokeStyle=`rgba(255,235,232,${a*.85})`;ctx.lineWidth=Math.max(1,w*.35);ctx.stroke();
      }
    }
    if(s.trails.some(t=>t.length))s.raf=requestAnimationFrame(frame);
  }

  function drawDot(ctx,p,a){
    ctx.beginPath();ctx.arc(p.x,p.y,7,0,Math.PI*2);ctx.fillStyle=`rgba(${COLOR},${a*.25})`;ctx.fill();
    ctx.beginPath();ctx.arc(p.x,p.y,3.5,0,Math.PI*2);ctx.fillStyle=`rgba(${COLOR},${a})`;ctx.fill();
  }

  const schedule=()=>{if(!state.current.raf)state.current.raf=requestAnimationFrame(frame)};

  useImperativeHandle(ref,()=>({
    start(x,y){
      const s=state.current,trail=[{x,y,t:performance.now()}];
      s.current=trail;s.trails.push(trail);schedule();
    },
    move(x,y){
      const trail=state.current.current;
      if(!trail)return;
      const last=trail[trail.length-1];
      if(last&&Math.hypot(x-last.x,y-last.y)<1.5)return;
      trail.push({x,y,t:performance.now()});schedule();
    },
    // The trail keeps fading after release; it just stops growing.
    end(){state.current.current=null;schedule()}
  }),[]);

  useEffect(()=>{
    const canvas=canvasRef.current;
    const resize=()=>{
      const dpr=window.devicePixelRatio||1;
      canvas.width=Math.round(canvas.clientWidth*dpr);canvas.height=Math.round(canvas.clientHeight*dpr);
    };
    resize();
    const observer=new ResizeObserver(resize);
    observer.observe(canvas);
    return()=>{observer.disconnect();cancelAnimationFrame(state.current.raf)};
  },[]);

  return <canvas ref={canvasRef} className="laser-layer" aria-hidden="true"/>;
});

export default LaserLayer;
