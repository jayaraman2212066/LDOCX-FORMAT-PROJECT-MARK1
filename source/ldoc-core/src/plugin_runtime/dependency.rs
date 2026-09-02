use std::collections::{HashMap, HashSet, VecDeque};
use crate::plugin_runtime::types::PluginId;
use crate::plugin_runtime::manifest::PluginDependency;
use crate::plugin_runtime::error::PluginRuntimeError;

// ── DependencyNode ────────────────────────────────────────────────────────────

/// A single node in the dependency graph.
#[derive(Debug, Clone)]
pub struct DependencyNode {
    pub plugin_id:    PluginId,
    pub version:      String,
    pub dependencies: Vec<PluginDependency>,
}

// ── DependencyGraph ───────────────────────────────────────────────────────────

/// Directed acyclic graph of plugin dependencies.
#[derive(Debug, Default)]
pub struct DependencyGraph {
    nodes: HashMap<PluginId, DependencyNode>,
}

impl DependencyGraph {
    pub fn new() -> Self {
        Self::default()
    }

    /// Add a plugin node to the graph.
    pub fn add_node(&mut self, node: DependencyNode) {
        self.nodes.insert(node.plugin_id.clone(), node);
    }

    /// Returns true if the graph contains the given plugin.
    pub fn contains(&self, plugin_id: &PluginId) -> bool {
        self.nodes.contains_key(plugin_id)
    }

    /// Returns the node for a plugin, if present.
    pub fn get(&self, plugin_id: &PluginId) -> Option<&DependencyNode> {
        self.nodes.get(plugin_id)
    }

    /// Returns all plugin IDs in the graph.
    pub fn all_ids(&self) -> impl Iterator<Item = &PluginId> {
        self.nodes.keys()
    }
}

// ── DependencyResolver ────────────────────────────────────────────────────────

/// Resolves plugin dependencies and produces a valid topological load order.
pub struct DependencyResolver {
    graph: DependencyGraph,
}

impl DependencyResolver {
    pub fn new(graph: DependencyGraph) -> Self {
        Self { graph }
    }

    /// Resolve the full dependency graph and return a topological load order.
    ///
    /// The returned Vec is ordered so that each plugin appears after all its
    /// dependencies — i.e. the first element should be loaded first.
    ///
    /// Returns `Err(DependencyCycle)` if a cycle is detected.
    /// Returns `Err(DependencyNotFound)` if a required dependency is absent.
    /// Returns `Err(VersionConflict)` if two plugins require incompatible versions.
    pub fn resolve(&self) -> Result<Vec<PluginId>, PluginRuntimeError> {
        // Step 1: Validate all required dependencies are present.
        self.validate_required_deps()?;

        // Step 2: Detect cycles using DFS.
        self.detect_cycles()?;

        // Step 3: Topological sort (Kahn's algorithm).
        self.topological_sort()
    }

    // ── Step 1: Required dependency validation ────────────────────────────────

    fn validate_required_deps(&self) -> Result<(), PluginRuntimeError> {
        for node in self.graph.nodes.values() {
            for dep in &node.dependencies {
                if dep.optional {
                    continue;
                }
                if !self.graph.contains(&dep.plugin_id) {
                    return Err(PluginRuntimeError::DependencyNotFound {
                        plugin_id: node.plugin_id.clone(),
                        dep_id:    dep.plugin_id.clone(),
                    });
                }
                // Version compatibility check.
                if let Some(dep_node) = self.graph.get(&dep.plugin_id) {
                    if !version_satisfies(&dep_node.version, &dep.version_req) {
                        return Err(PluginRuntimeError::VersionConflict {
                            dep_id: dep.plugin_id.clone(),
                            reason: format!(
                                "plugin '{}' requires '{}' @ '{}', found '{}'",
                                node.plugin_id,
                                dep.plugin_id,
                                dep.version_req,
                                dep_node.version,
                            ),
                        });
                    }
                }
            }
        }
        Ok(())
    }

    // ── Step 2: Cycle detection (DFS) ─────────────────────────────────────────

    fn detect_cycles(&self) -> Result<(), PluginRuntimeError> {
        let mut visited:    HashSet<PluginId> = HashSet::new();
        let mut in_stack:   HashSet<PluginId> = HashSet::new();
        let mut stack_path: Vec<PluginId>     = Vec::new();

        for id in self.graph.nodes.keys() {
            if !visited.contains(id) {
                self.dfs_cycle(id, &mut visited, &mut in_stack, &mut stack_path)?;
            }
        }
        Ok(())
    }

