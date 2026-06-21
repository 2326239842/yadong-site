// ============================================================
// CONFIG
// ============================================================
const SATS = {
  ISS:      {name:'ISS 国际空间站', color:0xff6b9d, cat:'iss',      alt:408,  inc:51.6, raan:0,   mass:'420 吨', period:'92 min', country:'国际合作', launch:'1998-11-20', desc:'国际空间站是多国合作的近地轨道科研设施，每92分钟绕地球一圈，常驻6-7名宇航员。'},
  Tiangong: {name:'天宫空间站',     color:0x6bcb77, cat:'iss',      alt:389,  inc:41.5, raan:120, mass:'90 吨',  period:'91 min', country:'中国',     launch:'2021-04-29', desc:'中国独立建造的空间站，由天和、问天、梦天三大舱段组成，标志着中国载人航天进入新阶段。'},
  Hubble:   {name:'哈勃望远镜',     color:0x4d96ff, cat:'hubble',   alt:547,  inc:28.5, raan:240, mass:'11.1吨', period:'97 min', country:'NASA/ESA', launch:'1990-04-24', desc:'哈勃太空望远镜已工作30余年，彻底改变了人类对宇宙的认知，观测距离超过134亿光年。'},
  Starlink1:{name:'Starlink 群组',  color:0xffd93d, cat:'starlink', alt:550,  inc:53.0, raan:60,  mass:'260 kg',  period:'95 min', country:'SpaceX',   launch:'2019-05-14', desc:'SpaceX 星链低轨宽带星座，已部署超6000颗卫星，提供全球互联网接入。'},
  GPS:      {name:'GPS IIF-12',     color:0xff9966, cat:'gnss',     alt:20180,inc:55.0, raan:180, mass:'1.6吨', period:'12 h',   country:'美国',     launch:'2012-10-04', desc:'GPS Block IIF 卫星运行在中地球轨道，提供全球导航定位服务，精度优于1米。'},
  Galileo:  {name:'Galileo-27',     color:0xcc99ff, cat:'gnss',     alt:23222,inc:56.0, raan:300, mass:'700 kg',period:'14h7m',  country:'欧盟',     launch:'2016-11-17', desc:'伽利略导航卫星系统是欧洲独立运行的全球导航系统，使用高精度氢原子钟。'},
  Starlink2:{name:'Starlink 备用组', color:0xffd93d, cat:'starlink', alt:550,  inc:53.0, raan:45,  mass:'260 kg',  period:'95 min', country:'SpaceX',   launch:'2019-05-14', desc:'Starlink 备份轨道群组，为区域覆盖提供冗余保障。'},
  Starlink3:{name:'Starlink 第三组', color:0xffd93d, cat:'starlink', alt:550,  inc:53.0, raan:90,  mass:'260 kg',  period:'95 min', country:'SpaceX',   launch:'2019-05-14', desc:'Starlink 第三轨道群组，增强赤道区域覆盖密度。'}
};

const EARTH_R = 50;
let scene, camera, renderer, earthMesh, cloudsMesh, atmosphere;

// 兼容版圆角矩形绘制
function drawRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.lineTo(x+w-r, y);
  ctx.quadraticCurveTo(x+w, y, x+w, y+r);
  ctx.lineTo(x+w, y+h-r);
  ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  ctx.lineTo(x+r, y+h);
  ctx.quadraticCurveTo(x, y+h, x, y+h-r);
  ctx.lineTo(x, y+r);
  ctx.quadraticCurveTo(x, y, x+r, y);
  ctx.closePath();
}
let raycaster, mouse, sats = {}, satData = {};
let autoRotate = true, isDragging = false;
let lastPointer = {x:0, y:0}, pinchDist = 0;
let camTarget = {lat:20, lng:0, dist:250}, camCur = {lat:20, lng:0, dist:300};
let simStart = Date.now();
let selectedKey = 'ISS';

