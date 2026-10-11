/**
 * LDOC Studio — Vanguard-7 3D Telemetry & WebGL Engine
 * 120Hz Hardware-accelerated 3D Robotic CAD model, dynamic joint articulation,
 * radar grid, telemetry HUD formulas, and multi-surface 3D preview engine.
 * Fully air-gapped: zero external CDN dependencies, bundled with local Three.js.
 */

(function (global) {
  'use strict';

  let threeJsLoaded = false;
  let threeJsLoading = false;
  const threeCallbacks = [];

  function ensureThreeJs(callback) {
    if (typeof THREE !== 'undefined') {
      threeJsLoaded = true;
      if (callback) callback();
      return;
    }
    if (callback) threeCallbacks.push(callback);
    if (threeJsLoading) return;
    threeJsLoading = true;

    function onLoaded() {
      threeJsLoaded = true;
      threeJsLoading = false;
      while (threeCallbacks.length > 0) {
        const cb = threeCallbacks.shift();
        try { cb(); } catch (err) { console.error('Three.js callback error:', err); }
      }
    }

    // Load from local server first
    const script = document.createElement('script');
    script.src = '/three.min.js';
    script.onload = onLoaded;
    script.onerror = () => {
      // CDN fallback
      const cdn = document.createElement('script');
      cdn.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      cdn.onload = onLoaded;
      cdn.onerror = () => {
        threeJsLoading = false;
        console.warn('Three.js failed to load from local and CDN.');
      };
      document.head.appendChild(cdn);
    };
    document.head.appendChild(script);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HERO VANGUARD-7 3D STAGE CONTROLLER
  // ══════════════════════════════════════════════════════════════════════════
  let heroScene, heroCamera, heroRenderer, heroRobotGroup, coreLight;
  let heroMaterials = [];
  let heroRobotJoints = [];
  let heroWireframe = false;
  let heroOrbitActive = true;
  let heroOrbitRadius = 6.2;
  let heroDragState = { isDragging: false, rotX: 0.25, rotY: 0.6, prevX: 0, prevY: 0 };
  let heroAnimFrame = null;
  let heroIsVisible = true;
  let heroRenderActive = false;
  let heroLastRenderTime = 0;
  let currentHeroMode = '3d';

  function initVanguardHero3D(canvasId = 'hero-real-3d-canvas') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    if (canvas.dataset.initialized === 'true') return;

    ensureThreeJs(() => {
      canvas.dataset.initialized = 'true';
      setupThreeHero(canvas);
    });
  }

  function setupThreeHero(canvas) {
    const container = canvas.parentElement;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 520;

    heroScene = new THREE.Scene();
    heroScene.background = new THREE.Color(0x080A10);

    heroCamera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    heroCamera.position.set(0, 2.2, heroOrbitRadius);
    heroCamera.lookAt(0, 0.35, 0);

    try {
      heroRenderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance'
      });
      heroRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.0));
      heroRenderer.setSize(width, height);
    } catch (e) {
      console.warn('WebGL initialization failed, falling back to 2D vector wireframe:', e);
      setupFallbackVectorHero(canvas);
      return;
    }

    // Dynamic Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.8);
    heroScene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x38bdf8, 3.0);
    keyLight.position.set(6, 10, 7);
    heroScene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xf59e0b, 2.2);
    fillLight.position.set(-6, 4, -4);
    heroScene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x06b6d4, 1.8);
    rimLight.position.set(0, -4, -6);
    heroScene.add(rimLight);

    coreLight = new THREE.PointLight(0x38bdf8, 4.0, 10);
    coreLight.position.set(0, 0.45, 0);
    heroScene.add(coreLight);

    // Radar Hex/Grid Floor
    const grid = new THREE.GridHelper(16, 18, 0x06b6d4, 0x1e2638);
    grid.position.y = -1.15;
    heroScene.add(grid);

    // Concentric Range Rings
    const ringMat = new THREE.LineBasicMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0.35 });
    [1.6, 3.2, 4.8].forEach(r => {
      const segs = 64;
      const ringGeom = new THREE.BufferGeometry();
      const pts = [];
      for (let i = 0; i <= segs; i++) {
        const theta = (i / segs) * Math.PI * 2;
        pts.push(Math.cos(theta) * r, -1.14, Math.sin(theta) * r);
      }
      ringGeom.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      heroScene.add(new THREE.Line(ringGeom, ringMat));
    });

    // Robotic Model Construction
    heroRobotGroup = new THREE.Group();
    heroMaterials = [];
    heroRobotJoints = [];

    const armorMat = new THREE.MeshStandardMaterial({
      color: 0x161C2C,
      metalness: 0.85,
      roughness: 0.22,
      wireframe: heroWireframe
    });
    heroMaterials.push(armorMat);

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x2A374E,
      metalness: 0.9,
      roughness: 0.28,
      wireframe: heroWireframe
    });
    heroMaterials.push(frameMat);

    const cyanGlowMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      wireframe: heroWireframe
    });
    heroMaterials.push(cyanGlowMat);

    const amberGlowMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      wireframe: heroWireframe
    });
    heroMaterials.push(amberGlowMat);

    // Torso / Chassis
    const chassisGeom = new THREE.BoxGeometry(1.65, 0.58, 2.3);
    const chassis = new THREE.Mesh(chassisGeom, armorMat);
    chassis.position.y = 0.42;
    heroRobotGroup.add(chassis);

    // Armored Top Cowling with Chamfer
    const cowlGeom = new THREE.BoxGeometry(1.25, 0.24, 1.7);
    const cowl = new THREE.Mesh(cowlGeom, frameMat);
    cowl.position.set(0, 0.78, 0.1);
    heroRobotGroup.add(cowl);

    // Glowing Chest Reactor Core
    const coreGeom = new THREE.CylinderGeometry(0.26, 0.26, 0.6, 20);
    const coreMesh = new THREE.Mesh(coreGeom, cyanGlowMat);
    coreMesh.rotation.x = Math.PI / 2;
    coreMesh.position.set(0, 0.42, 0.9);
    heroRobotGroup.add(coreMesh);

    // Sensor Visor Turret
    const headGeom = new THREE.BoxGeometry(0.7, 0.32, 0.65);
    const head = new THREE.Mesh(headGeom, armorMat);
    head.position.set(0, 0.68, 1.3);
    heroRobotGroup.add(head);

    const visorGeom = new THREE.BoxGeometry(0.55, 0.09, 0.12);
    const visor = new THREE.Mesh(visorGeom, amberGlowMat);
    visor.position.set(0, 0.68, 1.63);
    heroRobotGroup.add(visor);

    // 4 Articulated Quadruped Legs
    const legPositions = [
      { x: -0.92, z: 0.92, side: -1 },
      { x: 0.92, z: 0.92, side: 1 },
      { x: -0.92, z: -0.92, side: -1 },
      { x: 0.92, z: -0.92, side: 1 }
    ];

    legPositions.forEach((pos, idx) => {
      const hipPivot = new THREE.Group();
      hipPivot.position.set(pos.x, 0.36, pos.z);

      const ballGeom = new THREE.SphereGeometry(0.2, 14, 14);
      const ball = new THREE.Mesh(ballGeom, frameMat);
      hipPivot.add(ball);

      const upperGeom = new THREE.BoxGeometry(0.18, 0.88, 0.22);
      const upper = new THREE.Mesh(upperGeom, armorMat);
      upper.position.set(pos.side * 0.16, -0.42, 0);
      upper.rotation.z = pos.side * -0.22;
      hipPivot.add(upper);

      const kneePivot = new THREE.Group();
      kneePivot.position.set(pos.side * 0.34, -0.88, 0);

      const kneeGeom = new THREE.CylinderGeometry(0.15, 0.15, 0.24, 14);
      const knee = new THREE.Mesh(kneeGeom, frameMat);
      knee.rotation.z = Math.PI / 2;
      kneePivot.add(knee);

      const lowerGeom = new THREE.BoxGeometry(0.13, 0.88, 0.17);
      const lower = new THREE.Mesh(lowerGeom, frameMat);
      lower.position.set(0, -0.44, 0);
      kneePivot.add(lower);

      const footGeom = new THREE.CylinderGeometry(0.2, 0.24, 0.12, 14);
      const foot = new THREE.Mesh(footGeom, armorMat);
      foot.position.set(0, -0.88, 0);
      kneePivot.add(foot);

      hipPivot.add(kneePivot);
      heroRobotGroup.add(hipPivot);

      heroRobotJoints.push({ hip: hipPivot, knee: kneePivot, baseRotX: idx < 2 ? 0.18 : -0.18 });
    });

    // Particle Swarm
    const partGeom = new THREE.BufferGeometry();
    const partCount = 70;
    const partPos = [];
    for (let i = 0; i < partCount; i++) {
      partPos.push(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.2) * 5,
        (Math.random() - 0.5) * 10
      );
    }
    partGeom.setAttribute('position', new THREE.Float32BufferAttribute(partPos, 3));
    const partMat = new THREE.PointsMaterial({ color: 0x38bdf8, size: 0.05, transparent: true, opacity: 0.65 });
    const particles = new THREE.Points(partGeom, partMat);
    heroScene.add(particles);

    heroScene.add(heroRobotGroup);

    // Interactive Drag Controls
    canvas.addEventListener('mousedown', (e) => {
      heroDragState.isDragging = true;
      heroDragState.prevX = e.clientX;
      heroDragState.prevY = e.clientY;
    });
    window.addEventListener('mouseup', () => { heroDragState.isDragging = false; });
    window.addEventListener('mousemove', (e) => {
      if (!heroDragState.isDragging) return;
      const dx = e.clientX - heroDragState.prevX;
      const dy = e.clientY - heroDragState.prevY;
      heroDragState.rotY += dx * 0.008;
      heroDragState.rotX = Math.max(-0.35, Math.min(0.75, heroDragState.rotX + dy * 0.006));
      heroDragState.prevX = e.clientX;
      heroDragState.prevY = e.clientY;
    });

    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        heroDragState.isDragging = true;
        heroDragState.prevX = e.touches[0].clientX;
        heroDragState.prevY = e.touches[0].clientY;
      }
    }, { passive: true });
    window.addEventListener('touchend', () => { heroDragState.isDragging = false; });
    window.addEventListener('touchmove', (e) => {
      if (!heroDragState.isDragging || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - heroDragState.prevX;
      const dy = e.touches[0].clientY - heroDragState.prevY;
      heroDragState.rotY += dx * 0.01;
      heroDragState.rotX = Math.max(-0.35, Math.min(0.75, heroDragState.rotX + dy * 0.008));
      heroDragState.prevX = e.touches[0].clientX;
      heroDragState.prevY = e.touches[0].clientY;
    }, { passive: true });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomDelta = e.deltaY * 0.005;
      heroOrbitRadius = Math.max(3.8, Math.min(10.5, heroOrbitRadius + zoomDelta));
    }, { passive: false });

    // Responsive Canvas Resizing
    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 520;
      heroCamera.aspect = w / h;
      heroCamera.updateProjectionMatrix();
      heroRenderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    // Animation & Render Loop
    let clock = 0;
    function renderHeroFrame() {
      clock += 0.016;
      if (heroOrbitActive && !heroDragState.isDragging) {
        heroDragState.rotY += 0.007;
      }
      const radius = heroOrbitRadius;
      const camY = Math.sin(heroDragState.rotX) * radius + 0.4;
      const flatDist = Math.cos(heroDragState.rotX) * radius;
      const camX = Math.sin(heroDragState.rotY) * flatDist;
      const camZ = Math.cos(heroDragState.rotY) * flatDist;

      heroCamera.position.set(camX, camY, camZ);
      heroCamera.lookAt(0, 0.35, 0);

      if (heroRobotGroup) {
        heroRobotGroup.position.y = Math.sin(clock * 2) * 0.035;
      }
      if (coreLight) {
        coreLight.intensity = 2.5 + Math.sin(clock * 4) * 0.9;
      }
      heroRenderer.render(heroScene, heroCamera);
    }

    function animate(now) {
      if (!heroIsVisible || document.hidden || currentHeroMode !== '3d') {
        heroRenderActive = false;
        return;
      }
      heroAnimFrame = requestAnimationFrame(animate);
      if (now && now - heroLastRenderTime < 16) return;
      heroLastRenderTime = now || 0;
      renderHeroFrame();
    }

    renderHeroFrame();
    heroRenderActive = true;
    heroAnimFrame = requestAnimationFrame(animate);

    // Visibility Observer to save GPU cycles when scrolled away
    if ('IntersectionObserver' in window) {
      const obs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          heroIsVisible = entry.isIntersecting;
          if (heroIsVisible && !heroRenderActive && !document.hidden && currentHeroMode === '3d') {
            heroRenderActive = true;
            heroAnimFrame = requestAnimationFrame(animate);
          } else if (!heroIsVisible) {
            heroRenderActive = false;
          }
        });
      }, { threshold: 0.05 });
      obs.observe(container);
    }

    // Initialize telemetry slider values
    const slider = document.getElementById('hero-actuator-slider');
    if (slider) updateHeroFormula(slider.value);
  }

  // Fallback 2D Vector Wireframe Engine
  function setupFallbackVectorHero(canvas) {
    const ctx = canvas.getContext('2d');
    function resize() {
      canvas.width = (canvas.parentElement.clientWidth || 800) * (window.devicePixelRatio || 1);
      canvas.height = (canvas.parentElement.clientHeight || 520) * (window.devicePixelRatio || 1);
    }
    resize();
    window.addEventListener('resize', resize);

    let rotY = 0.5, rotX = 0.3;
    const nodes = [
      [-1,-0.4,-1],[1,-0.4,-1],[1,0.4,-1],[-1,0.4,-1],
      [-1,-0.4,1],[1,-0.4,1],[1,0.4,1],[-1,0.4,1],
      [0,0.6,1.4],[0,-0.8,0]
    ];
    const links = [
      [0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],
      [0,4],[1,5],[2,6],[3,7],[2,8],[6,8],[3,8],[7,8],
      [0,9],[1,9],[4,9],[5,9]
    ];

    function loop() {
      if (currentHeroMode !== '3d') return;
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      if (heroOrbitActive) rotY += 0.012;

      const scale = Math.min(w, h) * 0.28;
      const cx = w / 2, cy = h / 2;
      const cy_cos = Math.cos(rotY), cy_sin = Math.sin(rotY);
      const cx_cos = Math.cos(rotX), cx_sin = Math.sin(rotX);

      const proj = nodes.map(n => {
        let x1 = n[0] * cy_cos + n[2] * cy_sin;
        let z1 = -n[0] * cy_sin + n[2] * cy_cos;
        let y2 = n[1] * cx_cos - z1 * cx_sin;
        let z2 = n[1] * cx_sin + z1 * cx_cos;
        const pz = 3.5 / (3.5 + z2);
        return { x: cx + x1 * scale * pz, y: cy + y2 * scale * pz };
      });

      ctx.strokeStyle = heroWireframe ? '#06b6d4' : '#38bdf8';
      ctx.lineWidth = 2;
      links.forEach(l => {
        ctx.beginPath();
        ctx.moveTo(proj[l[0]].x, proj[l[0]].y);
        ctx.lineTo(proj[l[1]].x, proj[l[1]].y);
        ctx.stroke();
      });
      requestAnimationFrame(loop);
    }
    loop();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TELEMETRY FORMULA & JOINT ARTICULATION ENGINE
  // ══════════════════════════════════════════════════════════════════════════
  function updateHeroFormula(val) {
    const load = parseInt(val, 10) || 340;

    // HUD metrics
    const valEl = document.getElementById('hero-actuator-val');
    if (valEl) valEl.textContent = load + ' Nm';

    const thermal = (25.0 + (load * 0.052)).toFixed(1);
    const thermEl = document.getElementById('hero-thermal-val');
    if (thermEl) thermEl.textContent = '+' + thermal + ' °C';

    const safety = Math.max(72.0, (100.0 - (load * 0.038))).toFixed(1);
    const safetyEl = document.getElementById('hero-safety-val');
    if (safetyEl) safetyEl.textContent = safety + '%';

    const vramEl = document.getElementById('hero-vram-val');
    if (vramEl) vramEl.textContent = (16.2 + (load / 600) * 4.2).toFixed(1) + ' MB';

    // Update Floating Glass Badges
    const floatTorque = document.getElementById('floating-torque-val');
    if (floatTorque) floatTorque.textContent = load + ' Nm';

    const floatTemp = document.getElementById('floating-temp-val');
    if (floatTemp) floatTemp.textContent = '+' + thermal + ' °C';

    const floatInteg = document.getElementById('floating-integrity-val');
    if (floatInteg) floatInteg.textContent = safety + '% Verified Root';

    // Physically articulate the 3D quadruped robotic limbs in real-time WebGL
    if (heroRobotJoints && heroRobotJoints.length > 0) {
      const norm = (load - 50) / 550; // 0.0 to 1.0
      heroRobotJoints.forEach(j => {
        if (j.hip && j.knee) {
          j.hip.rotation.x = j.baseRotX + (norm * 0.28);
          j.knee.rotation.x = -(norm * 0.48);
        }
      });
    }
  }

  function toggleHeroAutoOrbit() {
    heroOrbitActive = !heroOrbitActive;
    const btn = document.getElementById('hero-orbit-btn');
    if (btn) btn.textContent = heroOrbitActive ? 'Pause Orbit' : 'Resume Orbit';
  }

  function toggleHeroWireframe() {
    heroWireframe = !heroWireframe;
    if (heroMaterials && heroMaterials.length > 0) {
      heroMaterials.forEach(m => { m.wireframe = heroWireframe; });
    }
    const btn = document.getElementById('hero-wireframe-btn');
    if (btn) {
      btn.textContent = heroWireframe ? 'Solid Model' : 'Wireframe';
      btn.style.color = heroWireframe ? '#38bdf8' : '#cbd5e1';
    }
  }

  function switchHeroStageMode(mode) {
    currentHeroMode = mode;
    const canvas = document.getElementById('hero-real-3d-canvas');
    const hudTop = document.getElementById('hero-hud-top');
    const hudBottom = document.getElementById('hero-hud-bottom');
    const video = document.getElementById('hero-video-demo');
    const tab3d = document.getElementById('hero-tab-3d');
    const tabVid = document.getElementById('hero-tab-video');

    if (mode === '3d') {
      if (canvas) canvas.style.display = 'block';
      if (hudTop) hudTop.style.display = 'flex';
      if (hudBottom) hudBottom.style.display = 'flex';
      if (video) {
        video.style.display = 'none';
        video.pause();
      }
      if (tab3d) tab3d.classList.add('active');
      if (tabVid) tabVid.classList.remove('active');

      if (!heroRenderActive && heroIsVisible) {
        heroRenderActive = true;
        requestAnimationFrame(() => {
          if (heroRenderer && heroScene && heroCamera) {
            heroRenderer.render(heroScene, heroCamera);
          }
        });
      }
    } else {
      if (canvas) canvas.style.display = 'none';
      if (hudTop) hudTop.style.display = 'none';
      if (hudBottom) hudBottom.style.display = 'none';
      if (video) {
        video.style.display = 'block';
        video.play().catch(() => {});
      }
      if (tab3d) tab3d.classList.remove('active');
      if (tabVid) tabVid.classList.add('active');
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // EMBEDDED 3D MINI VIEWPORT ENGINE (For Format Spec, Features & Models)
  // ══════════════════════════════════════════════════════════════════════════
  const activeMiniInstances = new Map();

  function initMini3DPreview(canvasId, preset = 'avionics') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    ensureThreeJs(() => {
      const container = canvas.parentElement;
      const width = container.clientWidth || 320;
      const height = container.clientHeight || 240;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0a0d17);

      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      camera.position.set(0, 0, 3.8);

      let renderer;
      try {
        renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.0));
      } catch (e) {
        return;
      }

      const amb = new THREE.AmbientLight(0xffffff, 1.2);
      scene.add(amb);
      const dir = new THREE.DirectionalLight(0x38bdf8, 2.5);
      dir.position.set(3, 4, 3);
      scene.add(dir);
      const point = new THREE.PointLight(0xf59e0b, 2.0, 6);
      point.position.set(-2, -2, 2);
      scene.add(point);

      let geom, color;
      if (preset === 'avionics' || preset === 'actuator') {
        geom = new THREE.OctahedronGeometry(1.2, 1);
        color = 0x38bdf8;
      } else if (preset === 'crispr' || preset === 'biology') {
        geom = new THREE.TorusKnotGeometry(0.85, 0.28, 64, 12);
        color = 0x10b981;
      } else if (preset === 'robotics' || preset === 'cad') {
        geom = new THREE.DodecahedronGeometry(1.15, 1);
        color = 0xf59e0b;
      } else {
        geom = new THREE.IcosahedronGeometry(1.2, 1);
        color = 0xc084fc;
      }

      const mat = new THREE.MeshStandardMaterial({
        color: color,
        metalness: 0.8,
        roughness: 0.2,
        wireframe: false
      });
      const mesh = new THREE.Mesh(geom, mat);
      scene.add(mesh);

      // Radar wireframe floor
      const grid = new THREE.GridHelper(6, 8, 0x38bdf8, 0x1e293b);
      grid.position.y = -1.3;
      scene.add(grid);

      let animRunning = true;
      function animate() {
        if (!animRunning) return;
        requestAnimationFrame(animate);
        mesh.rotation.x += 0.008;
        mesh.rotation.y += 0.012;
        renderer.render(scene, camera);
      }
      animate();

      activeMiniInstances.set(canvasId, {
        scene, camera, renderer, mesh, mat,
        toggleWireframe: () => { mat.wireframe = !mat.wireframe; }
      });
    });
  }

  // Global Exports
  global.initVanguardHero3D = initVanguardHero3D;
  global.updateHeroFormula = updateHeroFormula;
  global.toggleHeroAutoOrbit = toggleHeroAutoOrbit;
  global.toggleHeroWireframe = toggleHeroWireframe;
  global.switchHeroStageMode = switchHeroStageMode;
  global.initMini3DPreview = initMini3DPreview;
  global.ensureThreeJs = ensureThreeJs;

  // Auto-init hero on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initVanguardHero3D());
  } else {
    initVanguardHero3D();
  }

})(typeof window !== 'undefined' ? window : this);