    fn dfs_cycle(
        &self,
        id:         &PluginId,
        visited:    &mut HashSet<PluginId>,
        in_stack:   &mut HashSet<PluginId>,
        stack_path: &mut Vec<PluginId>,
    ) -> Result<(), PluginRuntimeError> {
        visited.insert(id.clone());
        in_stack.insert(id.clone());
        stack_path.push(id.clone());

        if let Some(node) = self.graph.get(id) {
            for dep in &node.dependencies {
                if dep.optional && !self.graph.contains(&dep.plugin_id) {
                    continue;
                }
                if !visited.contains(&dep.plugin_id) {
                    self.dfs_cycle(&dep.plugin_id, visited, in_stack, stack_path)?;
                } else if in_stack.contains(&dep.plugin_id) {
                    // Cycle found — build the cycle path.
                    let cycle_start = stack_path
                        .iter()
                        .position(|p| p == &dep.plugin_id)
                        .unwrap_or(0);
                    let mut cycle_path = stack_path[cycle_start..].to_vec();
                    cycle_path.push(dep.plugin_id.clone());
                    return Err(PluginRuntimeError::DependencyCycle { path: cycle_path });
                }
            }
        }

        in_stack.remove(id);
        stack_path.pop();
        Ok(())
    }

    // ── Step 3: Topological sort (Kahn's algorithm) ───────────────────────────

    fn topological_sort(&self) -> Result<Vec<PluginId>, PluginRuntimeError> {
        // Build in-degree map and adjacency list.
        let mut in_degree: HashMap<PluginId, usize> = HashMap::new();
        let mut adj:       HashMap<PluginId, Vec<PluginId>> = HashMap::new();

        for id in self.graph.all_ids() {
            in_degree.entry(id.clone()).or_insert(0);
            adj.entry(id.clone()).or_default();
        }

        for node in self.graph.nodes.values() {
            for dep in &node.dependencies {
                if dep.optional && !self.graph.contains(&dep.plugin_id) {
                    continue;
                }
                // dep.plugin_id must be loaded before node.plugin_id
                adj.entry(dep.plugin_id.clone())
                    .or_default()
                    .push(node.plugin_id.clone());
                *in_degree.entry(node.plugin_id.clone()).or_insert(0) += 1;
            }
        }

        // Kahn's BFS.
        let mut queue: VecDeque<PluginId> = in_degree
            .iter()
            .filter(|(_, &deg)| deg == 0)
            .map(|(id, _)| id.clone())
            .collect();

        let mut order: Vec<PluginId> = Vec::with_capacity(self.graph.nodes.len());

        while let Some(id) = queue.pop_front() {
            order.push(id.clone());
            if let Some(dependents) = adj.get(&id) {
                for dep in dependents {
                    let deg = in_degree.get_mut(dep).unwrap();
                    *deg -= 1;
                    if *deg == 0 {
                        queue.push_back(dep.clone());
                    }
                }
            }
        }

        // If order doesn't contain all nodes, there's a cycle (should have been
        // caught in detect_cycles, but guard here for safety).
        if order.len() != self.graph.nodes.len() {
            return Err(PluginRuntimeError::DependencyCycle { path: vec![] });
        }

        Ok(order)
    }
}

// ── Version compatibility ─────────────────────────────────────────────────────

/// Minimal semver-compatible version check.
/// Supports: `^X.Y.Z`, `~X.Y.Z`, `=X.Y.Z`, `>=X.Y.Z`, `*`.
/// Returns true if `version` satisfies `requirement`.
fn version_satisfies(version: &str, requirement: &str) -> bool {
    if requirement == "*" || requirement.is_empty() {
        return true;
    }

    let (op, req_ver) = if let Some(v) = requirement.strip_prefix(">=") {
        (">=", v.trim())
    } else if let Some(v) = requirement.strip_prefix('=') {
        ("=", v.trim())
    } else if let Some(v) = requirement.strip_prefix('^') {
        ("^", v.trim())
    } else if let Some(v) = requirement.strip_prefix('~') {
        ("~", v.trim())
    } else {
        ("^", requirement.trim())
    };

    let v  = parse_semver(version);
    let rv = parse_semver(req_ver);

    match (v, rv) {
        (Some((ma, mi, pa)), Some((rma, rmi, rpa))) => match op {
            "="  => ma == rma && mi == rmi && pa == rpa,
            ">=" => (ma, mi, pa) >= (rma, rmi, rpa),
            "^"  => ma == rma && (mi, pa) >= (rmi, rpa),
            "~"  => ma == rma && mi == rmi && pa >= rpa,
            _    => false,
        },
        _ => false,
    }
}

