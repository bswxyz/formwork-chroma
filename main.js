/* CHROMA — raymarched liquid-chrome metaballs (raw WebGL) + motion */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.getElementById('chrome');
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' });

  if (!gl) { canvas.classList.add('fallback'); }
  else {
    const vert = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
    const frag = `
      precision highp float;
      uniform float u_time; uniform vec2 u_res; uniform vec2 u_mouse;
      float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
      float map(vec3 p){
        float t=u_time*0.5;
        vec3 c1=vec3(sin(t)*0.95, cos(t*0.8)*0.6, sin(t*0.3)*0.3);
        vec3 c2=vec3(cos(t*0.7)*0.95, sin(t*1.1)*0.55, cos(t*0.5)*0.4);
        vec3 c3=vec3(sin(t*1.3+2.0)*0.75, cos(t*0.6+1.0)*0.7, sin(t*0.9)*0.4);
        vec3 c4=vec3(cos(t*0.4)*0.4, sin(t*0.9)*0.35, cos(t*0.7)*0.3);
        vec3 cm=vec3((u_mouse.x-0.5)*2.6,(u_mouse.y-0.5)*2.0,0.7);
        float d=length(p-c1)-0.62;
        d=smin(d,length(p-c2)-0.55,0.62);
        d=smin(d,length(p-c3)-0.5,0.6);
        d=smin(d,length(p-c4)-0.7,0.62);
        d=smin(d,length(p-cm)-0.5,0.7);
        return d;
      }
      vec3 nrm(vec3 p){vec2 e=vec2(.0015,0.);
        return normalize(vec3(map(p+e.xyy)-map(p-e.xyy),map(p+e.yxy)-map(p-e.yxy),map(p+e.yyx)-map(p-e.yyx)));}
      vec3 env(vec3 rd){
        float y=rd.y*0.5+0.5;
        vec3 base=vec3(.03,.02,.06), mid=vec3(.86,.84,1.0), top=vec3(.05,.07,.16);
        vec3 c=mix(base,mid,smoothstep(.15,.55,y));
        c=mix(c,top,smoothstep(.55,1.0,y));
        float band=sin(rd.x*7.0+rd.y*5.0+u_time*0.6)*0.5+0.5;
        vec3 irid=0.5+0.5*cos(vec3(0.,2.1,4.2)+band*6.28+rd.y*3.5);
        c=mix(c,c*irid*1.5,0.4);
        return c;
      }
      void main(){
        vec2 uv=(gl_FragCoord.xy-0.5*u_res.xy)/u_res.y;
        vec3 ro=vec3(0.,0.,3.3);
        vec3 rd=normalize(vec3(uv,-1.55));
        float t=0.; bool hit=false; float d;
        for(int i=0;i<90;i++){vec3 p=ro+rd*t;d=map(p);if(d<0.001){hit=true;break;}t+=d;if(t>9.)break;}
        vec3 col;
        if(hit){
          vec3 p=ro+rd*t; vec3 n=nrm(p); vec3 refl=reflect(rd,n);
          vec3 rc=env(refl);
          float fres=pow(1.0-max(dot(-rd,n),0.0),3.0);
          col=rc*(0.55+0.7*fres);
          vec3 l=normalize(vec3(0.5,0.8,0.35));
          col+=pow(max(dot(refl,l),0.0),42.0)*1.7;
          col+=fres*vec3(0.45,0.55,0.9)*0.6;
        } else {
          col=env(rd)*0.28;
        }
        float vig=1.0-0.32*dot(uv,uv);
        col*=vig;
        col=pow(max(col,0.0),vec3(0.86));
        col+=(fract(sin(dot(gl_FragCoord.xy,vec2(12.9,78.2)))*43758.5)-0.5)*0.02;
        gl_FragColor=vec4(col,1.0);
      }`;
    const sh=(ty,src)=>{const s=gl.createShader(ty);gl.shaderSource(s,src);gl.compileShader(s);return s;};
    const prog=gl.createProgram();
    gl.attachShader(prog,sh(gl.VERTEX_SHADER,vert));
    gl.attachShader(prog,sh(gl.FRAGMENT_SHADER,frag));
    gl.linkProgram(prog);
    if(!gl.getProgramParameter(prog,gl.LINK_STATUS)){canvas.classList.add('fallback');}
    else{
      gl.useProgram(prog);
      const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
      const loc=gl.getAttribLocation(prog,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
      const uT=gl.getUniformLocation(prog,'u_time'),uR=gl.getUniformLocation(prog,'u_res'),uM=gl.getUniformLocation(prog,'u_mouse');
      const m={x:.5,y:.5,tx:.5,ty:.5};
      if(!reduce)addEventListener('pointermove',e=>{m.tx=e.clientX/innerWidth;m.ty=1-e.clientY/innerHeight;},{passive:true});
      const dpr=Math.min(devicePixelRatio||1,1.4);
      function resize(){const w=(canvas.clientWidth*dpr)|0,h=(canvas.clientHeight*dpr)|0;if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}}
      const start=performance.now();
      function frame(now){resize();
        m.x+=(m.tx-m.x)*0.05;m.y+=(m.ty-m.y)*0.05;
        gl.uniform1f(uT,reduce?6.0:(now-start)/1000);
        gl.uniform2f(uR,canvas.width,canvas.height);
        gl.uniform2f(uM,m.x,m.y);
        gl.drawArrays(gl.TRIANGLES,0,3);
        if(!reduce)requestAnimationFrame(frame);
      }
      addEventListener('resize',resize);resize();requestAnimationFrame(frame);
    }
  }

  /* motion layer */
  const hero=document.querySelector('.hero');
  requestAnimationFrame(()=>requestAnimationFrame(()=>hero.classList.add('loaded')));
  setTimeout(()=>hero.classList.add('loaded'),400);
  const revealAll=()=>document.querySelectorAll('.reveal').forEach(e=>e.classList.add('is-in'));
  window.addEventListener('load',()=>{
    if(!window.gsap){revealAll();return;}
    gsap.registerPlugin(ScrollTrigger);
    gsap.utils.toArray('.reveal:not(.hero .reveal)').forEach(el=>
      ScrollTrigger.create({trigger:el,start:'top 88%',onEnter:()=>el.classList.add('is-in')}));
  });
  setTimeout(()=>{if(!window.gsap)revealAll();},2500);
})();
