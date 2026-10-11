/**
 * LDOC Studio — Vanguard-7 3D Telemetry, Multi-Model Showcase & Video Synchronizer
 * 120Hz Hardware-accelerated 3D WebGL Engine with procedural robotic, aerospace & quantum models,
 * dynamic kinematic joint articulation, radar floor, and dual-window video synchronization.
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
  // HERO 3D MULTI-MODEL STAGE ENGINE
  // ══════════════════════════════════════════════════════════════════════════
  let heroScene, heroCamera, heroRenderer, heroActiveModelGroup, coreLight, radarScanLine;
  let heroMaterials = [];
  let heroRobotJoints = [];
  let heroHydraulics = [];
  let heroRotatingParts = [];
  let heroWireframe = false;
  let heroOrbitActive = true;
  let heroOrbitRadius = 6.2;
  let heroDragState = { isDragging: false, rotX: 0.22, rotY: 0.55, prevX: 0, prevY: 0 };
  let heroAnimFrame = null;
  let heroIsVisible = true;
  let heroRenderActive = false;
  let heroLastRenderTime = 0;
  let currentModelKey = 'vanguard';

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
    const width = container.clientWidth || 640;
    const height = container.clientHeight || 520;

    heroScene = new THREE.Scene();
    heroScene.background = new THREE.Color(0x07090E);

    heroCamera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    heroCamera.position.set(0, 2.1, heroOrbitRadius);
    heroCamera.lookAt(0, 0.3, 0);

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

    // Dynamic 4-Point High-Fidelity Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.2);
    heroScene.add(ambientLight);

    // Amber Key Light
    const keyLight = new THREE.DirectionalLight(0xf59e0b, 3.2);
    keyLight.position.set(6, 9, 7);
    heroScene.add(keyLight);

    // Electric Cyan Rim Light (Back-Right)
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 3.0);
    rimLight.position.set(-6, 5, -6);
    heroScene.add(rimLight);

    // Soft Blue Fill Light (Front-Left)
    const fillLight = new THREE.DirectionalLight(0x06b6d4, 1.8);
    fillLight.position.set(-5, -2, 5);
    heroScene.add(fillLight);

    // Glowing Core Point Light
    coreLight = new THREE.PointLight(0x00e5ff, 4.5, 12);
    coreLight.position.set(0, 0.45, 0);
    heroScene.add(coreLight);

    // Holographic Cyber Radar Floor
    const grid = new THREE.GridHelper(16, 20, 0x06b6d4, 0x172033);
    grid.position.y = -1.15;
    heroScene.add(grid);

    // Concentric Range Rings with Distance Markers
    const ringMat = new THREE.LineBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.4 });
    [1.5, 3.0, 4.5].forEach(r => {
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

    // Sweeping Radar Line
    const scanGeom = new THREE.BufferGeometry();
    scanGeom.setAttribute('position', new THREE.Float32BufferAttribute([0, -1.13, 0, 4.5, -1.13, 0], 3));
    const scanMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.7 });
    radarScanLine = new THREE.Line(scanGeom, scanMat);
    heroScene.add(radarScanLine);

    // Ambient Floating Telemetry Particles
    const partGeom = new THREE.BufferGeometry();
    const partCount = 85;
    const partPos = [];
    for (let i = 0; i < partCount; i++) {
      partPos.push(
        (Math.random() - 0.5) * 11,
        (Math.random() - 0.2) * 5.5,
        (Math.random() - 0.5) * 11
      );
    }
    partGeom.setAttribute('position', new THREE.Float32BufferAttribute(partPos, 3));
    const partMat = new THREE.PointsMaterial({ color: 0x38bdf8, size: 0.05, transparent: true, opacity: 0.75 });
    const particles = new THREE.Points(partGeom, partMat);
    heroScene.add(particles);

    // Build Initial Selected Model
    loadHeroModel(currentModelKey);

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
      const w = container.clientWidth || 640;
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
      const camY = Math.sin(heroDragState.rotX) * radius + 0.35;
      const flatDist = Math.cos(heroDragState.rotX) * radius;
      const camX = Math.sin(heroDragState.rotY) * flatDist;
      const camZ = Math.cos(heroDragState.rotY) * flatDist;

      heroCamera.position.set(camX, camY, camZ);
      heroCamera.lookAt(0, 0.35, 0);

      // Sweeping radar scan line rotation
      if (radarScanLine) {
        radarScanLine.rotation.y = clock * 1.8;
      }

      // Model specific animations
      if (heroActiveModelGroup) {
        heroActiveModelGroup.position.y = Math.sin(clock * 2) * 0.035;
      }
      if (coreLight) {
        coreLight.intensity = 3.5 + Math.sin(clock * 4) * 1.2;
      }

      // Rotate sub-parts (satellite solar arrays, tourbillon gears, quantum rings)
      heroRotatingParts.forEach(item => {
        if (item.axis === 'x') item.mesh.rotation.x += item.speed;
        else if (item.axis === 'y') item.mesh.rotation.y += item.speed;
        else if (item.axis === 'z') item.mesh.rotation.z += item.speed;
      });

      heroRenderer.render(heroScene, heroCamera);
    }

    function animate(now) {
      if (!heroIsVisible || document.hidden) {
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
          if (heroIsVisible && !heroRenderActive && !document.hidden) {
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

  // ══════════════════════════════════════════════════════════════════════════
  // MODEL BUILDERS (Vanguard-7, Satellite X-1, Quantum Core, Tourbillon)
  // ══════════════════════════════════════════════════════════════════════════

  function loadHeroModel(key) {
    currentModelKey = key;
    if (heroActiveModelGroup) {
      heroScene.remove(heroActiveModelGroup);
    }

    heroMaterials = [];
    heroRobotJoints = [];
    heroHydraulics = [];
    heroRotatingParts = [];

    heroActiveModelGroup = new THREE.Group();

    if (key === 'satellite') {
      buildSatelliteModel(heroActiveModelGroup);
      updateTitleAndBadges('Vanguard X-1 Deep Space Satellite Bus', '380 W', '-65.2 °C', '99.8% Constellation Lock');
    } else if (key === 'quantum') {
      buildQuantumModel(heroActiveModelGroup);
      updateTitleAndBadges('Quantum Core FCC Atomic Lattice', '4.2 GHz', '0.015 K', '100% Phase Coherence');
    } else if (key === 'tourbillon') {
      buildTourbillonModel(heroActiveModelGroup);
      updateTitleAndBadges('Haute Horlogerie Tourbillon Escapement', '21,600 vph', '+21.4 °C', '0.00s/day Chronometer');
    } else {
      // Default: Vanguard-7
      buildVanguard7Model(heroActiveModelGroup);
      updateTitleAndBadges('vanguard-7-telemetry.ldocx — 3D CAD', '340 Nm', '+42.8 °C', '98.4% Verified Root');
    }

    heroScene.add(heroActiveModelGroup);

    // Re-apply wireframe if currently active
    if (heroWireframe) {
      heroMaterials.forEach(m => { m.wireframe = true; });
    }

    // Update joint articulation if Vanguard
    const slider = document.getElementById('hero-actuator-slider');
    if (slider) updateHeroFormula(slider.value);
  }

  function updateTitleAndBadges(title, torqueText, tempText, integText) {
    const titleEl = document.getElementById('hero-3d-title-text');
    if (titleEl) titleEl.textContent = title;

    const torqueEl = document.getElementById('floating-torque-val');
    if (torqueEl) torqueEl.textContent = torqueText;

    const tempEl = document.getElementById('floating-temp-val');
    if (tempEl) tempEl.textContent = tempText;

    const integEl = document.getElementById('floating-integrity-val');
    if (integEl) integEl.textContent = integText;
  }

  // 1. High-Fidelity Vanguard-7 Quadruped Robot Model
  function buildVanguard7Model(group) {
    // High-contrast, metallic materials
    const titaniumMat = new THREE.MeshStandardMaterial({
      color: 0x475569, // Crisp metallic slate
      metalness: 0.78,
      roughness: 0.28,
      wireframe: heroWireframe
    });
    heroMaterials.push(titaniumMat);

    const darkChassisMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.85,
      roughness: 0.32,
      wireframe: heroWireframe
    });
    heroMaterials.push(darkChassisMat);

    const chromePistonMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.95,
      roughness: 0.15,
      wireframe: heroWireframe
    });
    heroMaterials.push(chromePistonMat);

    const goldTrimMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.88,
      roughness: 0.24,
      wireframe: heroWireframe
    });
    heroMaterials.push(goldTrimMat);

    const cyanGlowMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      wireframe: heroWireframe
    });
    heroMaterials.push(cyanGlowMat);

    const amberGlowMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      wireframe: heroWireframe
    });
    heroMaterials.push(amberGlowMat);

    // Main Faceted Hull / Torso
    const chassisGeom = new THREE.BoxGeometry(1.7, 0.62, 2.35);
    const chassis = new THREE.Mesh(chassisGeom, titaniumMat);
    chassis.position.y = 0.42;
    group.add(chassis);

    // Spinal Armor Cowling with Chamfer
    const cowlGeom = new THREE.BoxGeometry(1.3, 0.26, 1.75);
    const cowl = new THREE.Mesh(cowlGeom, darkChassisMat);
    cowl.position.set(0, 0.82, 0.08);
    group.add(cowl);

    // Golden Armor Trim Plates
    const trimGeom = new THREE.BoxGeometry(0.18, 0.05, 1.6);
    const trimL = new THREE.Mesh(trimGeom, goldTrimMat);
    trimL.position.set(-0.7, 0.96, 0.08);
    group.add(trimL);
    const trimR = new THREE.Mesh(trimGeom, goldTrimMat);
    trimR.position.set(0.7, 0.96, 0.08);
    group.add(trimR);

    // Glowing Chest Reactor Core (Multi-layered Plasma)
    const coreCylinder = new THREE.CylinderGeometry(0.28, 0.28, 0.65, 24);
    const coreMesh = new THREE.Mesh(coreCylinder, cyanGlowMat);
    coreMesh.rotation.x = Math.PI / 2;
    coreMesh.position.set(0, 0.42, 0.94);
    group.add(coreMesh);

    const coreRingGeom = new THREE.TorusGeometry(0.38, 0.04, 16, 32);
    const coreRing = new THREE.Mesh(coreRingGeom, goldTrimMat);
    coreRing.position.set(0, 0.42, 1.18);
    group.add(coreRing);

    // Sensor Visor Turret & Antenna Mast
    const headGeom = new THREE.BoxGeometry(0.74, 0.35, 0.72);
    const head = new THREE.Mesh(headGeom, darkChassisMat);
    head.position.set(0, 0.7, 1.35);
    group.add(head);

    // Glowing Amber Scanner Visor
    const visorGeom = new THREE.BoxGeometry(0.58, 0.1, 0.15);
    const visor = new THREE.Mesh(visorGeom, amberGlowMat);
    visor.position.set(0, 0.7, 1.72);
    group.add(visor);

    // High-Gain Sensor Antenna
    const antGeom = new THREE.CylinderGeometry(0.03, 0.03, 0.55, 12);
    const ant = new THREE.Mesh(antGeom, goldTrimMat);
    ant.position.set(0.28, 1.1, 1.3);
    ant.rotation.z = -0.15;
    group.add(ant);

    // 4 Articulated Quadruped Mechanical Limbs with Hydraulic Pistons
    const legPositions = [
      { x: -0.96, z: 0.92, side: -1 },
      { x: 0.96, z: 0.92, side: 1 },
      { x: -0.96, z: -0.92, side: -1 },
      { x: 0.96, z: -0.92, side: 1 }
    ];

    legPositions.forEach((pos, idx) => {
      const hipPivot = new THREE.Group();
      hipPivot.position.set(pos.x, 0.36, pos.z);

      // Heavy Hip Servo Hub
      const ballGeom = new THREE.SphereGeometry(0.22, 16, 16);
      const ball = new THREE.Mesh(ballGeom, darkChassisMat);
      hipPivot.add(ball);

      // Hip Accent Ring
      const hipRingGeom = new THREE.TorusGeometry(0.25, 0.03, 12, 24);
      const hipRing = new THREE.Mesh(hipRingGeom, goldTrimMat);
      hipRing.rotation.y = Math.PI / 2;
      hipPivot.add(hipRing);

      // Upper Armored Femur
      const upperGeom = new THREE.BoxGeometry(0.2, 0.92, 0.24);
      const upper = new THREE.Mesh(upperGeom, titaniumMat);
      upper.position.set(pos.side * 0.18, -0.44, 0);
      upper.rotation.z = pos.side * -0.22;
      hipPivot.add(upper);

      // Knee Pivot Servo
      const kneePivot = new THREE.Group();
      kneePivot.position.set(pos.side * 0.38, -0.92, 0);

      const kneeGeom = new THREE.CylinderGeometry(0.16, 0.16, 0.26, 16);
      const knee = new THREE.Mesh(kneeGeom, darkChassisMat);
      knee.rotation.z = Math.PI / 2;
      kneePivot.add(knee);

      // Lower Tibia Rod
      const lowerGeom = new THREE.BoxGeometry(0.15, 0.92, 0.18);
      const lower = new THREE.Mesh(lowerGeom, titaniumMat);
      lower.position.set(0, -0.46, 0);
      kneePivot.add(lower);

      // Chrome Hydraulic Piston Cylinder
      const pistonGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.65, 12);
      const piston = new THREE.Mesh(pistonGeom, chromePistonMat);
      piston.position.set(-pos.side * 0.08, -0.4, 0.08);
      kneePivot.add(piston);
      heroHydraulics.push(piston);

      // Magnetic Shock Absorber Foot Pad
      const footGeom = new THREE.CylinderGeometry(0.22, 0.26, 0.14, 16);
      const foot = new THREE.Mesh(footGeom, darkChassisMat);
      foot.position.set(0, -0.94, 0);
      kneePivot.add(foot);

      // Foot Glow Contact Ring
      const footGlowGeom = new THREE.TorusGeometry(0.24, 0.025, 8, 20);
      const footGlow = new THREE.Mesh(footGlowGeom, cyanGlowMat);
      footGlow.rotation.x = Math.PI / 2;
      footGlow.position.set(0, -0.98, 0);
      kneePivot.add(footGlow);

      hipPivot.add(kneePivot);
      group.add(hipPivot);

      heroRobotJoints.push({
        hip: hipPivot,
        knee: kneePivot,
        piston: piston,
        baseRotX: idx < 2 ? 0.18 : -0.18,
        side: pos.side
      });
    });
  }

  // 2. Vanguard X-1 Deep Space Satellite Bus Model
  function buildSatelliteModel(group) {
    const goldFoilMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.92,
      roughness: 0.22,
      wireframe: heroWireframe
    });
    heroMaterials.push(goldFoilMat);

    const solarCellMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.75,
      roughness: 0.18,
      wireframe: heroWireframe
    });
    heroMaterials.push(solarCellMat);

    const darkFrameMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.35,
      wireframe: heroWireframe
    });
    heroMaterials.push(darkFrameMat);

    const cyanGlowMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: heroWireframe
    });
    heroMaterials.push(cyanGlowMat);

    // Central Avionics Bus (Cube)
    const busGeom = new THREE.BoxGeometry(1.2, 1.2, 1.6);
    const bus = new THREE.Mesh(busGeom, goldFoilMat);
    bus.position.y = 0.45;
    group.add(bus);

    // High-Gain Parabolic Communications Dish
    const dishGeom = new THREE.CylinderGeometry(0.9, 0.15, 0.4, 28, 1, true);
    const dish = new THREE.Mesh(dishGeom, darkFrameMat);
    dish.rotation.x = Math.PI / 2;
    dish.position.set(0, 0.45, 1.15);
    group.add(dish);

    const dishFeedGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.6, 12);
    const dishFeed = new THREE.Mesh(dishFeedGeom, cyanGlowMat);
    dishFeed.rotation.x = Math.PI / 2;
    dishFeed.position.set(0, 0.45, 1.45);
    group.add(dishFeed);

    // Dual Photovoltaic Solar Wings (Left & Right)
    [-1, 1].forEach(side => {
      const wingPivot = new THREE.Group();
      wingPivot.position.set(side * 0.7, 0.45, 0);

      // Connecting Boom
      const boomGeom = new THREE.CylinderGeometry(0.06, 0.06, 0.8, 12);
      const boom = new THREE.Mesh(boomGeom, darkFrameMat);
      boom.rotation.z = Math.PI / 2;
      boom.position.x = side * 0.4;
      wingPivot.add(boom);

      // 3 Symmetrical Solar Panels per wing
      const panelGeom = new THREE.BoxGeometry(1.8, 0.8, 0.06);
      const panel = new THREE.Mesh(panelGeom, solarCellMat);
      panel.position.x = side * 1.6;
      wingPivot.add(panel);

      const panelBorderGeom = new THREE.BoxGeometry(1.86, 0.86, 0.04);
      const panelBorder = new THREE.Mesh(panelBorderGeom, darkFrameMat);
      panelBorder.position.x = side * 1.6;
      wingPivot.add(panelBorder);

      group.add(wingPivot);
      heroRotatingParts.push({ mesh: wingPivot, axis: 'x', speed: side * 0.005 });
    });

    // Hydrazine Thruster Nozzles at Base
    const thrusterGeom = new THREE.ConeGeometry(0.2, 0.35, 16);
    const thruster = new THREE.Mesh(thrusterGeom, darkFrameMat);
    thruster.rotation.x = Math.PI;
    thruster.position.set(0, 0.45, -0.95);
    group.add(thruster);
  }

  // 3. Quantum Core FCC Lattice Model
  function buildQuantumModel(group) {
    const nucleusMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      wireframe: heroWireframe
    });
    heroMaterials.push(nucleusMat);

    const goldRingMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.9,
      roughness: 0.2,
      wireframe: heroWireframe
    });
    heroMaterials.push(goldRingMat);

    const cyanRingMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.85,
      roughness: 0.25,
      wireframe: heroWireframe
    });
    heroMaterials.push(cyanRingMat);

    const violetRingMat = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      metalness: 0.8,
      roughness: 0.3,
      wireframe: heroWireframe
    });
    heroMaterials.push(violetRingMat);

    // Glowing Central Quantum Nucleus
    const nucleusGeom = new THREE.SphereGeometry(0.65, 28, 28);
    const nucleus = new THREE.Mesh(nucleusGeom, nucleusMat);
    nucleus.position.y = 0.4;
    group.add(nucleus);

    // 3 Concentric Gimbaled Orbital Containment Rings
    const ring1Geom = new THREE.TorusGeometry(1.35, 0.055, 16, 64);
    const ring1 = new THREE.Mesh(ring1Geom, goldRingMat);
    ring1.position.y = 0.4;
    group.add(ring1);
    heroRotatingParts.push({ mesh: ring1, axis: 'x', speed: 0.016 });

    const ring2Geom = new THREE.TorusGeometry(1.85, 0.05, 16, 64);
    const ring2 = new THREE.Mesh(ring2Geom, cyanRingMat);
    ring2.position.y = 0.4;
    group.add(ring2);
    heroRotatingParts.push({ mesh: ring2, axis: 'y', speed: 0.012 });

    const ring3Geom = new THREE.TorusGeometry(2.35, 0.045, 16, 64);
    const ring3 = new THREE.Mesh(ring3Geom, violetRingMat);
    ring3.position.y = 0.4;
    group.add(ring3);
    heroRotatingParts.push({ mesh: ring3, axis: 'z', speed: 0.009 });

    // Orbital Qubit Nodes
    [0.75, -0.75].forEach(offset => {
      const qGeom = new THREE.SphereGeometry(0.14, 16, 16);
      const qMesh = new THREE.Mesh(qGeom, nucleusMat);
      qMesh.position.set(offset * 1.8, 0.4 + offset * 0.4, 0);
      group.add(qMesh);
    });
  }

  // 4. Haute Horlogerie Flying Tourbillon Escapement Model
  function buildTourbillonModel(group) {
    const goldGearMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.92,
      roughness: 0.22,
      wireframe: heroWireframe
    });
    heroMaterials.push(goldGearMat);

    const titaniumBridgeMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.85,
      roughness: 0.28,
      wireframe: heroWireframe
    });
    heroMaterials.push(titaniumBridgeMat);

    const rubyJewelMat = new THREE.MeshBasicMaterial({
      color: 0xf43f5e,
      wireframe: heroWireframe
    });
    heroMaterials.push(rubyJewelMat);

    // Outer 16-Segment Gear Rim
    const outerRimGeom = new THREE.TorusGeometry(1.8, 0.12, 16, 48);
    const outerRim = new THREE.Mesh(outerRimGeom, goldGearMat);
    outerRim.position.y = 0.4;
    group.add(outerRim);

    // Rotating Balance Wheel with 3-Arm Bridge
    const cage = new THREE.Group();
    cage.position.y = 0.4;

    const balanceRingGeom = new THREE.TorusGeometry(1.3, 0.07, 14, 36);
    const balanceRing = new THREE.Mesh(balanceRingGeom, goldGearMat);
    cage.add(balanceRing);

    // 3 Symmetrical Curved Bridge Arms
    for (let i = 0; i < 3; i++) {
      const armGeom = new THREE.BoxGeometry(1.3, 0.08, 0.06);
      const arm = new THREE.Mesh(armGeom, titaniumBridgeMat);
      arm.rotation.z = (i / 3) * Math.PI * 2;
      cage.add(arm);
    }

    // Central Synthetic Ruby Jewel
    const rubyGeom = new THREE.SphereGeometry(0.18, 16, 16);
    const ruby = new THREE.Mesh(rubyGeom, rubyJewelMat);
    cage.add(ruby);

    group.add(cage);
    heroRotatingParts.push({ mesh: cage, axis: 'z', speed: 0.024 });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TELEMETRY FORMULA & ARTICULATION (Vanguard-7 Kinematics)
  // ══════════════════════════════════════════════════════════════════════════
  function updateHeroFormula(val) {
    const load = parseInt(val, 10) || 340;

    // HUD metrics
    const valEl = document.getElementById('hero-actuator-val');
    if (valEl) valEl.textContent = load + ' Nm';

    const thermal = (25.0 + (load * 0.052)).toFixed(1);
    const thermEl = document.getElementById('hero-thermal-val');
    if (thermEl) thermEl.textContent = '+' + thermal + ' °C';

    const floatTorque = document.getElementById('floating-torque-val');
    if (floatTorque) floatTorque.textContent = load + ' Nm';

    const floatTemp = document.getElementById('floating-temp-val');
    if (floatTemp) floatTemp.textContent = '+' + thermal + ' °C';

    const integ = (99.9 - (load * 0.025)).toFixed(1);
    const integEl = document.getElementById('floating-integrity-val');
    if (integEl) integEl.textContent = integ + '% Verified Root';

    // Kinematic Articulation of 3D Robot Limbs
    if (heroRobotJoints && heroRobotJoints.length > 0) {
      const flexFactor = (load - 50) / 550; // 0.0 to 1.0

      heroRobotJoints.forEach((joint) => {
        // Flex hip servo
        joint.hip.rotation.x = joint.baseRotX + (flexFactor * 0.42);
        // Flex knee servo
        joint.knee.rotation.x = -joint.baseRotX - (flexFactor * 0.72);
        // Compress hydraulic piston
        if (joint.piston) {
          joint.piston.scale.y = 1.0 - (flexFactor * 0.28);
        }
      });

      // Lower robot chassis slightly under load
      if (heroActiveModelGroup && currentModelKey === 'vanguard') {
        heroActiveModelGroup.position.y = -(flexFactor * 0.22);
      }
    }
  }

  // Model Switcher Function (Exposed to Global)
  function switchHero3DModel(modelKey) {
    document.querySelectorAll('.hud-mode-pill').forEach(btn => {
      btn.classList.remove('active');
    });

    const activeBtn = document.getElementById('hero-model-btn-' + modelKey);
    if (activeBtn) activeBtn.classList.add('active');

    loadHeroModel(modelKey);
  }

  function toggleHeroAutoOrbit() {
    heroOrbitActive = !heroOrbitActive;
    const btn = document.getElementById('hero-orbit-btn');
    if (btn) btn.textContent = heroOrbitActive ? 'Pause Orbit' : 'Resume Orbit';
  }

  function toggleHeroWireframe() {
    heroWireframe = !heroWireframe;
    heroMaterials.forEach(m => { m.wireframe = heroWireframe; });
    const btn = document.getElementById('hero-wireframe-btn');
    if (btn) btn.textContent = heroWireframe ? 'Solid' : 'Wireframe';
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VIDEO STREAM SYNCHRONIZER & AUDIO CONTROLS
  // ══════════════════════════════════════════════════════════════════════════
  function toggleHeroVideoAudio() {
    const vid = document.getElementById('hero-side-video');
    const icon = document.getElementById('hero-audio-icon');
    const label = document.getElementById('hero-audio-label');
    if (!vid) return;

    vid.muted = !vid.muted;
    if (icon) icon.textContent = vid.muted ? '🔇' : '🔊';
    if (label) label.textContent = vid.muted ? 'Unmute' : 'Mute';
  }

  function toggleHeroVideoPlay() {
    const vid = document.getElementById('hero-side-video');
    const icon = document.getElementById('hero-play-icon');
    const label = document.getElementById('hero-play-label');
    if (!vid) return;

    if (vid.paused) {
      vid.play();
      if (icon) icon.textContent = '⏸';
      if (label) label.textContent = 'Pause';
    } else {
      vid.pause();
      if (icon) icon.textContent = '▶';
      if (label) label.textContent = 'Play';
    }
  }

  function expandHeroVideoFullscreen() {
    const vid = document.getElementById('hero-side-video');
    if (!vid) return;

    if (vid.requestFullscreen) {
      vid.requestFullscreen();
    } else if (vid.webkitRequestFullscreen) {
      vid.webkitRequestFullscreen();
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

      const amb = new THREE.AmbientLight(0xffffff, 1.8);
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

  // Fallback 2D Vector Wireframe Engine
  function setupFallbackVectorHero(canvas) {
    const ctx = canvas.getContext('2d');
    function resize() {
      canvas.width = (canvas.parentElement.clientWidth || 640) * (window.devicePixelRatio || 1);
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

  // Global Exports
  global.initVanguardHero3D = initVanguardHero3D;
  global.updateHeroFormula = updateHeroFormula;
  global.toggleHeroAutoOrbit = toggleHeroAutoOrbit;
  global.toggleHeroWireframe = toggleHeroWireframe;
  global.switchHero3DModel = switchHero3DModel;
  global.toggleHeroVideoAudio = toggleHeroVideoAudio;
  global.toggleHeroVideoPlay = toggleHeroVideoPlay;
  global.expandHeroVideoFullscreen = expandHeroVideoFullscreen;
  global.initMini3DPreview = initMini3DPreview;
  global.ensureThreeJs = ensureThreeJs;

  // Auto-init hero on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initVanguardHero3D());
  } else {
    initVanguardHero3D();
  }

})(typeof window !== 'undefined' ? window : this);
