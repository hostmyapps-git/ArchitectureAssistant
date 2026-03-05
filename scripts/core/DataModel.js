(function () {
  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  class ArchitectureDataModel {
    constructor(options) {
      this.storageKey = options.storageKey;
      this.defaultState = options.defaultState;
      this.state = this.loadState();
      this.listeners = new Set();
    }

    createDefaultDiagram(elements) {
      const id = "dia_" + Math.random().toString(36).slice(2, 9);
      const ids = elements.map(function (element) {
        return element.id;
      });
      const elementLayout = {};
      elements.forEach(function (element) {
        if (!element || !element.id) {
          return;
        }
        const x = Number(element.x);
        const y = Number(element.y);
        if (Number.isFinite(x) || Number.isFinite(y)) {
          elementLayout[element.id] = {
            x: Number.isFinite(x) ? x : 0,
            y: Number.isFinite(y) ? y : 0
          };
        }
      });
      return {
        id: id,
        name: "Main Diagram",
        title: "Main Diagram",
        view: "",
        type: "standard",
        lineMode: null,
        elementIds: ids,
        elementLayout: elementLayout,
        allocationSourceView: "All",
        allocationTargetView: "All",
        allocationRelationshipType: "All",
        roadmapTimeScale: "month",
        roadmapStartDate: "",
        roadmapEndDate: "",
        roadmapRows: [],
        focusElementId: ids[0] || null,
        depth: 1
      };
    }

    normalizeModel(model) {
      const normalizedModel = model || {};
      normalizedModel.elements = Array.isArray(normalizedModel.elements) ? normalizedModel.elements : [];
      normalizedModel.relationships = Array.isArray(normalizedModel.relationships) ? normalizedModel.relationships : [];
      normalizedModel.diagrams = Array.isArray(normalizedModel.diagrams) ? normalizedModel.diagrams : [];

      if (normalizedModel.diagrams.length === 0) {
        normalizedModel.diagrams = [this.createDefaultDiagram(normalizedModel.elements)];
      } else {
        normalizedModel.diagrams = normalizedModel.diagrams.map(function (diagram, index) {
          const fallbackId = "dia_" + Math.random().toString(36).slice(2, 9);
          const ids = Array.isArray(diagram.elementIds) ? diagram.elementIds : [];
          const rawLayout = (diagram && typeof diagram.elementLayout === "object" && diagram.elementLayout)
            ? diagram.elementLayout
            : {};
          const elementLayout = {};
          Object.keys(rawLayout).forEach(function (elementId) {
            if (ids.indexOf(elementId) < 0) {
              return;
            }
            const point = rawLayout[elementId] || {};
            const x = Number(point.x);
            const y = Number(point.y);
            if (!Number.isFinite(x) && !Number.isFinite(y)) {
              return;
            }
            elementLayout[elementId] = {
              x: Number.isFinite(x) ? x : 0,
              y: Number.isFinite(y) ? y : 0
            };
          });
          ids.forEach(function (elementId) {
            if (elementLayout[elementId]) {
              return;
            }
            const sourceElement = (normalizedModel.elements || []).find(function (entry) {
              return entry && entry.id === elementId;
            });
            if (!sourceElement) {
              return;
            }
            const x = Number(sourceElement.x);
            const y = Number(sourceElement.y);
            if (!Number.isFinite(x) && !Number.isFinite(y)) {
              return;
            }
            elementLayout[elementId] = {
              x: Number.isFinite(x) ? x : 0,
              y: Number.isFinite(y) ? y : 0
            };
          });
          return {
            id: diagram.id || fallbackId,
            name: diagram.name || "Diagram " + (index + 1),
            title: diagram.title || diagram.name || "Diagram " + (index + 1),
            view: diagram.view || "",
            type: (function () {
              const rawType = String(diagram.type || "").trim().toLowerCase();
              if (rawType === "clickable") {
                return "clickable";
              }
              if (rawType === "roadmap") {
                return "roadmap";
              }
              if (
                rawType === "allocationmatrix" ||
                rawType === "allocation matrix" ||
                rawType === "allocation" ||
                rawType === "matrix"
              ) {
                return "allocationMatrix";
              }
              return "standard";
            })(),
            lineMode: ["straight", "curved", "ortho"].includes(diagram.lineMode) ? diagram.lineMode : null,
            elementIds: ids,
            elementLayout: elementLayout,
            allocationSourceView: String(diagram.allocationSourceView || "All").trim() || "All",
            allocationTargetView: String(diagram.allocationTargetView || "All").trim() || "All",
            allocationRelationshipType: String(diagram.allocationRelationshipType || "All").trim() || "All",
            roadmapTimeScale: ["month", "quarter", "year"].includes(String(diagram.roadmapTimeScale || "").trim().toLowerCase())
              ? String(diagram.roadmapTimeScale || "").trim().toLowerCase()
              : "month",
            roadmapStartDate: String(diagram.roadmapStartDate || "").trim(),
            roadmapEndDate: String(diagram.roadmapEndDate || "").trim(),
            roadmapRows: Array.isArray(diagram.roadmapRows)
              ? diagram.roadmapRows
                  .map(function (row) {
                    const rowId = String((row && row.id) || ("rr_" + Math.random().toString(36).slice(2, 9))).trim();
                    const mode = String((row && row.mode) || "range").trim().toLowerCase() === "milestone"
                      ? "milestone"
                      : "range";
                    return {
                      id: rowId,
                      nodeId: String((row && row.nodeId) || "").trim(),
                      mode: mode,
                      startAttr: String((row && row.startAttr) || "").trim(),
                      endAttr: String((row && row.endAttr) || "").trim(),
                      milestoneAttr: String((row && row.milestoneAttr) || "").trim(),
                      label: String((row && row.label) || "").trim()
                    };
                  })
              : [],
            focusElementId: diagram.focusElementId || null,
            depth: Number.isFinite(diagram.depth) && diagram.depth >= 1 ? Math.floor(diagram.depth) : 1
          };
        });
      }
      return normalizedModel;
    }

    normalizeArchitecture(architecture, index) {
      const fallbackId = "arch_" + Math.random().toString(36).slice(2, 9);
      const base = architecture || {};
      return {
        id: base.id || fallbackId,
        name: (base.name || "").trim() || "Architecture " + (index + 1),
        baseline: deepClone(base.baseline || deepClone(this.defaultState.baseline)),
        model: this.normalizeModel(deepClone(base.model || {}))
      };
    }

    snapshotActiveArchitectureState() {
      return {
        baseline: deepClone(this.state.baseline || deepClone(this.defaultState.baseline)),
        model: this.normalizeModel(deepClone(this.state.model || {}))
      };
    }

    getActiveArchitectureIndex() {
      return this.state.architectures.findIndex((entry) => {
        return entry.id === this.state.ui.activeArchitectureId;
      });
    }

    syncActiveArchitectureSnapshot() {
      if (!Array.isArray(this.state.architectures) || this.state.architectures.length === 0) {
        return;
      }
      const index = this.getActiveArchitectureIndex();
      if (index < 0) {
        return;
      }
      const current = this.state.architectures[index];
      const snapshot = this.snapshotActiveArchitectureState();
      this.state.architectures[index] = {
        ...current,
        baseline: snapshot.baseline,
        model: snapshot.model
      };
    }

    normalizeState(candidateState) {
      const normalized = candidateState || deepClone(this.defaultState);
      normalized.model = this.normalizeModel(deepClone(normalized.model || {}));
      normalized.baseline = deepClone(normalized.baseline || this.defaultState.baseline);

      normalized.ui = normalized.ui || {};
      normalized.architectures = Array.isArray(normalized.architectures) ? normalized.architectures : [];
      if (normalized.architectures.length === 0) {
        normalized.architectures = [
          this.normalizeArchitecture(
            {
              id: "arch_main",
              name: "Main Architecture",
              baseline: normalized.baseline,
              model: normalized.model
            },
            0
          )
        ];
      } else {
        normalized.architectures = normalized.architectures.map((architecture, index) => {
          return this.normalizeArchitecture(architecture, index);
        });
      }
      const architectureIds = new Set(
        normalized.architectures.map(function (entry) {
          return entry.id;
        })
      );
      normalized.ui.activeArchitectureId = architectureIds.has(normalized.ui.activeArchitectureId)
        ? normalized.ui.activeArchitectureId
        : normalized.architectures[0].id;
      const activeArchitecture = normalized.architectures.find((entry) => {
        return entry.id === normalized.ui.activeArchitectureId;
      }) || normalized.architectures[0];
      normalized.baseline = deepClone(activeArchitecture.baseline);
      normalized.model = this.normalizeModel(deepClone(activeArchitecture.model));

      const hasActive = normalized.model.diagrams.some(function (diagram) {
        return diagram.id === normalized.ui.activeDiagramId;
      });
      normalized.ui.activeDiagramId = hasActive ? normalized.ui.activeDiagramId : normalized.model.diagrams[0].id;
      normalized.ui.elementViewFilter = normalized.ui.elementViewFilter || "All";
      normalized.ui.elementOrphanFilter = normalized.ui.elementOrphanFilter || "all";
      normalized.ui.relationshipViewFilter = normalized.ui.relationshipViewFilter || "All";
      const zoomValue = Number(normalized.ui.diagramZoom);
      normalized.ui.diagramZoom = Number.isFinite(zoomValue) ? Math.max(10, Math.min(400, Math.round(zoomValue))) : 100;
      normalized.ui.diagramPanX = Number.isFinite(Number(normalized.ui.diagramPanX)) ? Number(normalized.ui.diagramPanX) : 0;
      normalized.ui.diagramPanY = Number.isFinite(Number(normalized.ui.diagramPanY)) ? Number(normalized.ui.diagramPanY) : 0;
      normalized.ui.leftDiagramsCollapsed = !!normalized.ui.leftDiagramsCollapsed;
      normalized.ui.leftCreateCollapsed = !!normalized.ui.leftCreateCollapsed;
      normalized.ui.leftEditCollapsed = !!normalized.ui.leftEditCollapsed;
      normalized.ui.rightToolbarCollapsed = !!normalized.ui.rightToolbarCollapsed;
      normalized.ui.rightMetaCollapsed = !!normalized.ui.rightMetaCollapsed;
      normalized.ui.sidebarBaselineCollapsed = !!normalized.ui.sidebarBaselineCollapsed;
      normalized.ui.sidebarViewFilterCollapsed = !!normalized.ui.sidebarViewFilterCollapsed;
      normalized.ui.sidebarStatsCollapsed = !!normalized.ui.sidebarStatsCollapsed;
      normalized.ui.sidebarColorsCollapsed = !!normalized.ui.sidebarColorsCollapsed;
      normalized.ui.theme = ["naf", "light", "dark"].includes(normalized.ui.theme) ? normalized.ui.theme : "dark";
      normalized.ui.selectionDrawerOpen = !!normalized.ui.selectionDrawerOpen;
      normalized.ui.selectedNodeId = normalized.ui.selectedNodeId || null;
      normalized.ui.selectedNodeIds = Array.isArray(normalized.ui.selectedNodeIds)
        ? normalized.ui.selectedNodeIds.filter(function (value) {
            return !!value;
          })
        : (normalized.ui.selectedNodeId ? [normalized.ui.selectedNodeId] : []);
      normalized.ui.selectedEdgeId = normalized.ui.selectedEdgeId || null;
      normalized.ui.elementSearch = normalized.ui.elementSearch || "";
      normalized.ui.relationshipSearch = normalized.ui.relationshipSearch || "";
      normalized.ui.diagramFindQuery = normalized.ui.diagramFindQuery || "";
      normalized.ui.dataSplitLeftWidth = Number.isFinite(Number(normalized.ui.dataSplitLeftWidth))
        ? Number(normalized.ui.dataSplitLeftWidth)
        : null;
      return normalized;
    }

    loadState() {
      try {
        const raw = localStorage.getItem(this.storageKey);
        if (!raw) {
          return this.normalizeState(deepClone(this.defaultState));
        }
        return this.normalizeState({ ...deepClone(this.defaultState), ...JSON.parse(raw) });
      } catch {
        return this.normalizeState(deepClone(this.defaultState));
      }
    }

    compactBaselineForPersist(baseline) {
      const source = baseline || {};
      const architecture = source.architecture || { views: [], categories: [], nodeTypes: [], edgeTypes: [] };
      return {
        source: source.source || "",
        name: source.name || "",
        version: source.version || "",
        format: source.format || "architectureMetaModel",
        schemaVersion: source.schemaVersion || 2,
        metaModelId: source.metaModelId || "",
        fileName: source.fileName || "",
        isLoaded: !!source.isLoaded,
        isDefaultMetaModel: !!source.isDefaultMetaModel,
        loadedCategoryColors: deepClone(source.loadedCategoryColors || {}),
        architecture: deepClone(architecture)
      };
    }

    buildPersistableState() {
      const state = deepClone(this.state || {});
      state.baseline = this.compactBaselineForPersist(state.baseline);
      const architectures = Array.isArray(state.architectures) ? state.architectures : [];
      const activeArchitectureId = (state.ui && state.ui.activeArchitectureId) || "";
      const activeArchitecture = architectures.find((entry) => {
        return entry && entry.id === activeArchitectureId;
      }) || architectures[0] || null;
      state.architectures = activeArchitecture
        ? [{
            ...activeArchitecture,
            baseline: this.compactBaselineForPersist(activeArchitecture.baseline),
            model: this.normalizeModel(deepClone(activeArchitecture.model || {}))
          }]
        : [];
      if (state.ui) {
        state.ui.activeArchitectureId = activeArchitecture ? activeArchitecture.id : "";
      }
      return state;
    }

    persist() {
      const persistableState = this.buildPersistableState();
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(persistableState));
      } catch (error) {
        if (error && (error.name === "QuotaExceededError" || String(error).includes("quota"))) {
          console.warn("[storage] State exceeds localStorage quota. Keeping session in memory only.");
          return;
        }
        throw error;
      }
    }

    subscribe(listener) {
      this.listeners.add(listener);
      return () => {
        this.listeners.delete(listener);
      };
    }

    notify() {
      this.syncActiveArchitectureSnapshot();
      this.persist();
      this.listeners.forEach((listener) => {
        listener(this.state);
      });
    }

    getState() {
      return this.state;
    }

    getArchitectures() {
      return (this.state.architectures || []).map(function (entry) {
        return { id: entry.id, name: entry.name };
      });
    }

    setState(nextState) {
      const candidate = deepClone(nextState || {});
      this.state = this.normalizeState({ ...deepClone(this.defaultState), ...candidate });
      this.notify();
    }

    resetModel(model) {
      const nextModel = {
        elements: Array.isArray(model.elements) ? model.elements : [],
        relationships: Array.isArray(model.relationships) ? model.relationships : [],
        diagrams: Array.isArray(model.diagrams) ? model.diagrams : []
      };
      this.state.model = nextModel;
      if (Array.isArray(this.state.architectures) && this.state.architectures.length > 0) {
        const activeIndex = this.getActiveArchitectureIndex();
        const targetIndex = activeIndex >= 0 ? activeIndex : 0;
        const currentArchitecture = this.state.architectures[targetIndex] || {};
        this.state.architectures[targetIndex] = {
          ...currentArchitecture,
          model: this.normalizeModel(deepClone(nextModel))
        };
        if (!this.state.ui.activeArchitectureId && this.state.architectures[targetIndex].id) {
          this.state.ui.activeArchitectureId = this.state.architectures[targetIndex].id;
        }
      }
      this.state = this.normalizeState(this.state);
      this.notify();
    }

    setBaseline(baseline) {
      this.state.baseline = baseline;
      this.notify();
    }

    setUi(partialUi) {
      this.state.ui = { ...this.state.ui, ...partialUi };
      this.notify();
    }

    clearNodeColorOverrides() {
      this.state.model.elements = this.state.model.elements.map(function (element) {
        if (!element.bgColor && !element.fontColor) {
          return element;
        }
        return {
          ...element,
          bgColor: "",
          fontColor: ""
        };
      });
      this.notify();
    }

    upsertElement(element) {
      const index = this.state.model.elements.findIndex(function (entry) {
        return entry.id === element.id;
      });
      if (index >= 0) {
        this.state.model.elements[index] = element;
      } else {
        this.state.model.elements.push(element);
      }
      this.notify();
    }

    deleteElement(elementId) {
      if (this.state.ui.selectedNodeId === elementId) {
        this.state.ui.selectedNodeId = null;
      }
      this.state.ui.selectedNodeIds = (this.state.ui.selectedNodeIds || []).filter(function (id) {
        return id !== elementId;
      });
      const selectedRelationship = this.state.model.relationships.find((entry) => {
        return entry.id === this.state.ui.selectedEdgeId;
      });
      if (
        selectedRelationship &&
        (selectedRelationship.sourceId === elementId || selectedRelationship.targetId === elementId)
      ) {
        this.state.ui.selectedEdgeId = null;
      }
      if (
        !this.state.ui.selectedNodeId &&
        (!Array.isArray(this.state.ui.selectedNodeIds) || this.state.ui.selectedNodeIds.length === 0) &&
        !this.state.ui.selectedEdgeId
      ) {
        this.state.ui.selectionDrawerOpen = false;
      }

      this.state.model.elements = this.state.model.elements.filter(function (entry) {
        return entry.id !== elementId;
      });
      this.state.model.relationships = this.state.model.relationships.filter(function (entry) {
        return entry.sourceId !== elementId && entry.targetId !== elementId;
      });
      this.state.model.diagrams = this.state.model.diagrams.map(function (diagram) {
        const nextIds = diagram.elementIds.filter(function (id) {
          return id !== elementId;
        });
        const nextFocus = diagram.focusElementId === elementId ? (nextIds[0] || null) : diagram.focusElementId;
        const nextLayout = { ...(diagram.elementLayout || {}) };
        delete nextLayout[elementId];
        return { ...diagram, elementIds: nextIds, elementLayout: nextLayout, focusElementId: nextFocus };
      });
      this.notify();
    }

    upsertRelationship(relationship) {
      const index = this.state.model.relationships.findIndex(function (entry) {
        return entry.id === relationship.id;
      });
      if (index >= 0) {
        this.state.model.relationships[index] = relationship;
      } else {
        this.state.model.relationships.push(relationship);
      }
      this.notify();
    }

    deleteRelationship(relationshipId) {
      if (this.state.ui.selectedEdgeId === relationshipId) {
        this.state.ui.selectedEdgeId = null;
      }
      if (
        !this.state.ui.selectedNodeId &&
        (!Array.isArray(this.state.ui.selectedNodeIds) || this.state.ui.selectedNodeIds.length === 0) &&
        !this.state.ui.selectedEdgeId
      ) {
        this.state.ui.selectionDrawerOpen = false;
      }
      this.state.model.relationships = this.state.model.relationships.filter(function (entry) {
        return entry.id !== relationshipId;
      });
      this.notify();
    }

    resetAllOrthoControls() {
      this.state.model.relationships = this.state.model.relationships.map(function (relationship) {
        if (!relationship.orthoControl) {
          return relationship;
        }
        return { ...relationship, orthoControl: null };
      });
      this.notify();
    }

    upsertDiagram(diagram) {
      const index = this.state.model.diagrams.findIndex(function (entry) {
        return entry.id === diagram.id;
      });
      if (index >= 0) {
        this.state.model.diagrams[index] = diagram;
      } else {
        this.state.model.diagrams.push(diagram);
      }
      this.notify();
    }

    deleteDiagram(diagramId) {
      if (this.state.model.diagrams.length <= 1) {
        return;
      }
      const index = this.state.model.diagrams.findIndex(function (entry) {
        return entry.id === diagramId;
      });
      if (index < 0) {
        return;
      }
      this.state.model.diagrams.splice(index, 1);
      if (this.state.ui.activeDiagramId === diagramId) {
        const fallback = this.state.model.diagrams[Math.max(0, index - 1)] || this.state.model.diagrams[0] || null;
        this.state.ui.activeDiagramId = fallback ? fallback.id : null;
      }
      this.notify();
    }

    getActiveDiagram(currentState) {
      const diagrams = (currentState.model && currentState.model.diagrams) || [];
      return diagrams.find(function (diagram) {
        return diagram.id === currentState.ui.activeDiagramId;
      }) || diagrams[0] || null;
    }

    createArchitecture(name) {
      const nextName = (name || "").trim() || "New Architecture";
      this.syncActiveArchitectureSnapshot();
      const id = "arch_" + Math.random().toString(36).slice(2, 9);
      const architecture = this.normalizeArchitecture(
        {
          id: id,
          name: nextName,
          baseline: deepClone(this.defaultState.baseline),
          model: { elements: [], relationships: [], diagrams: [] }
        },
        this.state.architectures.length
      );
      this.state.architectures.push(architecture);
      this.state.ui.activeArchitectureId = id;
      this.state.baseline = deepClone(architecture.baseline);
      this.state.model = this.normalizeModel(deepClone(architecture.model));
      this.state = this.normalizeState(this.state);
      this.notify();
      return id;
    }

    saveActiveArchitectureAs(name) {
      const nextName = (name || "").trim() || "Architecture Copy";
      this.syncActiveArchitectureSnapshot();
      const snapshot = this.snapshotActiveArchitectureState();
      const id = "arch_" + Math.random().toString(36).slice(2, 9);
      const architecture = this.normalizeArchitecture(
        {
          id: id,
          name: nextName,
          baseline: snapshot.baseline,
          model: snapshot.model
        },
        this.state.architectures.length
      );
      this.state.architectures.push(architecture);
      this.state.ui.activeArchitectureId = id;
      this.state = this.normalizeState(this.state);
      this.notify();
      return id;
    }

    loadArchitecture(architectureId) {
      const targetId = (architectureId || "").trim();
      if (!targetId) {
        return false;
      }
      this.syncActiveArchitectureSnapshot();
      const target = this.state.architectures.find(function (entry) {
        return entry.id === targetId;
      });
      if (!target) {
        return false;
      }
      this.state.ui.activeArchitectureId = target.id;
      this.state.baseline = deepClone(target.baseline);
      this.state.model = this.normalizeModel(deepClone(target.model));
      this.state = this.normalizeState(this.state);
      this.notify();
      return true;
    }

    renameArchitecture(architectureId, name) {
      const targetId = (architectureId || "").trim();
      const nextName = (name || "").trim();
      if (!targetId || !nextName) {
        return false;
      }
      const index = this.state.architectures.findIndex(function (entry) {
        return entry.id === targetId;
      });
      if (index < 0) {
        return false;
      }
      this.state.architectures[index] = {
        ...this.state.architectures[index],
        name: nextName
      };
      this.notify();
      return true;
    }

    deleteArchitecture(architectureId) {
      if (!Array.isArray(this.state.architectures) || this.state.architectures.length <= 1) {
        return false;
      }
      const targetId = (architectureId || "").trim();
      const index = this.state.architectures.findIndex(function (entry) {
        return entry.id === targetId;
      });
      if (index < 0) {
        return false;
      }
      this.syncActiveArchitectureSnapshot();
      this.state.architectures.splice(index, 1);
      if (this.state.ui.activeArchitectureId === targetId) {
        const fallback = this.state.architectures[Math.max(0, index - 1)] || this.state.architectures[0];
        this.state.ui.activeArchitectureId = fallback.id;
        this.state.baseline = deepClone(fallback.baseline);
        this.state.model = this.normalizeModel(deepClone(fallback.model));
      }
      this.state = this.normalizeState(this.state);
      this.notify();
      return true;
    }
  }

  window.ArchitectureDataModel = ArchitectureDataModel;
})();
