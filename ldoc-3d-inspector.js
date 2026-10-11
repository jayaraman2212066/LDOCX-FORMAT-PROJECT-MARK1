/**
 * LDOCX Living Document Platform — 3D Scene Inspector & Exploded View Engine
 * Parametric Exploded Views, Scene Graph Hierarchy, Part Isolation, and 3D Pin Callouts
 * 
 * Works across:
 * - Three.js WebGL in Viewer & Studio
 * - Node.js headless testing environments (graceful fallback mocks)
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LDoc3DInspector = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. EXPLODED VIEW CONTROLLER
  // ─────────────────────────────────────────────────────────────────────────────

  class ExplodedViewController {
    constructor(rootObject, options) {
      this.rootObject = rootObject;
      this.options = Object.assign({
        multiplier: 1.5,
        axis: 'radial', // 'radial' | 'x' | 'y' | 'z'
        minFactor: 0.0,
        maxFactor: 1.0
      }, options || {});

      this.currentFactor = 0.0;
      this.meshStates = []; // { mesh, originalPos, explodeVector }
      this._initialized = false;

      if (rootObject) {
        this.init();
      }
    }

    /**
     * Initialize explosion state and cache original positions
     */
    init() {
      if (!this.rootObject) return;
      this.meshStates = [];

      // Determine center of root model if THREE is available
      let center = { x: 0, y: 0, z: 0 };
      const THREE = (typeof window !== 'undefined' && window.THREE) ||
                    (typeof global !== 'undefined' && global.THREE) || null;

      if (THREE && typeof THREE.Box3 === 'function') {
        const bbox = new THREE.Box3().setFromObject(this.rootObject);
        const centerVec = new THREE.Vector3();
        bbox.getCenter(centerVec);
        center = { x: centerVec.x, y: centerVec.y, z: centerVec.z };
      }

      // Traverse all descendant meshes
      if (typeof this.rootObject.traverse === 'function') {
        this.rootObject.traverse(obj => {
          if (obj.isMesh || obj.type === 'Mesh' || (obj.children && obj.children.length === 0)) {
            const origX = obj.position ? obj.position.x : 0;
            const origY = obj.position ? obj.position.y : 0;
            const origZ = obj.position ? obj.position.z : 0;

            // Compute explosion vector
            let vecX = 0, vecY = 0, vecZ = 0;
            if (this.options.axis === 'radial') {
              const dx = origX - center.x;
              const dy = origY - center.y;
              const dz = origZ - center.z;
              const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1.0;
              vecX = (dx / len) * this.options.multiplier;
              vecY = (dy / len) * this.options.multiplier;
              vecZ = (dz / len) * this.options.multiplier;
            } else if (this.options.axis === 'x') {
              vecX = (origX >= center.x ? 1 : -1) * this.options.multiplier;
            } else if (this.options.axis === 'y') {
              vecY = (origY >= center.y ? 1 : -1) * this.options.multiplier;
            } else if (this.options.axis === 'z') {
              vecZ = (origZ >= center.z ? 1 : -1) * this.options.multiplier;
            }

            this.meshStates.push({
              uuid: obj.uuid || ('mesh_' + this.meshStates.length),
              name: obj.name || ('Part ' + (this.meshStates.length + 1)),
              object: obj,
              originalPos: { x: origX, y: origY, z: origZ },
              explodeVector: { x: vecX, y: vecY, z: vecZ }
            });
          }
        });
      }

      this._initialized = true;
    }

    /**
     * Set explosion factor (0.0 = assembled, 1.0 = fully exploded)
     */
    setFactor(factor) {
      if (!this._initialized) this.init();
      const clamped = Math.max(this.options.minFactor, Math.min(this.options.maxFactor, factor));
      this.currentFactor = clamped;

      for (let i = 0; i < this.meshStates.length; i++) {
        const state = this.meshStates[i];
        if (state.object && state.object.position) {
          state.object.position.x = state.originalPos.x + state.explodeVector.x * clamped;
          state.object.position.y = state.originalPos.y + state.explodeVector.y * clamped;
          state.object.position.z = state.originalPos.z + state.explodeVector.z * clamped;
        }
      }
      return clamped;
    }

    getFactor() {
      return this.currentFactor;
    }

    /**
     * Reset to completely assembled state
     */
    reset() {
      return this.setFactor(0.0);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. SCENE HIERARCHY INSPECTOR & PART ISOLATION
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Extract clean, serializable scene hierarchy tree
   */
  function getSceneHierarchy(rootObject) {
    if (!rootObject) return null;

    function walk(obj) {
      const node = {
        uuid: obj.uuid || '',
        name: obj.name || (obj.type || 'Object3D'),
        type: obj.type || 'Object3D',
        visible: obj.visible !== false,
        isMesh: Boolean(obj.isMesh || obj.type === 'Mesh'),
        childCount: (obj.children || []).length,
        children: []
      };

      if (obj.children && obj.children.length > 0) {
        node.children = obj.children.map(walk);
      }
      return node;
    }

    return walk(rootObject);
  }

  /**
   * Isolate a single part or sub-assembly by UUID or name
   */
  function isolatePart(rootObject, uuidOrName) {
    if (!rootObject || !uuidOrName) return false;

    let targetFound = false;
    // Map to restore later
    if (!rootObject._previousVisibilities) {
      rootObject._previousVisibilities = new Map();
    }

    // First pass: locate target
    const targetUuids = new Set();
    if (typeof rootObject.traverse === 'function') {
      rootObject.traverse(obj => {
        if (obj.uuid === uuidOrName || obj.name === uuidOrName) {
          targetFound = true;
          // Target and all its children should stay visible
          if (typeof obj.traverse === 'function') {
            obj.traverse(child => targetUuids.add(child.uuid));
          } else {
            targetUuids.add(obj.uuid);
          }
        }
      });
    }

    if (!targetFound) return false;

    // Second pass: apply visibility
    if (typeof rootObject.traverse === 'function') {
      rootObject.traverse(obj => {
        if (!rootObject._previousVisibilities.has(obj.uuid)) {
          rootObject._previousVisibilities.set(obj.uuid, obj.visible);
        }
        if (obj === rootObject) {
          obj.visible = true;
        } else if (targetUuids.has(obj.uuid)) {
          obj.visible = true;
        } else if (obj.isMesh || (obj.children && obj.children.length === 0)) {
          obj.visible = false;
        }
      });
    }

    return true;
  }

  /**
   * Reset all part visibilities back to their original states
   */
  function resetIsolation(rootObject) {
    if (!rootObject) return false;

    if (rootObject._previousVisibilities && typeof rootObject.traverse === 'function') {
      rootObject.traverse(obj => {
        if (rootObject._previousVisibilities.has(obj.uuid)) {
          obj.visible = rootObject._previousVisibilities.get(obj.uuid);
        } else {
          obj.visible = true;
        }
      });
      rootObject._previousVisibilities.clear();
      return true;
    }

    if (typeof rootObject.traverse === 'function') {
      rootObject.traverse(obj => { obj.visible = true; });
      return true;
    }
    return false;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. 3D ANNOTATION CALLOUT PINS
  // ─────────────────────────────────────────────────────────────────────────────

  class AnnotationManager {
    constructor() {
      this.pins = new Map(); // id -> Pin
    }

    /**
     * Add a 3D annotation pin
     */
    addPin(pinConfig) {
      const pin = {
        id: pinConfig.id || ('pin_' + Math.random().toString(36).substr(2, 9)),
        title: pinConfig.title || 'Annotation',
        description: pinConfig.description || '',
        position: Object.assign({ x: 0, y: 0, z: 0 }, pinConfig.position || {}),
        color: pinConfig.color || '#38bdf8',
        icon: pinConfig.icon || '📍',
        visible: true
      };
      this.pins.set(pin.id, pin);
      return pin;
    }

    /**
     * Remove pin
     */
    removePin(id) {
      return this.pins.delete(id);
    }

    /**
     * Get all pins
     */
    getPins() {
      return Array.from(this.pins.values());
    }

    /**
     * Project 3D coordinates into 2D viewport coordinates
     */
    projectToScreen(position3D, camera, canvasWidth, canvasHeight) {
      const w = canvasWidth || 800;
      const h = canvasHeight || 600;
      if (!position3D) {
        return { x: 0, y: 0, visible: false };
      }

      const THREE = (typeof window !== 'undefined' && window.THREE) ||
                    (typeof global !== 'undefined' && global.THREE) || null;

      if (THREE && typeof THREE.Vector3 === 'function' && camera) {
        const v = new THREE.Vector3(position3D.x, position3D.y, position3D.z);
        v.project(camera);

        const isBehind = v.z > 1.0;
        const screenX = ((v.x + 1) / 2) * w;
        const screenY = ((-v.y + 1) / 2) * h;
        const inFrustum = !isBehind && v.x >= -1.1 && v.x <= 1.1 && v.y >= -1.1 && v.y <= 1.1;

        return {
          x: Math.round(screenX),
          y: Math.round(screenY),
          visible: inFrustum
        };
      }

      // Safe fallback for 2D/mock environments without Three camera
      return {
        x: Math.round(w / 2 + position3D.x * 50),
        y: Math.round(h / 2 - position3D.y * 50),
        visible: true
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PUBLIC EXPORT
  // ─────────────────────────────────────────────────────────────────────────────

  return {
    ExplodedViewController,
    getSceneHierarchy,
    isolatePart,
    resetIsolation,
    AnnotationManager
  };
}));