fn parse_semver(s: &str) -> Option<(u64, u64, u64)> {
    let parts: Vec<&str> = s.split('.').collect();
    if parts.len() < 3 {
        return None;
    }
    let ma = parts[0].parse().ok()?;
    let mi = parts[1].parse().ok()?;
    let pa = parts[2].split('-').next()?.parse().ok()?;
    Some((ma, mi, pa))
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn node(id: &str, version: &str, deps: Vec<(&str, &str)>) -> DependencyNode {
        DependencyNode {
            plugin_id:    PluginId::new(id),
            version:      version.to_owned(),
            dependencies: deps.into_iter().map(|(dep_id, req)| PluginDependency {
                plugin_id:   PluginId::new(dep_id),
                version_req: req.to_owned(),
                optional:    false,
                platform:    None,
            }).collect(),
        }
    }

    #[test]
    fn linear_chain_resolves() {
        // A → B → C  =>  load order: [C, B, A]
        let mut graph = DependencyGraph::new();
        graph.add_node(node("A", "1.0.0", vec![("B", "^1.0.0")]));
        graph.add_node(node("B", "1.0.0", vec![("C", "^1.0.0")]));
        graph.add_node(node("C", "1.0.0", vec![]));
        let order = DependencyResolver::new(graph).resolve().unwrap();
        let pos = |id: &str| order.iter().position(|p| p.as_str() == id).unwrap();
        assert!(pos("C") < pos("B"));
        assert!(pos("B") < pos("A"));
    }

    #[test]
    fn diamond_resolves_without_duplication() {
        // A → B, A → C, B → D, C → D
        let mut graph = DependencyGraph::new();
        graph.add_node(node("A", "1.0.0", vec![("B", "^1.0.0"), ("C", "^1.0.0")]));
        graph.add_node(node("B", "1.0.0", vec![("D", "^1.0.0")]));
        graph.add_node(node("C", "1.0.0", vec![("D", "^1.0.0")]));
        graph.add_node(node("D", "1.0.0", vec![]));
        let order = DependencyResolver::new(graph).resolve().unwrap();
        assert_eq!(order.iter().filter(|p| p.as_str() == "D").count(), 1);
        let pos = |id: &str| order.iter().position(|p| p.as_str() == id).unwrap();
        assert!(pos("D") < pos("B"));
        assert!(pos("D") < pos("C"));
        assert!(pos("B") < pos("A"));
        assert!(pos("C") < pos("A"));
    }

    #[test]
    fn cycle_detected() {
        let mut graph = DependencyGraph::new();
        graph.add_node(node("A", "1.0.0", vec![("B", "^1.0.0")]));
        graph.add_node(node("B", "1.0.0", vec![("A", "^1.0.0")]));
        let err = DependencyResolver::new(graph).resolve();
        assert!(matches!(err, Err(PluginRuntimeError::DependencyCycle { .. })));
    }

    #[test]
    fn missing_required_dep_errors() {
        let mut graph = DependencyGraph::new();
        graph.add_node(node("A", "1.0.0", vec![("B", "^1.0.0")]));
        // B is not in the graph
        let err = DependencyResolver::new(graph).resolve();
        assert!(matches!(err, Err(PluginRuntimeError::DependencyNotFound { .. })));
    }

    #[test]
    fn version_conflict_detected() {
        let mut graph = DependencyGraph::new();
        graph.add_node(node("A", "1.0.0", vec![("C", "^2.0.0")]));
        graph.add_node(node("C", "1.0.0", vec![])); // A needs ^2.0.0 but C is 1.0.0
        let err = DependencyResolver::new(graph).resolve();
        assert!(matches!(err, Err(PluginRuntimeError::VersionConflict { .. })));
    }

    #[test]
    fn optional_absent_dep_does_not_block() {
        let mut graph = DependencyGraph::new();
        graph.add_node(DependencyNode {
            plugin_id:    PluginId::new("A"),
            version:      "1.0.0".to_owned(),
            dependencies: vec![PluginDependency {
                plugin_id:   PluginId::new("B"),
                version_req: "^1.0.0".to_owned(),
                optional:    true,
                platform:    None,
            }],
        });
        // B is absent but optional — should resolve fine.
        let order = DependencyResolver::new(graph).resolve().unwrap();
        assert_eq!(order.len(), 1);
        assert_eq!(order[0].as_str(), "A");
    }

    #[test]
    fn version_satisfies_caret() {
        assert!(version_satisfies("1.2.3", "^1.0.0"));
        assert!(version_satisfies("1.0.0", "^1.0.0"));
        assert!(!version_satisfies("2.0.0", "^1.0.0"));
    }

    #[test]
    fn version_satisfies_exact() {
        assert!(version_satisfies("1.2.3", "=1.2.3"));
        assert!(!version_satisfies("1.2.4", "=1.2.3"));
    }
}

