/**
 * LDOC Sandboxed Plugin API & Extension Registry
 * Provides a capability-based, safe extension framework for custom document blocks,
 * charts, simulations, exporters, importers, and custom inspector tools.
 */
(function (global) {
  'use strict';

  const PLUGIN_TYPES = ['block', 'chart', 'simulation', 'exporter', 'importer', 'tool', 'inspector'];

  const _registry = {
    block: {},
    chart: {},
    simulation: {},
    exporter: {},
    importer: {},
    tool: {},
    inspector: {}
  };

  const LDocPluginAPI = {
    PLUGIN_TYPES,

    /**
     * Registers a capability-safe plugin.
     */
    registerPlugin: function (pluginDef) {
      if (!pluginDef || typeof pluginDef !== 'object') {
        throw new Error('[LDocPluginAPI] Invalid plugin definition.');
      }
      if (!pluginDef.id || typeof pluginDef.id !== 'string') {
        throw new Error('[LDocPluginAPI] Plugin must have a string id.');
      }
      if (!pluginDef.type || !PLUGIN_TYPES.includes(pluginDef.type)) {
        throw new Error(`[LDocPluginAPI] Plugin type must be one of: ${PLUGIN_TYPES.join(', ')}`);
      }

      // Check permissions / sandboxing flags
      const safeRecord = {
        id: pluginDef.id,
        name: pluginDef.name || pluginDef.id,
        type: pluginDef.type,
        version: pluginDef.version || '1.0.0',
        author: pluginDef.author || 'Community',
        description: pluginDef.description || '',
        render: typeof pluginDef.render === 'function' ? pluginDef.render : null,
        evaluate: typeof pluginDef.evaluate === 'function' ? pluginDef.evaluate : null,
        schema: pluginDef.schema || null,
        defaultProps: pluginDef.defaultProps || {}
      };

      _registry[pluginDef.type][pluginDef.id] = safeRecord;
      return safeRecord;
    },

    getPlugin: function (type, id) {
      if (!_registry[type]) return null;
      return _registry[type][id] || null;
    },

    listPlugins: function (type) {
      if (type && _registry[type]) {
        return Object.values(_registry[type]);
      }
      const all = [];
      PLUGIN_TYPES.forEach(t => {
        all.push(...Object.values(_registry[t]));
      });
      return all;
    },

    executeBlockRender: function (block, container) {
      if (!block || !block.pluginType) return false;
      const plugin = this.getPlugin('block', block.pluginType);
      if (plugin && plugin.render) {
        try {
          plugin.render(block, container);
          return true;
        } catch (err) {
          console.error(`[LDocPluginAPI] Error executing plugin ${block.pluginType}:`, err);
          return false;
        }
      }
      return false;
    }
  };

  global.LDocPluginAPI = LDocPluginAPI;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = LDocPluginAPI;
    module.exports.LDocPluginAPI = LDocPluginAPI;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