// ============================================================
// INIT THREE.JS
// ============================================================
function init() {
  const c = document.getElementById('globe');
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(45, innerWidth/innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 250);
  camera.lookAt(0, 0, 0);
  
  renderer = new THREE.WebGLRenderer({antialias:true, alpha:true});
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000008);
  c.appendChild(renderer.domElement);
  
  // Lights
  scene.add(new THREE.AmbientLight(0x333344, 0.8));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(5, 3, 5);
  scene.add(sun);
  
  // Stars
  const sg = new THREE.BufferGeometry();
  const N = 2000, pos = new Float32Array(N*3);
  for(let i=0;i<N;i++){
    const t=Math.random()*Math.PI*2, p=Math.acos(2*Math.random()-1), r=200+Math.random()*300;
    pos[i*3]=r*Math.sin(p)*Math.cos(t);
    pos[i*3+1]=r*Math.sin(p)*Math.sin(t);
    pos[i*3+2]=r*Math.cos(p);
  }
  sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({color:0xffffff,size:0.5,transparent:true,opacity:0.8})));
  
  // Earth
  const loader = new THREE.TextureLoader();
  loader.load('earth_daymap.jpg', tex => {
    tex.colorSpace = THREE.SRGBColorSpace;
    const geo = new THREE.SphereGeometry(EARTH_R, 64, 64);
    earthMesh = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({map:tex,shininess:10}));
    scene.add(earthMesh);
  }, undefined, () => {
    const geo = new THREE.SphereGeometry(EARTH_R, 64, 64);
    earthMesh = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({color:0x1a4d8c,shininess:15}));
    scene.add(earthMesh);
  });
  
  // Clouds
  loader.load('earth_clouds.png', tex => {
    const geo = new THREE.SphereGeometry(EARTH_R+0.3, 64, 64);
    cloudsMesh = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({map:tex,transparent:true,opacity:0.4,depthWrite:false}));
    scene.add(cloudsMesh);
  });
  
  // Atmosphere
  const atmoGeo = new THREE.SphereGeometry(EARTH_R*1.15, 64, 64);
  atmosphere = new THREE.Mesh(atmoGeo, new THREE.MeshPhongMaterial({color:0x0088ff,transparent:true,opacity:0.08,side:THREE.BackSide}));
  scene.add(atmosphere);
  
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();
  
  createSats();
  updatePositions();
  updateUI();
  animate();
  
  setInterval(() => { updatePositions(); updateUI(); }, 100);
  setTimeout(() => document.getElementById('loading').classList.add('done'), 1200);
}

// ============================================================
// SATELLITES
// ============================================================
function createSats() {
  for(const [key, s] of Object.entries(SATS)){
    const c = s.color;
    const g = new THREE.SphereGeometry(1.2, 12, 12);
    const m = new THREE.MeshBasicMaterial({color:c});
    const mesh = new THREE.Mesh(g, m);
    
    // Glow
    const cv = document.createElement('canvas');
    cv.width = cv.height = 32;
    const ctx = cv.getContext('2d');
    const gr = ctx.createRadialGradient(16,16,0,16,16,16);
    gr.addColorStop(0,`rgba(${(c>>16)&255},${(c>>8)&255},${c&255},1)`);
    gr.addColorStop(0.4,`rgba(${(c>>16)&255},${(c>>8)&255},${c&255},0.5)`);
    gr.addColorStop(1,'transparent');
    ctx.fillStyle = gr; ctx.fillRect(0,0,32,32);
    const glowTex = new THREE.CanvasTexture(cv);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
    glow.scale.set(4,4,1);
    mesh.add(glow);
    
    // Label
    const lc = document.createElement('canvas');
    lc.width = 256; lc.height = 64;
    const lctx = lc.getContext('2d');
    lctx.fillStyle = 'rgba(0,0,20,0.6)';
    drawRoundRect(lctx, 4, 8, 248, 48, 6);
    lctx.fill();
    lctx.strokeStyle = '#'+c.toString(16).padStart(6,'0');
    lctx.lineWidth = 1.5;
    drawRoundRect(lctx, 4, 8, 248, 48, 6);
    lctx.stroke();
    lctx.fillStyle = '#fff';
    lctx.font = 'bold 22px monospace';
    lctx.textAlign = 'center';
    lctx.textBaseline = 'middle';
    const dn = s.name.length > 16 ? s.name.slice(0,14)+'…' : s.name;
    lctx.fillText(dn, 128, 33);
    const label = new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(lc),transparent:true,depthTest:false,depthWrite:false}));
    label.scale.set(10, 2.5, 1);
    label.position.set(0, 3, 0);
    mesh.add(label);
    
    mesh.userData = {key, inc:s.inc*Math.PI/180, raan:s.raan*Math.PI/180, alt:s.alt};
    scene.add(mesh);
    sats[key] = mesh;
  }
}

