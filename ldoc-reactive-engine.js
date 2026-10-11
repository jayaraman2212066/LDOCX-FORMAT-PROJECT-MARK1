/**
 * LDOCX Living Document Platform — Reactive Engine & Simulation DAG
 * Safe Topological Dependency DAG, Math Expression Evaluator, and Simulation Runtime
 * BENCHMARK: Feature-Complete Living Documents
 * 
 * Strict Invariants:
 * - NO eval() or new Function() (zero script injection vulnerabilities)
 * - Cycle detection with graceful degradation
 * - Pure determinism across Viewer, Editor, and Export surfaces
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LDocReactiveEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. SAFE TOKENIZER & MATH EXPRESSION PARSER (NO EVAL)
  // ─────────────────────────────────────────────────────────────────────────────

  const MATH_CONSTANTS = {
    PI: Math.PI,
    E: Math.E,
    LN2: Math.LN2,
    LN10: Math.LN10,
    LOG2E: Math.LOG2E,
    LOG10E: Math.LOG10E,
    SQRT2: Math.SQRT2,
    SQRT1_2: Math.SQRT1_2
  };

  const MATH_FUNCTIONS = {
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    asin: Math.asin,
    acos: Math.acos,
    atan: Math.atan,
    atan2: Math.atan2,
    sinh: Math.sinh,
    cosh: Math.cosh,
    tanh: Math.tanh,
    sqrt: Math.sqrt,
    cbrt: Math.cbrt,
    abs: Math.abs,
    round: Math.round,
    floor: Math.floor,
    ceil: Math.ceil,
    min: Math.min,
    max: Math.max,
    exp: Math.exp,
    log: Math.log,
    log10: Math.log10,
    log2: Math.log2,
    pow: Math.pow,
    clamp: function (val, minVal, maxVal) {
      return Math.min(Math.max(val, minVal), maxVal);
    },
    deg2rad: function (deg) {
      return deg * (Math.PI / 180);
    },
    rad2deg: function (rad) {
      return rad * (180 / Math.PI);
    },
    IF: function (condition, trueVal, falseVal) {
      return condition ? trueVal : falseVal;
    }
  };

  /**
   * Tokenize mathematical expression string
   */
  function tokenize(str) {
    const tokens = [];
    let i = 0;
    const len = str.length;

    while (i < len) {
      const ch = str[i];

      // Skip whitespace
      if (/\s/.test(ch)) {
        i++;
        continue;
      }

      // Numbers (integers, floats, scientific notation)
      if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(str[i + 1] || ''))) {
        let numStr = '';
        let hasDot = false;
        while (i < len && (/[0-9]/.test(str[i]) || (str[i] === '.' && !hasDot))) {
          if (str[i] === '.') hasDot = true;
          numStr += str[i++];
        }
        if (i < len && (str[i] === 'e' || str[i] === 'E')) {
          numStr += str[i++];
          if (i < len && (str[i] === '+' || str[i] === '-')) {
            numStr += str[i++];
          }
          while (i < len && /[0-9]/.test(str[i])) {
            numStr += str[i++];
          }
        }
        tokens.push({ type: 'NUMBER', value: parseFloat(numStr) });
        continue;
      }

      // Multi-character comparisons (==, !=, <=, >=, &&, ||)
      if (str.substr(i, 2) === '==' || str.substr(i, 2) === '!=' ||
          str.substr(i, 2) === '<=' || str.substr(i, 2) === '>=' ||
          str.substr(i, 2) === '&&' || str.substr(i, 2) === '||') {
        tokens.push({ type: 'OP', value: str.substr(i, 2) });
        i += 2;
        continue;
      }

      // Single character operators and punctuation
      if ('+-*/%^()?:,<>!'.indexOf(ch) !== -1) {
        tokens.push({ type: 'OP', value: ch });
        i++;
        continue;
      }

      // Identifiers (variable or function names)
      if (/[a-zA-Z_]/.test(ch)) {
        let idStr = '';
        while (i < len && /[a-zA-Z0-9_]/.test(str[i])) {
          idStr += str[i++];
        }
        tokens.push({ type: 'IDENT', value: idStr });
        continue;
      }

      // If unexpected character, advance
      i++;
    }

    return tokens;
  }

  /**
   * Safe Recursive Descent Expression Parser
   */
  class ExpressionParser {
    constructor(tokens) {
      this.tokens = tokens;
      this.pos = 0;
    }

    peek() {
      return this.tokens[this.pos] || null;
    }

    consume(expectedVal) {
      const tok = this.tokens[this.pos];
      if (!tok) throw new Error('Unexpected end of expression');
      if (expectedVal && tok.value !== expectedVal) {
        throw new Error(`Expected "${expectedVal}", found "${tok.value}"`);
      }
      this.pos++;
      return tok;
    }

    parse() {
      if (!this.tokens.length) return { type: 'LITERAL', value: 0 };
      const res = this.parseConditional();
      if (this.pos < this.tokens.length) {
        throw new Error(`Unexpected token at end: "${this.tokens[this.pos].value}"`);
      }
      return res;
    }

    parseConditional() {
      let expr = this.parseLogicalOr();
      const tok = this.peek();
      if (tok && tok.value === '?') {
        this.consume('?');
        const trueExpr = this.parseConditional();
        this.consume(':');
        const falseExpr = this.parseConditional();
        return {
          type: 'TERNARY',
          cond: expr,
          trueExpr: trueExpr,
          falseExpr: falseExpr
        };
      }
      return expr;
    }

    parseLogicalOr() {
      let left = this.parseLogicalAnd();
      while (this.peek() && this.peek().value === '||') {
        const op = this.consume().value;
        const right = this.parseLogicalAnd();
        left = { type: 'BINARY', op, left, right };
      }
      return left;
    }

    parseLogicalAnd() {
      let left = this.parseComparison();
      while (this.peek() && this.peek().value === '&&') {
        const op = this.consume().value;
        const right = this.parseComparison();
        left = { type: 'BINARY', op, left, right };
      }
      return left;
    }

    parseComparison() {
      let left = this.parseAddSub();
      while (this.peek() && ['==', '!=', '<', '<=', '>', '>='].indexOf(this.peek().value) !== -1) {
        const op = this.consume().value;
        const right = this.parseAddSub();
        left = { type: 'BINARY', op, left, right };
      }
      return left;
    }

    parseAddSub() {
      let left = this.parseMulDiv();
      while (this.peek() && (this.peek().value === '+' || this.peek().value === '-')) {
        const op = this.consume().value;
        const right = this.parseMulDiv();
        left = { type: 'BINARY', op, left, right };
      }
      return left;
    }

    parseMulDiv() {
      let left = this.parsePower();
      while (this.peek() && (this.peek().value === '*' || this.peek().value === '/' || this.peek().value === '%')) {
        const op = this.consume().value;
        const right = this.parsePower();
        left = { type: 'BINARY', op, left, right };
      }
      return left;
    }

    parsePower() {
      let left = this.parseUnary();
      if (this.peek() && this.peek().value === '^') {
        const op = this.consume().value;
        const right = this.parsePower(); // Right associative
        left = { type: 'BINARY', op, left, right };
      }
      return left;
    }

    parseUnary() {
      const tok = this.peek();
      if (tok && (tok.value === '-' || tok.value === '+' || tok.value === '!')) {
        const op = this.consume().value;
        const operand = this.parseUnary();
        return { type: 'UNARY', op, operand };
      }
      return this.parsePrimary();
    }

    parsePrimary() {
      const tok = this.peek();
      if (!tok) throw new Error('Unexpected end of input');

      if (tok.type === 'NUMBER') {
        this.consume();
        return { type: 'LITERAL', value: tok.value };
      }

      if (tok.value === '(') {
        this.consume('(');
        const expr = this.parseConditional();
        this.consume(')');
        return expr;
      }

      if (tok.type === 'IDENT') {
        const name = this.consume().value;
        // Check if function call
        if (this.peek() && this.peek().value === '(') {
          this.consume('(');
          const args = [];
          if (!this.peek() || this.peek().value !== ')') {
            while (true) {
              args.push(this.parseConditional());
              if (this.peek() && this.peek().value === ',') {
                this.consume(',');
              } else {
                break;
              }
            }
          }
          this.consume(')');
          return { type: 'CALL', func: name, args };
        }

        // Constant or Variable
        if (Object.prototype.hasOwnProperty.call(MATH_CONSTANTS, name)) {
          return { type: 'LITERAL', value: MATH_CONSTANTS[name] };
        }

        return { type: 'VAR', name };
      }

      throw new Error(`Unexpected token "${tok.value}"`);
    }
  }

  /**
   * Evaluate an expression AST against variable values dictionary
   */
  function evaluateAst(ast, context) {
    if (!ast) return 0;

    switch (ast.type) {
      case 'LITERAL':
        return ast.value;

      case 'VAR': {
        if (ast.name === '__proto__' || ast.name === 'constructor' || ast.name === 'prototype') {
          return 0;
        }
        const val = Object.prototype.hasOwnProperty.call(context, ast.name) ? context[ast.name] : undefined;
        if (val === undefined || val === null || isNaN(val)) {
          return 0;
        }
        return typeof val === 'number' ? val : parseFloat(val) || 0;
      }

      case 'UNARY': {
        const opVal = evaluateAst(ast.operand, context);
        if (ast.op === '-') return -opVal;
        if (ast.op === '+') return +opVal;
        if (ast.op === '!') return opVal ? 0 : 1;
        return opVal;
      }

      case 'BINARY': {
        const l = evaluateAst(ast.left, context);
        const r = evaluateAst(ast.right, context);
        switch (ast.op) {
          case '+': return l + r;
          case '-': return l - r;
          case '*': return l * r;
          case '/': return r === 0 ? 0 : l / r;
          case '%': return r === 0 ? 0 : l % r;
          case '^': return Math.pow(l, r);
          case '==': return (l === r) ? 1 : 0;
          case '!=': return (l !== r) ? 1 : 0;
          case '<': return (l < r) ? 1 : 0;
          case '<=': return (l <= r) ? 1 : 0;
          case '>': return (l > r) ? 1 : 0;
          case '>=': return (l >= r) ? 1 : 0;
          case '&&': return (l && r) ? 1 : 0;
          case '||': return (l || r) ? 1 : 0;
          default: return 0;
        }
      }

      case 'TERNARY': {
        const cond = evaluateAst(ast.cond, context);
        return cond ? evaluateAst(ast.trueExpr, context) : evaluateAst(ast.falseExpr, context);
      }

      case 'CALL': {
        const fn = MATH_FUNCTIONS[ast.func];
        if (typeof fn !== 'function') {
          return 0;
        }
        const evaluatedArgs = ast.args.map(a => evaluateAst(a, context));
        return fn.apply(null, evaluatedArgs);
      }

      default:
        return 0;
    }
  }

  /**
   * Extract variable identifier names from formula string
   */
  function extractVariables(formula) {
    if (!formula || typeof formula !== 'string') return [];
    try {
      const tokens = tokenize(formula);
      const vars = new Set();
      for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        if (t.type === 'IDENT') {
          // Check if followed by '(' -> function call
          const next = tokens[i + 1];
          if (next && next.value === '(') continue;
          // Check if known constant
          if (MATH_CONSTANTS[t.value] !== undefined) continue;
          vars.add(t.value);
        }
      }
      return Array.from(vars);
    } catch (_) {
      return [];
    }
  }

  /**
   * Safely evaluate expression string with context
   */
  function evaluateFormula(formula, context) {
    if (typeof formula === 'number') return formula;
    if (!formula || typeof formula !== 'string') return 0;
    try {
      const tokens = tokenize(formula);
      const parser = new ExpressionParser(tokens);
      const ast = parser.parse();
      const val = evaluateAst(ast, context || {});
      return isFinite(val) ? val : 0;
    } catch (e) {
      return 0;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. TOPOLOGICAL REACTIVE DEPENDENCY DAG
  // ─────────────────────────────────────────────────────────────────────────────

  class ReactiveDAG {
    constructor(id) {
      this.id = id || 'dag_' + Math.random().toString(36).substr(2, 9);
      this.nodes = new Map(); // name -> Node
      this.subscribers = new Set();
      this.isBatchUpdating = false;
    }

    /**
     * Add or configure a variable node
     */
    addVariable(config) {
      const name = config.name;
      if (!name) throw new Error('Variable node requires a unique name');

      const node = {
        name,
        type: config.type || (config.formula ? 'formula' : 'slider'), // 'slider' | 'input' | 'formula' | 'constant'
        value: config.value !== undefined ? config.value : (config.defaultValue !== undefined ? config.defaultValue : 0),
        formula: config.formula || null,
        ast: null,
        min: config.min !== undefined ? config.min : 0,
        max: config.max !== undefined ? config.max : 100,
        step: config.step !== undefined ? config.step : 1,
        unit: config.unit || '',
        label: config.label || name,
        options: config.options || null, // for dropdowns
        dependencies: new Set(),
        dependents: new Set(),
        error: null
      };

      if (node.formula) {
        try {
          const tokens = tokenize(node.formula);
          const parser = new ExpressionParser(tokens);
          node.ast = parser.parse();
          const depVars = extractVariables(node.formula);
          depVars.forEach(d => node.dependencies.add(d));
        } catch (err) {
          node.error = `Syntax Error: ${err.message}`;
        }
      }

      this.nodes.set(name, node);
      this._rebuildDependents();

      if (!this.isBatchUpdating) {
        this.evaluate();
      }
      return node;
    }

    /**
     * Update an input/slider variable value and propagate downstream
     */
    setVariable(name, value) {
      const node = this.nodes.get(name);
      if (!node) return false;
      const num = typeof value === 'number' ? value : parseFloat(value);
      node.value = isNaN(num) ? value : num;
      this.evaluate(name);
      return true;
    }

    /**
     * Update a formula and re-evaluate
     */
    setFormula(name, formula) {
      const node = this.nodes.get(name);
      if (!node) return false;
      node.type = 'formula';
      node.formula = formula;
      node.error = null;
      node.dependencies.clear();

      try {
        const tokens = tokenize(formula);
        const parser = new ExpressionParser(tokens);
        node.ast = parser.parse();
        const depVars = extractVariables(formula);
        depVars.forEach(d => node.dependencies.add(d));
      } catch (err) {
        node.error = `Syntax Error: ${err.message}`;
      }

      this._rebuildDependents();
      this.evaluate(name);
      return true;
    }

    /**
     * Get a node by name
     */
    getNode(name) {
      return this.nodes.get(name) || null;
    }

    /**
     * Get evaluated value of a variable
     */
    getValue(name) {
      const node = this.nodes.get(name);
      return node ? node.value : undefined;
    }

    /**
     * Get all current values as a key-value object
     */
    getAllValues() {
      const res = {};
      this.nodes.forEach((node, name) => {
        res[name] = node.value;
      });
      return res;
    }

    /**
     * Remove a variable node
     */
    removeVariable(name) {
      const node = this.nodes.get(name);
      if (!node) return false;
      this.nodes.delete(name);
      this._rebuildDependents();
      this.evaluate();
      return true;
    }

    /**
     * Internal: Rebuild dependents inverted map
     */
    _rebuildDependents() {
      // Clear all dependents sets
      this.nodes.forEach(n => n.dependents.clear());

      // Re-populate from dependencies
      this.nodes.forEach((node, nodeName) => {
        node.dependencies.forEach(depName => {
          const parent = this.nodes.get(depName);
          if (parent) {
            parent.dependents.add(nodeName);
          }
        });
      });
    }

    /**
     * Topological sort with Kahn's Algorithm + Cycle Detection
     */
    getTopologicalOrder() {
      const inDegree = new Map();
      const nodeNames = Array.from(this.nodes.keys());

      nodeNames.forEach(name => {
        const node = this.nodes.get(name);
        // In-degree is number of internal nodes this node depends on
        let count = 0;
        node.dependencies.forEach(dep => {
          if (this.nodes.has(dep)) count++;
        });
        inDegree.set(name, count);
      });

      const queue = [];
      inDegree.forEach((deg, name) => {
        if (deg === 0) queue.push(name);
      });

      const order = [];
      while (queue.length > 0) {
        const curr = queue.shift();
        order.push(curr);

        const currNode = this.nodes.get(curr);
        if (currNode) {
          currNode.dependents.forEach(depName => {
            const nextDeg = (inDegree.get(depName) || 0) - 1;
            inDegree.set(depName, nextDeg);
            if (nextDeg === 0) {
              queue.push(depName);
            }
          });
        }
      }

      // Check for cycles
      if (order.length < nodeNames.length) {
        // Cyclic nodes are those remaining with in-degree > 0
        nodeNames.forEach(name => {
          if (inDegree.get(name) > 0) {
            const cyclicNode = this.nodes.get(name);
            if (cyclicNode) {
              cyclicNode.error = 'Cyclic dependency detected';
            }
          }
        });
      }

      return order;
    }

    /**
     * Explicit cycle detector
     */
    detectCycles() {
      const order = this.getTopologicalOrder();
      const nodeNames = Array.from(this.nodes.keys());
      const cyclic = [];
      if (order.length < nodeNames.length) {
        nodeNames.forEach(name => {
          const n = this.nodes.get(name);
          if (n && n.error === 'Cyclic dependency detected') {
            cyclic.push(name);
          }
        });
      }
      return {
        hasCycle: cyclic.length > 0,
        cyclicNodes: cyclic
      };
    }

    /**
     * Evaluate all formula nodes in topological order
     */
    evaluate(triggerVar) {
      const order = this.getTopologicalOrder();
      const context = {};

      // Fill initial values from constants and input variables
      this.nodes.forEach((node, name) => {
        context[name] = node.value;
      });

      // Compute in topological sequence
      for (let i = 0; i < order.length; i++) {
        const name = order[i];
        const node = this.nodes.get(name);
        if (!node) continue;

        if (node.type === 'formula' && node.ast && !node.error) {
          try {
            const val = evaluateAst(node.ast, context);
            node.value = isFinite(val) ? val : 0;
            context[name] = node.value;
          } catch (e) {
            node.error = `Eval Error: ${e.message}`;
          }
        }
      }

      // Notify all subscribers
      this._notify(triggerVar);
      return context;
    }

    /**
     * Subscribe to updates
     */
    subscribe(callback) {
      if (typeof callback === 'function') {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
      }
      return () => {};
    }

    _notify(triggerVar) {
      const snapshot = this.getAllValues();
      this.subscribers.forEach(cb => {
        try {
          cb(triggerVar, snapshot, this);
        } catch (e) {
          console.error('LDocReactiveEngine subscriber error:', e);
        }
      });
    }

    /**
     * Serialize to JSON block for LDOCX document AST
     */
    toBlock(title) {
      const vars = [];
      this.nodes.forEach(n => {
        vars.push({
          name: n.name,
          label: n.label,
          type: n.type,
          value: n.value,
          formula: n.formula,
          min: n.min,
          max: n.max,
          step: n.step,
          unit: n.unit,
          options: n.options
        });
      });

      return {
        id: this.id,
        type: 'simulation',
        title: title || 'Interactive Reactive Simulation',
        variables: vars
      };
    }

    /**
     * Load from JSON block
     */
    static fromBlock(block) {
      const dag = new ReactiveDAG(block.id);
      dag.isBatchUpdating = true;
      (block.variables || []).forEach(v => {
        dag.addVariable(v);
      });
      dag.isBatchUpdating = false;
      dag.evaluate();
      return dag;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. CANVA-GRADE SIMULATION PRESETS
  // ─────────────────────────────────────────────────────────────────────────────

  const SIMULATION_PRESETS = {
    /**
     * Projectile Motion (Ballistics & Kinematics)
     */
    projectile_motion: function (overrides) {
      const dag = new ReactiveDAG('sim_projectile_' + Date.now());
      dag.isBatchUpdating = true;

      dag.addVariable({ name: 'velocity', label: 'Launch Velocity', type: 'slider', value: 30, min: 1, max: 100, step: 1, unit: 'm/s' });
      dag.addVariable({ name: 'angle', label: 'Launch Angle', type: 'slider', value: 45, min: 0, max: 90, step: 1, unit: '°' });
      dag.addVariable({ name: 'gravity', label: 'Gravity', type: 'slider', value: 9.81, min: 1.62, max: 24.79, step: 0.1, unit: 'm/s²' });
      dag.addVariable({ name: 'init_height', label: 'Initial Height', type: 'slider', value: 0, min: 0, max: 50, step: 1, unit: 'm' });

      // Formulas
      dag.addVariable({
        name: 'angle_rad',
        label: 'Angle (Radians)',
        type: 'formula',
        formula: 'deg2rad(angle)'
      });

      dag.addVariable({
        name: 'v_y',
        label: 'Vertical Velocity (Vy)',
        type: 'formula',
        formula: 'velocity * sin(angle_rad)',
        unit: 'm/s'
      });

      dag.addVariable({
        name: 'v_x',
        label: 'Horizontal Velocity (Vx)',
        type: 'formula',
        formula: 'velocity * cos(angle_rad)',
        unit: 'm/s'
      });

      dag.addVariable({
        name: 'time_of_flight',
        label: 'Total Flight Time',
        type: 'formula',
        formula: '(v_y + sqrt(v_y^2 + 2 * gravity * init_height)) / gravity',
        unit: 's'
      });

      dag.addVariable({
        name: 'max_height',
        label: 'Apex Altitude',
        type: 'formula',
        formula: 'init_height + (v_y^2) / (2 * gravity)',
        unit: 'm'
      });

      dag.addVariable({
        name: 'range',
        label: 'Total Range',
        type: 'formula',
        formula: 'v_x * time_of_flight',
        unit: 'm'
      });

      if (overrides) {
        Object.keys(overrides).forEach(k => {
          if (dag.nodes.has(k)) dag.setVariable(k, overrides[k]);
        });
      }

      dag.isBatchUpdating = false;
      dag.evaluate();

      // Trajectory point generator helper
      dag.getTrajectoryPoints = function (steps) {
        const count = steps || 60;
        const vals = dag.getAllValues();
        const tFlight = vals.time_of_flight || 0;
        const pts = [];
        if (tFlight <= 0) return pts;

        const dt = tFlight / count;
        for (let i = 0; i <= count; i++) {
          const t = i * dt;
          const x = vals.v_x * t;
          const y = Math.max(0, vals.init_height + vals.v_y * t - 0.5 * vals.gravity * t * t);
          pts.push({ x, y, t });
        }
        return pts;
      };

      return dag;
    },

    /**
     * Ohm's Law & Electric Power
     */
    ohms_law: function (overrides) {
      const dag = new ReactiveDAG('sim_ohms_' + Date.now());
      dag.isBatchUpdating = true;

      dag.addVariable({ name: 'voltage', label: 'Voltage (V)', type: 'slider', value: 12, min: 0, max: 240, step: 0.5, unit: 'V' });
      dag.addVariable({ name: 'resistance', label: 'Resistance (R)', type: 'slider', value: 4, min: 0.1, max: 1000, step: 0.5, unit: 'Ω' });

      dag.addVariable({
        name: 'current',
        label: 'Current (I = V / R)',
        type: 'formula',
        formula: 'voltage / resistance',
        unit: 'A'
      });

      dag.addVariable({
        name: 'power',
        label: 'Electric Power (P = V * I)',
        type: 'formula',
        formula: 'voltage * current',
        unit: 'W'
      });

      if (overrides) {
        Object.keys(overrides).forEach(k => {
          if (dag.nodes.has(k)) dag.setVariable(k, overrides[k]);
        });
      }

      dag.isBatchUpdating = false;
      dag.evaluate();
      return dag;
    },

    /**
     * Damped Harmonic Oscillator (Spring-Mass-Damper)
     */
    harmonic_oscillator: function (overrides) {
      const dag = new ReactiveDAG('sim_oscillator_' + Date.now());
      dag.isBatchUpdating = true;

      dag.addVariable({ name: 'mass', label: 'Mass (m)', type: 'slider', value: 1.0, min: 0.1, max: 10, step: 0.1, unit: 'kg' });
      dag.addVariable({ name: 'spring_k', label: 'Spring Constant (k)', type: 'slider', value: 40, min: 1, max: 200, step: 1, unit: 'N/m' });
      dag.addVariable({ name: 'damping_c', label: 'Damping Factor (c)', type: 'slider', value: 0.4, min: 0, max: 5, step: 0.1, unit: 'N·s/m' });
      dag.addVariable({ name: 'init_x', label: 'Initial Displacement (x0)', type: 'slider', value: 2.0, min: 0.1, max: 5, step: 0.1, unit: 'm' });

      dag.addVariable({
        name: 'omega_0',
        label: 'Natural Frequency (ω₀)',
        type: 'formula',
        formula: 'sqrt(spring_k / mass)',
        unit: 'rad/s'
      });

      dag.addVariable({
        name: 'frequency',
        label: 'Frequency (f)',
        type: 'formula',
        formula: 'omega_0 / (2 * PI)',
        unit: 'Hz'
      });

      dag.addVariable({
        name: 'period',
        label: 'Oscillation Period (T)',
        type: 'formula',
        formula: '1 / frequency',
        unit: 's'
      });

      if (overrides) {
        Object.keys(overrides).forEach(k => {
          if (dag.nodes.has(k)) dag.setVariable(k, overrides[k]);
        });
      }

      dag.isBatchUpdating = false;
      dag.evaluate();

      dag.getWaveformPoints = function (duration, steps) {
        const dur = duration || 10;
        const count = steps || 100;
        const vals = dag.getAllValues();
        const m = vals.mass || 1;
        const c = vals.damping_c || 0;
        const k = vals.spring_k || 1;
        const x0 = vals.init_x || 1;
        const gamma = c / (2 * m);
        const w0Sq = k / m;
        const w1 = Math.sqrt(Math.max(0, w0Sq - gamma * gamma));

        const pts = [];
        const dt = dur / count;
        for (let i = 0; i <= count; i++) {
          const t = i * dt;
          const x = x0 * Math.exp(-gamma * t) * Math.cos(w1 * t);
          pts.push({ t, x });
        }
        return pts;
      };

      return dag;
    },

    /**
     * Compound Interest & Investment Growth
     */
    compound_interest: function (overrides) {
      const dag = new ReactiveDAG('sim_compound_' + Date.now());
      dag.isBatchUpdating = true;

      dag.addVariable({ name: 'principal', label: 'Principal Deposit', type: 'slider', value: 10000, min: 100, max: 250000, step: 500, unit: '$' });
      dag.addVariable({ name: 'annual_rate', label: 'Annual Return Rate', type: 'slider', value: 8, min: 0.5, max: 30, step: 0.5, unit: '%' });
      dag.addVariable({ name: 'compounds_per_yr', label: 'Compounds / Year', type: 'slider', value: 12, min: 1, max: 365, step: 1, unit: 'times' });
      dag.addVariable({ name: 'years', label: 'Investment Horizon', type: 'slider', value: 10, min: 1, max: 40, step: 1, unit: 'years' });

      dag.addVariable({
        name: 'r_decimal',
        label: 'Rate (Decimal)',
        type: 'formula',
        formula: 'annual_rate / 100'
      });

      dag.addVariable({
        name: 'future_value',
        label: 'Total Future Balance',
        type: 'formula',
        formula: 'principal * pow(1 + (r_decimal / compounds_per_yr), compounds_per_yr * years)',
        unit: '$'
      });

      dag.addVariable({
        name: 'total_interest',
        label: 'Total Growth / Interest',
        type: 'formula',
        formula: 'future_value - principal',
        unit: '$'
      });

      if (overrides) {
        Object.keys(overrides).forEach(k => {
          if (dag.nodes.has(k)) dag.setVariable(k, overrides[k]);
        });
      }

      dag.isBatchUpdating = false;
      dag.evaluate();

      dag.getGrowthCurve = function () {
        const vals = dag.getAllValues();
        const p = vals.principal;
        const r = vals.annual_rate / 100;
        const n = vals.compounds_per_yr;
        const yMax = Math.round(vals.years);
        const pts = [];
        for (let yr = 0; yr <= yMax; yr++) {
          const val = p * Math.pow(1 + r / n, n * yr);
          pts.push({ year: yr, amount: val, interest: val - p });
        }
        return pts;
      };

      return dag;
    },

    /**
     * Gravitational & Orbital Mechanics
     */
    gravitational_orbital: function (overrides) {
      const dag = new ReactiveDAG('sim_orbit_' + Date.now());
      dag.isBatchUpdating = true;
      dag.addVariable({ name: 'altitude', label: 'Orbital Altitude', type: 'slider', value: 400, min: 160, max: 2000, step: 10, unit: 'km' });
      dag.addVariable({ name: 'planet_mass_exp', label: 'Earth Mass (x10²⁴)', type: 'slider', value: 5.97, min: 1.0, max: 15.0, step: 0.1, unit: 'kg' });
      dag.addVariable({ name: 'radius_earth', label: 'Earth Radius', type: 'number', value: 6371, unit: 'km' });

      dag.addVariable({
        name: 'r_total_m',
        label: 'Total Radius (m)',
        type: 'formula',
        formula: '(radius_earth + altitude) * 1000'
      });

      dag.addVariable({
        name: 'orbital_velocity',
        label: 'Orbital Speed',
        type: 'formula',
        formula: 'sqrt((6.674e-11 * (planet_mass_exp * 1e24)) / r_total_m)',
        unit: 'm/s'
      });

      dag.addVariable({
        name: 'period_minutes',
        label: 'Orbital Period',
        type: 'formula',
        formula: '(2 * 3.14159265 * r_total_m / orbital_velocity) / 60',
        unit: 'min'
      });

      if (overrides) {
        Object.keys(overrides).forEach(k => {
          if (dag.nodes.has(k)) dag.setVariable(k, overrides[k]);
        });
      }
      dag.isBatchUpdating = false;
      dag.evaluate();
      return dag;
    },

    /**
     * Elastic Collision & Momentum Conservation
     */
    elastic_collision: function (overrides) {
      const dag = new ReactiveDAG('sim_collision_' + Date.now());
      dag.isBatchUpdating = true;
      dag.addVariable({ name: 'mass_a', label: 'Mass A', type: 'slider', value: 2.0, min: 0.5, max: 10.0, step: 0.5, unit: 'kg' });
      dag.addVariable({ name: 'vel_a', label: 'Initial Velocity A', type: 'slider', value: 5.0, min: -10.0, max: 10.0, step: 0.5, unit: 'm/s' });
      dag.addVariable({ name: 'mass_b', label: 'Mass B', type: 'slider', value: 3.0, min: 0.5, max: 10.0, step: 0.5, unit: 'kg' });
      dag.addVariable({ name: 'vel_b', label: 'Initial Velocity B', type: 'slider', value: -2.0, min: -10.0, max: 10.0, step: 0.5, unit: 'm/s' });

      dag.addVariable({
        name: 'final_vel_a',
        label: 'Final Velocity A',
        type: 'formula',
        formula: '((mass_a - mass_b) * vel_a + 2 * mass_b * vel_b) / (mass_a + mass_b)',
        unit: 'm/s'
      });

      dag.addVariable({
        name: 'final_vel_b',
        label: 'Final Velocity B',
        type: 'formula',
        formula: '((mass_b - mass_a) * vel_b + 2 * mass_a * vel_a) / (mass_a + mass_b)',
        unit: 'm/s'
      });

      if (overrides) {
        Object.keys(overrides).forEach(k => {
          if (dag.nodes.has(k)) dag.setVariable(k, overrides[k]);
        });
      }
      dag.isBatchUpdating = false;
      dag.evaluate();
      return dag;
    },

    /**
     * RC Circuit Charging & Cutoff Frequency
     */
    rc_circuit: function (overrides) {
      const dag = new ReactiveDAG('sim_rc_' + Date.now());
      dag.isBatchUpdating = true;
      dag.addVariable({ name: 'resistance_kohm', label: 'Resistance (kΩ)', type: 'slider', value: 10, min: 1, max: 100, step: 1, unit: 'kΩ' });
      dag.addVariable({ name: 'capacitance_uf', label: 'Capacitance (μF)', type: 'slider', value: 47, min: 1, max: 500, step: 5, unit: 'μF' });

      dag.addVariable({
        name: 'tau_ms',
        label: 'Time Constant (τ = R*C)',
        type: 'formula',
        formula: 'resistance_kohm * capacitance_uf',
        unit: 'ms'
      });

      dag.addVariable({
        name: 'cutoff_hz',
        label: 'Cutoff Frequency (-3dB)',
        type: 'formula',
        formula: '1000 / (2 * 3.14159265 * (resistance_kohm * capacitance_uf / 1000))',
        unit: 'Hz'
      });

      if (overrides) {
        Object.keys(overrides).forEach(k => {
          if (dag.nodes.has(k)) dag.setVariable(k, overrides[k]);
        });
      }
      dag.isBatchUpdating = false;
      dag.evaluate();
      return dag;
    },

    /**
     * Loan & Mortgage Amortization
     */
    loan_mortgage: function (overrides) {
      const dag = new ReactiveDAG('sim_loan_' + Date.now());
      dag.isBatchUpdating = true;
      dag.addVariable({ name: 'loan_amount', label: 'Principal Loan Amount', type: 'slider', value: 350000, min: 50000, max: 1500000, step: 10000, unit: '$' });
      dag.addVariable({ name: 'interest_rate_pct', label: 'Annual Interest Rate', type: 'slider', value: 6.5, min: 1.0, max: 15.0, step: 0.1, unit: '%' });
      dag.addVariable({ name: 'term_years', label: 'Loan Term', type: 'slider', value: 30, min: 5, max: 30, step: 5, unit: 'yrs' });

      dag.addVariable({
        name: 'monthly_rate',
        label: 'Monthly Rate (Decimal)',
        type: 'formula',
        formula: '(interest_rate_pct / 100) / 12'
      });

      dag.addVariable({
        name: 'total_months',
        label: 'Total Months',
        type: 'formula',
        formula: 'term_years * 12'
      });

      dag.addVariable({
        name: 'monthly_payment',
        label: 'Monthly Payment (P&I)',
        type: 'formula',
        formula: 'loan_amount * (monthly_rate * pow(1 + monthly_rate, total_months)) / (pow(1 + monthly_rate, total_months) - 1)',
        unit: '$'
      });

      dag.addVariable({
        name: 'total_payment',
        label: 'Total Repayment Cost',
        type: 'formula',
        formula: 'monthly_payment * total_months',
        unit: '$'
      });

      if (overrides) {
        Object.keys(overrides).forEach(k => {
          if (dag.nodes.has(k)) dag.setVariable(k, overrides[k]);
        });
      }
      dag.isBatchUpdating = false;
      dag.evaluate();
      return dag;
    },

    /**
     * Structural Engineering Beam Deflection
     */
    beam_bending_stress: function (overrides) {
      const dag = new ReactiveDAG('sim_beam_' + Date.now());
      dag.isBatchUpdating = true;
      dag.addVariable({ name: 'point_load_kn', label: 'Center Load (F)', type: 'slider', value: 25, min: 1, max: 100, step: 1, unit: 'kN' });
      dag.addVariable({ name: 'span_m', label: 'Beam Span (L)', type: 'slider', value: 6.0, min: 1.0, max: 15.0, step: 0.5, unit: 'm' });
      dag.addVariable({ name: 'elastic_modulus_gpa', label: 'Modulus E (Steel)', type: 'slider', value: 200, min: 50, max: 300, step: 10, unit: 'GPa' });
      dag.addVariable({ name: 'inertia_cm4', label: 'Moment of Inertia (I)', type: 'slider', value: 8500, min: 1000, max: 50000, step: 500, unit: 'cm⁴' });

      dag.addVariable({
        name: 'max_deflection_mm',
        label: 'Center Deflection (δ)',
        type: 'formula',
        formula: '((point_load_kn * 1000) * pow(span_m, 3)) / (48 * (elastic_modulus_gpa * 1e9) * (inertia_cm4 * 1e-8)) * 1000',
        unit: 'mm'
      });

      if (overrides) {
        Object.keys(overrides).forEach(k => {
          if (dag.nodes.has(k)) dag.setVariable(k, overrides[k]);
        });
      }
      dag.isBatchUpdating = false;
      dag.evaluate();
      return dag;
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. INTERACTIVE SIMULATION HTML & SVG MARKUP GENERATOR
  // ─────────────────────────────────────────────────────────────────────────────

  function generateSimulationCard(node) {
    const presetName = node.preset || 'projectile_motion';
    const presetFn = SIMULATION_PRESETS[presetName] || SIMULATION_PRESETS.projectile_motion;
    const dag = presetFn(node.variables ? (function() {
      const map = {};
      node.variables.forEach(v => { map[v.name] = v.value; });
      return map;
    })() : null);

    const title = node.title || (presetName.replace(/_/g, ' ').toUpperCase() + ' SIMULATOR');
    const uid = 'sim_' + Math.random().toString(36).substr(2, 8);
    const vals = dag.getAllValues();

    // Render interactive controls
    let controlsHtml = '';
    dag.nodes.forEach(n => {
      if (n.type === 'slider' || n.type === 'input') {
        controlsHtml += `
          <div style="margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;font-size:12px;color:#cbd5e1;margin-bottom:4px;">
              <span>${n.label}</span>
              <span style="font-family:monospace;font-weight:700;color:#38bdf8;" id="${uid}_val_${n.name}">${n.value} ${n.unit}</span>
            </div>
            <input type="range" min="${n.min}" max="${n.max}" step="${n.step}" value="${n.value}"
              data-var="${n.name}" data-unit="${n.unit}"
              style="width:100%;accent-color:#38bdf8;cursor:pointer;"
              oninput="window.LDocReactiveEngine && window.LDocReactiveEngine.onSliderInput('${uid}', this)" />
          </div>
        `;
      }
    });

    // Render computed readouts
    let readoutsHtml = '';
    dag.nodes.forEach(n => {
      if (n.type === 'formula') {
        const displayVal = typeof n.value === 'number' ? (Math.round(n.value * 100) / 100) : n.value;
        readoutsHtml += `
          <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:8px 12px;display:flex;flex-direction:column;">
            <span style="font-size:11px;color:#94a3b8;margin-bottom:2px;">${n.label}</span>
            <span style="font-family:monospace;font-size:15px;font-weight:800;color:#fef08a;" id="${uid}_out_${n.name}">${displayVal} ${n.unit || ''}</span>
          </div>
        `;
      }
    });

    // Render SVG Visualization based on preset
    let svgViz = '';
    if (presetName === 'projectile_motion') {
      const pts = dag.getTrajectoryPoints(40);
      const maxR = Math.max(10, vals.range || 50);
      const maxH = Math.max(5, vals.max_height || 20);
      const pathD = pts.map((p, idx) => {
        const svgX = (p.x / maxR) * 260 + 20;
        const svgY = 160 - (p.y / (maxH * 1.2)) * 140;
        return (idx === 0 ? 'M' : 'L') + svgX.toFixed(1) + ',' + svgY.toFixed(1);
      }).join(' ');

      svgViz = `
        <svg id="${uid}_svg" viewBox="0 0 300 180" style="width:100%;height:180px;background:rgba(0,0,0,0.3);border-radius:10px;border:1px solid rgba(255,255,255,0.08);">
          <!-- Ground line -->
          <line x1="10" y1="160" x2="290" y2="160" stroke="#475569" stroke-width="2" />
          <!-- Flight trajectory -->
          <path id="${uid}_traj" d="${pathD}" fill="none" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" />
          <!-- Cannon base -->
          <circle cx="20" cy="160" r="5" fill="#f59e0b" />
          <!-- Apex marker -->
          <circle id="${uid}_apex" cx="${(pts[Math.floor(pts.length/2)] ? (pts[Math.floor(pts.length/2)].x / maxR) * 260 + 20 : 150).toFixed(1)}"
            cy="${(160 - ((vals.max_height || 0) / (maxH * 1.2)) * 140).toFixed(1)}" r="4" fill="#ef4444" />
        </svg>
      `;
    } else if (presetName === 'ohms_law') {
      const pRatio = Math.min(1, (vals.power || 0) / 1000);
      svgViz = `
        <div id="${uid}_svg" style="height:180px;background:rgba(0,0,0,0.3);border-radius:10px;border:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;">
          <div style="text-align:center;">
            <div style="font-size:36px;margin-bottom:6px;filter:drop-shadow(0 0 15px rgba(56,189,248,0.8));">⚡</div>
            <div style="font-size:13px;font-weight:700;color:#38bdf8;">DYNAMIC CIRCUIT LOAD</div>
            <div style="width:200px;height:10px;background:rgba(255,255,255,0.1);border-radius:5px;margin:10px auto;overflow:hidden;">
              <div id="${uid}_pbar" style="height:100%;width:${(pRatio * 100).toFixed(1)}%;background:linear-gradient(90deg, #10b981, #f59e0b, #ef4444);transition:width 0.15s ease;"></div>
            </div>
            <div style="font-size:11px;color:#94a3b8;">Power dissipation proportional to V²/R</div>
          </div>
        </div>
      `;
    } else {
      svgViz = `
        <div id="${uid}_svg" style="height:180px;background:rgba(0,0,0,0.3);border-radius:10px;border:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;">
          <div style="text-align:center;color:#38bdf8;">
            <span style="font-size:32px;">📊</span>
            <div style="font-weight:700;margin-top:4px;">Reactive Math Engine</div>
          </div>
        </div>
      `;
    }

    return `
      <div class="ldoc-simulation-container" id="${uid}" data-preset="${presetName}" style="background:rgba(15,23,42,0.92);border:1.5px solid rgba(56,189,248,0.35);border-radius:16px;padding:20px;margin:20px 0;box-shadow:0 12px 35px rgba(0,0,0,0.65);">
        <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:12px;margin-bottom:16px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#38bdf8;box-shadow:0 0 10px #38bdf8;"></span>
            <strong style="font-size:15px;color:#f8fafc;letter-spacing:0.5px;">${title}</strong>
          </div>
          <span style="font-size:11px;padding:2px 8px;border-radius:6px;background:rgba(56,189,248,0.15);color:#38bdf8;font-weight:700;">REACTIVE DAG</span>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));gap:20px;align-items:start;">
          <!-- Controls -->
          <div>
            <div style="font-size:12px;font-weight:700;color:#94a3b8;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;">Parameter Controls</div>
            ${controlsHtml}
          </div>

          <!-- Simulation Visualizer & Outputs -->
          <div>
            <div style="font-size:12px;font-weight:700;color:#94a3b8;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px;">Live Dynamic Response</div>
            ${svgViz}
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px;">
              ${readoutsHtml}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Global registry for live DOM slider bindings
  const activeSimulationDAGs = new Map();

  function onSliderInput(containerId, inputElem) {
    let dag = activeSimulationDAGs.get(containerId);
    if (!dag) {
      const container = document.getElementById(containerId);
      if (!container) return;
      const preset = container.getAttribute('data-preset') || 'projectile_motion';
      const presetFn = SIMULATION_PRESETS[preset] || SIMULATION_PRESETS.projectile_motion;
      dag = presetFn();
      activeSimulationDAGs.set(containerId, dag);
    }

    const varName = inputElem.getAttribute('data-var');
    const unit = inputElem.getAttribute('data-unit') || '';
    const val = parseFloat(inputElem.value);

    // Update label
    const labelElem = document.getElementById(`${containerId}_val_${varName}`);
    if (labelElem) labelElem.textContent = `${val} ${unit}`;

    // Update DAG
    dag.setVariable(varName, val);
    const vals = dag.getAllValues();

    // Update computed readout labels
    dag.nodes.forEach(n => {
      if (n.type === 'formula') {
        const outElem = document.getElementById(`${containerId}_out_${n.name}`);
        if (outElem) {
          const displayVal = typeof n.value === 'number' ? (Math.round(n.value * 100) / 100) : n.value;
          outElem.textContent = `${displayVal} ${n.unit || ''}`;
        }
      }
    });

    // Update SVG if projectile motion
    const trajPath = document.getElementById(`${containerId}_traj`);
    if (trajPath && typeof dag.getTrajectoryPoints === 'function') {
      const pts = dag.getTrajectoryPoints(40);
      const maxR = Math.max(10, vals.range || 50);
      const maxH = Math.max(5, vals.max_height || 20);
      const pathD = pts.map((p, idx) => {
        const svgX = (p.x / maxR) * 260 + 20;
        const svgY = 160 - (p.y / (maxH * 1.2)) * 140;
        return (idx === 0 ? 'M' : 'L') + svgX.toFixed(1) + ',' + svgY.toFixed(1);
      }).join(' ');
      trajPath.setAttribute('d', pathD);

      const apexElem = document.getElementById(`${containerId}_apex`);
      if (apexElem && pts.length > 0) {
        const midPt = pts[Math.floor(pts.length / 2)];
        apexElem.setAttribute('cx', ((midPt.x / maxR) * 260 + 20).toFixed(1));
        apexElem.setAttribute('cy', (160 - ((vals.max_height || 0) / (maxH * 1.2)) * 140).toFixed(1));
      }
    }

    // Update power bar if ohms law
    const pbar = document.getElementById(`${containerId}_pbar`);
    if (pbar && vals.power !== undefined) {
      const pRatio = Math.min(1, vals.power / 1000);
      pbar.style.width = (pRatio * 100).toFixed(1) + '%';
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. REACTIVE DEBUGGER & INSPECTOR SUITE
  // ─────────────────────────────────────────────────────────────────────────────

  function traceDependencies(dag, varName) {
    if (!dag || !dag.nodes) return { upstream: [], downstream: [] };
    const upstream = [];
    const downstream = [];

    const targetNode = dag.nodes.get(varName);
    if (targetNode) {
      if (targetNode.dependencies && typeof targetNode.dependencies.forEach === 'function') {
        targetNode.dependencies.forEach(dep => upstream.push(dep));
      }
      if (targetNode.dependents && typeof targetNode.dependents.forEach === 'function') {
        targetNode.dependents.forEach(dep => downstream.push(dep));
      }
    }

    return {
      variable: varName,
      upstreamDependencies: upstream,
      downstreamDependents: downstream,
      currentValue: targetNode ? targetNode.value : null
    };
  }

  function detectCycles(dag) {
    if (!dag || !dag.nodes) return { hasCycles: false, cycle: null };
    const visited = new Set();
    const recStack = new Set();
    let cycleFound = null;

    function dfs(nodeName, path = []) {
      visited.add(nodeName);
      recStack.add(nodeName);
      path.push(nodeName);

      const node = dag.nodes.get(nodeName);
      if (node && node.dependencies) {
        for (const dep of node.dependencies) {
          if (!visited.has(dep)) {
            if (dfs(dep, [...path])) return true;
          } else if (recStack.has(dep)) {
            cycleFound = [...path, dep];
            return true;
          }
        }
      }

      recStack.delete(nodeName);
      return false;
    }

    dag.nodes.forEach((_, name) => {
      if (!visited.has(name) && !cycleFound) {
        dfs(name);
      }
    });

    return {
      hasCycles: !!cycleFound,
      cycle: cycleFound
    };
  }

  function freezeVariable(dag, varName, frozenValue) {
    if (!dag || !dag.nodes) return false;
    const node = dag.nodes.get(varName);
    if (!node) return false;
    node._frozenValue = (frozenValue !== undefined) ? frozenValue : node.value;
    node._isFrozen = true;
    dag.evaluate();
    return true;
  }

  function resetVariable(dag, varName) {
    if (!dag || !dag.nodes) return false;
    const node = dag.nodes.get(varName);
    if (!node) return false;
    node._isFrozen = false;
    delete node._frozenValue;
    dag.evaluate();
    return true;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PUBLIC API EXPORT
  // ─────────────────────────────────────────────────────────────────────────────

  return {
    tokenize,
    ExpressionParser,
    evaluateAst,
    extractVariables,
    evaluateFormula,
    ReactiveDAG,
    SIMULATION_PRESETS,
    generateSimulationCard,
    onSliderInput,
    activeSimulationDAGs,
    traceDependencies,
    detectCycles,
    freezeVariable,
    resetVariable
  };
}));