function updatePositions() {
  const el = (Date.now() - simStart) / 1000;
  const er = 7.2921159e-5;
  
  for(const [key, s] of Object.entries(SATS)){
    const mesh = sats[key];
    if(!mesh) continue;
    const ud = mesh.userData;
    const period = 2*Math.PI*Math.sqrt(Math.pow(ud.alt+6371,3)/398600);
    const mm = (2*Math.PI)/(period*60);
    const ma = mm * el;
    const lat = s.inc * Math.sin(ma) * 0.9;
    const lonBase = s.raan + (el * 0.5) % 360;
    const gmst = (280.46061837 + 360.98564736629*(el/86400)) % 360;
    let lon = ((lonBase > 180 ? lonBase-360 : (lonBase < -180 ? lonBase+360 : lonBase)) - gmst);
    lon = lon > 180 ? lon-360 : (lon < -180 ? lon+360 : lon);
    
    const altUnits = Math.max(1.5, Math.min(40, 1.5 + Math.log(ud.alt/400)*8));
    const lr = lat*Math.PI/180, wr = lon*Math.PI/180, r = EARTH_R+altUnits;
    
    mesh.position.set(r*Math.cos(lr)*Math.cos(wr), r*Math.sin(lr), -r*Math.cos(lr)*Math.sin(wr));
    satData[key] = {lat, lon, alt:ud.alt, vel:(2*Math.PI*(ud.alt+6371)/period/60).toFixed(3)};
  }
}

// ============================================================
// CAMERA CONTROLS (Mouse + Touch)
// ============================================================
function updateCamera() {
  camCur.lat += (camTarget.lat-camCur.lat)*0.08;
  camCur.lng += (camTarget.lng-camCur.lng)*0.08;
  camCur.dist += (camTarget.dist-camCur.dist)*0.08;
  if(autoRotate && !isDragging) camTarget.lng += 0.05;
  const lr=camCur.lat*Math.PI/180, wr=camCur.lng*Math.PI/180;
  camera.position.set(camCur.dist*Math.cos(lr)*Math.sin(wr), camCur.dist*Math.sin(lr), camCur.dist*Math.cos(lr)*Math.cos(wr));
  camera.lookAt(0,0,0);
}

function onPointerDown(e) {
  isDragging = true;
  autoRotate = false;
  const touches = e.touches;
  if(touches && touches.length === 2) {
    pinchDist = Math.hypot(touches[0].clientX-touches[1].clientX, touches[0].clientY-touches[1].clientY);
  } else {
    const p = touches ? touches[0] : e;
    lastPointer = {x:p.clientX, y:p.clientY};
  }
}

function onPointerMove(e) {
  e.preventDefault();
  const touches = e.touches;
  if(touches && touches.length === 2) {
    const d = Math.hypot(touches[0].clientX-touches[1].clientX, touches[0].clientY-touches[1].clientY);
    const delta = pinchDist - d;
    camTarget.dist += delta * 0.5;
    camTarget.dist = Math.max(100, Math.min(500, camTarget.dist));
    pinchDist = d;
    return;
  }
  if(!isDragging) return;
  const p = touches ? touches[0] : e;
  const dx = p.clientX - lastPointer.x;
  const dy = p.clientY - lastPointer.y;
  camTarget.lng += dx * 0.25;
  camTarget.lat = Math.max(-85, Math.min(85, camTarget.lat + dy * 0.25));
  lastPointer = {x:p.clientX, y:p.clientY};
}

function onPointerUp() {
  isDragging = false;
  setTimeout(() => { autoRotate = true; }, 3000);
}

function onWheel(e) {
  camTarget.dist += e.deltaY * 0.1;
  camTarget.dist = Math.max(100, Math.min(500, camTarget.dist));
}

function onClick(e) {
  mouse.x = (e.clientX/innerWidth)*2-1;
  mouse.y = -(e.clientY/innerHeight)*2+1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(Object.values(sats));
  if(hits.length > 0 && hits[0].object.userData.key) {
    showDetail(hits[0].object.userData.key);
  }
}

// Mouse events
const dom = renderer ? renderer.domElement : document;
document.addEventListener('mousedown', onPointerDown);
document.addEventListener('mousemove', onPointerMove);
document.addEventListener('mouseup', onPointerUp);
document.addEventListener('wheel', onWheel, {passive:true});

// Touch events
document.addEventListener('touchstart', onPointerDown, {passive:false});
document.addEventListener('touchmove', onPointerMove, {passive:false});
document.addEventListener('touchend', onPointerUp);

// Click (separate from drag)
let pointerDownTime = 0, pointerDownPos = {x:0,y:0};
document.addEventListener('mousedown', e => { pointerDownTime = Date.now(); pointerDownPos = {x:e.clientX,y:e.clientY}; });
document.addEventListener('mouseup', e => {
  if(Date.now()-pointerDownTime < 300 && Math.hypot(e.clientX-pointerDownPos.x, e.clientY-pointerDownPos.y) < 5) onClick(e);
});
document.addEventListener('touchstart', e => { pointerDownTime = Date.now(); const t=e.touches[0]; pointerDownPos = {x:t.clientX,y:t.clientY}; });
document.addEventListener('touchend', e => {
  const t = e.changedTouches[0];
  if(Date.now()-pointerDownTime < 300 && Math.hypot(t.clientX-pointerDownPos.x, t.clientY-pointerDownPos.y) < 10) onClick({clientX:t.clientX, clientY:t.clientY});
});

window.addEventListener('resize', () => {
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ============================================================
// UI
// ============================================================
function updateUI() {
  document.getElementById('count').innerHTML = `<span>${Object.keys(satData).length}</span> satellites tracked`;
  const list = document.getElementById('satellites');
  let html = '';
  for(const [key, s] of Object.entries(SATS)){
    const d = satData[key];
    const active = key === selectedKey ? ' active' : '';
    html += `<div class="sat-item${active}" onclick="selectSat('${key}')"><span class="name">${s.name.split(' ')[0]}</span><span class="alt">${d?Math.round(d.alt)+'km':''}</span></div>`;
  }
  list.innerHTML = html;
}

window.selectSat = function(key) {
  selectedKey = key;
  const d = satData[key];
  if(d){camTarget.lat=d.lat; camTarget.lng=d.lon; camTarget.dist=160; autoRotate=false;}
  updateUI();
};

window.showDetail = function(key) {
  const s = SATS[key], d = satData[key], ov = document.getElementById('detail'), pnl = document.getElementById('detail-panel');
  const c = s.color, hex = '#'+c.toString(16).padStart(6,'0');
  pnl.innerHTML = `
    <button class="close" onclick="closeDetail()">✕</button>
    <h2 style="color:${hex}">${s.name}</h2>
    <div class="desc">${s.desc}</div>
    <div class="spec">
      <div class="spec-item"><div class="spec-label">国家/组织</div><div class="spec-val">${s.country}</div></div>
      <div class="spec-item"><div class="spec-label">发射日期</div><div class="spec-val">${s.launch}</div></div>
      <div class="spec-item"><div class="spec-label">质量</div><div class="spec-val">${s.mass}</div></div>
      <div class="spec-item"><div class="spec-label">轨道周期</div><div class="spec-val">${s.period}</div></div>
      <div class="spec-item"><div class="spec-label">高度</div><div class="spec-val">${d?d.alt:s.alt} km</div></div>
      <div class="spec-item"><div class="spec-label">速度</div><div class="spec-val">${d?d.vel:'7.66'} km/s</div></div>
    </div>
    <div style="font-size:10px;color:#66aaa0;margin-top:12px">
      <span style="color:${hex}">●</span> 轨道倾角 ${s.inc}° | RAAN ${s.raan}° | 纬度 ${d?d.lat.toFixed(2)+'°':'--'}
    </div>
  `;
  ov.classList.add('show');
};

window.closeDetail = function(){
  document.getElementById('detail').classList.remove('show');
};

// ============================================================
// ANIMATE
// ============================================================
function animate() {
  requestAnimationFrame(animate);
  if(cloudsMesh) cloudsMesh.rotation.y += 0.0001;
  updateCamera();
  renderer.render(scene, camera);
}

init();
