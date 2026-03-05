(function () {
  const storageKey = "deltaModelAssistantState";
  const defaultBundledMetaModelFileName = "NAFv4-ADMBw-2025.10.meta.json";
  const customSelectValue = "__custom__";
  const defaultCategoryColorMap = {
    DEFAULT: { bg: "#fffdf8", font: "#1e1d1a" }
  };

  const defaultState = {
    baseline: {
      source: "none",
      name: "No MetaModel Loaded",
      version: "-",
      format: "architectureMetaModel",
      schemaVersion: 2,
      metaModelId: "",
      viewpoints: [],
      stereotypes: [],
      nodeTypes: [],
      edgeTypes: [],
      isLoaded: false,
      isDefaultMetaModel: false,
      architecture: { views: [], categories: [], nodeTypes: [], edgeTypes: [] }
    },
    model: {
      elements: [],
      relationships: [],
      diagrams: []
    },
    ui: {
      activeTab: "dataTab",
      viewpointFilter: "All",
      elementViewFilter: "All",
      elementOrphanFilter: "all",
      relationshipViewFilter: "All",
      lineMode: "straight",
      diagramZoom: 100,
      diagramPanX: 0,
      diagramPanY: 0,
      leftDiagramsCollapsed: false,
      leftCreateCollapsed: false,
      leftEditCollapsed: false,
      rightToolbarCollapsed: false,
      rightMetaCollapsed: false,
      sidebarBaselineCollapsed: false,
      sidebarViewFilterCollapsed: false,
      sidebarStatsCollapsed: false,
      sidebarColorsCollapsed: false,
      sidebarCollapsed: false,
      sidebarWidth: null,
      theme: "dark",
      defaultBaselineFile: defaultBundledMetaModelFileName,
      activeDiagramId: null,
      selectionDrawerOpen: false,
      selectedNodeId: null,
      selectedNodeIds: [],
      selectedEdgeId: null,
      elementSearch: "",
      relationshipSearch: "",
      diagramFindQuery: "",
      dataSplitLeftWidth: null
    }
  };

  function getEffectiveBaseline(baseline) {
    const baselineValue = baseline || {};
    const noMetaModel = {
      source: "none",
      name: "No MetaModel Loaded",
      version: "-",
      format: "architectureMetaModel",
      schemaVersion: 2,
      metaModelId: "",
      fileName: "",
      viewpoints: [],
      stereotypes: [],
      nodeTypes: [],
      edgeTypes: [],
      architecture: { views: [], categories: [], nodeTypes: [], edgeTypes: [] },
      isLoaded: false,
      isDefaultMetaModel: false
    };
    const hasAnyBaselineData =
      !!baselineValue.architecture ||
      (Array.isArray(baselineValue.viewpoints) && baselineValue.viewpoints.length > 0) ||
      (Array.isArray(baselineValue.stereotypes) && baselineValue.stereotypes.length > 0) ||
      (Array.isArray(baselineValue.nodeTypes) && baselineValue.nodeTypes.length > 0) ||
      (Array.isArray(baselineValue.edgeTypes) && baselineValue.edgeTypes.length > 0);
    if (!hasAnyBaselineData) {
      return noMetaModel;
    }
    try {
      if (baselineValue.architecture) {
        const normalized = normalizeArchitectureMetaModel({
          format: baselineValue.format || "architectureMetaModel",
          schemaVersion: baselineValue.schemaVersion || 2,
          source: baselineValue.source,
          metaModelId: baselineValue.metaModelId,
          name: baselineValue.name,
          version: baselineValue.version,
          notes: baselineValue.notes,
          documentation: baselineValue.documentation,
          architecture: baselineValue.architecture
        });
        const nodeTypes = dedupe((normalized.architecture.nodeTypes || []).map(function (entry) {
          return entry.id;
        }));
        const edgeTypes = dedupe((normalized.architecture.edgeTypes || []).map(function (entry) {
          return entry.id;
        }));
        const viewpoints = dedupe((normalized.architecture.views || []).map(function (entry) {
          return entry.name;
        }));
        return {
          source: baselineValue.source || normalized.source || defaultState.baseline.source,
          name: baselineValue.name || normalized.name || defaultState.baseline.name,
          version: baselineValue.version || normalized.version || defaultState.baseline.version,
          format: normalized.format,
          schemaVersion: normalized.schemaVersion,
          metaModelId: normalized.metaModelId || "",
          fileName: baselineValue.fileName || "",
          viewpoints: viewpoints,
          stereotypes: dedupe(nodeTypes.concat(edgeTypes)),
          nodeTypes: nodeTypes,
          edgeTypes: edgeTypes,
          architecture: normalized.architecture,
          isLoaded: true,
          isDefaultMetaModel: !!baselineValue.isDefaultMetaModel
        };
      }
    } catch (error) {
      console.warn("[baseline] failed to normalize architecture baseline", error);
      return noMetaModel;
    }

    const hasViewpoints = Array.isArray(baselineValue.viewpoints) && baselineValue.viewpoints.length;
    const hasStereotypes = Array.isArray(baselineValue.stereotypes) && baselineValue.stereotypes.length;
    const viewpoints = hasViewpoints ? baselineValue.viewpoints : defaultState.baseline.viewpoints;
    const stereotypes = hasStereotypes ? baselineValue.stereotypes : defaultState.baseline.stereotypes;
    const architectureInput = baselineValue.architecture || {};
    const views = dedupe(
      (Array.isArray(architectureInput.views) ? architectureInput.views : viewpoints).map(function (entry) {
        if (typeof entry === "string") {
          return entry;
        }
        return (entry && (entry.name || entry.id)) || "";
      })
    ).map(function (name) {
      return {
        id: name,
        name: name,
        category: inferViewCategory(name)
      };
    });
    const nodeTypeNames = dedupe(
      (Array.isArray(architectureInput.nodeTypes) ? architectureInput.nodeTypes : stereotypes).map(function (entry) {
        if (typeof entry === "string") {
          return entry;
        }
        return (entry && (entry.id || entry.name || entry.stereotype)) || "";
      })
    );
    const edgeTypeNames = dedupe(
      (Array.isArray(architectureInput.edgeTypes) ? architectureInput.edgeTypes : stereotypes).map(function (entry) {
        if (typeof entry === "string") {
          return entry;
        }
        return (entry && (entry.id || entry.name || entry.stereotype)) || "";
      })
    );

    return {
      source: baselineValue.source || defaultState.baseline.source,
      name: baselineValue.name || defaultState.baseline.name,
      version: baselineValue.version || defaultState.baseline.version,
      format: baselineValue.format || "architectureMetaModel",
      schemaVersion: baselineValue.schemaVersion || 2,
      metaModelId: baselineValue.metaModelId || "",
      fileName: baselineValue.fileName || "",
      viewpoints: viewpoints,
      stereotypes: stereotypes,
      nodeTypes: nodeTypeNames,
      edgeTypes: edgeTypeNames,
      architecture: {
        views: views,
        categories: [],
        nodeTypes: nodeTypeNames.map(function (name) {
          return { id: name, label: name, allowedViews: [] };
        }),
        edgeTypes: edgeTypeNames.map(function (name) {
          return { id: name, label: name, sourceNodeTypes: [], targetNodeTypes: [], allowedViews: [] };
        })
      },
      isLoaded: true,
      isDefaultMetaModel: !!baselineValue.isDefaultMetaModel
    };
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  const dataModel = new window.ArchitectureDataModel({
    storageKey: storageKey,
    defaultState: defaultState
  });

  const getState = dataModel.getState.bind(dataModel);
  const setState = dataModel.setState.bind(dataModel);
  const resetModel = dataModel.resetModel.bind(dataModel);
  const setBaseline = dataModel.setBaseline.bind(dataModel);
  const setUi = dataModel.setUi.bind(dataModel);
  const clearNodeColorOverrides = dataModel.clearNodeColorOverrides.bind(dataModel);
  const upsertElement = dataModel.upsertElement.bind(dataModel);
  const deleteElement = dataModel.deleteElement.bind(dataModel);
  const upsertRelationship = dataModel.upsertRelationship.bind(dataModel);
  const deleteRelationship = dataModel.deleteRelationship.bind(dataModel);
  const upsertDiagram = dataModel.upsertDiagram.bind(dataModel);
  const deleteDiagram = dataModel.deleteDiagram.bind(dataModel);
  const getActiveDiagram = dataModel.getActiveDiagram.bind(dataModel);
  const createArchitecture = dataModel.createArchitecture.bind(dataModel);
  const subscribe = dataModel.subscribe.bind(dataModel);

  function dedupe(values) {
    return Array.from(
      new Set(
        values
          .filter(Boolean)
          .map(function (value) {
            return String(value).trim();
          })
      )
    ).sort(function (a, b) {
      return a.localeCompare(b);
    });
  }

  function splitMultiValue(rawValue) {
    if (Array.isArray(rawValue)) {
      return dedupe(
        rawValue.map(function (entry) {
          return String(entry || "").trim();
        })
      );
    }
    const raw = String(rawValue || "").trim();
    if (!raw) {
      return [];
    }
    return dedupe(
      raw
        .split(/[;,]+/)
        .map(function (entry) {
          return entry.trim();
        })
        .filter(Boolean)
        .flatMap(function (entry) {
          if (entry.indexOf("::") >= 0 || entry.indexOf(" ") < 0) {
            return [entry];
          }
          return entry.split(/\s+/);
        })
        .map(function (entry) {
          const parts = entry.split("::");
          return (parts[parts.length - 1] || "").trim();
        })
    );
  }

  function inferViewCategory(viewName) {
    const name = String(viewName || "").trim();
    if (!name) {
      return "";
    }
    const prefix = name.split(" - ")[0] || name;
    const letters = prefix.match(/[A-Za-z]/g) || [];
    const unique = Array.from(new Set(letters.map(function (entry) {
      return entry.toUpperCase();
    })));
    if (!unique.length) {
      return "";
    }
    return unique.length === 1 ? unique[0] : unique.join(",");
  }

  function splitCategoryTokens(rawCategory) {
    const raw = String(rawCategory || "").trim();
    if (!raw) {
      return [];
    }
    return dedupe(
      raw
        .split(/[;,/]+/)
        .map(function (entry) {
          return entry.trim().toUpperCase();
        })
        .filter(Boolean)
    );
  }

  function formatStereotypeLabel(value) {
    const raw = String(value || "").trim();
    if (!raw) {
      return "";
    }
    if (/^<<.*>>$/.test(raw)) {
      return raw;
    }
    return "<<" + raw + ">>";
  }

  function isEdgeApplyType(applyType) {
    const normalized = String(applyType || "").trim().toLowerCase();
    return [
      "association",
      "aggregation",
      "composition",
      "dependency",
      "realisation",
      "realization",
      "abstraction",
      "usage",
      "generalization",
      "connector",
      "informationflow",
      "itemflow",
      "flow",
      "extend",
      "include",
      "trace"
    ].indexOf(normalized) >= 0;
  }

  function normalizeStrokeStyle(value) {
    const raw = String(value || "").trim().toLowerCase();
    if (raw === "dotted" || raw === "dot" || raw === "dots") {
      return "dotted";
    }
    if (
      raw === "dashed" ||
      raw === "dash" ||
      raw === "stroked" ||
      raw === "stroke" ||
      raw === "broken"
    ) {
      return "dashed";
    }
    return "solid";
  }

  function normalizeLineMode(value) {
    const raw = String(value || "").trim().toLowerCase();
    if (raw === "curved" || raw === "ortho" || raw === "straight") {
      return raw;
    }
    return "straight";
  }

  function normalizeDiagramType(value) {
    const raw = String(value || "").trim().toLowerCase();
    if (raw === "clickable") {
      return "clickable";
    }
    if (raw === "roadmap") {
      return "roadmap";
    }
    if (
      raw === "allocationmatrix" ||
      raw === "allocation matrix" ||
      raw === "allocation" ||
      raw === "matrix"
    ) {
      return "allocationMatrix";
    }
    return "standard";
  }

  function dashArrayForStrokeStyle(strokeStyle) {
    const normalized = normalizeStrokeStyle(strokeStyle);
    if (normalized === "dotted") {
      return "1.2 5";
    }
    if (normalized === "dashed") {
      return "7 5";
    }
    return "";
  }

  function inferEdgeStrokeStyle(typeName, umlTypes) {
    const normalizedTypeName = String(typeName || "").toLowerCase();
    const umlLower = (umlTypes || []).map(function (entry) {
      return String(entry || "").toLowerCase();
    });
    if (umlLower.some(function (entry) { return entry.indexOf("dependency") >= 0; })) {
      return "dashed";
    }
    if (umlLower.some(function (entry) { return entry.indexOf("realisation") >= 0 || entry.indexOf("realization") >= 0; })) {
      return "dashed";
    }
    if (
      normalizedTypeName.indexOf("dependency") >= 0 ||
      normalizedTypeName.indexOf("realization") >= 0 ||
      normalizedTypeName.indexOf("realisation") >= 0
    ) {
      return "dashed";
    }
    return "solid";
  }

  function buildArchitectureMetaModelFromLegacy(metaModel) {
    const viewpoints = dedupe((metaModel.viewpoints || []).map(function (entry) {
      return typeof entry === "string" ? entry : (entry && entry.name) || "";
    }));
    const views = viewpoints.map(function (name) {
      return { id: name, name: name, category: inferViewCategory(name) };
    });

    const rawStereotypes = Array.isArray(metaModel.stereotypes) ? metaModel.stereotypes : [];
    const nodeTypes = [];
    const edgeTypes = [];
    rawStereotypes.forEach(function (entry) {
      const name = typeof entry === "string" ? entry : (entry && (entry.name || entry.id || entry.stereotype)) || "";
      if (!name) {
        return;
      }
      const sourceNodeTypes = splitMultiValue(entry && entry.sourceNodeTypes);
      const targetNodeTypes = splitMultiValue(entry && entry.targetNodeTypes);
      const applyTypes = splitMultiValue(entry && entry.appliesTo);
      const notes = typeof entry === "object" && entry && entry.notes ? String(entry.notes) : "";
      const looksLikeEdge =
        sourceNodeTypes.length > 0 ||
        targetNodeTypes.length > 0 ||
        applyTypes.some(isEdgeApplyType) ||
        /\brelationship\b|\brelation\b/i.test(notes);
      if (looksLikeEdge) {
        edgeTypes.push({
          id: name,
          label: name,
          stereotype: name,
          sourceNodeTypes: sourceNodeTypes,
          targetNodeTypes: targetNodeTypes,
          allowedViews: splitMultiValue(entry && entry.allowedViews),
          strokeStyle: normalizeStrokeStyle((entry && entry.strokeStyle) || inferEdgeStrokeStyle(name, applyTypes))
        });
      } else {
        nodeTypes.push({
          id: name,
          label: name,
          stereotype: name,
          isAbstract: !!(entry && entry.isAbstract),
          generalizes: splitMultiValue(entry && entry.generalizes),
          baseStereotypes: splitMultiValue(entry && entry.baseStereotypes),
          allowedViews: splitMultiValue(entry && entry.allowedViews),
          attributes: Array.isArray(entry && entry.tags) ? entry.tags : []
        });
      }
    });

    return {
      format: "architectureMetaModel",
      schemaVersion: 2,
      source: metaModel.source || "legacy-json",
      metaModelId: metaModel.metaModelId || "",
      name: metaModel.name || "MetaModel",
      version: metaModel.version || "unknown",
      notes: metaModel.notes || "",
      architecture: {
        views: views,
        nodeTypes: nodeTypes,
        edgeTypes: edgeTypes
      }
    };
  }

  function normalizeArchitectureMetaModel(metaModel) {
    if (!metaModel || typeof metaModel !== "object") {
      throw new Error("Invalid metamodel: expected object");
    }
    const base = (metaModel.format === "architectureMetaModel" && metaModel.architecture)
      ? metaModel
      : buildArchitectureMetaModelFromLegacy(metaModel);
    const architecture = base.architecture || {};
    const fallbackCategoryColors = base.categoryColors || metaModel.categoryColors || {};

    const views = dedupe((architecture.views || []).map(function (entry) {
      return typeof entry === "string" ? entry : (entry && (entry.name || entry.id)) || "";
    })).map(function (name) {
      const current = (architecture.views || []).find(function (entry) {
        if (typeof entry === "string") {
          return entry === name;
        }
        return (entry && (entry.name || entry.id)) === name;
      });
      const hasExplicitCategory =
        !!current &&
        typeof current === "object" &&
        Object.prototype.hasOwnProperty.call(current, "category");
      return {
        id: (current && current.id) || name,
        name: name,
        category: hasExplicitCategory
          ? String(current.category || "").trim()
          : inferViewCategory(name),
        description: (current && current.description) || ""
      };
    });

    const categoryIdsFromViews = dedupe(
      views.flatMap(function (entry) {
        return splitCategoryTokens(entry.category);
      })
    );
    const categoriesInput = Array.isArray(architecture.categories) ? architecture.categories : [];
    const categories = dedupe(
      categoriesInput.map(function (entry) {
        return typeof entry === "string" ? entry : (entry && (entry.id || entry.name)) || "";
      }).concat(categoryIdsFromViews)
    ).map(function (categoryId) {
      const current = categoriesInput.find(function (entry) {
        if (typeof entry === "string") {
          return entry === categoryId;
        }
        return (entry && (entry.id || entry.name)) === categoryId;
      }) || {};
      const legacyColor = fallbackCategoryColors[categoryId] || {};
      const fallbackColor = defaultCategoryColorMap[categoryId] || defaultCategoryColorMap.DEFAULT;
      return {
        id: categoryId,
        name: current.name || categoryId,
        bg: isValidCssColor(current.bg) ? String(current.bg).trim() : (isValidCssColor(legacyColor.bg) ? String(legacyColor.bg).trim() : fallbackColor.bg),
        font: isValidCssColor(current.font) ? String(current.font).trim() : (isValidCssColor(legacyColor.font) ? String(legacyColor.font).trim() : fallbackColor.font)
      };
    });

    const nodeTypes = dedupe((architecture.nodeTypes || []).map(function (entry) {
      return typeof entry === "string" ? entry : (entry && (entry.id || entry.name || entry.stereotype)) || "";
    })).map(function (id) {
      const current = (architecture.nodeTypes || []).find(function (entry) {
        if (typeof entry === "string") {
          return entry === id;
        }
        return (entry && (entry.id || entry.name || entry.stereotype)) === id;
      }) || {};
      return {
        id: id,
        label: current.label || id,
        stereotype: current.stereotype || id,
        isAbstract: !!current.isAbstract,
        allowedViews: splitMultiValue(current.allowedViews),
        generalizes: splitMultiValue(current.generalizes),
        baseStereotypes: splitMultiValue(current.baseStereotypes),
        attributes: Array.isArray(current.attributes) ? current.attributes : (Array.isArray(current.tags) ? current.tags : [])
      };
    });

    const edgeTypes = dedupe((architecture.edgeTypes || []).map(function (entry) {
      return typeof entry === "string" ? entry : (entry && (entry.id || entry.name || entry.stereotype)) || "";
    })).map(function (id) {
      const current = (architecture.edgeTypes || []).find(function (entry) {
        if (typeof entry === "string") {
          return entry === id;
        }
        return (entry && (entry.id || entry.name || entry.stereotype)) === id;
      }) || {};
      return {
        id: id,
        label: current.label || id,
        stereotype: current.stereotype || id,
        umlTypes: splitMultiValue(current.umlTypes),
        direction: current.direction || "directed",
        sourceNodeTypes: splitMultiValue(current.sourceNodeTypes),
        targetNodeTypes: splitMultiValue(current.targetNodeTypes),
        allowedViews: splitMultiValue(current.allowedViews),
        strokeStyle: normalizeStrokeStyle(current.strokeStyle || inferEdgeStrokeStyle(id, splitMultiValue(current.umlTypes)))
      };
    });

    if (!views.length && !nodeTypes.length && !edgeTypes.length) {
      throw new Error("Invalid metamodel: architecture/views/nodeTypes/edgeTypes missing");
    }

    return {
      format: "architectureMetaModel",
      schemaVersion: 2,
      source: base.source || metaModel.source || "json",
      metaModelId: base.metaModelId || metaModel.metaModelId || "",
      name: base.name || metaModel.name || "MetaModel",
      version: base.version || metaModel.version || "unknown",
      notes: base.notes || metaModel.notes || "",
      documentation: base.documentation || metaModel.documentation || {},
      architecture: {
        views: views,
        categories: categories,
        nodeTypes: nodeTypes,
        edgeTypes: edgeTypes
      }
    };
  }

  function parseMdgXmlToMetaModel(xmlText) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "application/xml");
    if (xmlDoc.querySelector("parsererror")) {
      throw new Error("Invalid XML input");
    }

    const mdgRoot = xmlDoc.querySelector("MDG\\.Technology");
    const docNode = xmlDoc.querySelector("Documentation");
    const modelNodes = Array.from(xmlDoc.querySelectorAll("ModelTemplates > Model"));
    const stereotypeNodes = Array.from(xmlDoc.querySelectorAll("Stereotype"));
    const viewpoints = dedupe(modelNodes.map(function (node) {
      return node.getAttribute("name") || "";
    }));
    const views = viewpoints.map(function (name) {
      return { id: name, name: name, category: inferViewCategory(name) };
    });
    const nodeTypes = [];
    const edgeTypes = [];

    stereotypeNodes.forEach(function (node) {
      const stereotypeName = node.getAttribute("name") || "";
      if (!stereotypeName) {
        return;
      }
      const applyTypes = dedupe(Array.from(node.querySelectorAll("AppliesTo > Apply")).map(function (entry) {
        return entry.getAttribute("type") || "";
      }));
      const sourceNodeTypes = [];
      const targetNodeTypes = [];
      Array.from(node.querySelectorAll("metaconstraints > metaconstraint")).forEach(function (entry) {
        const role = String(entry.getAttribute("umlRole") || "").toLowerCase();
        const constraintTypes = splitMultiValue(entry.getAttribute("constraint"));
        if (role === "client" || role === "source" || role === "from") {
          sourceNodeTypes.push.apply(sourceNodeTypes, constraintTypes);
        } else if (role === "supplier" || role === "target" || role === "to") {
          targetNodeTypes.push.apply(targetNodeTypes, constraintTypes);
        }
      });
      const tagNodes = Array.from(node.querySelectorAll("TaggedValues > Tag"));
      const tags = tagNodes.map(function (tagNode) {
        return {
          name: tagNode.getAttribute("name") || "",
          type: tagNode.getAttribute("type") || "",
          description: tagNode.getAttribute("description") || "",
          unit: tagNode.getAttribute("unit") || "",
          values: tagNode.getAttribute("values") || "",
          default: tagNode.getAttribute("default") || ""
        };
      }).filter(function (entry) { return !!entry.name; });

      const looksLikeEdge =
        applyTypes.some(isEdgeApplyType) ||
        sourceNodeTypes.length > 0 ||
        targetNodeTypes.length > 0;
      if (looksLikeEdge) {
        edgeTypes.push({
          id: stereotypeName,
          label: stereotypeName,
          stereotype: stereotypeName,
          notes: node.getAttribute("notes") || "",
          umlTypes: applyTypes,
          direction: "directed",
          sourceNodeTypes: dedupe(sourceNodeTypes),
          targetNodeTypes: dedupe(targetNodeTypes),
          allowedViews: [],
          strokeStyle: inferEdgeStrokeStyle(stereotypeName, applyTypes)
        });
      } else {
        nodeTypes.push({
          id: stereotypeName,
          label: stereotypeName,
          stereotype: stereotypeName,
          metatype: node.getAttribute("metatype") || "",
          notes: node.getAttribute("notes") || "",
          isAbstract: String(node.getAttribute("isAbstract") || "").toLowerCase() === "true",
          generalizes: splitMultiValue(node.getAttribute("generalizes")),
          baseStereotypes: splitMultiValue(node.getAttribute("baseStereotypes")),
          allowedViews: [],
          attributes: tags
        });
      }
    });

    return normalizeArchitectureMetaModel({
      format: "architectureMetaModel",
      schemaVersion: 2,
      source: "mdg-import",
      metaModelId: "mdg:" + (((docNode && docNode.getAttribute("name")) || "unknown").toLowerCase().replace(/\s+/g, "-")),
      name: (docNode && docNode.getAttribute("name")) || "MDG",
      version:
        (docNode && docNode.getAttribute("version")) ||
        (mdgRoot && mdgRoot.getAttribute("version")) ||
        "unknown",
      notes: (docNode && docNode.getAttribute("notes")) || "",
      architecture: {
        views: views,
        nodeTypes: nodeTypes,
        edgeTypes: edgeTypes
      },
      importedAt: new Date().toISOString()
    });
  }

  function parseMetaModelJson(jsonText) {
    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      throw new Error("Invalid JSON input");
    }
    return normalizeArchitectureMetaModel(parsed);
  }

  function metaModelToBaseline(metaModel, sourceLabel, runtimeInfo) {
    const normalized = normalizeArchitectureMetaModel(metaModel);
    const viewpoints = dedupe((normalized.architecture.views || []).map(function (entry) {
      return (entry && entry.name) || "";
    }));
    const nodeTypes = dedupe((normalized.architecture.nodeTypes || []).map(function (entry) {
      return (entry && entry.id) || "";
    }));
    const edgeTypes = dedupe((normalized.architecture.edgeTypes || []).map(function (entry) {
      return (entry && entry.id) || "";
    }));
    const stereotypes = dedupe(nodeTypes.concat(edgeTypes));
    const loadedCategoryColors = {};
    (normalized.architecture.categories || []).forEach(function (entry) {
      const categoryId = String((entry && entry.id) || "").trim().toUpperCase();
      if (!categoryId) {
        return;
      }
      loadedCategoryColors[categoryId] = {
        bg: isValidCssColor(entry && entry.bg) ? String(entry.bg).trim() : "",
        font: isValidCssColor(entry && entry.font) ? String(entry.font).trim() : ""
      };
    });
    return {
      source: sourceLabel || normalized.source || "json",
      name: normalized.name || "MetaModel",
      version: normalized.version || "unknown",
      format: normalized.format,
      schemaVersion: normalized.schemaVersion,
      metaModelId: normalized.metaModelId || "",
      viewpoints: viewpoints,
      stereotypes: stereotypes,
      nodeTypes: nodeTypes,
      edgeTypes: edgeTypes,
      architecture: normalized.architecture,
      loadedCategoryColors: loadedCategoryColors,
      isLoaded: true,
      fileName: (runtimeInfo && runtimeInfo.fileName) || "",
      isDefaultMetaModel: !!(runtimeInfo && runtimeInfo.isDefaultMetaModel)
    };
  }

  function toSet(values) {
    return new Set(
      (values || []).map(function (value) {
        return String(value || "").trim();
      })
    );
  }

  function evaluateCompliance(currentState) {
    const effectiveBaseline = getEffectiveBaseline(currentState.baseline);
    const elementById = new Map(
      currentState.model.elements.map(function (element) {
        return [element.id, element];
      })
    );
    const viewpointSet = toSet(effectiveBaseline.viewpoints);
    const nodeTypeSet = toSet(effectiveBaseline.nodeTypes || effectiveBaseline.stereotypes || []);
    const edgeTypeSet = toSet(effectiveBaseline.edgeTypes || effectiveBaseline.stereotypes || []);
    const nodeRules = new Map(
      ((effectiveBaseline.architecture && effectiveBaseline.architecture.nodeTypes) || []).map(function (entry) {
        return [entry.id, entry];
      })
    );
    const edgeRules = new Map(
      ((effectiveBaseline.architecture && effectiveBaseline.architecture.edgeTypes) || []).map(function (entry) {
        return [entry.id, entry];
      })
    );

    const issues = [];
    const hasLoadedMetaModel = !!effectiveBaseline.isLoaded;

    const elementResults = currentState.model.elements.map(function (element) {
      const itemIssues = [];

      if (hasLoadedMetaModel && !viewpointSet.has(element.viewpoint)) {
        itemIssues.push("Unknown viewpoint");
        issues.push({
          severity: element.allowDeviation ? "info" : "warning",
          category: "Element",
          item: element.name,
          reason: "Viewpoint '" + element.viewpoint + "' is not in baseline"
        });
      }
      if (hasLoadedMetaModel && !nodeTypeSet.has(element.type)) {
        itemIssues.push("Unknown type/stereotype");
        issues.push({
          severity: element.allowDeviation ? "info" : "warning",
          category: "Element",
          item: element.name,
          reason: "Type '" + element.type + "' is not in baseline"
        });
      } else if (hasLoadedMetaModel) {
        const nodeRule = nodeRules.get(element.type);
        const allowedViews = splitMultiValue(nodeRule && nodeRule.allowedViews);
        if (allowedViews.length > 0 && element.viewpoint && allowedViews.indexOf(element.viewpoint) < 0) {
          itemIssues.push("Type/view mismatch");
          issues.push({
            severity: element.allowDeviation ? "info" : "warning",
            category: "Element",
            item: element.name,
            reason: "Type '" + element.type + "' is not allowed in view '" + element.viewpoint + "'"
          });
        }
      }

      return {
        id: element.id,
        isCompliant: itemIssues.length === 0,
        isDeviation: itemIssues.length > 0,
        issues: itemIssues
      };
    });

    const relationshipResults = currentState.model.relationships.map(function (relationship) {
      const itemIssues = [];

      if (!elementById.has(relationship.sourceId)) {
        itemIssues.push("Missing source element");
        issues.push({
          severity: relationship.allowDeviation ? "info" : "error",
          category: "Relationship",
          item: relationship.id,
          reason: "Source element does not exist"
        });
      }
      if (!elementById.has(relationship.targetId)) {
        itemIssues.push("Missing target element");
        issues.push({
          severity: relationship.allowDeviation ? "info" : "error",
          category: "Relationship",
          item: relationship.id,
          reason: "Target element does not exist"
        });
      }
      if (hasLoadedMetaModel && !edgeTypeSet.has(relationship.type)) {
        itemIssues.push("Unknown relationship type");
        issues.push({
          severity: relationship.allowDeviation ? "info" : "warning",
          category: "Relationship",
          item: relationship.id,
          reason: "Type '" + relationship.type + "' is not in baseline"
        });
      } else if (hasLoadedMetaModel) {
        const sourceElement = elementById.get(relationship.sourceId);
        const targetElement = elementById.get(relationship.targetId);
        const edgeRule = edgeRules.get(relationship.type);
        const allowedSourceTypes = splitMultiValue(edgeRule && edgeRule.sourceNodeTypes);
        const allowedTargetTypes = splitMultiValue(edgeRule && edgeRule.targetNodeTypes);
        const allowedViews = splitMultiValue(edgeRule && edgeRule.allowedViews);

        if (sourceElement && allowedSourceTypes.length > 0 && allowedSourceTypes.indexOf(sourceElement.type) < 0) {
          itemIssues.push("Invalid source type");
          issues.push({
            severity: relationship.allowDeviation ? "info" : "warning",
            category: "Relationship",
            item: relationship.id,
            reason: "Source type '" + sourceElement.type + "' is not allowed for relationship '" + relationship.type + "'"
          });
        }
        if (targetElement && allowedTargetTypes.length > 0 && allowedTargetTypes.indexOf(targetElement.type) < 0) {
          itemIssues.push("Invalid target type");
          issues.push({
            severity: relationship.allowDeviation ? "info" : "warning",
            category: "Relationship",
            item: relationship.id,
            reason: "Target type '" + targetElement.type + "' is not allowed for relationship '" + relationship.type + "'"
          });
        }
        if (allowedViews.length > 0) {
          if (sourceElement && sourceElement.viewpoint && allowedViews.indexOf(sourceElement.viewpoint) < 0) {
            itemIssues.push("Source view not allowed");
            issues.push({
              severity: relationship.allowDeviation ? "info" : "warning",
              category: "Relationship",
              item: relationship.id,
              reason: "Source viewpoint '" + sourceElement.viewpoint + "' is not allowed for relationship '" + relationship.type + "'"
            });
          }
          if (targetElement && targetElement.viewpoint && allowedViews.indexOf(targetElement.viewpoint) < 0) {
            itemIssues.push("Target view not allowed");
            issues.push({
              severity: relationship.allowDeviation ? "info" : "warning",
              category: "Relationship",
              item: relationship.id,
              reason: "Target viewpoint '" + targetElement.viewpoint + "' is not allowed for relationship '" + relationship.type + "'"
            });
          }
        }
      }

      return {
        id: relationship.id,
        isCompliant: itemIssues.length === 0,
        isDeviation: itemIssues.length > 0,
        issues: itemIssues
      };
    });

    const elementDeviations = elementResults.filter(function (entry) {
      return entry.isDeviation;
    }).length;
    const relationshipDeviations = relationshipResults.filter(function (entry) {
      return entry.isDeviation;
    }).length;
    const acceptedDeviations =
      currentState.model.elements.filter(function (entry) {
        return entry.allowDeviation;
      }).length +
      currentState.model.relationships.filter(function (entry) {
        return entry.allowDeviation;
      }).length;

    return {
      elementResults: elementResults,
      relationshipResults: relationshipResults,
      issues: issues,
      summary: {
        elementCount: currentState.model.elements.length,
        relationshipCount: currentState.model.relationships.length,
        elementDeviations: elementDeviations,
        relationshipDeviations: relationshipDeviations,
        acceptedDeviations: acceptedDeviations,
        nonAcceptedIssues: issues.filter(function (entry) {
          return entry.severity !== "info";
        }).length
      }
    };
  }

  const ns = "http://www.w3.org/2000/svg";

  function createSvgElement(tag, attributes) {
    const node = document.createElementNS(ns, tag);
    Object.entries(attributes || {}).forEach(function (pair) {
      node.setAttribute(pair[0], String(pair[1]));
    });
    return node;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function isValidCssColor(value) {
    if (!value) {
      return false;
    }
    const style = new Option().style;
    style.color = "";
    style.color = String(value).trim();
    return style.color !== "";
  }

  function getStereotypeCategory(stereotype) {
    const match = String(stereotype || "").trim().match(/^([A-Za-z])/);
    return match ? match[1].toUpperCase() : "DEFAULT";
  }

  function getEffectiveColorScheme(currentState, effectiveBaseline) {
    const base = {
      DEFAULT: JSON.parse(JSON.stringify(defaultCategoryColorMap.DEFAULT))
    };
    if (!effectiveBaseline || !effectiveBaseline.isLoaded) {
      return base;
    }
    const categories = ((effectiveBaseline.architecture && effectiveBaseline.architecture.categories) || []);
    categories.forEach(function (entry) {
      const categoryId = String((entry && entry.id) || "").trim().toUpperCase();
      if (!categoryId) {
        return;
      }
      const fallback = defaultCategoryColorMap[categoryId] || defaultCategoryColorMap.DEFAULT;
      base[categoryId] = {
        bg: isValidCssColor(entry && entry.bg) ? String(entry.bg).trim() : fallback.bg,
        font: isValidCssColor(entry && entry.font) ? String(entry.font).trim() : fallback.font
      };
    });
    return base;
  }

  function getCategoryColors(stereotype, colorScheme) {
    const category = getStereotypeCategory(stereotype);
    return colorScheme[category] || colorScheme.DEFAULT;
  }

  function resolveElementColors(element, colorScheme) {
    const base = getCategoryColors(element.type, colorScheme);
    const bgOverride = isValidCssColor(element.bgColor) ? String(element.bgColor).trim() : "";
    const fontOverride = isValidCssColor(element.fontColor) ? String(element.fontColor).trim() : "";
    return {
      bg: bgOverride || base.bg,
      font: fontOverride || base.font
    };
  }

  function resolveViewBadgeColors(viewName, effectiveBaseline, colorScheme) {
    const fallback = colorScheme.DEFAULT || defaultCategoryColorMap.DEFAULT;
    const targetView = String(viewName || "").trim();
    if (!targetView || !effectiveBaseline || !effectiveBaseline.architecture) {
      return fallback;
    }
    const views = Array.isArray(effectiveBaseline.architecture.views)
      ? effectiveBaseline.architecture.views
      : [];
    const viewEntry = views.find(function (entry) {
      return entry && (entry.name === targetView || entry.id === targetView);
    });
    if (!viewEntry) {
      return fallback;
    }
    const categoryTokens = splitCategoryTokens(viewEntry.category || "");
    const category = categoryTokens[0] || "";
    return (category && colorScheme[category]) ? colorScheme[category] : fallback;
  }

  function getSvgBounds(svgNode) {
    const vb = svgNode.viewBox && svgNode.viewBox.baseVal;
    if (vb && vb.width > 0 && vb.height > 0) {
      return { minX: vb.x, minY: vb.y, maxX: vb.x + vb.width, maxY: vb.y + vb.height, width: vb.width, height: vb.height };
    }
    return { minX: 0, minY: 0, maxX: 1200, maxY: 700, width: 1200, height: 700 };
  }

  function computeContentBounds(elements, metricsByElementId) {
    const padX = 180;
    const padY = 140;
    if (!Array.isArray(elements) || elements.length === 0) {
      return { minX: 0, minY: 0, width: 1200, height: 700 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    elements.forEach(function (element) {
      const metrics = (metricsByElementId && metricsByElementId.get(element.id)) || getNodeMetrics(element);
      const x = Number(element.x) || 0;
      const y = Number(element.y) || 0;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + metrics.width);
      maxY = Math.max(maxY, y + metrics.height);
    });

    const rawWidth = Math.max(1, maxX - minX);
    const rawHeight = Math.max(1, maxY - minY);
    const width = Math.max(1, rawWidth + padX * 2);
    const height = Math.max(1, rawHeight + padY * 2);
    const centerX = minX + rawWidth / 2;
    const centerY = minY + rawHeight / 2;

    return {
      minX: centerX - width / 2,
      minY: centerY - height / 2,
      width: width,
      height: height
    };
  }

  function clientToSvgPoint(svgNode, clientX, clientY) {
    if (typeof svgNode.createSVGPoint === "function") {
      const point = svgNode.createSVGPoint();
      point.x = clientX;
      point.y = clientY;
      const ctm = svgNode.getScreenCTM();
      if (ctm) {
        const transformed = point.matrixTransform(ctm.inverse());
        return { x: transformed.x, y: transformed.y };
      }
    }
    const rect = svgNode.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  function getRectBorderPoint(fromPoint, toPoint, halfWidth, halfHeight) {
    const dx = toPoint.x - fromPoint.x;
    const dy = toPoint.y - fromPoint.y;

    if (dx === 0 && dy === 0) {
      return { x: fromPoint.x + halfWidth, y: fromPoint.y };
    }

    const scaleX = dx !== 0 ? halfWidth / Math.abs(dx) : Number.POSITIVE_INFINITY;
    const scaleY = dy !== 0 ? halfHeight / Math.abs(dy) : Number.POSITIVE_INFINITY;
    const scale = Math.min(scaleX, scaleY);

    return {
      x: fromPoint.x + dx * scale,
      y: fromPoint.y + dy * scale
    };
  }

  function clampToRange(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function getDockPointFromSide(center, metrics, side, positionValue) {
    const left = center.x - metrics.halfWidth;
    const right = center.x + metrics.halfWidth;
    const top = center.y - metrics.halfHeight;
    const bottom = center.y + metrics.halfHeight;
    const margin = 2;

    if (side === "left") {
      return { x: left, y: clampToRange(positionValue, top + margin, bottom - margin), side: "left" };
    }
    if (side === "right") {
      return { x: right, y: clampToRange(positionValue, top + margin, bottom - margin), side: "right" };
    }
    if (side === "top") {
      return { x: clampToRange(positionValue, left + margin, right - margin), y: top, side: "top" };
    }
    return { x: clampToRange(positionValue, left + margin, right - margin), y: bottom, side: "bottom" };
  }

  function getDefaultDockSide(center, targetCenter) {
    const dx = targetCenter.x - center.x;
    const dy = targetCenter.y - center.y;
    if (Math.abs(dx) >= Math.abs(dy)) {
      return dx >= 0 ? "right" : "left";
    }
    return dy >= 0 ? "bottom" : "top";
  }

  function resolveDockPoint(controlDock, center, metrics, targetCenter) {
    const side = controlDock && controlDock.side ? controlDock.side : getDefaultDockSide(center, targetCenter);
    const defaultPosition = side === "left" || side === "right" ? center.y : center.x;
    const positionValue =
      controlDock && Number.isFinite(controlDock.position) ? controlDock.position : defaultPosition;
    return getDockPointFromSide(center, metrics, side, positionValue);
  }

  function getLeadPoint(dockPoint, offset) {
    if (dockPoint.side === "left") {
      return { x: dockPoint.x - offset, y: dockPoint.y };
    }
    if (dockPoint.side === "right") {
      return { x: dockPoint.x + offset, y: dockPoint.y };
    }
    if (dockPoint.side === "top") {
      return { x: dockPoint.x, y: dockPoint.y - offset };
    }
    return { x: dockPoint.x, y: dockPoint.y + offset };
  }

  function projectPointToNodeBorder(node, metrics, pointX, pointY) {
    const center = { x: node.x + metrics.halfWidth, y: node.y + metrics.halfHeight };
    const localX = pointX - center.x;
    const localY = pointY - center.y;
    const halfW = metrics.halfWidth;
    const halfH = metrics.halfHeight;

    let side;
    if (Math.abs(localX) / halfW >= Math.abs(localY) / halfH) {
      side = localX >= 0 ? "right" : "left";
    } else {
      side = localY >= 0 ? "bottom" : "top";
    }

    const border = getDockPointFromSide(center, metrics, side, side === "left" || side === "right" ? pointY : pointX);
    return {
      side: border.side,
      position: border.side === "left" || border.side === "right" ? border.y : border.x
    };
  }

  function buildConnectorPath(lineMode, x1, y1, x2, y2) {
    if (lineMode === "curved") {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const curvature = 0.35;
      let c1x = x1;
      let c1y = y1;
      let c2x = x2;
      let c2y = y2;

      if (Math.abs(dx) >= Math.abs(dy)) {
        c1x = x1 + dx * curvature;
        c2x = x2 - dx * curvature;
      } else {
        c1y = y1 + dy * curvature;
        c2y = y2 - dy * curvature;
      }

      return (
        "M " +
        x1 +
        " " +
        y1 +
        " C " +
        c1x +
        " " +
        c1y +
        ", " +
        c2x +
        " " +
        c2y +
        ", " +
        x2 +
        " " +
        y2
      );
    }

    return "M " + x1 + " " + y1 + " L " + x2 + " " + y2;
  }

  function getConnectorGeometry(lineMode, relationship, source, target, sourceMetrics, targetMetrics) {
    const sourceCenter = { x: source.x + sourceMetrics.halfWidth, y: source.y + sourceMetrics.halfHeight };
    const targetCenter = { x: target.x + targetMetrics.halfWidth, y: target.y + targetMetrics.halfHeight };
    let x1;
    let y1;
    let x2;
    let y2;

    if (lineMode === "ortho") {
      const dockOffset = 18;
      const control = (relationship && relationship.orthoControl) || {};

      const sourceDock = resolveDockPoint(control.sourceDock, sourceCenter, sourceMetrics, targetCenter);
      const targetDock = resolveDockPoint(control.targetDock, targetCenter, targetMetrics, sourceCenter);
      const sourceLead = getLeadPoint(sourceDock, dockOffset);
      const targetLead = getLeadPoint(targetDock, dockOffset);

      const dx = targetLead.x - sourceLead.x;
      const dy = targetLead.y - sourceLead.y;
      const defaultRoute = Math.abs(dx) >= Math.abs(dy) ? "hv" : "vh";
      const route = control.route === "hv" || control.route === "vh" ? control.route : defaultRoute;

      x1 = sourceDock.x;
      y1 = sourceDock.y;
      x2 = targetDock.x;
      y2 = targetDock.y;

      if (route === "hv") {
        const splitX = Number.isFinite(control.splitX) ? control.splitX : (sourceLead.x + targetLead.x) / 2;
        const pathData =
          "M " +
          x1 +
          " " +
          y1 +
          " L " +
          sourceLead.x +
          " " +
          sourceLead.y +
          " L " +
          splitX +
          " " +
          sourceLead.y +
          " L " +
          splitX +
          " " +
          targetLead.y +
          " L " +
          targetLead.x +
          " " +
          targetLead.y +
          " L " +
          x2 +
          " " +
          y2;
        return {
          x1: x1,
          y1: y1,
          x2: x2,
          y2: y2,
          pathData: pathData,
          labelX: splitX,
          labelY: (sourceLead.y + targetLead.y) / 2 - 6,
          orthoControl: {
            route: "hv",
            splitX: splitX,
            sourceDock: { side: sourceDock.side, position: sourceDock.side === "left" || sourceDock.side === "right" ? sourceDock.y : sourceDock.x },
            targetDock: { side: targetDock.side, position: targetDock.side === "left" || targetDock.side === "right" ? targetDock.y : targetDock.x }
          },
          orthoHandles: [
            { kind: "sourceEndpoint", role: "source", route: "hv", x: x1, y: y1, cursor: "move" },
            { kind: "targetEndpoint", role: "target", route: "hv", x: x2, y: y2, cursor: "move" },
            { kind: "corner", role: "source", route: "hv", x: splitX, y: sourceLead.y, cursor: "move" },
            { kind: "corner", role: "target", route: "hv", x: splitX, y: targetLead.y, cursor: "move" }
          ]
        };
      }

      const splitY = Number.isFinite(control.splitY) ? control.splitY : (sourceLead.y + targetLead.y) / 2;
      const pathData =
        "M " +
        x1 +
        " " +
        y1 +
        " L " +
        sourceLead.x +
        " " +
        sourceLead.y +
        " L " +
        sourceLead.x +
        " " +
        splitY +
        " L " +
        targetLead.x +
        " " +
        splitY +
        " L " +
        targetLead.x +
        " " +
        targetLead.y +
        " L " +
        x2 +
        " " +
        y2;
      return {
        x1: x1,
        y1: y1,
        x2: x2,
        y2: y2,
        pathData: pathData,
        labelX: (sourceLead.x + targetLead.x) / 2,
        labelY: splitY - 6,
        orthoControl: {
          route: "vh",
          splitY: splitY,
          sourceDock: { side: sourceDock.side, position: sourceDock.side === "left" || sourceDock.side === "right" ? sourceDock.y : sourceDock.x },
          targetDock: { side: targetDock.side, position: targetDock.side === "left" || targetDock.side === "right" ? targetDock.y : targetDock.x }
        },
        orthoHandles: [
          { kind: "sourceEndpoint", role: "source", route: "vh", x: x1, y: y1, cursor: "move" },
          { kind: "targetEndpoint", role: "target", route: "vh", x: x2, y: y2, cursor: "move" },
          { kind: "corner", role: "source", route: "vh", x: sourceLead.x, y: splitY, cursor: "move" },
          { kind: "corner", role: "target", route: "vh", x: targetLead.x, y: splitY, cursor: "move" }
        ]
      };
    }

    const start = getRectBorderPoint(sourceCenter, targetCenter, sourceMetrics.halfWidth, sourceMetrics.halfHeight);
    const end = getRectBorderPoint(targetCenter, sourceCenter, targetMetrics.halfWidth, targetMetrics.halfHeight);
    x1 = start.x;
    y1 = start.y;
    x2 = end.x;
    y2 = end.y;

    return {
      x1: x1,
      y1: y1,
      x2: x2,
      y2: y2,
      pathData: buildConnectorPath(lineMode, x1, y1, x2, y2),
      labelX: (x1 + x2) / 2,
      labelY: (y1 + y2) / 2 - 6
    };
  }

  function getNodeMetrics(element) {
    const nodeWidth = 220;
    const titleHeight = 22;
    const typeHeight = 18;
    const rowHeight = 14;
    const members = Array.isArray(element.members)
      ? element.members
          .map(function (entry) {
            return normalizeMemberItem(entry);
          })
          .filter(function (entry) {
            return !!entry.name;
          })
      : [];
    const functions = Array.isArray(element.functions) ? element.functions : [];

    let nodeHeight = titleHeight + typeHeight + 8;
    if (members.length > 0) {
      nodeHeight += 6 + members.length * rowHeight;
    }
    if (functions.length > 0) {
      nodeHeight += 6 + functions.length * rowHeight;
    }

    return {
      width: nodeWidth,
      height: nodeHeight,
      halfWidth: nodeWidth / 2,
      halfHeight: nodeHeight / 2
    };
  }

  function getConnectorStyle(type, edgeRule) {
    const normalized = (type || "").toLowerCase().replace(/\s+/g, "");
    const explicitStrokeStyle = edgeRule && edgeRule.strokeStyle
      ? normalizeStrokeStyle(edgeRule.strokeStyle)
      : "";

    if (normalized.includes("composition")) {
      return { marker: "filledDiamond", dashArray: explicitStrokeStyle ? dashArrayForStrokeStyle(explicitStrokeStyle) : "" };
    }
    if (normalized.includes("aggregation") || normalized.includes("owned")) {
      return { marker: "diamond", dashArray: explicitStrokeStyle ? dashArrayForStrokeStyle(explicitStrokeStyle) : "" };
    }
    if (
      normalized.includes("generalization") ||
      normalized.includes("generalisation") ||
      normalized.includes("inherit") ||
      normalized.includes("specialization") ||
      normalized.includes("specialisation") ||
      normalized.includes("extends")
    ) {
      return { marker: "hollowTriangle", dashArray: explicitStrokeStyle ? dashArrayForStrokeStyle(explicitStrokeStyle) : "" };
    }
    if (normalized.includes("realization") || normalized.includes("implements")) {
      return {
        marker: "hollowTriangle",
        dashArray: explicitStrokeStyle ? dashArrayForStrokeStyle(explicitStrokeStyle) : "7 5"
      };
    }
    if (
      normalized.includes("dependency") ||
      normalized.includes("needs") ||
      normalized.includes("conforms") ||
      normalized.includes("refers") ||
      normalized.includes("maps")
    ) {
      return {
        marker: "openArrow",
        dashArray: explicitStrokeStyle ? dashArrayForStrokeStyle(explicitStrokeStyle) : "7 5"
      };
    }
    if (explicitStrokeStyle) {
      return { marker: "closedArrow", dashArray: dashArrayForStrokeStyle(explicitStrokeStyle) };
    }
    return { marker: "closedArrow", dashArray: "" };
  }

  function Diagram(svgNode, onNodeMoved, onConnectRequest) {
    this.svgNode = svgNode;
    this.onNodeMoved = onNodeMoved;
    this.onConnectRequest = onConnectRequest;
    this.onRelationshipControlMoved = null;
    this.connectMode = false;
    this.pendingSourceId = null;
    this.onNodeClicked = null;
    this.drag = null;
    this.controlDrag = null;
    this.panDrag = null;
    this.lastNodePointerDown = null;
    this.lastEdgePointerDown = null;
    this.installDefs();
    this.installPointerHandlers();
  }

  Diagram.prototype.installDefs = function () {
    const defs = createSvgElement("defs");
    const closedArrow = createSvgElement("marker", {
      id: "closedArrow",
      viewBox: "0 0 10 10",
      refX: "9",
      refY: "5",
      markerWidth: "8",
      markerHeight: "8",
      orient: "auto-start-reverse"
    });
    closedArrow.appendChild(createSvgElement("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "#735e4f" }));
    defs.appendChild(closedArrow);

    const openArrow = createSvgElement("marker", {
      id: "openArrow",
      viewBox: "0 0 12 12",
      refX: "11",
      refY: "6",
      markerWidth: "10",
      markerHeight: "10",
      orient: "auto-start-reverse"
    });
    openArrow.appendChild(
      createSvgElement("path", {
        d: "M 1 1 L 11 6 L 1 11",
        fill: "none",
        stroke: "#735e4f",
        "stroke-width": 1.5
      })
    );
    defs.appendChild(openArrow);

    const hollowTriangle = createSvgElement("marker", {
      id: "hollowTriangle",
      viewBox: "0 0 12 12",
      refX: "11",
      refY: "6",
      markerWidth: "12",
      markerHeight: "12",
      orient: "auto-start-reverse"
    });
    hollowTriangle.appendChild(
      createSvgElement("path", {
        d: "M 1 1 L 11 6 L 1 11 z",
        fill: "#fffdf8",
        stroke: "#735e4f",
        "stroke-width": 1.8
      })
    );
    defs.appendChild(hollowTriangle);

    const diamond = createSvgElement("marker", {
      id: "diamond",
      viewBox: "0 0 14 12",
      refX: "12",
      refY: "6",
      markerWidth: "12",
      markerHeight: "10",
      orient: "auto-start-reverse"
    });
    diamond.appendChild(
      createSvgElement("path", {
        d: "M 1 6 L 6 1 L 12 6 L 6 11 z",
        fill: "#fffdf8",
        stroke: "#735e4f",
        "stroke-width": 1.2
      })
    );
    defs.appendChild(diamond);

    const filledDiamond = createSvgElement("marker", {
      id: "filledDiamond",
      viewBox: "0 0 14 12",
      refX: "12",
      refY: "6",
      markerWidth: "12",
      markerHeight: "10",
      orient: "auto-start-reverse"
    });
    filledDiamond.appendChild(
      createSvgElement("path", {
        d: "M 1 6 L 6 1 L 12 6 L 6 11 z",
        fill: "#735e4f",
        stroke: "#735e4f",
        "stroke-width": 1
      })
    );
    defs.appendChild(filledDiamond);

    const focusGlow = createSvgElement("filter", {
      id: "focusGlow",
      x: "-30%",
      y: "-30%",
      width: "160%",
      height: "160%"
    });
    focusGlow.appendChild(
      createSvgElement("feDropShadow", {
        dx: "0",
        dy: "0",
        stdDeviation: "3.4",
        "flood-color": "#4b3f99",
        "flood-opacity": "0.72"
      })
    );
    defs.appendChild(focusGlow);

    this.svgNode.appendChild(defs);
  };

  Diagram.prototype.installPointerHandlers = function () {
    const self = this;
    this.svgNode.addEventListener("pointerdown", function (event) {
      if (event.target === self.svgNode) {
        if (typeof self.onCanvasSelected === "function") {
          self.onCanvasSelected();
        }
        self.panDrag = {
          clientX: event.clientX,
          clientY: event.clientY
        };
      }
    });

    this.svgNode.addEventListener("pointermove", function (event) {
      const svgPoint = clientToSvgPoint(self.svgNode, event.clientX, event.clientY);
      const bounds = getSvgBounds(self.svgNode);
      if (self.controlDrag && self.onRelationshipControlMoved) {
        const localX = svgPoint.x;
        const localY = svgPoint.y;
        self.onRelationshipControlMoved(
          self.controlDrag.relationshipId,
          self.controlDrag.kind,
          self.controlDrag.role,
          self.controlDrag.route,
          localX,
          localY
        );
        return;
      }
      if (self.panDrag && typeof self.onPanDelta === "function") {
        const rect = self.svgNode.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const deltaX = event.clientX - self.panDrag.clientX;
          const deltaY = event.clientY - self.panDrag.clientY;
          const scaleX = bounds.width / rect.width;
          const scaleY = bounds.height / rect.height;
          self.onPanDelta(-deltaX * scaleX, -deltaY * scaleY);
        }
        self.panDrag.clientX = event.clientX;
        self.panDrag.clientY = event.clientY;
        return;
      }
      if (!self.drag) {
        return;
      }
      const x = svgPoint.x - self.drag.offsetX;
      const y = svgPoint.y - self.drag.offsetY;
      self.onNodeMoved(self.drag.elementId, x, y);
    });

    this.svgNode.addEventListener("pointerup", function () {
      self.drag = null;
      self.controlDrag = null;
      self.panDrag = null;
    });

    this.svgNode.addEventListener("pointerleave", function () {
      if (self.controlDrag) {
        return;
      }
      self.drag = null;
      self.panDrag = null;
    });
  };

  Diagram.prototype.setConnectMode = function (enabled) {
    this.connectMode = enabled;
    if (!enabled) {
      this.pendingSourceId = null;
    }
  };

  Diagram.prototype.getPendingSourceId = function () {
    return this.pendingSourceId;
  };

  Diagram.prototype.render = function (payload) {
    const elements = payload.elements;
    const relationships = payload.relationships;
    const viewpointFilter = payload.viewpointFilter;
    const lineMode = payload.lineMode || "straight";
    const colorScheme = payload.colorScheme || defaultCategoryColorMap;
    const visibleElementIds = payload.visibleElementIds || null;
    const diagramType = payload.diagramType || "standard";
    const clickableMetaById = payload.clickableMetaById || new Map();
    const focusElementId = payload.focusElementId || null;
    const selectedNodeId = payload.selectedNodeId || null;
    const selectedNodeIds = new Set(Array.isArray(payload.selectedNodeIds) ? payload.selectedNodeIds : []);
    const selectedEdgeId = payload.selectedEdgeId || null;
    const edgeTypeById = payload.edgeTypeById || new Map();
    const relationshipResultById = payload.relationshipResultById || new Map();
    const nodeTypeById = payload.nodeTypeById || new Map();

    const map = new Map(
      elements.map(function (element) {
        return [element.id, element];
      })
    );

    const filteredElements =
      viewpointFilter === "All"
        ? elements
        : elements.filter(function (element) {
            return element.viewpoint === viewpointFilter;
          });

    const diagramScopedElements = visibleElementIds
      ? filteredElements.filter(function (element) {
          return visibleElementIds.has(element.id);
        })
      : filteredElements;

    const visibleIds = new Set(
      diagramScopedElements.map(function (element) {
        return element.id;
      })
    );

    Array.from(this.svgNode.querySelectorAll("g.renderGroup")).forEach(function (node) {
      node.remove();
    });

    const edgeGroup = createSvgElement("g", { class: "renderGroup edgeGroup" });
    const metricsByElementId = new Map(
      elements.map(function (element) {
        return [element.id, getNodeMetrics(element)];
      })
    );
    const contentBounds = computeContentBounds(diagramScopedElements, metricsByElementId);
    const self = this;
    relationships.forEach(function (relationship) {
      if (!visibleIds.has(relationship.sourceId) || !visibleIds.has(relationship.targetId)) {
        return;
      }
      const source = map.get(relationship.sourceId);
      const target = map.get(relationship.targetId);
      if (!source || !target) {
        return;
      }
      const sourceMetrics = metricsByElementId.get(source.id);
      const targetMetrics = metricsByElementId.get(target.id);
      const complianceEntry = relationshipResultById.get(relationship.id) || null;
      const isRelationshipDeviation = !!(complianceEntry && complianceEntry.isDeviation);
      const isAcceptedDeviation = isRelationshipDeviation && !!relationship.allowDeviation;
      const isOpenDeviation = isRelationshipDeviation && !relationship.allowDeviation;
      const edgeRule =
        edgeTypeById.get(relationship.type) ||
        edgeTypeById.get(String(relationship.type || "").toLowerCase()) ||
        null;
      const connectorStyle = getConnectorStyle(relationship.type, edgeRule);
      const geometry = getConnectorGeometry(lineMode, relationship, source, target, sourceMetrics, targetMetrics);
      const isEdgeDoublePointerDown = function (relationshipId) {
        const pointerTime = Date.now();
        const lastEdgePointerDown = self.lastEdgePointerDown;
        const isDoublePointerDown = !!lastEdgePointerDown &&
          lastEdgePointerDown.relationshipId === relationshipId &&
          pointerTime - lastEdgePointerDown.time <= 420;
        self.lastEdgePointerDown = {
          relationshipId: relationshipId,
          time: pointerTime
        };
        return isDoublePointerDown;
      };
      const openEdgeSelectionEditor = function (event) {
        if (self.connectMode) {
          return;
        }
        event.stopPropagation();
        event.preventDefault();
        if (typeof self.onEdgeSelected === "function") {
          self.onEdgeSelected(relationship.id);
        }
      };
      const line = createSvgElement("path", {
        d: geometry.pathData,
        stroke: relationship.id === selectedEdgeId
          ? "#3f51b5"
          : (isOpenDeviation ? "#ad3f2f" : (isAcceptedDeviation ? "#aa7a2d" : "#735e4f")),
        "stroke-width": relationship.id === selectedEdgeId ? 2.6 : 1.6,
        "marker-end": "url(#" + connectorStyle.marker + ")",
        "stroke-dasharray": connectorStyle.dashArray,
        fill: "none",
        cursor: "pointer"
      });
      line.setAttribute("stroke-opacity", "0.95");
      line.addEventListener("dblclick", function (event) {
        openEdgeSelectionEditor(event);
      });
      line.addEventListener("pointerdown", function (event) {
        if (!isEdgeDoublePointerDown(relationship.id)) {
          return;
        }
        openEdgeSelectionEditor(event);
      });
      edgeGroup.appendChild(line);

      const labelX = geometry.labelX;
      const labelY = geometry.labelY;
      const edgeType =
        edgeTypeById.get(relationship.type) ||
        edgeTypeById.get(String(relationship.type || "").toLowerCase()) ||
        null;
      const labelText = formatStereotypeLabel((edgeType && edgeType.label) || relationship.type || "Association");
      const labelWidth = Math.max(36, Math.min(220, labelText.length * 6.6));

      const labelBg = createSvgElement("rect", {
        x: labelX - labelWidth / 2,
        y: labelY - 11,
        width: labelWidth,
        height: 14,
        rx: 3,
        ry: 3,
        fill: relationship.id === selectedEdgeId
          ? "#ecefff"
          : (isOpenDeviation ? "#fbe7e4" : (isAcceptedDeviation ? "#fff1d9" : "#fffdf8")),
        stroke: relationship.id === selectedEdgeId
          ? "#3f51b5"
          : (isOpenDeviation ? "#d1887f" : (isAcceptedDeviation ? "#dbb173" : "#c8bbaa")),
        "stroke-width": relationship.id === selectedEdgeId ? 1.1 : 0.8,
        cursor: "pointer"
      });
      labelBg.addEventListener("dblclick", function (event) {
        openEdgeSelectionEditor(event);
      });
      labelBg.addEventListener("pointerdown", function (event) {
        if (!isEdgeDoublePointerDown(relationship.id)) {
          return;
        }
        openEdgeSelectionEditor(event);
      });
      edgeGroup.appendChild(labelBg);

      const label = createSvgElement("text", {
        x: labelX,
        y: labelY,
        "text-anchor": "middle",
        "font-size": 10,
        fill: relationship.id === selectedEdgeId
          ? "#3f51b5"
          : (isOpenDeviation ? "#8f3a2e" : (isAcceptedDeviation ? "#8a5a16" : "#51483f")),
        cursor: "pointer"
      });
      label.textContent = labelText;
      label.addEventListener("dblclick", function (event) {
        openEdgeSelectionEditor(event);
      });
      label.addEventListener("pointerdown", function (event) {
        if (!isEdgeDoublePointerDown(relationship.id)) {
          return;
        }
        openEdgeSelectionEditor(event);
      });
      edgeGroup.appendChild(label);

      if (lineMode === "ortho" && Array.isArray(geometry.orthoHandles)) {
        const startControlDrag = function (event, handleInfo) {
          event.preventDefault();
          event.stopPropagation();
          self.controlDrag = {
            relationshipId: relationship.id,
              kind: handleInfo.kind,
              role: handleInfo.role,
              route: handleInfo.route
            };
          };

        geometry.orthoHandles.forEach(function (handleInfo) {
          const hitArea = createSvgElement("circle", {
            cx: handleInfo.x,
            cy: handleInfo.y,
            r: 18,
            fill: "transparent",
            stroke: "none",
            "pointer-events": "all",
            cursor: handleInfo.cursor
          });
          hitArea.addEventListener("pointerdown", function (event) {
            startControlDrag(event, handleInfo);
          });
          edgeGroup.appendChild(hitArea);
        });
      }
    });
    this.svgNode.appendChild(edgeGroup);

    const nodeGroup = createSvgElement("g", { class: "renderGroup nodeGroup" });

    diagramScopedElements.forEach(function (element) {
      const metrics = getNodeMetrics(element);
      const members = Array.isArray(element.members)
        ? element.members
            .map(function (entry) {
              return normalizeMemberItem(entry);
            })
            .filter(function (entry) {
              return !!entry.name;
            })
        : [];
      const functions = Array.isArray(element.functions) ? element.functions : [];
      const node = createSvgElement("g", {
        class: "diagramNode",
        transform: "translate(" + element.x + "," + element.y + ")",
        "data-id": element.id,
        cursor: "move"
      });

      const colors = resolveElementColors(element, colorScheme);
      const clickableMeta = diagramType === "clickable" ? clickableMetaById.get(element.id) : null;
      const isFocusNode = diagramType === "clickable" && focusElementId === element.id;
      const borderColor = element.allowDeviation
        ? "#ad3f2f"
        : clickableMeta && clickableMeta.hasContinuation
          ? "#1d5f89"
          : clickableMeta && clickableMeta.isLeaf
            ? "#557a52"
            : "#355f66";
      const isSelectedNode = element.id === selectedNodeId || selectedNodeIds.has(element.id);
      if (isFocusNode) {
        node.appendChild(
          createSvgElement("rect", {
            x: -4,
            y: -4,
            width: metrics.width + 8,
            height: metrics.height + 8,
            rx: 11,
            ry: 11,
            fill: "none",
            stroke: "#4b3f99",
            "stroke-width": 3,
            filter: "url(#focusGlow)"
          })
        );
      }
      node.appendChild(
        createSvgElement("rect", {
          width: metrics.width,
          height: metrics.height,
          rx: 8,
          ry: 8,
          fill: colors.bg,
          stroke: isSelectedNode ? "#3f51b5" : borderColor,
          "stroke-width": isSelectedNode ? 2.4 : 1.4
        })
      );

      const title = createSvgElement("text", { x: 8, y: 18, "font-size": 12, fill: colors.font });
      title.textContent = element.name;
      node.appendChild(title);

      const subtitle = createSvgElement("text", { x: 8, y: 34, "font-size": 11, fill: colors.font });
      const nodeType =
        nodeTypeById.get(element.type) ||
        nodeTypeById.get(String(element.type || "").toLowerCase()) ||
        null;
      const isAbstractType = !!(nodeType && nodeType.isAbstract);
      if (isAbstractType) {
        subtitle.setAttribute("font-style", "italic");
      }
      subtitle.textContent = formatStereotypeLabel((nodeType && nodeType.label) || element.type);
      node.appendChild(subtitle);

      if (isAbstractType) {
        const badgeY = clickableMeta && (clickableMeta.isLeaf || clickableMeta.hasContinuation) ? 18 : 8;
        const badgeWidth = 56;
        const badgeX = metrics.width - badgeWidth - 8;
        node.appendChild(
          createSvgElement("rect", {
            x: badgeX,
            y: badgeY,
            width: badgeWidth,
            height: 12,
            rx: 6,
            ry: 6,
            fill: "#fff9ea",
            stroke: "#b5a88f",
            "stroke-width": 0.8
          })
        );
        const abstractBadge = createSvgElement("text", {
          x: badgeX + badgeWidth / 2,
          y: badgeY + 9,
          "text-anchor": "middle",
          "font-size": 8.5,
          fill: "#75684f"
        });
        abstractBadge.textContent = "abstract";
        node.appendChild(abstractBadge);
      }

      if (clickableMeta && (clickableMeta.isLeaf || clickableMeta.hasContinuation)) {
        const hintText = clickableMeta.isLeaf ? "Leaf" : "Continue +" + clickableMeta.continuationCount;
        const hint = createSvgElement("text", {
          x: metrics.width - 8,
          y: 16,
          "text-anchor": "end",
          "font-size": 10,
          fill: clickableMeta.isLeaf ? "#557a52" : "#1d5f89"
        });
        hint.textContent = hintText;
        node.appendChild(hint);
      }


      let yCursor = 40;
      if (members.length > 0) {
        node.appendChild(
          createSvgElement("line", {
            x1: 0,
            y1: yCursor,
            x2: metrics.width,
            y2: yCursor,
            stroke: "#d5cab8",
            "stroke-width": 1
          })
        );
        yCursor += 14;
        members.forEach(function (member) {
          const memberText = createSvgElement("text", { x: 8, y: yCursor, "font-size": 10, fill: colors.font });
          memberText.textContent = "+ " + (member.value ? member.name + ": " + member.value : member.name);
          node.appendChild(memberText);
          yCursor += 14;
        });
      }

      if (functions.length > 0) {
        node.appendChild(
          createSvgElement("line", {
            x1: 0,
            y1: yCursor - 8,
            x2: metrics.width,
            y2: yCursor - 8,
            stroke: "#d5cab8",
            "stroke-width": 1
          })
        );
        functions.forEach(function (fnName) {
          const fnText = createSvgElement("text", { x: 8, y: yCursor + 4, "font-size": 10, fill: colors.font });
          fnText.textContent = "# " + fnName + "()";
          node.appendChild(fnText);
          yCursor += 14;
        });
      }

      node.addEventListener("pointerdown", function (event) {
        const pointerTime = Date.now();
        if (self.connectMode) {
          if (!self.pendingSourceId) {
            self.pendingSourceId = element.id;
          } else if (self.pendingSourceId !== element.id) {
            self.onConnectRequest(self.pendingSourceId, element.id);
            self.pendingSourceId = null;
          }
          return;
        }

        if (diagramType === "clickable" && typeof self.onNodeActivated === "function") {
          self.onNodeActivated(element.id);
          return;
        }

        const lastNodePointerDown = self.lastNodePointerDown;
        const isDoublePointerDown = !!lastNodePointerDown &&
          lastNodePointerDown.elementId === element.id &&
          pointerTime - lastNodePointerDown.time <= 360;
        self.lastNodePointerDown = {
          elementId: element.id,
          time: pointerTime
        };

        if (isDoublePointerDown) {
          if (typeof self.onNodeSelected === "function") {
            self.onNodeSelected(element.id);
          }
          return;
        }

        if (typeof self.onNodeClicked === "function") {
          self.onNodeClicked(element.id);
        }

        const rect = self.svgNode.getBoundingClientRect();
        const local = clientToSvgPoint(self.svgNode, event.clientX, event.clientY);
        self.drag = {
          elementId: element.id,
          offsetX: local.x - element.x,
          offsetY: local.y - element.y
        };
      });

      nodeGroup.appendChild(node);
    });

    this.svgNode.appendChild(nodeGroup);
    return { contentBounds: contentBounds };
  };

  const gui = new window.ArchitectureGuiManager();
  const dom = gui.dom;
  let editingElementId = null;
  let editingRelationshipId = null;
  let editingMetaModelViewId = null;
  let editingMetaModelNodeTypeId = null;
  let editingMetaModelEdgeTypeId = null;
  let tauriMenuUnlisten = null;
  let baselineLoadStatus = "";
  let lastLoggedBaselineSignature = "";
  let allocationMatrixSelection = null;
  let editingRoadmapRowId = null;

  function getTauriApi() {
    return window.__TAURI__ || null;
  }

  function isTauriRuntime() {
    return !!getTauriApi();
  }

  function invokeTauri(commandName, payload) {
    const tauriApi = getTauriApi();
    if (!tauriApi || !tauriApi.core || typeof tauriApi.core.invoke !== "function") {
      return Promise.reject(new Error("Tauri runtime not available"));
    }
    return tauriApi.core.invoke(commandName, payload || {});
  }

  function setBaselineLoadStatus(message) {
    baselineLoadStatus = String(message || "").trim();
  }

  function applyMetaModelAndLog(metaModel, contextLabel, sourceLabel, runtimeInfo) {
    const baseline = metaModelToBaseline(metaModel, sourceLabel, runtimeInfo);
    setBaseline(baseline);
    console.info(
      "[baseline] loaded",
      {
        context: contextLabel,
        source: sourceLabel || baseline.source,
        name: baseline.name,
        version: baseline.version,
        viewpoints: (baseline.viewpoints || []).length,
        stereotypes: (baseline.stereotypes || []).length,
        nodeTypes: (baseline.nodeTypes || []).length,
        edgeTypes: (baseline.edgeTypes || []).length
      }
    );
    setBaselineLoadStatus(
      "Baseline loaded: " + (contextLabel || baseline.name || "MetaModel")
    );
    return baseline;
  }

  function applyMdgXmlAndLog(xmlText, contextLabel, sourceLabel) {
    const metaModel = parseMdgXmlToMetaModel(xmlText);
    return applyMetaModelAndLog(metaModel, contextLabel, sourceLabel || "mdg-import");
  }

  function parseCsvField(value) {
    return (value || "")
      .split(",")
      .map(function (entry) {
        return entry.trim();
      })
      .filter(Boolean);
  }

  function formatCsvField(items) {
    return Array.isArray(items) ? items.join(", ") : "";
  }

  function getMultiSelectValues(selectElement) {
    if (!selectElement) {
      return [];
    }
    return Array.from(selectElement.selectedOptions || [])
      .map(function (option) {
        return String(option.value || "").trim();
      })
      .filter(Boolean);
  }

  function assignMultiSelectValues(selectElement, values) {
    if (!selectElement) {
      return;
    }
    const selected = new Set((values || []).map(function (value) {
      return String(value || "").trim();
    }));
    Array.from(selectElement.options || []).forEach(function (option) {
      option.selected = selected.has(String(option.value || "").trim());
    });
  }

  function setMultiSelectOptions(selectElement, values) {
    if (!selectElement) {
      return;
    }
    const previousSelected = getMultiSelectValues(selectElement);
    const uniqueValues = dedupe(values || []);
    selectElement.innerHTML = "";
    uniqueValues.forEach(function (value) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      selectElement.appendChild(option);
    });
    assignMultiSelectValues(selectElement, previousSelected);
  }

  function getSelectedListValue(listElement) {
    if (!listElement) {
      return "";
    }
    return String(listElement.value || "").trim();
  }

  function buildEditableMetaModel(currentState) {
    const baselineState = (currentState && currentState.baseline) || {};
    const effectiveBaseline = getEffectiveBaseline(baselineState);
    const metaModel = {
      format: baselineState.format || effectiveBaseline.format || "architectureMetaModel",
      schemaVersion: baselineState.schemaVersion || effectiveBaseline.schemaVersion || 2,
      source: baselineState.source || (effectiveBaseline.isLoaded ? effectiveBaseline.source : "metaModel-json"),
      metaModelId: baselineState.metaModelId || effectiveBaseline.metaModelId || "",
      name: baselineState.name || (effectiveBaseline.isLoaded ? effectiveBaseline.name : "MetaModel"),
      version: baselineState.version || (effectiveBaseline.isLoaded ? effectiveBaseline.version : "1.0.0"),
      notes: baselineState.notes || "",
      documentation: baselineState.documentation || {},
      architecture: effectiveBaseline.architecture || { views: [], nodeTypes: [], edgeTypes: [] }
    };
    if (!effectiveBaseline.isLoaded) {
      metaModel.architecture = { views: [], nodeTypes: [], edgeTypes: [] };
      return metaModel;
    }
    return normalizeArchitectureMetaModel(metaModel);
  }

  function applyMetaModelEditorMutation(mutator, labelText) {
    const currentState = getState();
    const effectiveBaseline = getEffectiveBaseline(currentState.baseline);
    const metaModel = buildEditableMetaModel(currentState);
    mutator(metaModel.architecture);
    if (effectiveBaseline.isDefaultMetaModel) {
      metaModel.name = String(metaModel.name || "MetaModel") + " (Draft)";
      metaModel.source = "metaModel-draft";
      if (metaModel.metaModelId) {
        metaModel.metaModelId = String(metaModel.metaModelId) + "-draft";
      }
    }
    const normalized = normalizeArchitectureMetaModel(metaModel);
    applyMetaModelAndLog(
      normalized,
      labelText || "metamodel editor",
      effectiveBaseline.isDefaultMetaModel ? "metaModel-draft" : "metaModel-json",
      { isDefaultMetaModel: false, fileName: "" }
    );
    if (effectiveBaseline.isDefaultMetaModel) {
      setBaselineLoadStatus("Draft created from default MetaModel. Export as new .meta.json to persist changes.");
    }
  }

  function resetMetaModelViewEditMode() {
    editingMetaModelViewId = null;
    if (dom.metaModelViewSubmitBtn) {
      dom.metaModelViewSubmitBtn.textContent = "Add View";
    }
    if (dom.metaModelViewCancelBtn) {
      dom.metaModelViewCancelBtn.hidden = true;
    }
    if (dom.metaModelViewForm) {
      dom.metaModelViewForm.reset();
    }
  }

  function resetMetaModelNodeTypeEditMode() {
    editingMetaModelNodeTypeId = null;
    if (dom.metaModelNodeTypeSubmitBtn) {
      dom.metaModelNodeTypeSubmitBtn.textContent = "Add Node Type";
    }
    if (dom.metaModelNodeTypeCancelBtn) {
      dom.metaModelNodeTypeCancelBtn.hidden = true;
    }
    if (dom.metaModelNodeTypeForm) {
      dom.metaModelNodeTypeForm.reset();
    }
    assignMultiSelectValues(dom.metaModelNodeTypeAllowedViews, []);
  }

  function resetMetaModelEdgeTypeEditMode() {
    editingMetaModelEdgeTypeId = null;
    if (dom.metaModelEdgeTypeSubmitBtn) {
      dom.metaModelEdgeTypeSubmitBtn.textContent = "Add Edge Type";
    }
    if (dom.metaModelEdgeTypeCancelBtn) {
      dom.metaModelEdgeTypeCancelBtn.hidden = true;
    }
    if (dom.metaModelEdgeTypeForm) {
      dom.metaModelEdgeTypeForm.reset();
    }
    assignMultiSelectValues(dom.metaModelEdgeTypeSourceTypes, []);
    assignMultiSelectValues(dom.metaModelEdgeTypeTargetTypes, []);
    assignMultiSelectValues(dom.metaModelEdgeTypeAllowedViews, []);
    if (dom.metaModelEdgeTypeStrokeStyle) {
      dom.metaModelEdgeTypeStrokeStyle.value = "solid";
    }
  }

  function renderMetaModelEditor(currentState, effectiveBaseline) {
    if (!dom.metaModelViewList || !dom.metaModelNodeTypeList || !dom.metaModelEdgeTypeList) {
      return;
    }
    const architecture = (effectiveBaseline && effectiveBaseline.architecture) || {
      views: [],
      nodeTypes: [],
      edgeTypes: []
    };
    const viewIds = dedupe((architecture.views || []).map(function (entry) {
      return entry.id || entry.name || "";
    }));
    const nodeTypeIds = dedupe((architecture.nodeTypes || []).map(function (entry) {
      return entry.id || "";
    }));
    setMultiSelectOptions(dom.metaModelNodeTypeAllowedViews, viewIds);
    setMultiSelectOptions(dom.metaModelEdgeTypeAllowedViews, viewIds);
    setMultiSelectOptions(dom.metaModelEdgeTypeSourceTypes, nodeTypeIds);
    setMultiSelectOptions(dom.metaModelEdgeTypeTargetTypes, nodeTypeIds);
    const previousView = dom.metaModelViewList.value;
    const previousNodeType = dom.metaModelNodeTypeList.value;
    const previousEdgeType = dom.metaModelEdgeTypeList.value;

    dom.metaModelViewList.innerHTML = "";
    (architecture.views || []).forEach(function (view) {
      const option = document.createElement("option");
      option.value = view.id;
      option.textContent = view.name + (view.category ? " [" + view.category + "]" : "");
      dom.metaModelViewList.appendChild(option);
    });
    if (previousView) {
      dom.metaModelViewList.value = previousView;
    }

    dom.metaModelNodeTypeList.innerHTML = "";
    (architecture.nodeTypes || []).forEach(function (nodeType) {
      const option = document.createElement("option");
      option.value = nodeType.id;
      const allowedViews = splitMultiValue(nodeType.allowedViews);
      option.textContent = String(nodeType.label || nodeType.id) + (allowedViews.length ? " @ " + allowedViews.length + " view(s)" : "");
      dom.metaModelNodeTypeList.appendChild(option);
    });
    if (previousNodeType) {
      dom.metaModelNodeTypeList.value = previousNodeType;
    }

    dom.metaModelEdgeTypeList.innerHTML = "";
    (architecture.edgeTypes || []).forEach(function (edgeType) {
      const option = document.createElement("option");
      option.value = edgeType.id;
      option.textContent = String(edgeType.label || edgeType.id) + " (" + normalizeStrokeStyle(edgeType.strokeStyle) + ")";
      dom.metaModelEdgeTypeList.appendChild(option);
    });
    if (previousEdgeType) {
      dom.metaModelEdgeTypeList.value = previousEdgeType;
    }
  }

  function normalizeMemberItem(item) {
    if (item && typeof item === "object") {
      return {
        name: (item.name || "").trim(),
        value: item.value != null ? String(item.value).trim() : ""
      };
    }
    const raw = String(item || "").trim();
    if (!raw) {
      return { name: "", value: "" };
    }
    const separatorIndex = raw.indexOf("=");
    if (separatorIndex < 0) {
      return { name: raw, value: "" };
    }
    return {
      name: raw.slice(0, separatorIndex).trim(),
      value: raw.slice(separatorIndex + 1).trim()
    };
  }

  function parseMembersField(value) {
    return (value || "")
      .split(",")
      .map(function (entry) {
        return normalizeMemberItem(entry);
      })
      .filter(function (entry) {
        return !!entry.name;
      });
  }

  function formatMembersField(items) {
    if (!Array.isArray(items)) {
      return "";
    }
    return items
      .map(function (item) {
        const normalized = normalizeMemberItem(item);
        return normalized.value ? normalized.name + "=" + normalized.value : normalized.name;
      })
      .filter(Boolean)
      .join(", ");
  }

  function cssColorToHex(value) {
    const raw = String(value || "").trim();
    if (!raw || !isValidCssColor(raw)) {
      return "";
    }
    const parser = document.createElement("span");
    parser.style.color = "";
    parser.style.color = raw;
    if (!parser.style.color) {
      return "";
    }
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return "";
    }
    ctx.fillStyle = "#000000";
    ctx.fillStyle = parser.style.color;
    const resolved = String(ctx.fillStyle || "").trim();
    if (/^#[0-9a-fA-F]{6}$/.test(resolved)) {
      return resolved.toLowerCase();
    }
    if (/^#[0-9a-fA-F]{3}$/.test(resolved)) {
      return (
        "#" +
        resolved[1] + resolved[1] +
        resolved[2] + resolved[2] +
        resolved[3] + resolved[3]
      ).toLowerCase();
    }
    const rgbMatch = resolved.match(/^rgba?\(\s*([0-9.]+)[,\s]+([0-9.]+)[,\s]+([0-9.]+)/i);
    if (!rgbMatch) {
      return "";
    }
    const toHex = function (channel) {
      const clamped = Math.max(0, Math.min(255, Math.round(Number(channel) || 0)));
      return clamped.toString(16).padStart(2, "0");
    };
    return "#" + toHex(rgbMatch[1]) + toHex(rgbMatch[2]) + toHex(rgbMatch[3]);
  }

  const cssNamedColors = [
    "aliceblue", "antiquewhite", "aqua", "aquamarine", "azure", "beige", "bisque", "black", "blanchedalmond",
    "blue", "blueviolet", "brown", "burlywood", "cadetblue", "chartreuse", "chocolate", "coral",
    "cornflowerblue", "cornsilk", "crimson", "cyan", "darkblue", "darkcyan", "darkgoldenrod", "darkgray",
    "darkgreen", "darkgrey", "darkkhaki", "darkmagenta", "darkolivegreen", "darkorange", "darkorchid",
    "darkred", "darksalmon", "darkseagreen", "darkslateblue", "darkslategray", "darkslategrey", "darkturquoise",
    "darkviolet", "deeppink", "deepskyblue", "dimgray", "dimgrey", "dodgerblue", "firebrick", "floralwhite",
    "forestgreen", "fuchsia", "gainsboro", "ghostwhite", "gold", "goldenrod", "gray", "green", "greenyellow",
    "grey", "honeydew", "hotpink", "indianred", "indigo", "ivory", "khaki", "lavender", "lavenderblush",
    "lawngreen", "lemonchiffon", "lightblue", "lightcoral", "lightcyan", "lightgoldenrodyellow", "lightgray",
    "lightgreen", "lightgrey", "lightpink", "lightsalmon", "lightseagreen", "lightskyblue", "lightslategray",
    "lightslategrey", "lightsteelblue", "lightyellow", "lime", "limegreen", "linen", "magenta", "maroon",
    "mediumaquamarine", "mediumblue", "mediumorchid", "mediumpurple", "mediumseagreen", "mediumslateblue",
    "mediumspringgreen", "mediumturquoise", "mediumvioletred", "midnightblue", "mintcream", "mistyrose",
    "moccasin", "navajowhite", "navy", "oldlace", "olive", "olivedrab", "orange", "orangered", "orchid",
    "palegoldenrod", "palegreen", "paleturquoise", "palevioletred", "papayawhip", "peachpuff", "peru", "pink",
    "plum", "powderblue", "purple", "rebeccapurple", "red", "rosybrown", "royalblue", "saddlebrown", "salmon",
    "sandybrown", "seagreen", "seashell", "sienna", "silver", "skyblue", "slateblue", "slategray", "slategrey",
    "snow", "springgreen", "steelblue", "tan", "teal", "thistle", "tomato", "transparent", "turquoise", "violet",
    "wheat", "white", "whitesmoke", "yellow", "yellowgreen"
  ];

  function populateCssNamedColorDatalist() {
    const list = document.getElementById("cssNamedColorList");
    if (!list) {
      return;
    }
    list.innerHTML = cssNamedColors
      .map(function (name) {
        return '<option value="' + name + '" label="' + name + '"></option>';
      })
      .join("");
  }

  function normalizeSearch(value) {
    return String(value || "").trim().toLowerCase();
  }

  function ensureSelectValueOption(selectElement, value) {
    if (!selectElement) {
      return;
    }
    const nextValue = String(value || "").trim();
    if (!nextValue || nextValue === customSelectValue) {
      return;
    }
    const hasValue = Array.from(selectElement.options || []).some(function (option) {
      return option.value === nextValue;
    });
    if (hasValue) {
      return;
    }
    const customOption = Array.from(selectElement.options || []).find(function (option) {
      return option.value === customSelectValue;
    });
    const option = document.createElement("option");
    option.value = nextValue;
    option.textContent = nextValue;
    if (customOption) {
      selectElement.insertBefore(option, customOption);
    } else {
      selectElement.appendChild(option);
    }
  }

  function setSelectOptions(selectElement, values) {
    if (!selectElement) {
      return;
    }
    if (selectElement.tagName !== "SELECT") {
      const listId = selectElement.getAttribute("list") || selectElement.dataset.fallbackListId || "";
      const listElement = listId ? document.getElementById(listId) : null;
      if (listElement) {
        const safeValues = dedupe(values || []);
        listElement.innerHTML = "";
        safeValues.forEach(function (value) {
          const option = document.createElement("option");
          option.value = value;
          listElement.appendChild(option);
        });
      }
      return;
    }
    const previousValue = String(selectElement.value || "").trim();
    const safeValues = dedupe(values || []);
    selectElement.innerHTML = "";
    safeValues.forEach(function (value) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      selectElement.appendChild(option);
    });
    const customOption = document.createElement("option");
    customOption.value = customSelectValue;
    customOption.textContent = "Custom...";
    selectElement.appendChild(customOption);
    if (previousValue) {
      ensureSelectValueOption(selectElement, previousValue);
      if (Array.from(selectElement.options).some(function (option) { return option.value === previousValue; })) {
        selectElement.value = previousValue;
      }
    }
    if (!selectElement.value && selectElement.options.length > 0) {
      selectElement.value = selectElement.options[0].value;
    }
    selectElement.dataset.lastValue = selectElement.value || "";
    const filterInputId = selectElement.dataset.filterInputId || "";
    if (filterInputId) {
      const filterInput = document.getElementById(filterInputId);
      if (filterInput) {
        applySelectFilter(selectElement, filterInput.value || "");
      }
    }
  }

  function formatSelectStereotypeOptions(selectElement) {
    if (!selectElement || selectElement.tagName !== "SELECT") {
      return;
    }
    Array.from(selectElement.options || []).forEach(function (option) {
      if (!option || option.value === customSelectValue) {
        return;
      }
      option.textContent = formatStereotypeLabel(option.value);
    });
  }

  function applySelectStereotypeLabels(selectElement, typeByIdMap) {
    if (!selectElement || selectElement.tagName !== "SELECT") {
      return;
    }
    Array.from(selectElement.options || []).forEach(function (option) {
      if (!option || option.value === customSelectValue) {
        return;
      }
      const key = String(option.value || "").trim();
      const typeEntry = (typeByIdMap && (typeByIdMap.get(key) || typeByIdMap.get(key.toLowerCase()))) || null;
      option.textContent = formatStereotypeLabel((typeEntry && typeEntry.label) || key);
    });
  }

  function assignSelectAndCustom(selectElement, customElement, value) {
    // Kept for backward compatibility calls; customElement is intentionally ignored.
    assignSelectValue(selectElement, value);
  }

  function assignSelectValue(selectElement, value) {
    const nextValue = String(value || "").trim();
    if (!selectElement) {
      return;
    }
    if (selectElement.tagName !== "SELECT") {
      selectElement.value = nextValue;
      return;
    }
    ensureSelectValueOption(selectElement, nextValue);
    if (nextValue && Array.from(selectElement.options).some(function (option) { return option.value === nextValue; })) {
      selectElement.value = nextValue;
    } else if (selectElement.options.length > 0) {
      selectElement.value = selectElement.options[0].value;
    }
    selectElement.dataset.lastValue = selectElement.value || "";
  }

  function resolveSelectAndCustom(selectElement, customElement) {
    // Kept for backward compatibility calls; customElement is intentionally ignored.
    return resolveSelectValue(selectElement);
  }

  function resolveSelectValue(selectElement) {
    if (!selectElement) {
      return "";
    }
    if (selectElement.tagName !== "SELECT") {
      return String(selectElement.value || "").trim();
    }
    const value = String(selectElement.value || "").trim();
    return value === customSelectValue ? "" : value;
  }

  function bindCustomSelect(selectElement, labelText) {
    if (!selectElement) {
      return;
    }
    selectElement.addEventListener("focus", function () {
      selectElement.dataset.lastValue = selectElement.value || "";
    });
    selectElement.addEventListener("change", function () {
      if (selectElement.value !== customSelectValue) {
        selectElement.dataset.lastValue = selectElement.value || "";
        return;
      }
      const typed = window.prompt("Custom " + labelText + ":", "");
      const nextValue = String(typed || "").trim();
      if (!nextValue) {
        selectElement.value = selectElement.dataset.lastValue || (selectElement.options[0] ? selectElement.options[0].value : "");
        return;
      }
      ensureSelectValueOption(selectElement, nextValue);
      selectElement.value = nextValue;
      selectElement.dataset.lastValue = nextValue;
    });
  }

  function applySelectFilter(selectElement, queryText) {
    if (!selectElement) {
      return;
    }
    const query = String(queryText || "").trim().toLowerCase();
    const selectedValue = String(selectElement.value || "").trim();
    Array.from(selectElement.options || []).forEach(function (option) {
      const value = String(option.value || "");
      const label = String(option.textContent || "");
      const isCustom = value === customSelectValue;
      if (!query || isCustom || value === selectedValue) {
        option.hidden = false;
        option.disabled = false;
        return;
      }
      const matches = value.toLowerCase().includes(query) || label.toLowerCase().includes(query);
      option.hidden = !matches;
      option.disabled = !matches;
    });
  }

  function bindSelectFilter(filterInput, selectElement) {
    if (!filterInput || !selectElement) {
      return;
    }
    selectElement.dataset.filterInputId = filterInput.id;
    filterInput.addEventListener("input", function () {
      applySelectFilter(selectElement, filterInput.value || "");
    });
  }

  function setInputDatalistEntries(inputElement, entries) {
    if (!inputElement || inputElement.tagName === "SELECT") {
      return;
    }
    const listId = inputElement.getAttribute("list") || inputElement.dataset.fallbackListId || "";
    const listElement = listId ? document.getElementById(listId) : null;
    if (!listElement) {
      return;
    }
    listElement.innerHTML = "";
    (entries || []).forEach(function (entry) {
      const option = document.createElement("option");
      option.value = String((entry && entry.value) || "").trim();
      option.label = String((entry && entry.label) || option.value);
      if (entry && entry.status) {
        option.dataset.status = entry.status;
      }
      if (option.value) {
        listElement.appendChild(option);
      }
    });
  }

  function bindDatalistFallback(inputElement) {
    if (!inputElement || inputElement.tagName === "SELECT") {
      return;
    }
    if (inputElement.dataset.datalistFallbackBound === "1") {
      return;
    }
    const listId = inputElement.getAttribute("list") || inputElement.dataset.fallbackListId || "";
    if (!listId) {
      return;
    }
    const listElement = document.getElementById(listId);
    if (!listElement) {
      return;
    }
    inputElement.dataset.fallbackListId = listId;
    // Disable native datalist popup so only the custom fallback is shown.
    inputElement.removeAttribute("list");
    inputElement.dataset.datalistFallbackBound = "1";
    const showColorBadge = listId === "cssNamedColorList";

    const popup = document.createElement("div");
    popup.className = "datalistFallbackPopup";
    popup.style.display = "none";
    popup.setAttribute("role", "listbox");
    document.body.appendChild(popup);
    let lastEntries = [];
    let activeIndex = -1;
    let hasTypedSinceOpen = false;

    function getEntries() {
      return Array.from(listElement.querySelectorAll("option"))
        .map(function (option) {
          return {
            value: String(option.value || "").trim(),
            label: String(option.label || option.value || "").trim(),
            status: String(option.dataset.status || "").trim()
          };
        })
        .filter(function (entry) {
          return !!entry.value;
        });
    }

    function positionPopup() {
      const rect = inputElement.getBoundingClientRect();
      popup.style.left = rect.left + window.scrollX + "px";
      popup.style.top = rect.bottom + window.scrollY + 4 + "px";
      popup.style.width = rect.width + "px";
    }

    function hidePopup() {
      popup.style.display = "none";
      popup.innerHTML = "";
      lastEntries = [];
      activeIndex = -1;
      hasTypedSinceOpen = false;
    }

    function getPopupItems() {
      return Array.from(popup.querySelectorAll(".datalistFallbackItem"));
    }

    function setActiveIndex(nextIndex) {
      const items = getPopupItems();
      if (!items.length) {
        activeIndex = -1;
        return;
      }
      activeIndex = clamp(nextIndex, 0, items.length - 1);
      items.forEach(function (item, index) {
        item.classList.toggle("active", index === activeIndex);
      });
      const activeItem = items[activeIndex];
      if (activeItem && typeof activeItem.scrollIntoView === "function") {
        activeItem.scrollIntoView({ block: "nearest" });
      }
    }

    function selectEntry(entry) {
      if (!entry) {
        return;
      }
      inputElement.value = entry.value;
      inputElement.dispatchEvent(new Event("input", { bubbles: true }));
      inputElement.dispatchEvent(new Event("change", { bubbles: true }));
      hidePopup();
    }

    function showPopup(forceFilter) {
      const query = String(inputElement.value || "").trim().toLowerCase();
      const shouldFilter = !!forceFilter || hasTypedSinceOpen || !!query;
      const entries = getEntries();
      if (!entries.length) {
        hidePopup();
        return;
      }
      const decoratedEntries = entries.map(function (entry) {
        const matches =
          !shouldFilter ||
          !query ||
          entry.value.toLowerCase().includes(query) ||
          entry.label.toLowerCase().includes(query);
        return {
          ...entry,
          _matchesFilter: !!matches
        };
      });
      decoratedEntries.sort(function (a, b) {
        if (a._matchesFilter !== b._matchesFilter) {
          return a._matchesFilter ? -1 : 1;
        }
        const aStatusWeight = a.status === "ok" ? 0 : (a.status === "warn" ? 1 : 2);
        const bStatusWeight = b.status === "ok" ? 0 : (b.status === "warn" ? 1 : 2);
        if (aStatusWeight !== bStatusWeight) {
          return aStatusWeight - bStatusWeight;
        }
        return String(a.label || a.value).localeCompare(String(b.label || b.value));
      });
      lastEntries = decoratedEntries;
      activeIndex = -1;
      popup.innerHTML = "";
      decoratedEntries.forEach(function (entry, index) {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "datalistFallbackItem";
        item.classList.toggle("filteredOut", !entry._matchesFilter);
        const text = document.createElement("span");
        text.className = "datalistFallbackText";
        text.textContent = entry.label || entry.value;
        item.appendChild(text);
        if (showColorBadge) {
          const colorValue = cssColorToHex(entry.value) || cssColorToHex(entry.label) || "";
          if (colorValue) {
            const colorBadge = document.createElement("span");
            colorBadge.className = "datalistColorBadge";
            colorBadge.title = entry.value;
            const swatch = document.createElement("span");
            swatch.className = "datalistColorSwatch";
            swatch.style.background = colorValue;
            colorBadge.appendChild(swatch);
            const colorText = document.createElement("span");
            colorText.className = "datalistColorText";
            colorText.textContent = colorValue;
            colorBadge.appendChild(colorText);
            item.appendChild(colorBadge);
          }
        }
        if (entry.status === "ok" || entry.status === "warn") {
          const badge = document.createElement("span");
          badge.className = "deviationBadge " + entry.status;
          badge.textContent = entry.status === "ok" ? "Compliant" : "Deviation";
          item.appendChild(badge);
        }
        item.setAttribute("role", "option");
        item.addEventListener("mouseenter", function () {
          setActiveIndex(index);
        });
        item.addEventListener("mousedown", function (event) {
          event.preventDefault();
          selectEntry(entry);
        });
        popup.appendChild(item);
      });
      positionPopup();
      popup.style.display = "block";
    }

    inputElement.addEventListener("focus", function () {
      hasTypedSinceOpen = false;
      showPopup(false);
    });
    inputElement.addEventListener("input", function () {
      hasTypedSinceOpen = true;
      showPopup(true);
    });
    inputElement.addEventListener("click", function () {
      if (popup.style.display === "none") {
        hasTypedSinceOpen = false;
      }
      showPopup(false);
    });
    inputElement.addEventListener("keydown", function (event) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        const isOpen = popup.style.display !== "none";
        if (!isOpen) {
          hasTypedSinceOpen = false;
          showPopup(false);
        }
        if (popup.style.display === "none") {
          return;
        }
        if (activeIndex < 0) {
          setActiveIndex(0);
        } else {
          setActiveIndex(activeIndex + 1);
        }
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        const isOpen = popup.style.display !== "none";
        if (!isOpen) {
          hasTypedSinceOpen = false;
          showPopup(false);
        }
        if (popup.style.display === "none") {
          return;
        }
        if (activeIndex < 0) {
          setActiveIndex((lastEntries || []).length - 1);
        } else {
          setActiveIndex(activeIndex - 1);
        }
        return;
      }
      if (event.key === "Enter" && popup.style.display !== "none") {
        if (activeIndex >= 0 && lastEntries[activeIndex]) {
          event.preventDefault();
          selectEntry(lastEntries[activeIndex]);
        }
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        hidePopup();
      }
    });
    inputElement.addEventListener("blur", function () {
      window.setTimeout(hidePopup, 120);
    });
    window.addEventListener("resize", function () {
      if (popup.style.display !== "none") {
        positionPopup();
      }
    });
    window.addEventListener("scroll", function () {
      if (popup.style.display !== "none") {
        positionPopup();
      }
    }, true);
  }

  function groupBy(items, keyGetter) {
    const map = new Map();
    items.forEach(function (item) {
      const key = keyGetter(item) || "Unassigned View";
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(item);
    });
    return map;
  }

  function applyDiagramZoom(svgNode, canvasBounds, zoomPercent, panX, panY) {
    const bounds = canvasBounds || { minX: 0, minY: 0, width: 1200, height: 700 };
    const baseWidth = 1200;
    const baseHeight = 700;
    const zoom = clamp((Number(zoomPercent) || 100) / 100, 0.1, 4);
    const visibleWidth = baseWidth / zoom;
    const visibleHeight = baseHeight / zoom;
    const contentMinX = Number(bounds.minX) || 0;
    const contentMinY = Number(bounds.minY) || 0;
    const contentWidth = Math.max(1, Number(bounds.width) || 1);
    const contentHeight = Math.max(1, Number(bounds.height) || 1);
    const contentMaxX = contentMinX + contentWidth;
    const contentMaxY = contentMinY + contentHeight;

    const centeredX = contentMinX + (contentWidth - visibleWidth) / 2;
    const centeredY = contentMinY + (contentHeight - visibleHeight) / 2;

    const minOffsetX = contentWidth <= visibleWidth ? centeredX : contentMinX;
    const maxOffsetX = contentWidth <= visibleWidth ? centeredX : (contentMaxX - visibleWidth);
    const minOffsetY = contentHeight <= visibleHeight ? centeredY : contentMinY;
    const maxOffsetY = contentHeight <= visibleHeight ? centeredY : (contentMaxY - visibleHeight);

    const offsetX = clamp(centeredX + (Number(panX) || 0), minOffsetX, maxOffsetX);
    const offsetY = clamp(centeredY + (Number(panY) || 0), minOffsetY, maxOffsetY);
    svgNode.setAttribute(
      "viewBox",
      offsetX + " " + offsetY + " " + visibleWidth + " " + visibleHeight
    );
    return {
      panX: offsetX - centeredX,
      panY: offsetY - centeredY
    };
  }

  function parseZoomPercent(value) {
    const raw = String(value || "").trim().replace("%", "");
    const parsed = parseInt(raw, 10);
    if (!Number.isFinite(parsed)) {
      return null;
    }
    return Math.max(10, Math.min(400, parsed));
  }

  function fitSelectedNodesInDiagram(currentState, selectedIds) {
    const activeDiagram = getActiveDiagram(currentState);
    if (!activeDiagram || !Array.isArray(selectedIds) || selectedIds.length === 0) {
      return null;
    }
    const selectedIdSet = new Set(selectedIds);
    const viewpointFilter = currentState.ui.viewpointFilter || "All";
    const diagramIds = Array.isArray(activeDiagram.elementIds) ? activeDiagram.elementIds : [];

    const diagramElements = applyDiagramLayoutToElements(currentState.model.elements || [], activeDiagram);

    const selectedElements = diagramElements.filter(function (entry) {
      if (activeDiagram.type === "standard" && diagramIds.indexOf(entry.id) < 0) {
        return false;
      }
      if (viewpointFilter !== "All" && (entry.viewpoint || "") !== viewpointFilter) {
        return false;
      }
      return selectedIdSet.has(entry.id);
    });
    if (!selectedElements.length) {
      return null;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    selectedElements.forEach(function (entry) {
      const metrics = getNodeMetrics(entry);
      const x = Number(entry.x) || 0;
      const y = Number(entry.y) || 0;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + metrics.width);
      maxY = Math.max(maxY, y + metrics.height);
    });

    const marginX = 80;
    const marginY = 70;
    const viewPadding = 16;
    const boxWidth = Math.max(1, maxX - minX + marginX * 2);
    const boxHeight = Math.max(1, maxY - minY + marginY * 2);

    const currentView = getSvgBounds(dom.diagramSvg);
    const alreadyVisible =
      minX >= currentView.minX + viewPadding &&
      maxX <= currentView.maxX - viewPadding &&
      minY >= currentView.minY + viewPadding &&
      maxY <= currentView.maxY - viewPadding;
    if (alreadyVisible) {
      return null;
    }

    const zoomRatio = Math.min(1200 / boxWidth, 700 / boxHeight);
    const zoom = clamp(Math.floor(zoomRatio * 100), 10, 100);
    const visibleWidth = 1200 / (zoom / 100);
    const visibleHeight = 700 / (zoom / 100);

    const allVisibleElements = diagramElements.filter(function (entry) {
      if (activeDiagram.type === "standard" && diagramIds.indexOf(entry.id) < 0) {
        return false;
      }
      if (viewpointFilter !== "All" && (entry.viewpoint || "") !== viewpointFilter) {
        return false;
      }
      return true;
    });
    const metricsById = new Map(
      allVisibleElements.map(function (entry) {
        return [entry.id, getNodeMetrics(entry)];
      })
    );
    const contentBounds = computeContentBounds(allVisibleElements, metricsById);
    const contentMinX = Number(contentBounds.minX) || 0;
    const contentMinY = Number(contentBounds.minY) || 0;
    const contentWidth = Math.max(1, Number(contentBounds.width) || 1);
    const contentHeight = Math.max(1, Number(contentBounds.height) || 1);
    const centeredX = contentMinX + (contentWidth - visibleWidth) / 2;
    const centeredY = contentMinY + (contentHeight - visibleHeight) / 2;
    const targetCenterX = (minX + maxX) / 2;
    const targetCenterY = (minY + maxY) / 2;
    const desiredOffsetX = targetCenterX - visibleWidth / 2;
    const desiredOffsetY = targetCenterY - visibleHeight / 2;

    return {
      diagramZoom: zoom,
      diagramPanX: desiredOffsetX - centeredX,
      diagramPanY: desiredOffsetY - centeredY
    };
  }

  const diagram = new Diagram(
    dom.diagramSvg,
    function (elementId, x, y) {
      const currentState = getState();
      const activeDiagram = getActiveDiagram(currentState);
      if (!activeDiagram || activeDiagram.type !== "standard") {
        return;
      }
      upsertDiagram({
        ...activeDiagram,
        elementLayout: {
          ...(activeDiagram.elementLayout || {}),
          [elementId]: { x: x, y: y }
        }
      });
    },
    function (sourceId, targetId) {
      const baseline = getEffectiveBaseline(getState().baseline);
      const type = (dom.diagramRelType.value || "").trim() || ((baseline.edgeTypes && baseline.edgeTypes[0]) || "Association");
      addRelationship({
        sourceId: sourceId,
        targetId: targetId,
        type: type,
        description: "Created in diagram",
        allowDeviation: false
      });
    }
  );
  diagram.onNodeActivated = function (elementId) {
    const current = getState();
    const activeDiagram = getActiveDiagram(current);
    if (!activeDiagram || activeDiagram.type !== "clickable") {
      return;
    }
    upsertDiagram({
      ...activeDiagram,
      focusElementId: elementId
    });
  };
  diagram.onNodeSelected = function (elementId) {
    setUi({ selectedNodeId: elementId, selectedNodeIds: [elementId], selectedEdgeId: null, selectionDrawerOpen: true });
  };
  diagram.onNodeClicked = function (elementId) {
    const current = getState();
    setUi({
      selectedNodeId: elementId,
      selectedNodeIds: [elementId],
      selectedEdgeId: null,
      selectionDrawerOpen: !!current.ui.selectionDrawerOpen
    });
  };
  diagram.onEdgeSelected = function (relationshipId) {
    setUi({ selectedNodeId: null, selectedNodeIds: [], selectedEdgeId: relationshipId, selectionDrawerOpen: true });
  };
  diagram.onCanvasSelected = function () {
    setUi({ selectedNodeId: null, selectedNodeIds: [], selectedEdgeId: null, selectionDrawerOpen: false });
  };
  diagram.onPanDelta = function (deltaX, deltaY) {
    const current = getState();
    setUi({
      diagramPanX: (current.ui.diagramPanX || 0) + deltaX,
      diagramPanY: (current.ui.diagramPanY || 0) + deltaY
    });
  };
  diagram.onRelationshipControlMoved = function (relationshipId, kind, role, route, localX, localY) {
    const current = getState().model.relationships.find(function (entry) {
      return entry.id === relationshipId;
    });
    if (!current) {
      return;
    }
    const modelState = getState();
    const source = modelState.model.elements.find(function (entry) {
      return entry.id === current.sourceId;
    });
    const target = modelState.model.elements.find(function (entry) {
      return entry.id === current.targetId;
    });
    if (!source || !target) {
      return;
    }

    const sourceMetrics = getNodeMetrics(source);
    const targetMetrics = getNodeMetrics(target);
    const previous = current.orthoControl || {};
    const next = { ...previous, route: route || previous.route || "hv" };

    const sourceCenter = { x: source.x + sourceMetrics.halfWidth, y: source.y + sourceMetrics.halfHeight };
    const targetCenter = { x: target.x + targetMetrics.halfWidth, y: target.y + targetMetrics.halfHeight };
    const sourceDock = resolveDockPoint(next.sourceDock, sourceCenter, sourceMetrics, targetCenter);
    const targetDock = resolveDockPoint(next.targetDock, targetCenter, targetMetrics, sourceCenter);
    const sourceLead = getLeadPoint(sourceDock, 18);
    const targetLead = getLeadPoint(targetDock, 18);

    if (kind === "corner") {
      const anchor = role === "target" ? targetLead : sourceLead;
      const hvError = Math.abs(localY - anchor.y);
      const vhError = Math.abs(localX - anchor.x);
      if (hvError <= vhError) {
        next.route = "hv";
        next.splitX = localX;
      } else {
        next.route = "vh";
        next.splitY = localY;
      }
    } else if (kind === "sourceEndpoint") {
      next.sourceDock = projectPointToNodeBorder(source, sourceMetrics, localX, localY);
    } else if (kind === "targetEndpoint") {
      next.targetDock = projectPointToNodeBorder(target, targetMetrics, localX, localY);
    }
    upsertRelationship({
      ...current,
      orthoControl: next
    });
  };

  function createId(prefix) {
    return prefix + "_" + Math.random().toString(36).slice(2, 9);
  }

  function buildExportPayload(currentState) {
    const safeState = currentState || defaultState;
    const architectures = Array.isArray(safeState.architectures) ? safeState.architectures : [];
    const activeArchitectureId = (safeState.ui && safeState.ui.activeArchitectureId) || "";
    const activeArchitecture = architectures.find(function (entry) {
      return entry && entry.id === activeArchitectureId;
    }) || architectures[0] || null;
    const exportArchitecture = activeArchitecture
      ? {
          id: activeArchitecture.id || "",
          name: activeArchitecture.name || "",
          model: clone((activeArchitecture && activeArchitecture.model) || { elements: [], relationships: [], diagrams: [] })
        }
      : {
          id: "arch_main",
          name: "Main Architecture",
          model: clone(safeState.model || { elements: [], relationships: [], diagrams: [] })
        };
    return {
      format: "deltaModelArchitectureExport",
      version: 4,
      exportedAt: new Date().toISOString(),
      architecture: exportArchitecture
    };
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function wrapStereotype(value) {
    const text = String(value || "").trim();
    if (!text) {
      return "";
    }
    return "&lt;&lt;" + escapeHtml(text) + "&gt;&gt;";
  }

  function toValueList(value) {
    if (Array.isArray(value)) {
      return value.map(function (entry) { return String(entry || "").trim(); }).filter(Boolean);
    }
    return splitMultiValue(value);
  }

  function joinListForHtml(value) {
    const list = toValueList(value);
    if (!list.length) {
      return "-";
    }
    return escapeHtml(list.join(", "));
  }

  function buildHtmlTable(headers, rows) {
    return (
      '<table><thead><tr>' +
      headers.map(function (header) {
        return "<th>" + escapeHtml(header) + "</th>";
      }).join("") +
      "</tr></thead><tbody>" +
      (rows.length
        ? rows.map(function (row) {
            return "<tr>" + row.map(function (cell) {
              return "<td>" + (cell == null ? "-" : String(cell)) + "</td>";
            }).join("") + "</tr>";
          }).join("")
        : '<tr><td colspan="' + headers.length + '">No entries</td></tr>') +
      "</tbody></table>"
    );
  }

  function computeDiagramExportBounds(elements) {
    if (!elements.length) {
      return { minX: 0, minY: 0, width: 1200, height: 700 };
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    elements.forEach(function (entry) {
      const metrics = getNodeMetrics(entry);
      const x = Number(entry.x) || 0;
      const y = Number(entry.y) || 0;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + metrics.width);
      maxY = Math.max(maxY, y + metrics.height);
    });
    const padX = 120;
    const padY = 90;
    const width = Math.max(640, (maxX - minX) + padX * 2);
    const height = Math.max(360, (maxY - minY) + padY * 2);
    return {
      minX: minX - padX,
      minY: minY - padY,
      width: width,
      height: height
    };
  }

  function truncateText(value, max) {
    const text = String(value || "");
    if (text.length <= max) {
      return text;
    }
    return text.slice(0, Math.max(0, max - 1)) + "…";
  }

  function sanitizeFileName(value, fallbackValue) {
    const raw = String(value || "").trim();
    const cleaned = raw.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "");
    return cleaned || String(fallbackValue || "diagram");
  }

  function buildEdgeTypeByIdMap(effectiveBaseline) {
    const map = new Map();
    const edgeTypes = ((effectiveBaseline.architecture && effectiveBaseline.architecture.edgeTypes) || []);
    edgeTypes.forEach(function (entry) {
      if (!entry || !entry.id) {
        return;
      }
      const id = String(entry.id || "").trim();
      if (!id) {
        return;
      }
      map.set(id, entry);
      map.set(id.toLowerCase(), entry);
    });
    return map;
  }

  function getRelationshipStrokeStyle(relationship, edgeTypeById) {
    if (relationship && relationship.strokeStyle) {
      return normalizeStrokeStyle(relationship.strokeStyle);
    }
    const typeId = String((relationship && relationship.type) || "").trim();
    const edgeType = (edgeTypeById && (edgeTypeById.get(typeId) || edgeTypeById.get(typeId.toLowerCase()))) || null;
    if (edgeType && edgeType.strokeStyle) {
      return normalizeStrokeStyle(edgeType.strokeStyle);
    }
    return "solid";
  }

  function buildDiagramPreviewSvg(diagram, allElements, allRelationships, colorScheme, edgeTypeById, cssClassName) {
    const idSet = new Set(Array.isArray(diagram.elementIds) ? diagram.elementIds : []);
    const positionedElements = applyDiagramLayoutToElements(allElements, diagram);
    const elements = positionedElements.filter(function (entry) {
      return idSet.has(entry.id);
    });
    if (!elements.length) {
      return '<div class="muted">No elements assigned to this diagram.</div>';
    }
    const elementById = new Map(
      elements.map(function (entry) {
        return [entry.id, entry];
      })
    );
    const relationships = allRelationships.filter(function (entry) {
      return idSet.has(entry.sourceId) && idSet.has(entry.targetId);
    });
    const bounds = computeDiagramExportBounds(elements);
    const edgeLayer = relationships.map(function (entry) {
      const source = elementById.get(entry.sourceId);
      const target = elementById.get(entry.targetId);
      if (!source || !target) {
        return "";
      }
      const sourceMetrics = getNodeMetrics(source);
      const targetMetrics = getNodeMetrics(target);
      const x1 = (Number(source.x) || 0) + sourceMetrics.width / 2;
      const y1 = (Number(source.y) || 0) + sourceMetrics.height / 2;
      const x2 = (Number(target.x) || 0) + targetMetrics.width / 2;
      const y2 = (Number(target.y) || 0) + targetMetrics.height / 2;
      const strokeDash = dashArrayForStrokeStyle(getRelationshipStrokeStyle(entry, edgeTypeById));
      return (
        '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"' +
        ' stroke="#5d5449" stroke-width="1.6" marker-end="url(#arrowHead)"' +
        (strokeDash ? ' stroke-dasharray="' + strokeDash + '"' : "") +
        " />"
      );
    }).join("");
    const nodeLayer = elements.map(function (entry) {
      const metrics = getNodeMetrics(entry);
      const x = Number(entry.x) || 0;
      const y = Number(entry.y) || 0;
      const colors = resolveElementColors(entry, colorScheme);
      const label = truncateText(entry.name || entry.id, 34);
      const typeLabel = truncateText("<<" + String(entry.type || "") + ">>", 34);
      return (
        '<g class="diagramNode">' +
        '<rect x="' + x + '" y="' + y + '" width="' + metrics.width + '" height="' + metrics.height + '" rx="10" ry="10"' +
        ' fill="' + escapeHtml(colors.bg) + '" stroke="#6f675d" stroke-width="1.1" />' +
        '<text x="' + (x + 10) + '" y="' + (y + 20) + '" font-size="12" fill="' + escapeHtml(colors.font) + '" font-weight="600">' + escapeHtml(label) + "</text>" +
        '<text x="' + (x + 10) + '" y="' + (y + 36) + '" font-size="10" fill="#5a534a">' + escapeHtml(typeLabel) + "</text>" +
        "</g>"
      );
    }).join("");
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" class="' + escapeHtml(cssClassName || "diagramPreviewSvg") + '" viewBox="' +
      [bounds.minX, bounds.minY, bounds.width, bounds.height].join(" ") +
      '" aria-label="Diagram preview">' +
      "<defs>" +
      "<style><![CDATA[text{font-family:Arial,'Liberation Sans','DejaVu Sans',sans-serif;}]]></style>" +
      '<marker id="arrowHead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">' +
      '<path d="M 0 0 L 10 5 L 0 10 z" fill="#5d5449"></path>' +
      "</marker>" +
      "</defs>" +
      '<rect x="' + bounds.minX + '" y="' + bounds.minY + '" width="' + bounds.width + '" height="' + bounds.height + '" fill="#fffdf8" />' +
      '<g class="diagramEdges">' + edgeLayer + "</g>" +
      '<g class="diagramNodes">' + nodeLayer + "</g>" +
      "</svg>"
    );
  }

  function buildRoadmapSvgForExport(diagram, allElements) {
    const elements = Array.isArray(allElements) ? allElements : [];
    const rows = Array.isArray(diagram.roadmapRows) ? diagram.roadmapRows : [];
    const elementById = new Map(
      elements.map(function (entry) {
        return [entry.id, entry];
      })
    );
    const resolvedRows = rows.map(function (row) {
      return buildRoadmapRowResult(row, elementById);
    });
    const diagramStartMs = parseIsoDateToUtcMs(diagram.roadmapStartDate || "");
    const diagramEndMs = parseIsoDateToUtcMs(diagram.roadmapEndDate || "");
    const validBounds = resolvedRows.filter(function (entry) {
      return Number.isFinite(entry.startBound) && Number.isFinite(entry.endBound);
    });
    let minMs = Number.isFinite(diagramStartMs) ? diagramStartMs : null;
    let maxMs = Number.isFinite(diagramEndMs) ? diagramEndMs : null;
    if (minMs == null && validBounds.length) {
      minMs = Math.min.apply(null, validBounds.map(function (entry) { return entry.startBound; }));
    }
    if (maxMs == null && validBounds.length) {
      maxMs = Math.max.apply(null, validBounds.map(function (entry) { return entry.endBound; }));
    }
    if (minMs == null) {
      minMs = Date.now() - (14 * 24 * 60 * 60 * 1000);
    }
    if (maxMs == null) {
      maxMs = Date.now() + (120 * 24 * 60 * 60 * 1000);
    }
    if (maxMs <= minMs) {
      maxMs = minMs + (24 * 60 * 60 * 1000);
    }
    const scale = normalizeRoadmapScale(diagram.roadmapTimeScale || "month");
    const totalSpan = maxMs - minMs;
    const labelAreaWidth = 280;
    const rightPad = 40;
    const trackStartX = labelAreaWidth + 20;
    const trackWidth = 1020;
    const rowHeight = 48;
    const headHeight = 58;
    const chartTop = 78;
    const rowsHeight = Math.max(1, resolvedRows.length) * rowHeight;
    const width = trackStartX + trackWidth + rightPad;
    const height = chartTop + rowsHeight + 60;
    const toX = function (ms) {
      return trackStartX + clamp(((ms - minMs) / totalSpan), 0, 1) * trackWidth;
    };

    const tickDates = [];
    const cursor = new Date(minMs);
    cursor.setUTCHours(0, 0, 0, 0);
    if (scale === "year") {
      cursor.setUTCMonth(0, 1);
    } else if (scale === "quarter") {
      cursor.setUTCMonth(Math.floor(cursor.getUTCMonth() / 3) * 3, 1);
    } else {
      cursor.setUTCDate(1);
    }
    if (cursor.getTime() > minMs) {
      if (scale === "year") {
        cursor.setUTCFullYear(cursor.getUTCFullYear() - 1);
      } else if (scale === "quarter") {
        cursor.setUTCMonth(cursor.getUTCMonth() - 3);
      } else {
        cursor.setUTCMonth(cursor.getUTCMonth() - 1);
      }
    }
    while (cursor.getTime() <= maxMs) {
      tickDates.push(new Date(cursor.getTime()));
      if (scale === "year") {
        cursor.setUTCFullYear(cursor.getUTCFullYear() + 1);
      } else if (scale === "quarter") {
        cursor.setUTCMonth(cursor.getUTCMonth() + 3);
      } else {
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
      }
    }

    const tickLayer = tickDates.map(function (dateValue) {
      const x = toX(dateValue.getTime());
      let label = String(dateValue.getUTCFullYear());
      if (scale === "month") {
        label = String(dateValue.getUTCFullYear()) + "-" + String(dateValue.getUTCMonth() + 1).padStart(2, "0");
      } else if (scale === "quarter") {
        label = String(dateValue.getUTCFullYear()) + "-Q" + (Math.floor(dateValue.getUTCMonth() / 3) + 1);
      }
      return (
        '<line x1="' + x + '" y1="' + (headHeight - 6) + '" x2="' + x + '" y2="' + (height - 32) + '" stroke="#d7cfbf" stroke-width="1"/>' +
        '<text x="' + (x + 2) + '" y="' + (headHeight - 12) + '" font-size="10" fill="#665f55">' + escapeHtml(label) + "</text>"
      );
    }).join("");

    const rowLayer = resolvedRows.map(function (entry, index) {
      const y = chartTop + index * rowHeight;
      const nodeName = entry.node ? (entry.node.name || entry.node.id) : entry.row.nodeId;
      const rowLabel = String(entry.row.label || "").trim() || nodeName;
      const rowBg = index % 2 === 0 ? "#fffdf8" : "#fcf8ef";
      const deviationColor = "#8f3a2e";
      const base =
        '<rect x="0" y="' + y + '" width="' + width + '" height="' + rowHeight + '" fill="' + rowBg + '"/>' +
        '<line x1="0" y1="' + y + '" x2="' + width + '" y2="' + y + '" stroke="#ddd4c5" stroke-width="1"/>' +
        '<text x="10" y="' + (y + 19) + '" font-size="12" fill="#2a313b">' + escapeHtml(truncateText(rowLabel, 38)) + "</text>" +
        '<text x="10" y="' + (y + 34) + '" font-size="10" fill="#6e695f">' + escapeHtml("(" + (entry.row.nodeId || "-") + ")") + "</text>";
      if (entry.mode === "range" && Number.isFinite(entry.startMs) && Number.isFinite(entry.endMs)) {
        const x1 = toX(entry.startMs);
        const x2 = toX(entry.endMs);
        return (
          base +
          '<rect x="' + x1 + '" y="' + (y + 14) + '" width="' + Math.max(1.8, x2 - x1) + '" height="16" rx="8" ry="8" fill="#5f89bc" stroke="#3b5e88" stroke-width="1"/>'
        );
      }
      if (entry.mode === "milestone" && Number.isFinite(entry.milestoneMs)) {
        const x = toX(entry.milestoneMs);
        const cy = y + 22;
        return (
          base +
          '<polygon points="' +
          (x) + "," + (cy - 8) + " " +
          (x + 8) + "," + (cy) + " " +
          (x) + "," + (cy + 8) + " " +
          (x - 8) + "," + (cy) +
          '" fill="#e6f2ff" stroke="#3b5e88" stroke-width="1.2"/>'
        );
      }
      return (
        base +
        '<text x="' + trackStartX + '" y="' + (y + 27) + '" font-size="11" fill="' + deviationColor + '">' +
        escapeHtml("Missing or invalid date values") +
        "</text>"
      );
    }).join("");

    return (
      '<svg xmlns="http://www.w3.org/2000/svg" class="diagramExportSvg" viewBox="0 0 ' + width + " " + height + '" aria-label="Roadmap export">' +
      "<defs><style><![CDATA[text{font-family:Arial,'Liberation Sans','DejaVu Sans',sans-serif;}]]></style></defs>" +
      '<rect x="0" y="0" width="' + width + '" height="' + height + '" fill="#fffdf8"/>' +
      '<text x="12" y="24" font-size="15" font-weight="700" fill="#2e3640">' + escapeHtml(diagram.title || diagram.name || "Roadmap") + "</text>" +
      '<text x="12" y="42" font-size="11" fill="#6b6459">' +
      escapeHtml("Scale: " + scale + " | Range: " + formatUtcDate(minMs) + " to " + formatUtcDate(maxMs)) +
      "</text>" +
      '<line x1="0" y1="' + (headHeight + 10) + '" x2="' + width + '" y2="' + (headHeight + 10) + '" stroke="#cfc6b5" stroke-width="1"/>' +
      tickLayer +
      rowLayer +
      '<line x1="0" y1="' + (height - 32) + '" x2="' + width + '" y2="' + (height - 32) + '" stroke="#cfc6b5" stroke-width="1"/>' +
      "</svg>"
    );
  }

  function buildHtmlArchitectureReport(currentState) {
    const effectiveBaseline = getEffectiveBaseline(currentState.baseline);
    const effectiveColorScheme = getEffectiveColorScheme(currentState, effectiveBaseline);
    const edgeTypeById = buildEdgeTypeByIdMap(effectiveBaseline);
    const architectureEntries = Array.isArray(currentState.architectures) ? currentState.architectures : [];
    const activeArchitectureId = (currentState.ui && currentState.ui.activeArchitectureId) || "";
    const activeArchitecture = architectureEntries.find(function (entry) {
      return entry.id === activeArchitectureId;
    }) || architectureEntries[0] || null;
    const compliance = evaluateCompliance(currentState);
    const elementResultById = new Map(
      compliance.elementResults.map(function (entry) {
        return [entry.id, entry];
      })
    );
    const relationshipResultById = new Map(
      compliance.relationshipResults.map(function (entry) {
        return [entry.id, entry];
      })
    );
    const elements = (currentState.model.elements || []).slice().sort(function (a, b) {
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
    const elementById = new Map(
      elements.map(function (entry) {
        return [entry.id, entry];
      })
    );
    const relationships = (currentState.model.relationships || []).slice().sort(function (a, b) {
      return String(a.type || "").localeCompare(String(b.type || ""));
    });
    const diagrams = (currentState.model.diagrams || []).slice().sort(function (a, b) {
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
    const sections = [
      { id: "sec-summary", title: "Summary" },
      { id: "sec-architectures", title: "Architectures" },
      { id: "sec-views", title: "Views" },
      { id: "sec-categories", title: "Categories" },
      { id: "sec-elements", title: "Elements" },
      { id: "sec-relationships", title: "Relationships" },
      { id: "sec-diagrams", title: "Diagrams" },
      { id: "sec-diagram-previews", title: "Diagram Previews" }
    ];
    const architectureRows = architectureEntries.map(function (entry) {
      const model = entry.model || {};
      return [
        escapeHtml(entry.id),
        escapeHtml(entry.name || ""),
        String((model.elements || []).length),
        String((model.relationships || []).length),
        String((model.diagrams || []).length),
        entry.id === activeArchitectureId ? "Yes" : "No"
      ];
    });
    const viewRows = ((effectiveBaseline.architecture && effectiveBaseline.architecture.views) || []).map(function (entry) {
      return [
        escapeHtml(entry.id || entry.name || ""),
        escapeHtml(entry.name || entry.id || ""),
        escapeHtml(entry.category || "-"),
        escapeHtml(entry.description || "-")
      ];
    });
    const categoryRows = ((effectiveBaseline.architecture && effectiveBaseline.architecture.categories) || []).map(function (entry) {
      return [
        escapeHtml(entry.id || ""),
        escapeHtml(entry.name || entry.id || ""),
        escapeHtml(entry.bg || "-"),
        escapeHtml(entry.font || "-")
      ];
    });
    const elementRows = elements.map(function (entry) {
      const complianceEntry = elementResultById.get(entry.id);
      return [
        escapeHtml(entry.id),
        escapeHtml(entry.name || ""),
        wrapStereotype(entry.type || ""),
        escapeHtml(entry.viewpoint || "-"),
        escapeHtml(entry.description || "-"),
        joinListForHtml(entry.members),
        joinListForHtml(entry.functions),
        complianceEntry && complianceEntry.isDeviation ? "Deviation" : "Compliant"
      ];
    });
    const relationshipRows = relationships.map(function (entry) {
      const source = elementById.get(entry.sourceId) || null;
      const target = elementById.get(entry.targetId) || null;
      const complianceEntry = relationshipResultById.get(entry.id);
      return [
        escapeHtml(entry.id),
        escapeHtml((source && source.name) || entry.sourceId || ""),
        escapeHtml((target && target.name) || entry.targetId || ""),
        wrapStereotype(entry.type || ""),
        escapeHtml(entry.description || "-"),
        complianceEntry && complianceEntry.isDeviation ? "Deviation" : "Compliant"
      ];
    });
    const diagramRows = diagrams.map(function (entry) {
      const focus = elementById.get(entry.focusElementId) || null;
      return [
        escapeHtml(entry.id),
        escapeHtml(entry.name || ""),
        escapeHtml(entry.title || "-"),
        escapeHtml(entry.view || "-"),
        escapeHtml(entry.type || "standard"),
        String((entry.elementIds || []).length),
        escapeHtml((focus && focus.name) || entry.focusElementId || "-"),
        String(Math.max(1, Number(entry.depth) || 1))
      ];
    });
    const diagramDetailBlocks = diagrams.map(function (entry) {
      const idSet = new Set(Array.isArray(entry.elementIds) ? entry.elementIds : []);
      const relationshipCount = relationships.filter(function (relationship) {
        return idSet.has(relationship.sourceId) && idSet.has(relationship.targetId);
      }).length;
      const focus = elementById.get(entry.focusElementId) || null;
      return (
        '<article class="diagramExportBlock">' +
        "<h3>" + escapeHtml((entry.title || entry.name || entry.id) + " (" + (entry.view || "no view") + ")") + "</h3>" +
        '<div class="diagramLegendGrid">' +
        '<div class="card"><strong>View</strong><div class="muted">' + escapeHtml(entry.view || "Unassigned") + "</div></div>" +
        '<div class="card"><strong>Type</strong><div class="muted">' + escapeHtml(entry.type || "standard") + "</div></div>" +
        '<div class="card"><strong>Focus</strong><div class="muted">' + escapeHtml((focus && focus.name) || entry.focusElementId || "-") + "</div></div>" +
        '<div class="card"><strong>Elements / Relations</strong><div class="muted">' + String(idSet.size) + " / " + String(relationshipCount) + "</div></div>" +
        "</div>" +
        buildDiagramPreviewSvg(entry, elements, relationships, effectiveColorScheme, edgeTypeById, "diagramPreviewSvg") +
        "</article>"
      );
    }).join("");

    return (
      "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\">" +
      "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">" +
      "<title>DeltaModel Architecture Export</title>" +
      "<style id=\"printPageStyle\">@page { size: A4 portrait; margin: 10mm; }</style>" +
      "<style>body{font-family:Segoe UI,Tahoma,sans-serif;margin:24px;color:#1b1f23;background:#fbf8f1}h1{margin:0 0 8px}h2{margin:24px 0 8px;font-size:1.1rem}h3{margin:0 0 4px;font-size:0.98rem}.meta{color:#5f594f}section{margin-bottom:12px}table{width:100%;border-collapse:collapse;background:#fff}th,td{border:1px solid #d8d1c4;padding:6px 8px;font-size:13px;vertical-align:top}th{background:#f0e9dd;text-align:left}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px}.card{border:1px solid #d8d1c4;border-radius:8px;background:#fff;padding:10px}.muted{color:#6a665e}.toc{border:1px solid #d8d1c4;border-radius:8px;background:#fff;padding:10px}.toc ul{margin:0;padding-left:18px}.toc a{color:#1f4e7b;text-decoration:none}.toc a:hover{text-decoration:underline}.printControls{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.printControls button{border:1px solid #b9b0a0;background:#fff;padding:6px 10px;border-radius:8px;cursor:pointer}.diagramExportBlock{border:1px solid #d8d1c4;border-radius:8px;background:#fff;padding:10px;margin-bottom:10px}.diagramLegendGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-bottom:8px}.diagramPreviewSvg{display:block;width:100%;height:auto;min-height:260px;border:1px solid #d9d3c8;border-radius:8px;background:#fff}.diagramNodes text{font-family:Segoe UI,Tahoma,sans-serif}@media print{body{background:#fff;margin:0;font-size:11pt}section{break-inside:avoid}table{font-size:9.5pt}th,td{padding:4px 6px}.printControls{display:none}.diagramExportBlock{break-inside:avoid-page;page-break-inside:avoid}.diagramPreviewSvg{min-height:180px;max-height:180mm}}</style>" +
      "</head><body>" +
      "<h1>DeltaModel Architecture Assistant - HTML Export</h1>" +
      "<div class=\"meta\">Generated: " + escapeHtml(new Date().toISOString()) + "</div>" +
      "<div class=\"meta\">Active Architecture: " + escapeHtml((activeArchitecture && activeArchitecture.name) || "-") + "</div>" +
      "<div class=\"meta\">MetaModel: " + escapeHtml(effectiveBaseline.name || "No MetaModel Loaded") + " (source: " + escapeHtml(effectiveBaseline.fileName || effectiveBaseline.source || "-") + ")</div>" +
      '<div class="printControls">' +
      '<button type="button" data-print-orientation="portrait">A4 Portrait</button>' +
      '<button type="button" data-print-orientation="landscape">A4 Landscape</button>' +
      '<button type="button" data-print-action="print">Print</button>' +
      "</div>" +
      '<nav class="toc"><strong>Contents</strong><ul>' +
      sections.map(function (entry) {
        return '<li><a href="#' + escapeHtml(entry.id) + '">' + escapeHtml(entry.title) + "</a></li>";
      }).join("") +
      "</ul></nav>" +
      "<section id=\"sec-summary\"><h2>Summary</h2><div class=\"grid\">" +
      "<div class=\"card\"><strong>Elements</strong><div class=\"muted\">" + String(compliance.summary.elementCount) + "</div></div>" +
      "<div class=\"card\"><strong>Relationships</strong><div class=\"muted\">" + String(compliance.summary.relationshipCount) + "</div></div>" +
      "<div class=\"card\"><strong>Diagrams</strong><div class=\"muted\">" + String(diagrams.length) + "</div></div>" +
      "<div class=\"card\"><strong>Deviations</strong><div class=\"muted\">" + String(compliance.summary.elementDeviations + compliance.summary.relationshipDeviations) + "</div></div>" +
      "</div></section>" +
      "<section id=\"sec-architectures\"><h2>Architectures</h2>" + buildHtmlTable(["ID", "Name", "Elements", "Relationships", "Diagrams", "Active"], architectureRows) + "</section>" +
      "<section id=\"sec-views\"><h2>Views</h2>" + buildHtmlTable(["ID", "Name", "Category", "Description"], viewRows) + "</section>" +
      "<section id=\"sec-categories\"><h2>Categories</h2>" + buildHtmlTable(["ID", "Name", "Background", "Font"], categoryRows) + "</section>" +
      "<section id=\"sec-elements\"><h2>Elements</h2>" + buildHtmlTable(["ID", "Name", "Type", "View", "Description", "Members", "Functions", "Compliance"], elementRows) + "</section>" +
      "<section id=\"sec-relationships\"><h2>Relationships</h2>" + buildHtmlTable(["ID", "Source", "Target", "Type", "Description", "Compliance"], relationshipRows) + "</section>" +
      "<section id=\"sec-diagrams\"><h2>Diagrams</h2>" + buildHtmlTable(["ID", "Name", "Title", "View", "Type", "Element Count", "Focus", "Depth"], diagramRows) + "</section>" +
      "<section id=\"sec-diagram-previews\"><h2>Diagram Previews</h2>" + (diagramDetailBlocks || '<div class="muted">No diagrams available.</div>') + "</section>" +
      "<script>(function(){var style=document.getElementById('printPageStyle');function setPage(mode){var m=mode==='landscape'?'landscape':'portrait';document.body.setAttribute('data-print-orientation',m);if(style){style.textContent='@page { size: A4 '+m+'; margin: 10mm; }';}}document.querySelectorAll('[data-print-orientation]').forEach(function(btn){btn.addEventListener('click',function(){setPage(btn.getAttribute('data-print-orientation'));});});document.querySelectorAll('[data-print-action=\"print\"]').forEach(function(btn){btn.addEventListener('click',function(){window.print();});});setPage('portrait');})();</script>" +
      "</body></html>"
    );
  }

  function buildDiagramSvgTextForExport(currentState, diagramId) {
    const effectiveBaseline = getEffectiveBaseline(currentState.baseline);
    const effectiveColorScheme = getEffectiveColorScheme(currentState, effectiveBaseline);
    const edgeTypeById = buildEdgeTypeByIdMap(effectiveBaseline);
    const diagrams = Array.isArray(currentState.model.diagrams) ? currentState.model.diagrams : [];
    const diagram = diagrams.find(function (entry) {
      return entry.id === diagramId;
    });
    if (!diagram) {
      return null;
    }
    const elements = Array.isArray(currentState.model.elements) ? currentState.model.elements : [];
    const relationships = Array.isArray(currentState.model.relationships) ? currentState.model.relationships : [];
    const svgText = diagram.type === "roadmap"
      ? buildRoadmapSvgForExport(diagram, elements)
      : buildDiagramPreviewSvg(
          diagram,
          elements,
          relationships,
          effectiveColorScheme,
          edgeTypeById,
          "diagramExportSvg"
        );
    if (!svgText || svgText.indexOf("<svg") !== 0) {
      return null;
    }
    return {
      diagram: diagram,
      svgText: svgText
    };
  }

  function parseSvgViewBox(svgText) {
    const match = String(svgText || "").match(/viewBox="([^"]+)"/i);
    if (!match || !match[1]) {
      return { width: 1200, height: 700 };
    }
    const parts = match[1].trim().split(/\s+/).map(function (entry) {
      return Number(entry);
    });
    if (parts.length !== 4 || parts.some(function (entry) { return !Number.isFinite(entry); })) {
      return { width: 1200, height: 700 };
    }
    return {
      width: Math.max(1, Math.round(parts[2])),
      height: Math.max(1, Math.round(parts[3]))
    };
  }

  async function convertSvgTextToPngBlob(svgText) {
    const size = parseSvgViewBox(svgText);
    const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);
    try {
      const image = await new Promise(function (resolve, reject) {
        const img = new Image();
        img.onload = function () { resolve(img); };
        img.onerror = function () { reject(new Error("Failed to load generated SVG")); };
        img.src = svgUrl;
      });
      const canvas = document.createElement("canvas");
      canvas.width = size.width;
      canvas.height = size.height;
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Canvas 2D context unavailable");
      }
      context.fillStyle = "#fffdf8";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const pngBlob = await new Promise(function (resolve) {
        canvas.toBlob(function (blob) {
          resolve(blob || null);
        }, "image/png");
      });
      if (!pngBlob) {
        throw new Error("Failed to encode PNG");
      }
      return pngBlob;
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  }

  async function exportDiagramAsSvg(diagramId) {
    const currentState = getState();
    const payload = buildDiagramSvgTextForExport(currentState, diagramId);
    if (!payload) {
      return false;
    }
    const fileStem = sanitizeFileName(payload.diagram.name || payload.diagram.title || payload.diagram.id, payload.diagram.id);
    if (!isTauriRuntime()) {
      downloadText(fileStem + ".svg", payload.svgText, "image/svg+xml");
      return true;
    }
    await invokeTauri("save_svg_file", {
      suggestedName: fileStem + ".svg",
      svgContent: payload.svgText
    });
    return true;
  }

  async function exportDiagramAsPng(diagramId) {
    const currentState = getState();
    const payload = buildDiagramSvgTextForExport(currentState, diagramId);
    if (!payload) {
      return false;
    }
    const pngBlob = await convertSvgTextToPngBlob(payload.svgText);
    const fileStem = sanitizeFileName(payload.diagram.name || payload.diagram.title || payload.diagram.id, payload.diagram.id);
    if (!isTauriRuntime()) {
      downloadBlob(fileStem + ".png", pngBlob);
      return true;
    }
    const buffer = await pngBlob.arrayBuffer();
    await invokeTauri("save_png_file", {
      suggestedName: fileStem + ".png",
      pngBytes: Array.from(new Uint8Array(buffer))
    });
    return true;
  }

  function parseImportPayload(rawPayload) {
    if (
      rawPayload &&
      rawPayload.format === "deltaModelArchitectureExport" &&
      rawPayload.architecture &&
      rawPayload.architecture.model &&
      Array.isArray(rawPayload.architecture.model.elements)
    ) {
      return {
        architecturesOnly: {
          activeArchitectureId: String((rawPayload.architecture && rawPayload.architecture.id) || "").trim(),
          architectures: [rawPayload.architecture]
        }
      };
    }

    if (
      rawPayload &&
      rawPayload.format === "deltaModelArchitectureExport" &&
      Array.isArray(rawPayload.architectures)
    ) {
      const activeArchitectureId = String(rawPayload.activeArchitectureId || "").trim();
      const selectedArchitecture = rawPayload.architectures.find(function (entry) {
        return entry && entry.id === activeArchitectureId;
      }) || rawPayload.architectures[0] || null;
      if (!selectedArchitecture || !selectedArchitecture.model || !Array.isArray(selectedArchitecture.model.elements)) {
        throw new Error("No valid architecture payload found");
      }
      return {
        architecturesOnly: {
          activeArchitectureId: String((selectedArchitecture && selectedArchitecture.id) || "").trim(),
          architectures: [selectedArchitecture]
        }
      };
    }

    if (
      rawPayload &&
      rawPayload.format === "deltaModelAssistantExport" &&
      rawPayload.state &&
      typeof rawPayload.state === "object"
    ) {
      return { state: rawPayload.state };
    }

    if (rawPayload && Array.isArray(rawPayload.elements) && Array.isArray(rawPayload.relationships)) {
      return { model: rawPayload };
    }
    if (rawPayload && rawPayload.model && Array.isArray(rawPayload.model.elements)) {
      return {
        baseline: rawPayload.baseline || null,
        colorScheme: rawPayload.colorScheme || null,
        model: rawPayload.model
      };
    }
    if (
      rawPayload &&
      Array.isArray(rawPayload.architectures) &&
      rawPayload.architectures.length > 0
    ) {
      const activeArchitectureId =
        (rawPayload.ui && rawPayload.ui.activeArchitectureId) || rawPayload.activeArchitectureId || null;
      const selectedArchitecture = rawPayload.architectures.find(function (entry) {
        return entry && entry.id === activeArchitectureId;
      }) || rawPayload.architectures[0];
      if (
        selectedArchitecture &&
        selectedArchitecture.model &&
        Array.isArray(selectedArchitecture.model.elements)
      ) {
        return {
          state: {
            ...clone(defaultState),
            ...clone(rawPayload),
            baseline: clone(selectedArchitecture.baseline || rawPayload.baseline || defaultState.baseline),
            model: clone(selectedArchitecture.model || defaultState.model),
            ui: {
              ...clone(defaultState.ui),
              ...(rawPayload.ui || {}),
              activeArchitectureId: selectedArchitecture.id
            }
          }
        };
      }
    }
    throw new Error("Unsupported import format");
  }

  function applyImportedPayload(parsed) {
    if (parsed && parsed.architecturesOnly) {
      const current = getState();
      const sourceArchitectures = Array.isArray(parsed.architecturesOnly.architectures)
        ? parsed.architecturesOnly.architectures
        : [];
      const sanitizedArchitectures = sourceArchitectures
        .filter(function (entry) {
          return entry && entry.model && Array.isArray(entry.model.elements);
        })
        .map(function (entry, index) {
          return {
            id: String((entry && entry.id) || "").trim() || ("arch_" + Math.random().toString(36).slice(2, 9)),
            name: String((entry && entry.name) || "").trim() || ("Architecture " + (index + 1)),
            baseline: clone(current.baseline || defaultState.baseline),
            model: clone(entry.model || { elements: [], relationships: [], diagrams: [] })
          };
        });
      if (!sanitizedArchitectures.length) {
        throw new Error("No valid architectures found in import file");
      }
      const activeArchitecture = sanitizedArchitectures[0];
      const activeArchitectureId = activeArchitecture.id;
      setState({
        ...clone(current),
        baseline: clone(current.baseline || defaultState.baseline),
        model: clone(activeArchitecture.model),
        architectures: [activeArchitecture],
        ui: {
          ...(current.ui || {}),
          activeArchitectureId: activeArchitectureId
        }
      });
      return;
    }

    if (parsed && parsed.state) {
      setState(parsed.state);
      return;
    }
    if (parsed.baseline) {
      try {
        setBaseline(parsed.baseline);
      } catch (error) {
        console.warn("Imported baseline was invalid and has been skipped", error);
      }
    }
    const importedHasCategoryColors = !!(
      parsed.baseline &&
      parsed.baseline.architecture &&
      Array.isArray(parsed.baseline.architecture.categories) &&
      parsed.baseline.architecture.categories.length > 0
    );
    if (parsed.colorScheme && !importedHasCategoryColors) {
      const current = getState();
      const baseline = clone(current.baseline || defaultState.baseline);
      const architecture = baseline.architecture || { views: [], categories: [], nodeTypes: [], edgeTypes: [] };
      const existing = Array.isArray(architecture.categories) ? architecture.categories.slice() : [];
      Object.keys(parsed.colorScheme || {}).forEach(function (categoryId) {
        if (categoryId === "DEFAULT") {
          return;
        }
        const entry = parsed.colorScheme[categoryId] || {};
        const normalizedId = String(categoryId || "").trim().toUpperCase();
        if (!normalizedId) {
          return;
        }
        const index = existing.findIndex(function (categoryEntry) {
          return String((categoryEntry && categoryEntry.id) || "").trim().toUpperCase() === normalizedId;
        });
        const nextEntry = {
          id: normalizedId,
          name: normalizedId,
          bg: isValidCssColor(entry.bg) ? String(entry.bg).trim() : (defaultCategoryColorMap[normalizedId] || defaultCategoryColorMap.DEFAULT).bg,
          font: isValidCssColor(entry.font) ? String(entry.font).trim() : (defaultCategoryColorMap[normalizedId] || defaultCategoryColorMap.DEFAULT).font
        };
        if (index >= 0) {
          existing[index] = { ...(existing[index] || {}), ...nextEntry };
        } else {
          existing.push(nextEntry);
        }
      });
      architecture.categories = existing;
      baseline.architecture = architecture;
      setBaseline(baseline);
    }
    resetModel(parsed.model);
  }

  async function loadBundledMetaModelList() {
    if (isTauriRuntime()) {
      try {
        const files = await invokeTauri("list_bundled_meta_model_files");
        if (!Array.isArray(files)) {
          return [];
        }
        return files.filter(function (entry) {
          return typeof entry === "string" && entry.toLowerCase().endsWith(".meta.json");
        });
      } catch {
        return [];
      }
    }

    async function scanMetaModelDirectory() {
      const response = await fetch("./metaModels/", { cache: "no-store" });
      if (!response.ok) {
        return [];
      }
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const fileNames = Array.from(doc.querySelectorAll("a[href]"))
        .map(function (link) {
          const href = String(link.getAttribute("href") || "").trim();
          if (!href || href.endsWith("/") || href === "../") {
            return "";
          }
          const cleanHref = href.split("?")[0].split("#")[0];
          const fileName = cleanHref.split("/").pop() || "";
          return decodeURIComponent(fileName);
        })
        .filter(function (entry) {
          return typeof entry === "string" && entry.toLowerCase().endsWith(".meta.json");
        });
      return Array.from(new Set(fileNames)).sort(function (a, b) {
        return a.localeCompare(b);
      });
    }

    try {
      const scanned = await scanMetaModelDirectory();
      if (scanned.length) {
        return scanned;
      }
    } catch (_scanError) {
      // Fall back to catalog if server directory listing is disabled.
    }

    try {
      const response = await fetch("./metaModels/catalog.json", { cache: "no-store" });
      if (!response.ok) {
        return [];
      }
      const parsed = await response.json();
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed
        .map(function (entry) {
          return (entry && entry.fileName) || "";
        })
        .filter(function (entry) {
          return typeof entry === "string" && entry.toLowerCase().endsWith(".meta.json");
        })
        .sort(function (a, b) {
          return a.localeCompare(b);
        });
    } catch (_catalogError) {
      return [];
    }
  }

  function setBundledMetaModelOptions(fileNames) {
    if (!dom.settingsBaselineSelect) {
      return;
    }
    dom.settingsBaselineSelect.innerHTML = "";
    const unique = Array.from(new Set((fileNames || []).filter(Boolean)));
    if (!unique.length) {
      const fallbackOption = document.createElement("option");
      fallbackOption.value = defaultBundledMetaModelFileName;
      fallbackOption.textContent = defaultBundledMetaModelFileName;
      dom.settingsBaselineSelect.appendChild(fallbackOption);
      return;
    }
    unique.sort(function (a, b) {
      return a.localeCompare(b);
    });
    unique.forEach(function (fileName) {
      const option = document.createElement("option");
      option.value = fileName;
      option.textContent = fileName;
      dom.settingsBaselineSelect.appendChild(option);
    });
    if (unique.includes(defaultBundledMetaModelFileName)) {
      dom.settingsBaselineSelect.value = defaultBundledMetaModelFileName;
    }
  }

  function getPreferredBaselineFileName(currentState, bundledMetaModelFiles) {
    const configured = String((currentState.ui && currentState.ui.defaultBaselineFile) || "").trim();
    if (configured && bundledMetaModelFiles.includes(configured)) {
      return configured;
    }
    if (bundledMetaModelFiles.includes(defaultBundledMetaModelFileName)) {
      return defaultBundledMetaModelFileName;
    }
    return bundledMetaModelFiles[0] || defaultBundledMetaModelFileName;
  }

  async function loadBundledMetaModelByFileName(fileName) {
    const nextName = (fileName || "").trim();
    if (!nextName) {
      setBaselineLoadStatus("Baseline load skipped: no file selected");
      return false;
    }
    try {
      let jsonText = "";
      if (isTauriRuntime()) {
        jsonText = await invokeTauri("read_bundled_meta_model_file", { fileName: nextName });
      } else {
        const response = await fetch("./metaModels/" + encodeURIComponent(nextName), { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Unable to read bundled metamodel");
        }
        jsonText = await response.text();
      }
      const metaModel = parseMetaModelJson(jsonText);
      const isDefaultMetaModel = nextName === defaultBundledMetaModelFileName;
      applyMetaModelAndLog(
        metaModel,
        nextName,
        isDefaultMetaModel ? "metaModel-default" : "metaModel-json",
        { fileName: nextName, isDefaultMetaModel: isDefaultMetaModel }
      );
      return true;
    } catch (error) {
      console.error("[baseline] failed to load bundled metamodel", {
        fileName: nextName,
        error: error && error.message ? error.message : String(error)
      });
      setBaselineLoadStatus("Baseline load failed: check Developer Tools");
      return false;
    }
  }

  async function handleMenuImportJson() {
    if (!isTauriRuntime()) {
      return;
    }
    try {
      const jsonText = await invokeTauri("open_json_file");
      if (!jsonText) {
        return;
      }
      const trimmed = String(jsonText || "").trim();
      if (!trimmed) {
        throw new Error("Selected file is empty");
      }
      let parsedJson;
      try {
        parsedJson = JSON.parse(trimmed);
      } catch (_error) {
        throw new Error("Selected file is not valid JSON");
      }
      const parsed = parseImportPayload(parsedJson);
      applyImportedPayload(parsed);
      setBaselineLoadStatus("Architecture JSON imported");
    } catch (error) {
      console.error("Import JSON failed", error);
      const detail = error && error.message ? error.message : String(error);
      window.alert("Import JSON failed: " + detail);
    }
  }

  async function handleMenuExportJson() {
    if (!isTauriRuntime()) {
      const currentState = getState();
      downloadJson("deltaModelArchitectureDraft.json", buildExportPayload(currentState));
      return;
    }
    try {
      const payload = buildExportPayload(getState());
      await invokeTauri("save_json_file", {
        suggestedName: "deltaModelArchitectureDraft.json",
        jsonContent: JSON.stringify(payload, null, 2)
      });
    } catch (error) {
      console.error("Export JSON failed", error);
    }
  }

  async function handleMenuExportHtml() {
    const payload = buildHtmlArchitectureReport(getState());
    if (!isTauriRuntime()) {
      downloadText("deltaModelArchitectureReport.html", payload, "text/html");
      return;
    }
    try {
      await invokeTauri("save_html_file", {
        suggestedName: "deltaModelArchitectureReport.html",
        htmlContent: payload
      });
    } catch (error) {
      console.error("Export HTML report failed", error);
    }
  }

  async function handleMenuLoadMdg() {
    if (!isTauriRuntime()) {
      return;
    }
    try {
      const xmlText = await invokeTauri("open_mdg_xml_file");
      if (!xmlText) {
        setBaselineLoadStatus("Baseline load canceled");
        return;
      }
      applyMdgXmlAndLog(xmlText, "manual file", "mdg-import");
    } catch (error) {
      console.error("[baseline] Load MDG from menu failed", error);
      setBaselineLoadStatus("Baseline load failed: check Developer Tools");
    }
  }

  async function handleMenuLoadMetaModelJson() {
    function extractFileName(filePath) {
      const raw = String(filePath || "").trim();
      if (!raw) {
        return "";
      }
      const parts = raw.split(/[\\/]/);
      return parts[parts.length - 1] || raw;
    }

    async function applyFromJsonText(jsonText, contextLabel, fileName) {
      const metaModel = parseMetaModelJson(jsonText);
      applyMetaModelAndLog(metaModel, contextLabel, "metaModel-json", {
        fileName: fileName || "",
        isDefaultMetaModel: false
      });
    }

    if (!isTauriRuntime()) {
      return false;
    }
    try {
      const picked = await invokeTauri("open_json_file_with_path");
      if (!picked || !picked.content) {
        setBaselineLoadStatus("Baseline load canceled");
        return false;
      }
      const fileName = extractFileName(picked.path);
      await applyFromJsonText(picked.content, fileName || "manual metamodel json", fileName);
      return true;
    } catch (error) {
      console.error("[baseline] Load MetaModel JSON failed", error);
      setBaselineLoadStatus("Baseline load failed: invalid metamodel JSON");
      return false;
    }
  }

  async function handleMetaModelLoadButton() {
    if (isTauriRuntime()) {
      await handleMenuLoadMetaModelJson();
      return;
    }
    try {
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = ".json,.meta.json,application/json";
      fileInput.addEventListener("change", function () {
        const file = fileInput.files && fileInput.files[0];
        if (!file) {
          setBaselineLoadStatus("Baseline load canceled");
          return;
        }
        const reader = new FileReader();
        reader.onload = function () {
          try {
            const jsonText = String(reader.result || "");
            const metaModel = parseMetaModelJson(jsonText);
            applyMetaModelAndLog(metaModel, file.name || "manual metamodel json", "metaModel-json");
          } catch (error) {
            console.error("[baseline] Browser load MetaModel JSON failed", error);
            setBaselineLoadStatus("Baseline load failed: invalid metamodel JSON");
          }
        };
        reader.onerror = function () {
          setBaselineLoadStatus("Baseline load failed: unable to read file");
        };
        reader.readAsText(file, "utf-8");
      });
      fileInput.click();
    } catch (error) {
      console.error("[baseline] Browser load MetaModel JSON failed", error);
      setBaselineLoadStatus("Baseline load failed");
    }
  }

  function handleMenuNewArchitecture() {
    const current = getState();
    const count = Array.isArray(current.architectures) ? current.architectures.length : 0;
    createArchitecture("Architecture " + (count + 1));
  }

  async function setupTauriMenuBridge() {
    const tauriApi = getTauriApi();
    if (!tauriApi || !tauriApi.event || typeof tauriApi.event.listen !== "function") {
      return;
    }
    tauriMenuUnlisten = await tauriApi.event.listen("native-menu-action", function (event) {
      const payload = event && event.payload ? event.payload : {};
      const action = payload.action;
      if (action === "import-json") {
        handleMenuImportJson();
        return;
      }
      if (action === "export-json") {
        handleMenuExportJson();
        return;
      }
      if (action === "export-html") {
        handleMenuExportHtml();
        return;
      }
      if (action === "load-mdg-xml") {
        handleMenuLoadMdg();
        return;
      }
      if (action === "load-meta-model-json") {
        handleMenuLoadMetaModelJson();
        return;
      }
      if (action === "new-architecture") {
        handleMenuNewArchitecture();
      }
    });
  }

  function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function downloadText(filename, content, mimeType) {
    const blob = new Blob([String(content || "")], { type: mimeType || "text/plain" });
    downloadBlob(filename, blob);
  }

  function downloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function badge(isDeviation) {
    const statusClass = isDeviation ? "warn" : "ok";
    const label = isDeviation ? "Deviation" : "Compliant";
    return '<span class="deviationBadge ' + statusClass + '">' + label + "</span>";
  }

  function getClickableScope(currentState, diagram) {
    const focusId = diagram.focusElementId;
    const depth = Math.max(1, Number(diagram.depth) || 1);
    const allIds = new Set(
      currentState.model.elements.map(function (element) {
        return element.id;
      })
    );
    if (!focusId || !allIds.has(focusId)) {
      return { visibleIds: new Set(), metaById: new Map() };
    }

    const adjacency = new Map();
    currentState.model.elements.forEach(function (element) {
      adjacency.set(element.id, new Set());
    });
    currentState.model.relationships.forEach(function (relationship) {
      if (adjacency.has(relationship.sourceId) && adjacency.has(relationship.targetId)) {
        // Clickable visibility uses bidirectional neighborhood expansion.
        adjacency.get(relationship.sourceId).add(relationship.targetId);
        adjacency.get(relationship.targetId).add(relationship.sourceId);
      }
    });

    const visited = new Set([focusId]);
    const levelById = new Map([[focusId, 0]]);
    const queue = [{ id: focusId, level: 0 }];
    while (queue.length > 0) {
      const current = queue.shift();
      if (current.level >= depth) {
        continue;
      }
      (adjacency.get(current.id) || new Set()).forEach(function (nextId) {
        if (visited.has(nextId)) {
          return;
        }
        visited.add(nextId);
        levelById.set(nextId, current.level + 1);
        queue.push({ id: nextId, level: current.level + 1 });
      });
    }

    const metaById = new Map();
    visited.forEach(function (id) {
      const neighbors = adjacency.get(id) || new Set();
      let continuationCount = 0;
      let downstreamVisibleCount = 0;
      const level = levelById.get(id) || 0;
      neighbors.forEach(function (neighborId) {
        if (visited.has(neighborId)) {
          const neighborLevel = levelById.get(neighborId) || 0;
          if (neighborLevel > level) {
            downstreamVisibleCount += 1;
          }
        } else {
          continuationCount += 1;
        }
      });
      metaById.set(id, {
        level: level,
        downstreamVisibleCount: downstreamVisibleCount,
        continuationCount: continuationCount,
        hasContinuation: continuationCount > 0,
        // A leaf in clickable view is a visible non-root node with no deeper visible
        // neighbor and no hidden continuation.
        isLeaf: level > 0 && downstreamVisibleCount === 0 && continuationCount === 0
      });
    });

    return { visibleIds: visited, metaById: metaById };
  }

  function getVisibleElementIdsForDiagram(currentState, diagram) {
    if (!diagram) {
      return new Set();
    }
    if (diagram.type === "standard") {
      return new Set(Array.isArray(diagram.elementIds) ? diagram.elementIds : []);
    }
    if (diagram.type === "clickable") {
      const scope = getClickableScope(currentState, diagram);
      return scope && scope.visibleIds ? scope.visibleIds : new Set();
    }
    return new Set();
  }

  function getDiagramElementPosition(diagram, element) {
    if (!diagram || !element) {
      return { x: Number((element && element.x) || 0) || 0, y: Number((element && element.y) || 0) || 0 };
    }
    const layout = (diagram.elementLayout && diagram.elementLayout[element.id]) || null;
    if (layout && (Number.isFinite(Number(layout.x)) || Number.isFinite(Number(layout.y)))) {
      return {
        x: Number.isFinite(Number(layout.x)) ? Number(layout.x) : 0,
        y: Number.isFinite(Number(layout.y)) ? Number(layout.y) : 0
      };
    }
    return {
      x: Number.isFinite(Number(element.x)) ? Number(element.x) : 0,
      y: Number.isFinite(Number(element.y)) ? Number(element.y) : 0
    };
  }

  function applyDiagramLayoutToElements(elements, diagram) {
    return (elements || []).map(function (element) {
      const position = getDiagramElementPosition(diagram, element);
      return {
        ...element,
        x: position.x,
        y: position.y
      };
    });
  }

  function resetDiagramLayoutToDefault(currentState, diagram) {
    const visibleIds = getVisibleElementIdsForDiagram(currentState, diagram);
    const relationships = Array.isArray(currentState.model.relationships) ? currentState.model.relationships : [];
    let changed = 0;
    const nextRelationships = relationships.map(function (relationship) {
      const inScope = visibleIds.has(relationship.sourceId) && visibleIds.has(relationship.targetId);
      if (!inScope || !relationship.orthoControl) {
        return relationship;
      }
      changed += 1;
      return { ...relationship, orthoControl: null };
    });
    if (!changed) {
      return 0;
    }
    resetModel({
      ...currentState.model,
      relationships: nextRelationships
    });
    return changed;
  }

  function addElement(partial) {
    const entry = {
      id: createId("el"),
      name: partial.name,
      type: partial.type,
      viewpoint: partial.viewpoint,
      description: partial.description || "",
      members: Array.isArray(partial.members)
        ? partial.members
            .map(function (entry) {
              return normalizeMemberItem(entry);
            })
            .filter(function (entry) {
              return !!entry.name;
            })
        : [],
      functions: Array.isArray(partial.functions) ? partial.functions : [],
      bgColor: isValidCssColor(partial.bgColor) ? String(partial.bgColor).trim() : "",
      fontColor: isValidCssColor(partial.fontColor) ? String(partial.fontColor).trim() : "",
      allowDeviation: !!partial.allowDeviation,
      x: partial.x != null ? partial.x : 120 + Math.random() * 780,
      y: partial.y != null ? partial.y : 80 + Math.random() * 420
    };
    upsertElement(entry);
    return entry;
  }

  function getCurrentDiagramViewBox(svgNode) {
    if (svgNode && svgNode.viewBox && svgNode.viewBox.baseVal && svgNode.viewBox.baseVal.width > 0) {
      return {
        x: Number(svgNode.viewBox.baseVal.x) || 0,
        y: Number(svgNode.viewBox.baseVal.y) || 0,
        width: Number(svgNode.viewBox.baseVal.width) || 1200,
        height: Number(svgNode.viewBox.baseVal.height) || 700
      };
    }
    return { x: 0, y: 0, width: 1200, height: 700 };
  }

  function isElementVisibleInViewBox(element, viewBox) {
    if (!element) {
      return false;
    }
    const metrics = getNodeMetrics(element);
    const margin = 8;
    const left = Number(element.x) || 0;
    const top = Number(element.y) || 0;
    const right = left + metrics.width;
    const bottom = top + metrics.height;
    const visibleLeft = viewBox.x + margin;
    const visibleTop = viewBox.y + margin;
    const visibleRight = viewBox.x + viewBox.width - margin;
    const visibleBottom = viewBox.y + viewBox.height - margin;
    return right >= visibleLeft && left <= visibleRight && bottom >= visibleTop && top <= visibleBottom;
  }

  function computeVisiblePlacementForNode(viewBox, nodeMetrics, index) {
    const safeMetrics = nodeMetrics || { width: 180, height: 80 };
    const margin = 20;
    const maxX = viewBox.x + viewBox.width - safeMetrics.width - margin;
    const maxY = viewBox.y + viewBox.height - safeMetrics.height - margin;
    const minX = viewBox.x + margin;
    const minY = viewBox.y + margin;
    const columns = 4;
    const col = (index || 0) % columns;
    const row = Math.floor((index || 0) / columns);
    const xOffset = (col - 1.5) * 28;
    const yOffset = (row - 0.5) * 24;
    const centerX = viewBox.x + viewBox.width / 2 - safeMetrics.width / 2 + xOffset;
    const centerY = viewBox.y + viewBox.height / 2 - safeMetrics.height / 2 + yOffset;
    return {
      x: clamp(centerX, minX, Math.max(minX, maxX)),
      y: clamp(centerY, minY, Math.max(minY, maxY))
    };
  }

  function enterElementEditMode(elementId) {
    const entry = getState().model.elements.find(function (element) {
      return element.id === elementId;
    });
    if (!entry) {
      return;
    }
    editingElementId = elementId;
    document.getElementById("elementName").value = entry.name || "";
    assignSelectValue(dom.elementType, entry.type || "");
    assignSelectValue(dom.elementViewpoint, entry.viewpoint || "");
    document.getElementById("elementDescription").value = entry.description || "";
    dom.elementMembers.value = formatMembersField(entry.members);
    dom.elementFunctions.value = formatCsvField(entry.functions);
    dom.elementBgColor.value = entry.bgColor || "";
    dom.elementFontColor.value = entry.fontColor || "";
    dom.elementSubmitBtn.textContent = "Update Element";
    dom.elementCancelEditBtn.hidden = false;
    dom.addElementForm.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function resetElementEditMode() {
    editingElementId = null;
    dom.elementSubmitBtn.textContent = "Add Element";
    dom.elementCancelEditBtn.hidden = true;
    dom.addElementForm.reset();
  }

  function enterRelationshipEditMode(relationshipId) {
    const entry = getState().model.relationships.find(function (relationship) {
      return relationship.id === relationshipId;
    });
    if (!entry) {
      return;
    }
    editingRelationshipId = relationshipId;
    const elements = getState().model.elements || [];
    const sourceElement = elements.find(function (item) {
      return item.id === entry.sourceId;
    });
    const targetElement = elements.find(function (item) {
      return item.id === entry.targetId;
    });
    dom.relSource.value = sourceElement ? formatElementInputLabel(sourceElement) : (entry.sourceId || "");
    dom.relTarget.value = targetElement ? formatElementInputLabel(targetElement) : (entry.targetId || "");
    assignSelectValue(dom.relType, entry.type || "");
    document.getElementById("relDescription").value = entry.description || "";
    dom.relationshipSubmitBtn.textContent = "Update Relationship";
    dom.relationshipCancelEditBtn.hidden = false;
    dom.addRelationshipForm.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function resetRelationshipEditMode() {
    editingRelationshipId = null;
    dom.relationshipSubmitBtn.textContent = "Add Relationship";
    dom.relationshipCancelEditBtn.hidden = true;
    dom.addRelationshipForm.reset();
  }

  function syncEditingFormsWithState(currentState) {
    const elements = (currentState && currentState.model && currentState.model.elements) || [];
    const relationships = (currentState && currentState.model && currentState.model.relationships) || [];

    if (editingElementId) {
      const editingElement = elements.find(function (entry) {
        return entry.id === editingElementId;
      });
      if (!editingElement) {
        resetElementEditMode();
      } else if (currentState.ui && currentState.ui.activeTab === "dataTab") {
        document.getElementById("elementName").value = editingElement.name || "";
        assignSelectValue(dom.elementType, editingElement.type || "");
        assignSelectValue(dom.elementViewpoint, editingElement.viewpoint || "");
        document.getElementById("elementDescription").value = editingElement.description || "";
        dom.elementMembers.value = formatMembersField(editingElement.members);
        dom.elementFunctions.value = formatCsvField(editingElement.functions);
        dom.elementBgColor.value = editingElement.bgColor || "";
        dom.elementFontColor.value = editingElement.fontColor || "";
        dom.elementSubmitBtn.textContent = "Update Element";
        dom.elementCancelEditBtn.hidden = false;
      }
    }

    if (editingRelationshipId) {
      const editingRelationship = relationships.find(function (entry) {
        return entry.id === editingRelationshipId;
      });
      if (!editingRelationship) {
        resetRelationshipEditMode();
      } else if (currentState.ui && currentState.ui.activeTab === "dataTab") {
        const sourceElement = elements.find(function (entry) {
          return entry.id === editingRelationship.sourceId;
        });
        const targetElement = elements.find(function (entry) {
          return entry.id === editingRelationship.targetId;
        });
        dom.relSource.value = sourceElement ? formatElementInputLabel(sourceElement) : (editingRelationship.sourceId || "");
        dom.relTarget.value = targetElement ? formatElementInputLabel(targetElement) : (editingRelationship.targetId || "");
        assignSelectValue(dom.relType, editingRelationship.type || "");
        document.getElementById("relDescription").value = editingRelationship.description || "";
        dom.relationshipSubmitBtn.textContent = "Update Relationship";
        dom.relationshipCancelEditBtn.hidden = false;
      }
    }
  }

  function addRelationship(partial) {
    const entry = {
      id: createId("rel"),
      sourceId: partial.sourceId,
      targetId: partial.targetId,
      type: partial.type,
      description: partial.description || "",
      orthoControl: partial.orthoControl || null,
      allowDeviation: !!partial.allowDeviation
    };
    upsertRelationship(entry);
  }

  function normalizeTypeToken(value) {
    return String(value || "").trim().toLowerCase();
  }

  function toNormalizedTypeSet(values) {
    const set = new Set();
    splitMultiValue(values).forEach(function (value) {
      const token = normalizeTypeToken(value);
      if (token) {
        set.add(token);
      }
    });
    return set;
  }

  function isNodeAllowedByRule(element, rule, side) {
    if (!element || !rule) {
      return true;
    }
    const allowedTypes = toNormalizedTypeSet(side === "source" ? rule.sourceNodeTypes : rule.targetNodeTypes);
    if (allowedTypes.size === 0) {
      return true;
    }
    return allowedTypes.has(normalizeTypeToken(element.type));
  }

  function isEdgeTypeValidForNodeSelection(rule, sourceElement, targetElement) {
    if (!rule) {
      return true;
    }
    if (sourceElement && !isNodeAllowedByRule(sourceElement, rule, "source")) {
      return false;
    }
    if (targetElement && !isNodeAllowedByRule(targetElement, rule, "target")) {
      return false;
    }
    return true;
  }

  function formatElementInputLabel(element) {
    if (!element) {
      return "";
    }
    return (element.name || element.id || "").trim() + " (" + (element.id || "").trim() + ")";
  }

  function resolveElementInputToId(rawValue, elements) {
    const value = String(rawValue || "").trim();
    if (!value) {
      return "";
    }
    const byId = (elements || []).find(function (entry) {
      return entry.id === value;
    });
    if (byId) {
      return byId.id;
    }
    const labelMatch = value.match(/\(([^()]+)\)\s*$/);
    if (labelMatch && labelMatch[1]) {
      const parsedId = String(labelMatch[1]).trim();
      const byParsedId = (elements || []).find(function (entry) {
        return entry.id === parsedId;
      });
      if (byParsedId) {
        return byParsedId.id;
      }
    }
    const byName = (elements || []).filter(function (entry) {
      return String(entry.name || "").trim() === value;
    });
    if (byName.length === 1) {
      return byName[0].id;
    }
    return "";
  }

  function matchesElementViewFilter(element, filterValue) {
    const normalizedFilter = String(filterValue || "All").trim();
    if (!element) {
      return false;
    }
    if (!normalizedFilter || normalizedFilter === "All") {
      return true;
    }
    if (normalizedFilter === "Unassigned") {
      return !String(element.viewpoint || "").trim();
    }
    return String(element.viewpoint || "").trim() === normalizedFilter;
  }

  function getRoadmapRowSelectedNode(elements) {
    return (elements || []).find(function (entry) {
      return entry.id === resolveElementInputToId(dom.roadmapRowNode && dom.roadmapRowNode.value, elements || []);
    }) || null;
  }

  function updateRoadmapRowAttributePickers(elements) {
    const selectedNode = getRoadmapRowSelectedNode(elements || []);
    const attributeNames = selectedNode
      ? dedupe(
          (selectedNode.members || []).map(function (member) {
            return normalizeMemberItem(member).name;
          })
        )
      : [];
    setInputDatalistEntries(
      dom.roadmapRowStartAttr,
      attributeNames.map(function (name) {
        return { value: name, label: name };
      })
    );
    setInputDatalistEntries(
      dom.roadmapRowEndAttr,
      attributeNames.map(function (name) {
        return { value: name, label: name };
      })
    );
  }

  function updateRoadmapRowValidityBadges(elements) {
    const selectedNode = getRoadmapRowSelectedNode(elements || []);
    const startAttr = String((dom.roadmapRowStartAttr && dom.roadmapRowStartAttr.value) || "").trim();
    const endAttr = String((dom.roadmapRowEndAttr && dom.roadmapRowEndAttr.value) || "").trim();

    const evaluate = function (attributeName, statusElement) {
      if (!statusElement) {
        return;
      }
      if (!attributeName) {
        setValidityBadge(statusElement, "none", "Select");
        return;
      }
      const memberValue = selectedNode ? getElementMemberValueByName(selectedNode, attributeName) : "";
      const hasIsoDate = parseIsoDateToUtcMs(memberValue) != null;
      setValidityBadge(statusElement, hasIsoDate ? "ok" : "warn", hasIsoDate ? "Compliant" : "Deviation");
    };
    evaluate(startAttr, dom.roadmapRowStartAttrStatus);
    evaluate(endAttr, dom.roadmapRowEndAttrStatus);
  }

  function updateRoadmapDateInputStatuses() {
    const startValue = String((dom.roadmapStartDateValue && dom.roadmapStartDateValue.value) || "").trim();
    const endValue = String((dom.roadmapEndDateValue && dom.roadmapEndDateValue.value) || "").trim();
    if (dom.roadmapStartDateValueStatus) {
      if (!startValue) {
        setValidityBadge(dom.roadmapStartDateValueStatus, "none", "Format");
      } else {
        setValidityBadge(
          dom.roadmapStartDateValueStatus,
          parseIsoDateToUtcMs(startValue) != null ? "ok" : "warn",
          parseIsoDateToUtcMs(startValue) != null ? "Compliant" : "Deviation"
        );
      }
    }
    if (dom.roadmapEndDateValueStatus) {
      if (!endValue) {
        setValidityBadge(dom.roadmapEndDateValueStatus, "none", "Format");
      } else {
        setValidityBadge(
          dom.roadmapEndDateValueStatus,
          parseIsoDateToUtcMs(endValue) != null ? "ok" : "warn",
          parseIsoDateToUtcMs(endValue) != null ? "Compliant" : "Deviation"
        );
      }
    }
  }

  function renderAllocationMatrixPanel(panelElement, payload) {
    if (!panelElement) {
      return;
    }
    const elements = Array.isArray(payload.elements) ? payload.elements : [];
    const relationships = Array.isArray(payload.relationships) ? payload.relationships : [];
    const sourceView = String(payload.sourceView || "All").trim() || "All";
    const targetView = String(payload.targetView || "All").trim() || "All";
    const relationshipType = String(payload.relationshipType || "All").trim() || "All";
    const edgeTypeById = payload.edgeTypeById || new Map();
    const relationshipResultById = payload.relationshipResultById || new Map();
    const edgeTypeOptions = Array.isArray(payload.edgeTypeOptions) ? payload.edgeTypeOptions : [];
    const effectiveBaseline = payload.effectiveBaseline || null;
    const activeSelection = payload.activeSelection || null;

    const edgeRules = ((effectiveBaseline && effectiveBaseline.architecture && effectiveBaseline.architecture.edgeTypes) || []);
    const edgeRuleById = new Map();
    edgeRules.forEach(function (rule) {
      if (!rule || !rule.id) {
        return;
      }
      edgeRuleById.set(normalizeTypeToken(rule.id), rule);
    });

    function getValidTypesForPair(sourceElement, targetElement) {
      if (!sourceElement || !targetElement) {
        return [];
      }
      return edgeTypeOptions.filter(function (typeId) {
        const rule = edgeRuleById.get(normalizeTypeToken(typeId)) || null;
        return isEdgeTypeValidForNodeSelection(rule, sourceElement, targetElement);
      });
    }

    const sourceElements = elements.filter(function (entry) {
      return matchesElementViewFilter(entry, sourceView);
    });
    const targetElements = elements.filter(function (entry) {
      return matchesElementViewFilter(entry, targetView);
    });
    const sourceIds = new Set(sourceElements.map(function (entry) { return entry.id; }));
    const targetIds = new Set(targetElements.map(function (entry) { return entry.id; }));

    const cellRelationships = new Map();
    relationships.forEach(function (relationship) {
      if (!sourceIds.has(relationship.sourceId) || !targetIds.has(relationship.targetId)) {
        return;
      }
      if (relationshipType !== "All" && String(relationship.type || "") !== relationshipType) {
        return;
      }
      const key = relationship.sourceId + "::" + relationship.targetId;
      if (!cellRelationships.has(key)) {
        cellRelationships.set(key, []);
      }
      cellRelationships.get(key).push(relationship);
    });

    const targetHeader = targetElements
      .map(function (entry) {
        return '<th class="allocationMatrixHeader">' + escapeHtml(entry.name || entry.id) + "</th>";
      })
      .join("");
    const rowsHtml = sourceElements
      .map(function (sourceElement) {
        const cellsHtml = targetElements
          .map(function (targetElement) {
            const key = sourceElement.id + "::" + targetElement.id;
            const entries = cellRelationships.get(key) || [];
            const hasOpenDeviation = entries.some(function (relationship) {
              const result = relationshipResultById.get(relationship.id) || null;
              return !!(result && result.isDeviation) && !relationship.allowDeviation;
            });
            const hasAcceptedDeviation = entries.some(function (relationship) {
              const result = relationshipResultById.get(relationship.id) || null;
              return !!(result && result.isDeviation) && !!relationship.allowDeviation;
            });
            const classes = ["allocationMatrixCell"];
            const isSelected = !!(
              activeSelection &&
              activeSelection.sourceId === sourceElement.id &&
              activeSelection.targetId === targetElement.id
            );
            if (entries.length > 0) {
              classes.push("hasRelations");
            }
            if (hasOpenDeviation) {
              classes.push("hasOpenDeviation");
            } else if (hasAcceptedDeviation) {
              classes.push("hasAcceptedDeviation");
            }
            if (isSelected) {
              classes.push("isSelected");
            }
            if (!entries.length) {
              return (
                '<td class="' +
                classes.join(" ") +
                '">' +
                '<button type="button" class="allocationMatrixCellBtn" data-action="selectAllocationCell" data-source-id="' +
                sourceElement.id +
                '" data-target-id="' +
                targetElement.id +
                '">' +
                '<span class="allocationMatrixEmpty">-</span>' +
                "</button>" +
                "</td>"
              );
            }
            const labels = dedupe(entries.map(function (relationship) {
              const rule =
                edgeTypeById.get(relationship.type) ||
                edgeTypeById.get(String(relationship.type || "").toLowerCase()) ||
                null;
              return (rule && rule.label) || relationship.type || "Relationship";
            }));
            return (
              '<td class="' +
              classes.join(" ") +
              '">' +
              '<button type="button" class="allocationMatrixCellBtn" data-action="selectAllocationCell" data-source-id="' +
              sourceElement.id +
              '" data-target-id="' +
              targetElement.id +
              '">' +
              '<div class="allocationMatrixCount">' +
              entries.length +
              "</div>" +
              '<div class="allocationMatrixTypes">' +
              escapeHtml(labels.join(", ")) +
              "</div>" +
              "</button>" +
              "</td>"
            );
          })
          .join("");
        return (
          "<tr>" +
          '<th class="allocationMatrixHeader allocationMatrixRowHeader">' +
          escapeHtml(sourceElement.name || sourceElement.id) +
          "</th>" +
          cellsHtml +
          "</tr>"
        );
      })
      .join("");

    const selectedSource = activeSelection
      ? sourceElements.find(function (entry) { return entry.id === activeSelection.sourceId; }) || null
      : null;
    const selectedTarget = activeSelection
      ? targetElements.find(function (entry) { return entry.id === activeSelection.targetId; }) || null
      : null;
    const selectedKey = selectedSource && selectedTarget ? (selectedSource.id + "::" + selectedTarget.id) : "";
    const selectedRelationships = selectedKey ? (cellRelationships.get(selectedKey) || []) : [];
    const validRelationshipTypes = getValidTypesForPair(selectedSource, selectedTarget);
    const addTypeOptions = (validRelationshipTypes.length ? validRelationshipTypes : edgeTypeOptions);
    const addTypeOptionsHtml = addTypeOptions
      .map(function (value) {
        const edgeType = edgeTypeById.get(value) || edgeTypeById.get(String(value || "").toLowerCase()) || null;
        const label = (edgeType && edgeType.label) || value;
        return '<option value="' + escapeHtml(value) + '" label="' + escapeHtml(label) + '"></option>';
      })
      .join("");
    const selectedDetailHtml = selectedSource && selectedTarget
      ? (
        '<div class="allocationMatrixDetail">' +
        '<div class="allocationMatrixDetailHeader"><strong>Selected:</strong> ' +
        escapeHtml(selectedSource.name || selectedSource.id) +
        " -> " +
        escapeHtml(selectedTarget.name || selectedTarget.id) +
        "</div>" +
        (
          selectedRelationships.length
            ? (
              '<ul class="allocationMatrixRelationshipList">' +
              selectedRelationships.map(function (relationship) {
                const edgeType =
                  edgeTypeById.get(relationship.type) ||
                  edgeTypeById.get(String(relationship.type || "").toLowerCase()) ||
                  null;
                const label = (edgeType && edgeType.label) || relationship.type || "Relationship";
                return (
                  "<li>" +
                  '<span class="allocationMatrixRelationshipType">' + escapeHtml(label) + "</span>" +
                  '<button type="button" data-action="deleteAllocationRelationship" data-relationship-id="' +
                  relationship.id +
                  '">Remove</button>' +
                  "</li>"
                );
              }).join("") +
              "</ul>"
            )
            : '<div class="hint">No relationships in this cell.</div>'
        ) +
        '<div class="allocationMatrixAddRow">' +
        '<div class="fieldWithBadge">' +
        '<input id="allocationMatrixAddType" list="allocationMatrixAddTypeList" placeholder="Relationship type">' +
        '<span id="allocationMatrixAddTypeStatus" class="deviationBadge">Select</span>' +
        "</div>" +
        '<datalist id="allocationMatrixAddTypeList">' + addTypeOptionsHtml + "</datalist>" +
        '<button type="button" data-action="addAllocationRelationship">Add Relationship</button>' +
        "</div>" +
        '<div class="hint">Valid types: ' +
        escapeHtml((validRelationshipTypes.length ? validRelationshipTypes : ["none"]).join(", ")) +
        ".</div>" +
        "</div>"
      )
      : '<div class="allocationMatrixDetail"><div class="hint">Select a cell to inspect and edit relationships.</div></div>';

    panelElement.innerHTML =
      '<div class="allocationMatrixSummary">Sources: ' +
      sourceElements.length +
      " | Targets: " +
      targetElements.length +
      " | Matching relationships: " +
      Array.from(cellRelationships.values()).reduce(function (sum, entries) {
        return sum + entries.length;
      }, 0) +
      "</div>" +
      '<div class="allocationMatrixScroll">' +
      '<table class="allocationMatrixTable">' +
      "<thead><tr><th></th>" +
      targetHeader +
      "</tr></thead>" +
      "<tbody>" +
      rowsHtml +
      "</tbody></table></div>" +
      selectedDetailHtml;

    if (selectedSource && selectedTarget) {
      const addTypeInput = panelElement.querySelector("#allocationMatrixAddType");
      const addTypeStatus = panelElement.querySelector("#allocationMatrixAddTypeStatus");
      const validTypeSet = new Set(validRelationshipTypes.map(function (value) {
        return normalizeTypeToken(value);
      }));
      if (addTypeInput) {
        setInputDatalistEntries(
          addTypeInput,
          edgeTypeOptions.map(function (typeId) {
            const key = String(typeId || "").trim();
            const edgeType = edgeTypeById.get(key) || edgeTypeById.get(key.toLowerCase()) || null;
            return {
              value: key,
              label: (edgeType && edgeType.label) || key,
              status: validTypeSet.has(normalizeTypeToken(key)) ? "ok" : "warn"
            };
          })
        );
        bindDatalistFallback(addTypeInput);

        const updateTypeStatus = function () {
          const rawValue = String(addTypeInput.value || "").trim();
          if (!rawValue) {
            setValidityBadge(addTypeStatus, "none", "Select");
            return;
          }
          const isKnown = edgeTypeOptions.some(function (entry) {
            return normalizeTypeToken(entry) === normalizeTypeToken(rawValue);
          });
          const isValid = isKnown && validTypeSet.has(normalizeTypeToken(rawValue));
          setValidityBadge(addTypeStatus, isValid ? "ok" : "warn", isValid ? "Compliant" : "Deviation");
        };
        addTypeInput.addEventListener("input", updateTypeStatus);
        addTypeInput.addEventListener("change", updateTypeStatus);
        updateTypeStatus();
      }
    }
  }

  function normalizeRoadmapScale(value) {
    const raw = String(value || "").trim().toLowerCase();
    if (raw === "quarter" || raw === "year" || raw === "month") {
      return raw;
    }
    return "month";
  }

  function parseIsoDateToUtcMs(value) {
    const raw = String(value || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return null;
    }
    const parsed = Date.parse(raw + "T00:00:00Z");
    if (!Number.isFinite(parsed)) {
      return null;
    }
    return parsed;
  }

  function formatUtcDate(msValue) {
    if (!Number.isFinite(msValue)) {
      return "";
    }
    const date = new Date(msValue);
    return date.toISOString().slice(0, 10);
  }

  function getElementMemberValueByName(element, memberName) {
    if (!element || !Array.isArray(element.members)) {
      return "";
    }
    const key = String(memberName || "").trim();
    if (!key) {
      return "";
    }
    const entry = element.members
      .map(function (member) {
        return normalizeMemberItem(member);
      })
      .find(function (member) {
        return String(member.name || "").trim() === key;
      });
    return entry ? String(entry.value || "").trim() : "";
  }

  function buildRoadmapRowResult(row, elementById) {
    const node = elementById.get(row.nodeId) || null;
    const issues = [];
    if (!node) {
      issues.push("Node missing");
    }
    const startAttr = String(row.startAttr || "").trim();
    const endAttr = String(row.endAttr || "").trim();
    let startMs = null;
    let endMs = null;
    let milestoneMs = null;
    const startRaw = node && startAttr ? getElementMemberValueByName(node, startAttr) : "";
    const endRaw = node && endAttr ? getElementMemberValueByName(node, endAttr) : "";
    if (startAttr) {
      if (!startRaw) {
        issues.push("Start attribute missing");
      } else {
        startMs = parseIsoDateToUtcMs(startRaw);
        if (startMs == null) {
          issues.push("Start date invalid");
        }
      }
    }
    if (endAttr) {
      if (!endRaw) {
        issues.push("End attribute missing");
      } else {
        endMs = parseIsoDateToUtcMs(endRaw);
        if (endMs == null) {
          issues.push("End date invalid");
        }
      }
    }
    if (!startAttr && !endAttr) {
      issues.push("No start/end attribute selected");
    }
    let mode = "milestone";
    if (startAttr && endAttr) {
      mode = "range";
      if (startMs != null && endMs != null && startMs > endMs) {
        issues.push("Start after end");
      }
    } else if (startMs != null) {
      milestoneMs = startMs;
    } else if (endMs != null) {
      milestoneMs = endMs;
    }
    const startBound = mode === "range" ? startMs : milestoneMs;
    const endBound = mode === "range" ? endMs : milestoneMs;
    return {
      row: row,
      node: node,
      mode: mode,
      startMs: startMs,
      endMs: endMs,
      milestoneMs: milestoneMs,
      startBound: startBound,
      endBound: endBound,
      issues: issues,
      isCompliant: issues.length === 0
    };
  }

  function renderRoadmapPanel(panelElement, payload) {
    if (!panelElement) {
      return;
    }
    const elements = Array.isArray(payload.elements) ? payload.elements : [];
    const rows = Array.isArray(payload.rows) ? payload.rows : [];
    const diagramStartMs = parseIsoDateToUtcMs(payload.startDate || "");
    const diagramEndMs = parseIsoDateToUtcMs(payload.endDate || "");
    const scale = normalizeRoadmapScale(payload.scale || "month");
    const elementById = new Map(
      elements.map(function (entry) {
        return [entry.id, entry];
      })
    );
    const resolvedRows = rows.map(function (row) {
      return buildRoadmapRowResult(row, elementById);
    });
    const validBounds = resolvedRows
      .filter(function (entry) {
        return Number.isFinite(entry.startBound) && Number.isFinite(entry.endBound);
      });
    let minMs = Number.isFinite(diagramStartMs) ? diagramStartMs : null;
    let maxMs = Number.isFinite(diagramEndMs) ? diagramEndMs : null;
    if (minMs == null && validBounds.length) {
      minMs = Math.min.apply(null, validBounds.map(function (entry) { return entry.startBound; }));
    }
    if (maxMs == null && validBounds.length) {
      maxMs = Math.max.apply(null, validBounds.map(function (entry) { return entry.endBound; }));
    }
    if (minMs == null) {
      minMs = Date.now() - (14 * 24 * 60 * 60 * 1000);
    }
    if (maxMs == null) {
      maxMs = Date.now() + (120 * 24 * 60 * 60 * 1000);
    }
    if (maxMs <= minMs) {
      maxMs = minMs + (24 * 60 * 60 * 1000);
    }
    const spanMs = maxMs - minMs;
    const toPercent = function (ms) {
      return clamp(((ms - minMs) / spanMs) * 100, 0, 100);
    };

    const tickDates = [];
    const cursor = new Date(minMs);
    cursor.setUTCHours(0, 0, 0, 0);
    if (scale === "year") {
      cursor.setUTCMonth(0, 1);
    } else if (scale === "quarter") {
      cursor.setUTCMonth(Math.floor(cursor.getUTCMonth() / 3) * 3, 1);
    } else {
      cursor.setUTCDate(1);
    }
    if (cursor.getTime() > minMs) {
      if (scale === "year") {
        cursor.setUTCFullYear(cursor.getUTCFullYear() - 1);
      } else if (scale === "quarter") {
        cursor.setUTCMonth(cursor.getUTCMonth() - 3);
      } else {
        cursor.setUTCMonth(cursor.getUTCMonth() - 1);
      }
    }
    while (cursor.getTime() <= maxMs) {
      tickDates.push(new Date(cursor.getTime()));
      if (scale === "year") {
        cursor.setUTCFullYear(cursor.getUTCFullYear() + 1);
      } else if (scale === "quarter") {
        cursor.setUTCMonth(cursor.getUTCMonth() + 3);
      } else {
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
      }
    }
    const ticksHtml = tickDates
      .map(function (dateValue) {
        const ms = dateValue.getTime();
        const left = toPercent(ms);
        let label = String(dateValue.getUTCFullYear());
        if (scale === "month") {
          label = String(dateValue.getUTCFullYear()) + "-" + String(dateValue.getUTCMonth() + 1).padStart(2, "0");
        } else if (scale === "quarter") {
          label = String(dateValue.getUTCFullYear()) + "-Q" + (Math.floor(dateValue.getUTCMonth() / 3) + 1);
        }
        return (
          '<div class="roadmapTick" style="left:' + left + '%;">' +
          '<span class="roadmapTickLine"></span>' +
          '<span class="roadmapTickLabel">' + escapeHtml(label) + "</span>" +
          "</div>"
        );
      })
      .join("");

    const rowsHtml = resolvedRows
      .map(function (entry) {
        const nodeName = entry.node ? (entry.node.name || entry.node.id) : entry.row.nodeId;
        const rowLabel = String(entry.row.label || "").trim() || nodeName;
        const isSelected = payload.selectedRowId && payload.selectedRowId === entry.row.id;
        const rowClasses = ["roadmapRow"];
        if (!entry.isCompliant) {
          rowClasses.push("deviation");
        }
        if (isSelected) {
          rowClasses.push("selected");
        }
        let timelineInnerHtml = "";
        if (entry.mode === "range" && Number.isFinite(entry.startMs) && Number.isFinite(entry.endMs)) {
          const left = toPercent(entry.startMs);
          const right = toPercent(entry.endMs);
          const width = Math.max(0.8, right - left);
          timelineInnerHtml =
            '<div class="roadmapBar" style="left:' +
            left +
            "%;width:" +
            width +
            '%;" title="' +
            escapeHtml(formatUtcDate(entry.startMs) + " to " + formatUtcDate(entry.endMs)) +
            '"></div>';
        } else if (entry.mode === "milestone" && Number.isFinite(entry.milestoneMs)) {
          const left = toPercent(entry.milestoneMs);
          timelineInnerHtml =
            '<div class="roadmapMilestone" style="left:' +
            left +
            '%;" title="' +
            escapeHtml(formatUtcDate(entry.milestoneMs)) +
            '"></div>';
        } else {
          timelineInnerHtml = '<div class="roadmapInvalidHint">Missing or invalid date values</div>';
        }
        const issuesText = entry.issues.length
          ? '<div class="roadmapIssues">' + escapeHtml(entry.issues.join(", ")) + "</div>"
          : "";
        return (
          '<div class="' +
          rowClasses.join(" ") +
          '" data-action="selectRoadmapRow" data-row-id="' +
          entry.row.id +
          '">' +
          '<div class="roadmapRowLabel">' +
          escapeHtml(rowLabel) +
          '<span class="roadmapRowNodeId">(' + escapeHtml(entry.row.nodeId || "-") + ")</span>" +
          "</div>" +
          '<div class="roadmapTrack">' +
          timelineInnerHtml +
          "</div>" +
          issuesText +
          "</div>"
        );
      })
      .join("");

    const compliantCount = resolvedRows.filter(function (entry) {
      return entry.isCompliant;
    }).length;
    panelElement.innerHTML =
      '<div class="roadmapSummary">' +
      "Rows: " +
      resolvedRows.length +
      " | Compliant: " +
      compliantCount +
      " | Deviations: " +
      (resolvedRows.length - compliantCount) +
      " | Range: " +
      escapeHtml(formatUtcDate(minMs)) +
      " to " +
      escapeHtml(formatUtcDate(maxMs)) +
      " (" +
      escapeHtml(scale) +
      ")" +
      "</div>" +
      '<div class="roadmapTimelineHeader">' +
      '<div class="roadmapLabelHeader">Capability / Row</div>' +
      '<div class="roadmapTrackHeader">' + ticksHtml + "</div>" +
      "</div>" +
      '<div class="roadmapRows">' + rowsHtml + "</div>";
  }

  function describeAllowedNodeTypes(values, nodeTypeById) {
    const ids = splitMultiValue(values);
    if (!ids.length) {
      return "alle Node Types";
    }
    return ids
      .map(function (id) {
        const key = String(id || "").trim();
        const entry = (nodeTypeById && (nodeTypeById.get(key) || nodeTypeById.get(key.toLowerCase()))) || null;
        return (entry && entry.label) || key;
      })
      .join(", ");
  }

  function setValidityBadge(badgeElement, state, text) {
    if (!badgeElement) {
      return;
    }
    badgeElement.className = "deviationBadge";
    if (state === "ok") {
      badgeElement.classList.add("ok");
      badgeElement.textContent = text || "Compliant";
      return;
    }
    if (state === "warn") {
      badgeElement.classList.add("warn");
      badgeElement.textContent = text || "Deviation";
      return;
    }
    badgeElement.textContent = text || "Select";
  }

  function updateRelationshipAddControls(currentState, effectiveBaseline, nodeTypeById, edgeTypeById, edgeTypeOptions) {
    const elements = Array.isArray(currentState.model.elements) ? currentState.model.elements : [];
    const edgeRules = ((effectiveBaseline.architecture && effectiveBaseline.architecture.edgeTypes) || []);
    const edgeRuleById = new Map();
    edgeRules.forEach(function (rule) {
      if (!rule || !rule.id) {
        return;
      }
      edgeRuleById.set(normalizeTypeToken(rule.id), rule);
    });

    const previousSourceRaw = String(dom.relSource.value || "");
    const previousTargetRaw = String(dom.relTarget.value || "");
    const previousType = String(dom.relType.value || "");
    const previousSourceId = resolveElementInputToId(previousSourceRaw, elements);
    const previousTargetId = resolveElementInputToId(previousTargetRaw, elements);

    const relTypeQuery = normalizeSearch(dom.relTypeFilter ? dom.relTypeFilter.value : "");
    const filteredEdgeTypeOptions = relTypeQuery
      ? edgeTypeOptions.filter(function (typeId) {
          const key = String(typeId || "").trim();
          const entry = (edgeTypeById && (edgeTypeById.get(key) || edgeTypeById.get(key.toLowerCase()))) || null;
          const label = ((entry && entry.label) || key).toLowerCase();
          return key.toLowerCase().includes(relTypeQuery) || label.includes(relTypeQuery);
        })
      : edgeTypeOptions;

    const selectedSource = elements.find(function (entry) {
      return entry.id === previousSourceId;
    }) || null;
    const selectedTarget = elements.find(function (entry) {
      return entry.id === previousTargetId;
    }) || null;
    const selectedType = String(previousType || "").trim();
    const selectedRule = edgeRuleById.get(normalizeTypeToken(selectedType)) || null;

    const validEdgeTypes = edgeTypeOptions.filter(function (typeId) {
      const rule = edgeRuleById.get(normalizeTypeToken(typeId)) || null;
      return isEdgeTypeValidForNodeSelection(rule, selectedSource, selectedTarget);
    });
    const validEdgeTypeSet = new Set(validEdgeTypes.map(function (typeId) {
      return normalizeTypeToken(typeId);
    }));

    const validSourceCount = elements.filter(function (entry) {
      return isNodeAllowedByRule(entry, selectedRule, "source");
    }).length;
    const validTargetCount = elements.filter(function (entry) {
      return isNodeAllowedByRule(entry, selectedRule, "target");
    }).length;

    setInputDatalistEntries(
      dom.relSource,
      elements.map(function (element) {
        const isValid = isNodeAllowedByRule(element, selectedRule, "source");
        return {
          value: element.id,
          label: element.name + " (" + element.id + ")",
          status: isValid ? "ok" : "warn"
        };
      })
    );
    if (previousSourceId) {
      const sourceElement = elements.find(function (entry) {
        return entry.id === previousSourceId;
      });
      assignSelectValue(dom.relSource, sourceElement ? formatElementInputLabel(sourceElement) : previousSourceRaw);
    } else {
      assignSelectValue(dom.relSource, previousSourceRaw);
    }

    setInputDatalistEntries(
      dom.relTarget,
      elements.map(function (element) {
        const isValid = isNodeAllowedByRule(element, selectedRule, "target");
        return {
          value: element.id,
          label: element.name + " (" + element.id + ")",
          status: isValid ? "ok" : "warn"
        };
      })
    );
    if (previousTargetId) {
      const targetElement = elements.find(function (entry) {
        return entry.id === previousTargetId;
      });
      assignSelectValue(dom.relTarget, targetElement ? formatElementInputLabel(targetElement) : previousTargetRaw);
    } else {
      assignSelectValue(dom.relTarget, previousTargetRaw);
    }

    setInputDatalistEntries(
      dom.relType,
      filteredEdgeTypeOptions.map(function (typeId) {
        const key = String(typeId || "").trim();
        const typeEntry = (edgeTypeById && (edgeTypeById.get(key) || edgeTypeById.get(key.toLowerCase()))) || null;
        const isValid = validEdgeTypeSet.has(normalizeTypeToken(typeId));
        return {
          value: key,
          label: (typeEntry && typeEntry.label) || key,
          status: isValid ? "ok" : "warn"
        };
      })
    );
    assignSelectValue(dom.relType, previousType);

    const selectedSourceIsValid = !!selectedSource && isNodeAllowedByRule(selectedSource, selectedRule, "source");
    const selectedTargetIsValid = !!selectedTarget && isNodeAllowedByRule(selectedTarget, selectedRule, "target");
    const selectedTypeIsKnown = !!selectedType && edgeTypeOptions.some(function (entry) {
      return normalizeTypeToken(entry) === normalizeTypeToken(selectedType);
    });
    const selectedTypeIsValid = selectedTypeIsKnown && validEdgeTypeSet.has(normalizeTypeToken(selectedType));

    setValidityBadge(
      dom.relSourceStatus,
      !previousSourceId ? "none" : (selectedSourceIsValid ? "ok" : "warn"),
      !previousSourceId ? "Select" : (selectedSourceIsValid ? "Compliant" : "Deviation")
    );
    setValidityBadge(
      dom.relTargetStatus,
      !previousTargetId ? "none" : (selectedTargetIsValid ? "ok" : "warn"),
      !previousTargetId ? "Select" : (selectedTargetIsValid ? "Compliant" : "Deviation")
    );
    setValidityBadge(
      dom.relTypeStatus,
      !selectedType ? "none" : (selectedTypeIsValid ? "ok" : "warn"),
      !selectedType ? "Select" : (selectedTypeIsValid ? "Compliant" : "Deviation")
    );

    if (dom.relationshipFilterStats) {
      dom.relationshipFilterStats.textContent =
        "Filter impact: Relationship Types " +
        filteredEdgeTypeOptions.length +
        " -> " +
        validEdgeTypes.length +
        ", Source Nodes " +
        elements.length +
        " -> " +
        validSourceCount +
        ", Target Nodes " +
        elements.length +
        " -> " +
        validTargetCount +
        ".";
    }

    if (dom.relationshipValidityHelp) {
      const validTypePreview = validEdgeTypes
        .slice(0, 8)
        .map(function (typeId) {
          const entry = (edgeTypeById && (edgeTypeById.get(typeId) || edgeTypeById.get(String(typeId).toLowerCase()))) || null;
          return (entry && entry.label) || typeId;
        })
        .join(", ");
      const validTypeText = validEdgeTypes.length
        ? validTypePreview + (validEdgeTypes.length > 8 ? " ..." : "")
        : "none";
      const sourceTypeText = selectedRule
        ? describeAllowedNodeTypes(selectedRule.sourceNodeTypes, nodeTypeById)
        : "all node types (no relationship type selected)";
      const targetTypeText = selectedRule
        ? describeAllowedNodeTypes(selectedRule.targetNodeTypes, nodeTypeById)
        : "all node types (no relationship type selected)";
      dom.relationshipValidityHelp.textContent =
        "Valid relationship types are metamodel-compliant edge types for the current source/target selection. " +
        "Currently valid relationship types: " +
        validTypeText +
        ". Valid source node types: " +
        sourceTypeText +
        ". Valid target node types: " +
        targetTypeText +
        ".";
    }
  }

  function updateSelectedEdgeControls(currentState, effectiveBaseline, nodeTypeById, edgeTypeById, edgeTypeOptions, selectedEdge) {
    if (!selectedEdge) {
      setValidityBadge(dom.selectedEdgeTypeStatus, "none", "Select");
      if (dom.selectedEdgeValidityHelp) {
        dom.selectedEdgeValidityHelp.textContent = "";
      }
      return;
    }

    const edgeRules = ((effectiveBaseline.architecture && effectiveBaseline.architecture.edgeTypes) || []);
    const edgeRuleById = new Map();
    edgeRules.forEach(function (rule) {
      if (!rule || !rule.id) {
        return;
      }
      edgeRuleById.set(normalizeTypeToken(rule.id), rule);
    });

    const selectedSource = (currentState.model.elements || []).find(function (entry) {
      return entry.id === selectedEdge.sourceId;
    }) || null;
    const selectedTarget = (currentState.model.elements || []).find(function (entry) {
      return entry.id === selectedEdge.targetId;
    }) || null;
    const selectedType = String(dom.selectedEdgeType.value || selectedEdge.type || "").trim();
    const selectedRule = edgeRuleById.get(normalizeTypeToken(selectedType)) || null;

    const validEdgeTypes = edgeTypeOptions.filter(function (typeId) {
      const rule = edgeRuleById.get(normalizeTypeToken(typeId)) || null;
      return isEdgeTypeValidForNodeSelection(rule, selectedSource, selectedTarget);
    });
    const validEdgeTypeSet = new Set(validEdgeTypes.map(function (typeId) {
      return normalizeTypeToken(typeId);
    }));

    setInputDatalistEntries(
      dom.selectedEdgeType,
      edgeTypeOptions.map(function (typeId) {
        const key = String(typeId || "").trim();
        const typeEntry = (edgeTypeById && (edgeTypeById.get(key) || edgeTypeById.get(key.toLowerCase()))) || null;
        const isValid = validEdgeTypeSet.has(normalizeTypeToken(typeId));
        return {
          value: key,
          label: (typeEntry && typeEntry.label) || key,
          status: isValid ? "ok" : "warn"
        };
      })
    );

    const selectedTypeIsKnown = !!selectedType && edgeTypeOptions.some(function (entry) {
      return normalizeTypeToken(entry) === normalizeTypeToken(selectedType);
    });
    const selectedTypeIsValid = selectedTypeIsKnown && validEdgeTypeSet.has(normalizeTypeToken(selectedType));
    setValidityBadge(
      dom.selectedEdgeTypeStatus,
      !selectedType ? "none" : (selectedTypeIsValid ? "ok" : "warn"),
      !selectedType ? "Select" : (selectedTypeIsValid ? "Compliant" : "Deviation")
    );

    if (dom.selectedEdgeValidityHelp) {
      const validTypePreview = validEdgeTypes
        .slice(0, 8)
        .map(function (typeId) {
          const entry = (edgeTypeById && (edgeTypeById.get(typeId) || edgeTypeById.get(String(typeId).toLowerCase()))) || null;
          return (entry && entry.label) || typeId;
        })
        .join(", ");
      const validTypeText = validEdgeTypes.length
        ? validTypePreview + (validEdgeTypes.length > 8 ? " ..." : "")
        : "none";
      const sourceTypeText = selectedRule
        ? describeAllowedNodeTypes(selectedRule.sourceNodeTypes, nodeTypeById)
        : "all node types (no relationship type selected)";
      const targetTypeText = selectedRule
        ? describeAllowedNodeTypes(selectedRule.targetNodeTypes, nodeTypeById)
        : "all node types (no relationship type selected)";
      dom.selectedEdgeValidityHelp.textContent =
        "Valid relationship types are metamodel-compliant edge types for this edge source/target. " +
        "Currently valid relationship types: " +
        validTypeText +
        ". Valid source node types: " +
        sourceTypeText +
        ". Valid target node types: " +
        targetTypeText +
        ".";
    }
  }

  function refreshSelectedEdgeTypeValidity() {
    const currentState = getState();
    const selectedEdge = (currentState.model.relationships || []).find(function (relationship) {
      return relationship.id === currentState.ui.selectedEdgeId;
    }) || null;
    const effectiveBaseline = getEffectiveBaseline(currentState.baseline);
    const edgeTypeOptions = (effectiveBaseline.edgeTypes && effectiveBaseline.edgeTypes.length)
      ? effectiveBaseline.edgeTypes
      : (effectiveBaseline.stereotypes || []);
    const nodeTypeById = new Map();
    ((effectiveBaseline.architecture && effectiveBaseline.architecture.nodeTypes) || []).forEach(function (entry) {
      if (!entry || !entry.id) {
        return;
      }
      nodeTypeById.set(entry.id, entry);
      nodeTypeById.set(String(entry.id).toLowerCase(), entry);
    });
    const edgeTypeById = new Map();
    ((effectiveBaseline.architecture && effectiveBaseline.architecture.edgeTypes) || []).forEach(function (entry) {
      if (!entry || !entry.id) {
        return;
      }
      edgeTypeById.set(entry.id, entry);
      edgeTypeById.set(String(entry.id).toLowerCase(), entry);
    });
    updateSelectedEdgeControls(
      currentState,
      effectiveBaseline,
      nodeTypeById,
      edgeTypeById,
      edgeTypeOptions,
      selectedEdge
    );
  }

  function render() {
    const currentState = getState();
    const effectiveBaseline = getEffectiveBaseline(currentState.baseline);
    const effectiveColorScheme = getEffectiveColorScheme(currentState, effectiveBaseline);
    const activeArchitectureId = (currentState.ui && currentState.ui.activeArchitectureId) || "";
    const architectureEntries = Array.isArray(currentState.architectures) ? currentState.architectures : [];
    const activeArchitecture = architectureEntries.find(function (entry) {
      return entry.id === activeArchitectureId;
    }) || architectureEntries[0] || null;
    document.body.dataset.theme = (currentState.ui && currentState.ui.theme) || "dark";
    const activeDiagram = getActiveDiagram(currentState);
    const globalLineModeFallback = normalizeLineMode(currentState.ui.lineMode || "straight");
    const effectiveLineMode = normalizeLineMode(
      activeDiagram && activeDiagram.lineMode ? activeDiagram.lineMode : globalLineModeFallback
    );
    const compliance = evaluateCompliance(currentState);
    const elementResultById = new Map(
      compliance.elementResults.map(function (entry) {
        return [entry.id, entry];
      })
    );
    const relationshipResultById = new Map(
      compliance.relationshipResults.map(function (entry) {
        return [entry.id, entry];
      })
    );

    dom.baselineMeta.innerHTML = [
      "<div><strong>" + effectiveBaseline.name + "</strong></div>",
      "<div>version: " + effectiveBaseline.version + "</div>",
      "<div>source: " + (effectiveBaseline.fileName || effectiveBaseline.source) + "</div>",
      "<div>views: " + effectiveBaseline.viewpoints.length + "</div>",
      "<div>node types: " + (effectiveBaseline.nodeTypes || []).length + "</div>",
      "<div>edge types: " + (effectiveBaseline.edgeTypes || []).length + "</div>"
    ].join("");
    if (dom.settingsThemeSelect) {
      dom.settingsThemeSelect.value = (currentState.ui && currentState.ui.theme) || "dark";
    }
    renderMetaModelEditor(currentState, effectiveBaseline);

    const categoryEntries = ((effectiveBaseline.architecture && effectiveBaseline.architecture.categories) || []);
    if (!categoryEntries.length) {
      dom.categoryLegend.innerHTML = '<div class="hint">No categories defined in loaded metamodel.</div>';
    } else {
      const categoryRefCount = new Map();
      ((effectiveBaseline.architecture && effectiveBaseline.architecture.views) || []).forEach(function (viewEntry) {
        splitCategoryTokens(viewEntry && viewEntry.category).forEach(function (token) {
          const key = String(token || "").trim().toUpperCase();
          if (!key) {
            return;
          }
          categoryRefCount.set(key, (categoryRefCount.get(key) || 0) + 1);
        });
      });
      dom.categoryLegend.innerHTML =
        '<div class="legendHeaderRow">' +
        '<span class="legendCategoryHeader">Category</span>' +
        '<span class="legendClusterHeader">Background</span>' +
        '<span class="legendClusterHeader">Font</span>' +
        "</div>" +
        categoryEntries
          .map(function (entry) {
            const category = String(entry.id || "").trim().toUpperCase();
            const colors = effectiveColorScheme[category] || effectiveColorScheme.DEFAULT;
            const refCount = categoryRefCount.get(category) || 0;
            const isOrphanCategory = refCount === 0;
            return (
              '<div class="legendRow">' +
              '<span class="legendCategoryCell" style="background:' +
              colors.bg +
              ";color:" +
              colors.font +
              ';border-color:' +
              colors.font +
              '33;">' +
              '<span class="legendCategoryName">' + category + "</span>" +
              (isOrphanCategory
                ? '<span class="deviationBadge warn">Orphan</span><button class="legendCategoryDeleteBtn" type="button" data-action="deleteOrphanCategory" data-category="' +
                  category +
                  '">Delete</button>'
                : '<span class="legendCategoryRefs">Refs: ' + refCount + "</span>") +
              "</span>" +
              '<span class="legendCluster">' +
              '<span class="legendClusterLabel">Background</span>' +
              '<span class="colorPair">' +
              '<input class="colorPairText" data-category="' +
              category +
              '" data-field="bg" value="' +
              colors.bg +
              '" list="cssNamedColorList" title="Background color">' +
              "</span>" +
              "</span>" +
              '<span class="legendCluster">' +
              '<span class="legendClusterLabel">Font</span>' +
              '<span class="colorPair">' +
              '<input class="colorPairText" data-category="' +
              category +
              '" data-field="font" value="' +
              colors.font +
              '" list="cssNamedColorList" title="Font color">' +
              "</span>" +
              "</span>" +
              "</div>"
            );
          })
          .join("");
      Array.from(dom.categoryLegend.querySelectorAll('input.colorPairText[list="cssNamedColorList"]')).forEach(function (inputElement) {
        bindDatalistFallback(inputElement);
      });
    }

    const filterValues = ["All"].concat(effectiveBaseline.viewpoints);
    setInputDatalistEntries(
      dom.viewpointFilter,
      filterValues.map(function (value) {
        return { value: value, label: value };
      })
    );
    assignSelectValue(
      dom.viewpointFilter,
      filterValues.indexOf(currentState.ui.viewpointFilter) >= 0 ? currentState.ui.viewpointFilter : "All"
    );

    const modelViews = dedupe(
      currentState.model.elements.map(function (element) {
        return element.viewpoint;
      })
    );
    const hasUnassignedView = currentState.model.elements.some(function (element) {
      return !element.viewpoint;
    });
    const elementViewFilterValues = ["All"].concat(
      dedupe((effectiveBaseline.viewpoints || []).concat(modelViews, hasUnassignedView ? ["Unassigned View"] : []))
    );
    setSelectOptions(dom.elementViewFilter, elementViewFilterValues);
    dom.elementViewFilter.value =
      elementViewFilterValues.indexOf(currentState.ui.elementViewFilter) >= 0
        ? currentState.ui.elementViewFilter
        : "All";
    const orphanFilterOptions = ["all", "anyOrphan", "noLinks", "noDiagram", "noView", "strictOrphan"];
    dom.elementOrphanFilter.value = orphanFilterOptions.indexOf(currentState.ui.elementOrphanFilter) >= 0
      ? currentState.ui.elementOrphanFilter
      : "all";

    const relationshipViewFilterValues = ["All"].concat(
      dedupe((effectiveBaseline.viewpoints || []).concat(modelViews, hasUnassignedView ? ["Unassigned"] : []))
    );
    setSelectOptions(dom.relationshipViewFilter, relationshipViewFilterValues);
    dom.relationshipViewFilter.value =
      relationshipViewFilterValues.indexOf(currentState.ui.relationshipViewFilter) >= 0
        ? currentState.ui.relationshipViewFilter
        : "All";

    const nodeTypeOptions = (effectiveBaseline.nodeTypes && effectiveBaseline.nodeTypes.length)
      ? effectiveBaseline.nodeTypes
      : (effectiveBaseline.stereotypes || []);
    const edgeTypeOptions = (effectiveBaseline.edgeTypes && effectiveBaseline.edgeTypes.length)
      ? effectiveBaseline.edgeTypes
      : (effectiveBaseline.stereotypes || []);
    const nodeTypeById = new Map();
    ((effectiveBaseline.architecture && effectiveBaseline.architecture.nodeTypes) || []).forEach(function (entry) {
      if (!entry || !entry.id) {
        return;
      }
      nodeTypeById.set(entry.id, entry);
      nodeTypeById.set(String(entry.id).toLowerCase(), entry);
    });
    const edgeTypeById = new Map();
    ((effectiveBaseline.architecture && effectiveBaseline.architecture.edgeTypes) || []).forEach(function (entry) {
      if (!entry || !entry.id) {
        return;
      }
      edgeTypeById.set(entry.id, entry);
      edgeTypeById.set(String(entry.id).toLowerCase(), entry);
    });

    setSelectOptions(dom.elementViewpoint, effectiveBaseline.viewpoints);
    setSelectOptions(dom.elementType, nodeTypeOptions);
    setSelectOptions(dom.relType, edgeTypeOptions);
    setSelectOptions(dom.relTypeFilter, edgeTypeOptions);
    setSelectOptions(dom.diagramRelType, edgeTypeOptions);
    setSelectOptions(dom.newDiagramElementViewpoint, effectiveBaseline.viewpoints);
    setSelectOptions(dom.newDiagramElementType, nodeTypeOptions);
    setSelectOptions(
      dom.diagramViewInput,
      dedupe(
        (effectiveBaseline.viewpoints || []).concat(
          (currentState.model.diagrams || []).map(function (diagramEntry) {
            return diagramEntry.view || "";
          })
        )
      )
    );
    setSelectOptions(dom.selectedNodeViewpoint, effectiveBaseline.viewpoints);
    setSelectOptions(dom.selectedNodeType, nodeTypeOptions);
    setSelectOptions(dom.selectedEdgeType, edgeTypeOptions);
    setInputDatalistEntries(
      dom.roadmapRowNode,
      (currentState.model.elements || []).map(function (element) {
        return {
          value: formatElementInputLabel(element),
          label: formatElementInputLabel(element)
        };
      })
    );
    const allocationViewOptions = ["All"].concat(
      dedupe(
        (effectiveBaseline.viewpoints || []).concat(
          modelViews,
          hasUnassignedView ? ["Unassigned"] : []
        )
      )
    );
    setSelectOptions(dom.diagramAllocationSourceView, allocationViewOptions);
    setSelectOptions(dom.diagramAllocationTargetView, allocationViewOptions);
    setSelectOptions(dom.diagramAllocationRelType, ["All"].concat(edgeTypeOptions));
    applySelectStereotypeLabels(dom.elementType, nodeTypeById);
    applySelectStereotypeLabels(dom.relType, edgeTypeById);
    applySelectStereotypeLabels(dom.newDiagramElementType, nodeTypeById);
    applySelectStereotypeLabels(dom.selectedNodeType, nodeTypeById);
    applySelectStereotypeLabels(dom.selectedEdgeType, edgeTypeById);
    syncEditingFormsWithState(currentState);
    const baselineSignature = [
      effectiveBaseline.name,
      effectiveBaseline.version,
      effectiveBaseline.source,
      (effectiveBaseline.viewpoints || []).length,
      (effectiveBaseline.nodeTypes || []).length,
      (effectiveBaseline.edgeTypes || []).length
    ].join("|");
    if (baselineSignature !== lastLoggedBaselineSignature) {
      const elementTypeOptions = dom.elementTypeList ? dom.elementTypeList.querySelectorAll("option").length : 0;
      const elementViewpointOptions = dom.elementViewpointList ? dom.elementViewpointList.querySelectorAll("option").length : 0;
      console.info("[baseline] datalist options updated", {
        elementTypeOptions: elementTypeOptions,
        elementViewpointOptions: elementViewpointOptions
      });
      lastLoggedBaselineSignature = baselineSignature;
    }

    dom.statsList.innerHTML = [
      "<li>Elements: " + currentState.model.elements.length + "</li>",
      "<li>Relationships: " + currentState.model.relationships.length + "</li>",
      "<li>Element deviations: " + compliance.summary.elementDeviations + "</li>",
      "<li>Relationship deviations: " + compliance.summary.relationshipDeviations + "</li>",
      "<li>Line mode: " + effectiveLineMode + " (diagram), fallback: " + globalLineModeFallback + "</li>"
    ].join("");

    dom.lineModeSelect.value = effectiveLineMode;
    if (dom.diagramRelType && !String(dom.diagramRelType.value || "").trim()) {
      dom.diagramRelType.value = edgeTypeOptions[0] || "";
    }
    dom.diagramZoomSelect.value = String(currentState.ui.diagramZoom || 100);
    dom.leftSectionDiagramsBody.hidden = !!currentState.ui.leftDiagramsCollapsed;
    dom.leftSectionCreateBody.hidden = !!currentState.ui.leftCreateCollapsed;
    dom.leftSectionEditBody.hidden = !!currentState.ui.leftEditCollapsed;
    dom.toggleLeftDiagramsBtn.textContent = currentState.ui.leftDiagramsCollapsed ? "Expand" : "Collapse";
    dom.toggleLeftCreateBtn.textContent = currentState.ui.leftCreateCollapsed ? "Expand" : "Collapse";
    dom.toggleLeftEditBtn.textContent = currentState.ui.leftEditCollapsed ? "Expand" : "Collapse";
    const allLeftCollapsed =
      !!currentState.ui.leftDiagramsCollapsed &&
      !!currentState.ui.leftCreateCollapsed &&
      !!currentState.ui.leftEditCollapsed;
    dom.toggleLeftAllBtn.textContent = allLeftCollapsed ? "Expand All Left UI" : "Collapse All Left UI";

    const isAllocationDiagram = !!(activeDiagram && activeDiagram.type === "allocationMatrix");
    const isRoadmapDiagram = !!(activeDiagram && activeDiagram.type === "roadmap");
    dom.diagramToolbarWrap.hidden = !!currentState.ui.rightToolbarCollapsed || isAllocationDiagram || isRoadmapDiagram;
    dom.diagramMetaWrap.hidden = !!currentState.ui.rightMetaCollapsed;
    dom.toggleRightToolbarBtn.textContent = currentState.ui.rightToolbarCollapsed ? "Expand Toolbar" : "Collapse Toolbar";
    dom.toggleRightMetaBtn.textContent = currentState.ui.rightMetaCollapsed ? "Expand Meta" : "Collapse Meta";
    const allRightCollapsed = !!currentState.ui.rightToolbarCollapsed && !!currentState.ui.rightMetaCollapsed;
    dom.toggleRightAllBtn.textContent = allRightCollapsed ? "Expand All Right UI" : "Collapse All Right UI";

    dom.appLayout.classList.toggle("sidebarCollapsed", !!currentState.ui.sidebarCollapsed);
    dom.sidebarToggleBtn.textContent = currentState.ui.sidebarCollapsed ? "Show Sidebar" : "Hide Sidebar";
    dom.sidebarToggleBtn.setAttribute("aria-expanded", String(!currentState.ui.sidebarCollapsed));
    const sidebarViewFilterSection = dom.sidebarViewFilterBody
      ? dom.sidebarViewFilterBody.closest("section.card")
      : null;
    const shouldShowSidebarViewFilter = currentState.ui.activeTab === "diagramTab";
    if (sidebarViewFilterSection) {
      sidebarViewFilterSection.hidden = !shouldShowSidebarViewFilter;
    }
    dom.sidebarBaselineBody.hidden = !!currentState.ui.sidebarBaselineCollapsed;
    dom.sidebarViewFilterBody.hidden = !shouldShowSidebarViewFilter || !!currentState.ui.sidebarViewFilterCollapsed;
    dom.sidebarStatsBody.hidden = !!currentState.ui.sidebarStatsCollapsed;
    if (dom.sidebarColorsBody) {
      dom.sidebarColorsBody.hidden = !!currentState.ui.sidebarColorsCollapsed;
    }
    dom.toggleSidebarBaselineBtn.textContent = currentState.ui.sidebarBaselineCollapsed ? "Expand" : "Collapse";
    dom.toggleSidebarViewFilterBtn.textContent = currentState.ui.sidebarViewFilterCollapsed ? "Expand" : "Collapse";
    dom.toggleSidebarStatsBtn.textContent = currentState.ui.sidebarStatsCollapsed ? "Expand" : "Collapse";
    if (dom.toggleSidebarColorsBtn) {
      dom.toggleSidebarColorsBtn.textContent = currentState.ui.sidebarColorsCollapsed ? "Expand" : "Collapse";
    }
    const viewFilterCollapsedForSummary = !shouldShowSidebarViewFilter || !!currentState.ui.sidebarViewFilterCollapsed;
    const allLeftSidebarCollapsed =
      !!currentState.ui.sidebarBaselineCollapsed &&
      viewFilterCollapsedForSummary &&
      !!currentState.ui.sidebarStatsCollapsed &&
      (dom.sidebarColorsBody ? !!currentState.ui.sidebarColorsCollapsed : true);
    dom.toggleLeftSidebarAllBtn.textContent = allLeftSidebarCollapsed
      ? "Expand All Left Sidebar"
      : "Collapse All Left Sidebar";
    if (Number.isFinite(currentState.ui.sidebarWidth) && currentState.ui.sidebarWidth > 0) {
      dom.appLayout.style.setProperty("--sidebar-width", currentState.ui.sidebarWidth + "px");
    } else {
      dom.appLayout.style.removeProperty("--sidebar-width");
    }
    if (dom.dataSplit) {
      if (Number.isFinite(currentState.ui.dataSplitLeftWidth) && currentState.ui.dataSplitLeftWidth > 0) {
        dom.dataSplit.style.setProperty("--data-left-width", currentState.ui.dataSplitLeftWidth + "px");
      } else {
        dom.dataSplit.style.removeProperty("--data-left-width");
      }
    }

    dom.elementSearchInput.value = currentState.ui.elementSearch || "";
    const elementSearch = normalizeSearch(currentState.ui.elementSearch);
    const elementViewFilter = currentState.ui.elementViewFilter || "All";
    const elementOrphanFilter = currentState.ui.elementOrphanFilter || "all";
    const connectedElementIds = new Set();
    currentState.model.relationships.forEach(function (relationship) {
      connectedElementIds.add(relationship.sourceId);
      connectedElementIds.add(relationship.targetId);
    });
    const diagramElementIds = new Set();
    (currentState.model.diagrams || []).forEach(function (diagram) {
      (diagram.elementIds || []).forEach(function (id) {
        diagramElementIds.add(id);
      });
    });
    const filteredElements = currentState.model.elements.filter(function (element) {
      const viewMatches = elementViewFilter === "All" || (element.viewpoint || "Unassigned View") === elementViewFilter;
      if (!viewMatches) {
        return false;
      }
      const hasLinks = connectedElementIds.has(element.id);
      const inAnyDiagram = diagramElementIds.has(element.id);
      const inKnownView = !!element.viewpoint && (effectiveBaseline.viewpoints || []).indexOf(element.viewpoint) >= 0;
      const orphanAny = !hasLinks || !inAnyDiagram || !inKnownView;
      const orphanStrict = !hasLinks && !inAnyDiagram && !inKnownView;
      if (
        (elementOrphanFilter === "noLinks" && hasLinks) ||
        (elementOrphanFilter === "noDiagram" && inAnyDiagram) ||
        (elementOrphanFilter === "noView" && inKnownView) ||
        (elementOrphanFilter === "anyOrphan" && !orphanAny) ||
        (elementOrphanFilter === "strictOrphan" && !orphanStrict)
      ) {
        return false;
      }
      if (!elementSearch) {
        return true;
      }
      const haystack = [
        element.name,
        element.type,
        element.viewpoint,
        element.description,
        formatMembersField(element.members),
        formatCsvField(element.functions)
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(elementSearch);
    });
    const groupedElements = groupBy(filteredElements, function (element) {
      return element.viewpoint || "Unassigned View";
    });
    dom.elementsTableBody.innerHTML = Array.from(groupedElements.entries())
      .sort(function (a, b) {
        return a[0].localeCompare(b[0]);
      })
      .map(function (entry) {
        const view = entry[0];
        const rows = entry[1]
          .map(function (element) {
            const result = elementResultById.get(element.id);
            return (
              "<tr>" +
              "<td>" +
              element.id +
              "</td>" +
              "<td>" +
              element.name +
              "</td>" +
              "<td>" +
              (((nodeTypeById.get(element.type) || nodeTypeById.get(String(element.type || "").toLowerCase()) || {}).label) || element.type) +
              "</td>" +
              "<td>" +
              element.viewpoint +
              "</td>" +
              "<td>" +
              formatMembersField(element.members) +
              "</td>" +
              "<td>" +
              formatCsvField(element.functions) +
              "</td>" +
              "<td>" +
              '<span class="swatch" style="background:' +
              resolveElementColors(element, effectiveColorScheme).bg +
              ';"></span> ' +
              (element.bgColor || "stereotype") +
              " / " +
              (element.fontColor || "stereotype") +
              "</td>" +
              "<td>" +
              badge(!!(result && result.isDeviation)) +
              (element.allowDeviation ? " (accepted)" : "") +
              "</td>" +
              "<td>" +
              '<button data-action="editElement" data-id="' +
              element.id +
              '">Edit</button> ' +
              '<button data-action="toggleElementDeviation" data-id="' +
              element.id +
              '">' +
              (element.allowDeviation ? "Unaccept" : "Accept") +
              "</button> " +
              '<button data-action="deleteElement" data-id="' +
              element.id +
              '">Delete</button>' +
              "</td>" +
              "</tr>"
            );
          })
          .join("");
        return (
          '<tr class="groupRow"><td colspan="9">View: ' +
          view +
          " (" +
          entry[1].length +
          ")</td></tr>" +
          rows
        );
      })
      .join("");

    updateRelationshipAddControls(currentState, effectiveBaseline, nodeTypeById, edgeTypeById, edgeTypeOptions);

    dom.diagramList.innerHTML = currentState.model.diagrams
      .map(function (diagram) {
        const isActive = activeDiagram && diagram.id === activeDiagram.id;
        return (
          '<div class="diagramListItem ' +
          (isActive ? "active" : "") +
          '" data-diagram-id="' +
          diagram.id +
          '">' +
          '<span class="diagramListName" data-action="selectDiagram" data-diagram-id="' +
          diagram.id +
          '">' +
          diagram.name +
          "</span>" +
          '<span class="diagramListActions">' +
          '<button class="diagramExportBtn" data-action="saveDiagramSvg" data-diagram-id="' +
          diagram.id +
          '" title="Save diagram as SVG">SVG</button>' +
          '<button class="diagramExportBtn" data-action="saveDiagramPng" data-diagram-id="' +
          diagram.id +
          '" title="Save diagram as PNG">PNG</button>' +
          '<button class="diagramDeleteBtn" data-action="deleteDiagram" data-diagram-id="' +
          diagram.id +
          '" title="Delete diagram">x</button>' +
          "</span>" +
          "</div>"
        );
      })
      .join("");

    dom.diagramEditBar.hidden = !activeDiagram;
    if (activeDiagram) {
      dom.diagramNameInput.value = activeDiagram.name || "";
      dom.diagramTypeSelect.value = normalizeDiagramType(activeDiagram.type || "standard");
      dom.diagramTitleInput.value = activeDiagram.title || activeDiagram.name || "";
      dom.diagramViewInput.value = activeDiagram.view || "";
      dom.standardDiagramControls.hidden = activeDiagram.type !== "standard";
      dom.clickableDiagramControls.hidden = activeDiagram.type !== "clickable";
      if (dom.allocationDiagramControls) {
        dom.allocationDiagramControls.hidden = activeDiagram.type !== "allocationMatrix";
      }
      if (dom.roadmapDiagramControls) {
        dom.roadmapDiagramControls.hidden = activeDiagram.type !== "roadmap";
      }
      if (activeDiagram.type !== "roadmap") {
        editingRoadmapRowId = null;
      }
      if (dom.diagramAllocationSourceView) {
        dom.diagramAllocationSourceView.value = allocationViewOptions.indexOf(activeDiagram.allocationSourceView || "All") >= 0
          ? (activeDiagram.allocationSourceView || "All")
          : "All";
      }
      if (dom.diagramAllocationTargetView) {
        dom.diagramAllocationTargetView.value = allocationViewOptions.indexOf(activeDiagram.allocationTargetView || "All") >= 0
          ? (activeDiagram.allocationTargetView || "All")
          : "All";
      }
      if (dom.diagramAllocationRelType) {
        const relationshipTypeOptions = ["All"].concat(edgeTypeOptions);
        dom.diagramAllocationRelType.value = relationshipTypeOptions.indexOf(activeDiagram.allocationRelationshipType || "All") >= 0
          ? (activeDiagram.allocationRelationshipType || "All")
          : "All";
      }
      if (dom.roadmapRowsList) {
        const rows = Array.isArray(activeDiagram.roadmapRows) ? activeDiagram.roadmapRows : [];
        dom.roadmapRowsList.innerHTML = rows
          .map(function (row, index) {
            const element = (currentState.model.elements || []).find(function (entry) {
              return entry.id === row.nodeId;
            });
            const nodeLabel = element ? element.name : (row.nodeId || "-");
            const startAttr = String(row.startAttr || "").trim();
            const endAttr = String(row.endAttr || "").trim();
            const detail = startAttr && endAttr
              ? ("range: " + startAttr + " -> " + endAttr)
              : ("milestone: " + (startAttr || endAttr || "-"));
            return '<option value="' + row.id + '">' + (index + 1) + ". " + nodeLabel + " | " + detail + "</option>";
          })
          .join("");
        if (editingRoadmapRowId && rows.some(function (entry) { return entry.id === editingRoadmapRowId; })) {
          dom.roadmapRowsList.value = editingRoadmapRowId;
        } else {
          editingRoadmapRowId = null;
          dom.roadmapRowsList.value = "";
        }
      }
      updateRoadmapRowAttributePickers(currentState.model.elements || []);
      updateRoadmapRowValidityBadges(currentState.model.elements || []);
      updateRoadmapDateInputStatuses();
      if (dom.roadmapAddOrUpdateRowBtn) {
        dom.roadmapAddOrUpdateRowBtn.textContent = editingRoadmapRowId ? "Update Row" : "Add Row";
      }
      if (dom.roadmapCancelEditRowBtn) {
        dom.roadmapCancelEditRowBtn.hidden = !editingRoadmapRowId;
      }
      const listedIds = Array.isArray(activeDiagram.elementIds) ? activeDiagram.elementIds : [];
      const listedIdSet = new Set(listedIds);
      const activeViewpointFilter = currentState.ui.viewpointFilter || "All";
      const totalAvailableElements = currentState.model.elements.filter(function (element) {
        return !listedIdSet.has(element.id);
      });
      const filteredAvailableElements = totalAvailableElements
        .filter(function (element) {
          return activeViewpointFilter === "All" || (element.viewpoint || "") === activeViewpointFilter;
        })
      ;
      setInputDatalistEntries(
        dom.diagramElementPicker,
        filteredAvailableElements.map(function (element) {
          return {
            value: formatElementInputLabel(element),
            label: formatElementInputLabel(element)
          };
        })
      );
      if (dom.diagramElementPickerLabel) {
        dom.diagramElementPickerLabel.textContent =
          "Available Elements (" +
          totalAvailableElements.length +
          " total, " +
          filteredAvailableElements.length +
          " after filter)";
      }
      const availablePickerIds = new Set(
        filteredAvailableElements.map(function (entry) {
          return entry.id;
        })
      );
      const currentPickerId = resolveElementInputToId(dom.diagramElementPicker.value, currentState.model.elements);
      if (!currentPickerId || !availablePickerIds.has(currentPickerId)) {
        dom.diagramElementPicker.value = "";
      }
      setInputDatalistEntries(
        dom.diagramElementList,
        listedIds.map(function (id) {
          const element = currentState.model.elements.find(function (entry) {
            return entry.id === id;
          });
          return element || null;
        })
          .filter(Boolean)
          .sort(function (a, b) {
            const nameA = String(a.name || a.id || "").toLowerCase();
            const nameB = String(b.name || b.id || "").toLowerCase();
            return nameA.localeCompare(nameB);
          })
          .map(function (element) {
            return { value: formatElementInputLabel(element), label: formatElementInputLabel(element) };
          })
      );
      setInputDatalistEntries(
        dom.diagramFocusSelect,
        currentState.model.elements.map(function (element) {
          return {
            value: formatElementInputLabel(element),
            label: formatElementInputLabel(element)
          };
        })
      );
      if (activeDiagram.focusElementId) {
        const focusElement = currentState.model.elements.find(function (entry) {
          return entry.id === activeDiagram.focusElementId;
        });
        dom.diagramFocusSelect.value = focusElement ? formatElementInputLabel(focusElement) : activeDiagram.focusElementId;
      }
      const findDiagramIds = new Set(Array.isArray(activeDiagram.elementIds) ? activeDiagram.elementIds : []);
      const findQuery = normalizeSearch(currentState.ui.diagramFindQuery || "");
      const findCandidates = currentState.model.elements
        .filter(function (entry) {
          return activeDiagram.type !== "standard" || findDiagramIds.has(entry.id);
        })
        .filter(function (entry) {
          return (
            !findQuery ||
            String(entry.name || "").toLowerCase().includes(findQuery) ||
            String(entry.id || "").toLowerCase().includes(findQuery) ||
            String(entry.type || "").toLowerCase().includes(findQuery)
          );
        })
        .sort(function (a, b) {
          return String(a.name || a.id || "").toLowerCase().localeCompare(String(b.name || b.id || "").toLowerCase());
        });
      if (dom.diagramFindControls) {
        dom.diagramFindControls.hidden = activeDiagram.type === "allocationMatrix" || activeDiagram.type === "roadmap";
      }
      if (dom.diagramFindFilter) {
        dom.diagramFindFilter.value = currentState.ui.diagramFindQuery || "";
      }
      if (dom.diagramFindList) {
        const selectedNodeIds = Array.isArray(currentState.ui.selectedNodeIds) ? currentState.ui.selectedNodeIds : [];
        dom.diagramFindList.innerHTML = findCandidates
          .map(function (entry) {
            return '<option value="' + entry.id + '">' + entry.name + " (" + entry.id + ")</option>";
          })
          .join("");
        Array.from(dom.diagramFindList.options || []).forEach(function (option) {
          option.selected = selectedNodeIds.indexOf(option.value) >= 0;
        });
      }
      dom.diagramDepthInput.value = String(activeDiagram.depth || 1);
      dom.deleteActiveDiagramBtn.disabled = currentState.model.diagrams.length <= 1;
      dom.addElementToDiagramBtn.disabled = !resolveElementInputToId(dom.diagramElementPicker.value, currentState.model.elements);
      const viewLabel = activeDiagram.view ? activeDiagram.view : "Unassigned View";
      const titleLabel = activeDiagram.title || activeDiagram.name || "Diagram";
      const viewBadgeColors = resolveViewBadgeColors(activeDiagram.view, effectiveBaseline, effectiveColorScheme);
      dom.diagramMetaDisplay.innerHTML =
        '<span class="diagramMetaTitle">' +
        titleLabel +
        "</span>" +
        '<span class="diagramMetaView" style="background:' +
        viewBadgeColors.bg +
        ";color:" +
        viewBadgeColors.font +
        ';">' +
        viewLabel +
        "</span>";
    } else {
      dom.standardDiagramControls.hidden = true;
      dom.clickableDiagramControls.hidden = true;
      if (dom.allocationDiagramControls) {
        dom.allocationDiagramControls.hidden = true;
      }
      if (dom.roadmapDiagramControls) {
        dom.roadmapDiagramControls.hidden = true;
      }
      dom.deleteActiveDiagramBtn.disabled = true;
      dom.addElementToDiagramBtn.disabled = true;
      dom.diagramElementPicker.value = "";
      dom.diagramElementList.value = "";
      dom.diagramFocusSelect.value = "";
      if (dom.diagramFindControls) {
        dom.diagramFindControls.hidden = true;
      }
      if (dom.diagramFindFilter) {
        dom.diagramFindFilter.value = "";
      }
      if (dom.diagramFindList) {
        dom.diagramFindList.innerHTML = "";
      }
      if (dom.diagramElementPickerLabel) {
        dom.diagramElementPickerLabel.textContent = "Available Elements (0 total, 0 after filter)";
      }
      dom.diagramMetaDisplay.innerHTML = "";
      editingRoadmapRowId = null;
    }

    dom.relationshipSearchInput.value = currentState.ui.relationshipSearch || "";
    const relationshipSearch = normalizeSearch(currentState.ui.relationshipSearch);
    const relationshipViewFilter = currentState.ui.relationshipViewFilter || "All";
    const filteredRelationships = currentState.model.relationships.filter(function (relationship) {
      const sourceElement = currentState.model.elements.find(function (entry) {
        return entry.id === relationship.sourceId;
      });
      const targetElement = currentState.model.elements.find(function (entry) {
        return entry.id === relationship.targetId;
      });
      const sourceView = sourceElement && sourceElement.viewpoint ? sourceElement.viewpoint : "Unassigned";
      const targetView = targetElement && targetElement.viewpoint ? targetElement.viewpoint : "Unassigned";
      const viewMatches =
        relationshipViewFilter === "All" ||
        sourceView === relationshipViewFilter ||
        targetView === relationshipViewFilter;
      if (!viewMatches) {
        return false;
      }
      if (!relationshipSearch) {
        return true;
      }
      const haystack = [
        relationship.id,
        relationship.type,
        relationship.description,
        sourceElement ? sourceElement.name : relationship.sourceId,
        targetElement ? targetElement.name : relationship.targetId,
        sourceElement ? sourceElement.viewpoint : "",
        targetElement ? targetElement.viewpoint : ""
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(relationshipSearch);
    });
    const groupedRelationships = groupBy(filteredRelationships, function (relationship) {
      const sourceElement = currentState.model.elements.find(function (entry) {
        return entry.id === relationship.sourceId;
      });
      const targetElement = currentState.model.elements.find(function (entry) {
        return entry.id === relationship.targetId;
      });
      const sourceView = sourceElement && sourceElement.viewpoint ? sourceElement.viewpoint : "Unassigned";
      const targetView = targetElement && targetElement.viewpoint ? targetElement.viewpoint : "Unassigned";
      return sourceView === targetView ? sourceView : sourceView + " -> " + targetView;
    });
    dom.relationshipsTableBody.innerHTML = Array.from(groupedRelationships.entries())
      .sort(function (a, b) {
        return a[0].localeCompare(b[0]);
      })
      .map(function (entry) {
        const groupLabel = entry[0];
        const rows = entry[1]
          .map(function (relationship) {
            const result = relationshipResultById.get(relationship.id);
            const source =
              (currentState.model.elements.find(function (node) {
                return node.id === relationship.sourceId;
              }) || {}).name || relationship.sourceId;
            const target =
              (currentState.model.elements.find(function (node) {
                return node.id === relationship.targetId;
              }) || {}).name || relationship.targetId;

            return (
              "<tr>" +
              "<td>" +
              relationship.id +
              "</td>" +
              "<td>" +
              source +
              "</td>" +
              "<td>" +
              target +
              "</td>" +
              "<td>" +
              (((edgeTypeById.get(relationship.type) || edgeTypeById.get(String(relationship.type || "").toLowerCase()) || {}).label) || relationship.type) +
              "</td>" +
              "<td>" +
              badge(!!(result && result.isDeviation)) +
              (relationship.allowDeviation ? " (accepted)" : "") +
              "</td>" +
              "<td>" +
              '<button data-action="editRelationship" data-id="' +
              relationship.id +
              '">Edit</button> ' +
              '<button data-action="toggleRelationshipDeviation" data-id="' +
              relationship.id +
              '">' +
              (relationship.allowDeviation ? "Unaccept" : "Accept") +
              "</button> " +
              '<button data-action="deleteRelationship" data-id="' +
              relationship.id +
              '">Delete</button>' +
              "</td>" +
              "</tr>"
            );
          })
          .join("");
        return '<tr class="groupRow"><td colspan="6">View Group: ' + groupLabel + " (" + entry[1].length + ")</td></tr>" + rows;
      })
      .join("");

    dom.complianceSummary.innerHTML = [
      "<div><strong>Elements</strong><br>" + compliance.summary.elementCount + "</div>",
      "<div><strong>Relations</strong><br>" + compliance.summary.relationshipCount + "</div>",
      "<div><strong>Deviations</strong><br>" + (compliance.summary.elementDeviations + compliance.summary.relationshipDeviations) + "</div>",
      "<div><strong>Open issues</strong><br>" + compliance.summary.nonAcceptedIssues + "</div>"
    ].join("");

    dom.issuesTableBody.innerHTML = compliance.issues
      .map(function (issue) {
        return (
          "<tr>" +
          "<td>" +
          issue.severity +
          "</td>" +
          "<td>" +
          issue.category +
          "</td>" +
          "<td>" +
          issue.item +
          "</td>" +
          "<td>" +
          issue.reason +
          "</td>" +
          "</tr>"
        );
      })
      .join("");

    const clickableScope =
      activeDiagram && activeDiagram.type === "clickable"
        ? getClickableScope(currentState, activeDiagram)
        : null;
    const isClickableDiagramMode = !!(activeDiagram && activeDiagram.type === "clickable");
    const isAllocationDiagramMode = !!(activeDiagram && activeDiagram.type === "allocationMatrix");
    const isRoadmapDiagramMode = !!(activeDiagram && activeDiagram.type === "roadmap");
    if (!isAllocationDiagramMode && allocationMatrixSelection) {
      allocationMatrixSelection = null;
    }
    dom.diagramCanvasPane.classList.toggle("clickableDiagramMode", isClickableDiagramMode);
    dom.diagramCanvasPane.classList.toggle("allocationDiagramMode", isAllocationDiagramMode);
    dom.diagramCanvasPane.classList.toggle("roadmapDiagramMode", isRoadmapDiagramMode);
    if (dom.diagramSvg) {
      dom.diagramSvg.hidden = isAllocationDiagramMode || isRoadmapDiagramMode;
      dom.diagramSvg.style.display = (isAllocationDiagramMode || isRoadmapDiagramMode) ? "none" : "block";
    }
    if (dom.allocationMatrixPanel) {
      dom.allocationMatrixPanel.hidden = !isAllocationDiagramMode;
      dom.allocationMatrixPanel.style.display = isAllocationDiagramMode ? "grid" : "none";
    }
    if (dom.roadmapPanel) {
      dom.roadmapPanel.hidden = !isRoadmapDiagramMode;
      dom.roadmapPanel.style.display = isRoadmapDiagramMode ? "grid" : "none";
    }
    const visibleElementIds =
      activeDiagram && activeDiagram.type === "standard"
        ? new Set(activeDiagram.elementIds || [])
        : clickableScope
          ? clickableScope.visibleIds
          : null;

    const effectiveDiagramViewpointFilter = currentState.ui.viewpointFilter || "All";
    const diagramElements = applyDiagramLayoutToElements(currentState.model.elements || [], activeDiagram);
    if (isAllocationDiagramMode) {
      Array.from((dom.diagramSvg && dom.diagramSvg.querySelectorAll("g.renderGroup")) || []).forEach(function (node) {
        node.remove();
      });
      if (
        allocationMatrixSelection &&
        (
          !currentState.model.elements.some(function (entry) { return entry.id === allocationMatrixSelection.sourceId; }) ||
          !currentState.model.elements.some(function (entry) { return entry.id === allocationMatrixSelection.targetId; })
        )
      ) {
        allocationMatrixSelection = null;
      }
      renderAllocationMatrixPanel(dom.allocationMatrixPanel, {
        elements: currentState.model.elements || [],
        relationships: currentState.model.relationships || [],
        sourceView: activeDiagram ? activeDiagram.allocationSourceView : "All",
        targetView: activeDiagram ? activeDiagram.allocationTargetView : "All",
        relationshipType: activeDiagram ? activeDiagram.allocationRelationshipType : "All",
        edgeTypeById: edgeTypeById,
        relationshipResultById: relationshipResultById,
        edgeTypeOptions: edgeTypeOptions,
        effectiveBaseline: effectiveBaseline,
        activeSelection: allocationMatrixSelection
      });
    } else if (isRoadmapDiagramMode) {
      Array.from((dom.diagramSvg && dom.diagramSvg.querySelectorAll("g.renderGroup")) || []).forEach(function (node) {
        node.remove();
      });
      renderRoadmapPanel(dom.roadmapPanel, {
        elements: currentState.model.elements || [],
        rows: (activeDiagram && Array.isArray(activeDiagram.roadmapRows)) ? activeDiagram.roadmapRows : [],
        startDate: activeDiagram ? activeDiagram.roadmapStartDate : "",
        endDate: activeDiagram ? activeDiagram.roadmapEndDate : "",
        scale: activeDiagram ? activeDiagram.roadmapTimeScale : "month",
        selectedRowId: editingRoadmapRowId || ((dom.roadmapRowsList && dom.roadmapRowsList.value) || "")
      });
    } else {
      const diagramRenderResult = diagram.render({
        elements: diagramElements,
        relationships: currentState.model.relationships,
        viewpointFilter: effectiveDiagramViewpointFilter,
        lineMode: effectiveLineMode,
        colorScheme: effectiveColorScheme,
        visibleElementIds: visibleElementIds,
        diagramType: activeDiagram ? activeDiagram.type : "standard",
        clickableMetaById: clickableScope ? clickableScope.metaById : new Map(),
        edgeTypeById: edgeTypeById,
        relationshipResultById: relationshipResultById,
        nodeTypeById: nodeTypeById,
        focusElementId: activeDiagram && activeDiagram.type === "clickable" ? activeDiagram.focusElementId : null,
        selectedNodeId: currentState.ui.selectedNodeId || null,
        selectedNodeIds: Array.isArray(currentState.ui.selectedNodeIds) ? currentState.ui.selectedNodeIds : [],
        selectedEdgeId: currentState.ui.selectedEdgeId || null
      });

      const normalizedPan = applyDiagramZoom(
        dom.diagramSvg,
        (diagramRenderResult && diagramRenderResult.contentBounds) || null,
        currentState.ui.diagramZoom || 100,
        currentState.ui.diagramPanX || 0,
        currentState.ui.diagramPanY || 0
      );
      if (
        Math.abs((currentState.ui.diagramPanX || 0) - normalizedPan.panX) > 0.01 ||
        Math.abs((currentState.ui.diagramPanY || 0) - normalizedPan.panY) > 0.01
      ) {
        setUi({ diagramPanX: normalizedPan.panX, diagramPanY: normalizedPan.panY });
      }
    }

    dom.connectModeBtn.textContent = "Connect Mode: " + (diagram.connectMode ? "On" : "Off");
    // connect/clickable hints are represented by UI state (connect button, focus/depth controls)

    const selectedNode = currentState.model.elements.find(function (element) {
      return element.id === currentState.ui.selectedNodeId;
    });
    const selectedEdge = currentState.model.relationships.find(function (relationship) {
      return relationship.id === currentState.ui.selectedEdgeId;
    });
    const shouldShowDrawer =
      currentState.ui.activeTab === "diagramTab" &&
      !isAllocationDiagramMode &&
      !isRoadmapDiagramMode &&
      !!currentState.ui.selectionDrawerOpen &&
      (!!selectedNode || !!selectedEdge);
    dom.selectionDrawer.hidden = !shouldShowDrawer;
    dom.selectionDrawerBackdrop.hidden = !shouldShowDrawer;
    dom.selectionEmptyHint.hidden = !!selectedNode || !!selectedEdge;
    dom.selectedNodeEditor.hidden = !selectedNode;
    dom.selectedEdgeEditor.hidden = !selectedEdge;
    if (selectedNode) {
      if (dom.selectedNodeIdReadonly) {
        dom.selectedNodeIdReadonly.value = selectedNode.id || "";
      }
      dom.selectedNodeName.value = selectedNode.name || "";
      assignSelectValue(dom.selectedNodeType, selectedNode.type || "");
      assignSelectValue(dom.selectedNodeViewpoint, selectedNode.viewpoint || "");
      dom.selectedNodeDescription.value = selectedNode.description || "";
      dom.selectedNodeMembers.value = formatMembersField(selectedNode.members);
      dom.selectedNodeFunctions.value = formatCsvField(selectedNode.functions);
      dom.selectedNodeBgColor.value = selectedNode.bgColor || "";
      dom.selectedNodeFontColor.value = selectedNode.fontColor || "";
      if (dom.removeSelectedNodeFromDiagramBtn) {
        const canRemoveFromActiveDiagram =
          !!activeDiagram &&
          activeDiagram.type === "standard" &&
          Array.isArray(activeDiagram.elementIds) &&
          activeDiagram.elementIds.indexOf(selectedNode.id) >= 0;
        dom.removeSelectedNodeFromDiagramBtn.hidden = !(activeDiagram && activeDiagram.type === "standard");
        dom.removeSelectedNodeFromDiagramBtn.disabled = !canRemoveFromActiveDiagram;
      }
    }
    if (selectedEdge) {
      if (dom.selectedEdgeIdReadonly) {
        dom.selectedEdgeIdReadonly.value = selectedEdge.id || "";
      }
      assignSelectValue(dom.selectedEdgeType, selectedEdge.type || "");
      updateSelectedEdgeControls(currentState, effectiveBaseline, nodeTypeById, edgeTypeById, edgeTypeOptions, selectedEdge);
      dom.selectedEdgeDescription.value = selectedEdge.description || "";
    } else {
      updateSelectedEdgeControls(currentState, effectiveBaseline, nodeTypeById, edgeTypeById, edgeTypeOptions, null);
    }

    dom.tabBtns.forEach(function (button) {
      const isActive = button.dataset.tab === currentState.ui.activeTab;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-selected", String(isActive));
      button.setAttribute("tabindex", isActive ? "0" : "-1");
    });
    dom.tabPanels.forEach(function (panel) {
      const isActive = panel.id === currentState.ui.activeTab;
      panel.classList.toggle("active", isActive);
      panel.setAttribute("aria-hidden", isActive ? "false" : "true");
    });
  }

  function closeSelectionDrawer() {
    setUi({ selectionDrawerOpen: false, selectedNodeId: null, selectedNodeIds: [], selectedEdgeId: null });
  }

  function installEvents() {
    const eventBinder = new window.ArchitectureEventManager();
    const on = function (target, eventName, handler, options) {
      eventBinder.on(target, eventName, handler, options);
    };

    on(dom.sidebarToggleBtn, "click", function () {
      const current = getState();
      setUi({ sidebarCollapsed: !current.ui.sidebarCollapsed });
    });

    on(dom.toggleSidebarBaselineBtn, "click", function () {
      const current = getState();
      setUi({ sidebarBaselineCollapsed: !current.ui.sidebarBaselineCollapsed });
    });

    on(dom.toggleSidebarViewFilterBtn, "click", function () {
      const current = getState();
      setUi({ sidebarViewFilterCollapsed: !current.ui.sidebarViewFilterCollapsed });
    });

    on(dom.toggleSidebarStatsBtn, "click", function () {
      const current = getState();
      setUi({ sidebarStatsCollapsed: !current.ui.sidebarStatsCollapsed });
    });

    on(dom.toggleLeftSidebarAllBtn, "click", function () {
      const current = getState();
      const allCollapsed =
        !!current.ui.sidebarBaselineCollapsed &&
        !!current.ui.sidebarViewFilterCollapsed &&
        !!current.ui.sidebarStatsCollapsed;
      if (allCollapsed) {
        setUi({
          sidebarBaselineCollapsed: false,
          sidebarViewFilterCollapsed: false,
          sidebarStatsCollapsed: false
        });
        return;
      }
      setUi({
        sidebarBaselineCollapsed: true,
        sidebarViewFilterCollapsed: true,
        sidebarStatsCollapsed: true
      });
    });

    on(dom.sidebarResizeHandle, "pointerdown", function (event) {
      if (getState().ui.sidebarCollapsed) {
        return;
      }
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = dom.appSidebar.getBoundingClientRect().width;

      function onMove(moveEvent) {
        const delta = moveEvent.clientX - startX;
        const minContentWidth = 360;
        const maxWidth = Math.max(260, window.innerWidth - minContentWidth);
        const nextWidth = clamp(startWidth + delta, 220, maxWidth);
        dom.appLayout.style.setProperty("--sidebar-width", nextWidth + "px");
      }

      function onUp(upEvent) {
        const delta = upEvent.clientX - startX;
        const minContentWidth = 360;
        const maxWidth = Math.max(260, window.innerWidth - minContentWidth);
        const nextWidth = clamp(startWidth + delta, 220, maxWidth);
        setUi({ sidebarWidth: Math.round(nextWidth) });
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      }

      on(window, "pointermove", onMove);
      on(window, "pointerup", onUp);
    });

    on(dom.sidebarResizeHandle, "dblclick", function () {
      setUi({ sidebarWidth: null });
    });

    on(dom.dataSplitHandle, "pointerdown", function (event) {
      if (!dom.dataSplit) {
        return;
      }
      event.preventDefault();
      const startX = event.clientX;
      const splitRect = dom.dataSplit.getBoundingClientRect();
      const leftCard = dom.dataSplit.querySelector("section.card");
      const startWidth = leftCard ? leftCard.getBoundingClientRect().width : splitRect.width * 0.56;

      function onMove(moveEvent) {
        const delta = moveEvent.clientX - startX;
        const minLeft = 360;
        const minRight = 300;
        const handleWidth = 8;
        const maxLeft = Math.max(minLeft, splitRect.width - minRight - handleWidth);
        const nextWidth = clamp(startWidth + delta, minLeft, maxLeft);
        dom.dataSplit.style.setProperty("--data-left-width", nextWidth + "px");
      }

      function onUp(upEvent) {
        const delta = upEvent.clientX - startX;
        const minLeft = 360;
        const minRight = 300;
        const handleWidth = 8;
        const maxLeft = Math.max(minLeft, splitRect.width - minRight - handleWidth);
        const nextWidth = clamp(startWidth + delta, minLeft, maxLeft);
        setUi({ dataSplitLeftWidth: Math.round(nextWidth) });
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      }

      on(window, "pointermove", onMove);
      on(window, "pointerup", onUp);
    });

    on(dom.dataSplitHandle, "dblclick", function () {
      if (!dom.dataSplit) {
        return;
      }
      dom.dataSplit.style.removeProperty("--data-left-width");
      setUi({ dataSplitLeftWidth: null });
    });

    dom.tabBtns.forEach(function (button) {
      on(button, "click", function () {
        setUi({ activeTab: button.dataset.tab });
      });
    });

    on(dom.viewpointFilter, "change", function (event) {
      const rawValue = String((event.target && event.target.value) || "").trim();
      const baseline = getEffectiveBaseline(getState().baseline);
      const allowed = new Set(["All"].concat(baseline.viewpoints || []));
      const nextValue = allowed.has(rawValue) ? rawValue : "All";
      if (event.target) {
        event.target.value = nextValue;
      }
      setUi({ viewpointFilter: nextValue });
    });
    on(dom.viewpointFilter, "input", function (event) {
      const rawValue = String((event.target && event.target.value) || "").trim();
      const baseline = getEffectiveBaseline(getState().baseline);
      const allowed = new Set(["All"].concat(baseline.viewpoints || []));
      if (allowed.has(rawValue)) {
        setUi({ viewpointFilter: rawValue });
      }
    });
    on(dom.resetViewpointFilterBtn, "click", function () {
      if (dom.viewpointFilter) {
        dom.viewpointFilter.value = "All";
      }
      setUi({ viewpointFilter: "All" });
    });

    on(dom.elementViewFilter, "change", function (event) {
      const rawValue = String((event.target && event.target.value) || "").trim();
      const current = getState();
      const baseline = getEffectiveBaseline(current.baseline);
      const modelViews = dedupe(
        (current.model.elements || []).map(function (element) {
          return element.viewpoint;
        })
      );
      const hasUnassignedView = (current.model.elements || []).some(function (element) {
        return !element.viewpoint;
      });
      const allowed = new Set(
        ["All"].concat(dedupe((baseline.viewpoints || []).concat(modelViews, hasUnassignedView ? ["Unassigned View"] : [])))
      );
      const nextValue = allowed.has(rawValue) ? rawValue : "All";
      if (event.target) {
        event.target.value = nextValue;
      }
      setUi({ elementViewFilter: nextValue });
    });
    on(dom.elementViewFilter, "input", function (event) {
      const rawValue = String((event.target && event.target.value) || "").trim();
      const current = getState();
      const baseline = getEffectiveBaseline(current.baseline);
      const modelViews = dedupe(
        (current.model.elements || []).map(function (element) {
          return element.viewpoint;
        })
      );
      const hasUnassignedView = (current.model.elements || []).some(function (element) {
        return !element.viewpoint;
      });
      const allowed = new Set(
        ["All"].concat(dedupe((baseline.viewpoints || []).concat(modelViews, hasUnassignedView ? ["Unassigned View"] : [])))
      );
      if (allowed.has(rawValue)) {
        setUi({ elementViewFilter: rawValue });
      }
    });
    on(dom.elementOrphanFilter, "change", function (event) {
      const rawValue = String((event.target && event.target.value) || "").trim();
      const allowed = new Set(["all", "anyOrphan", "noLinks", "noDiagram", "noView", "strictOrphan"]);
      const nextValue = allowed.has(rawValue) ? rawValue : "all";
      if (event.target) {
        event.target.value = nextValue;
      }
      setUi({ elementOrphanFilter: nextValue });
    });
    on(dom.elementOrphanFilter, "input", function (event) {
      const rawValue = String((event.target && event.target.value) || "").trim();
      const allowed = new Set(["all", "anyOrphan", "noLinks", "noDiagram", "noView", "strictOrphan"]);
      if (allowed.has(rawValue)) {
        setUi({ elementOrphanFilter: rawValue });
      }
    });

    on(dom.relationshipViewFilter, "change", function (event) {
      const rawValue = String((event.target && event.target.value) || "").trim();
      const current = getState();
      const baseline = getEffectiveBaseline(current.baseline);
      const modelViews = dedupe(
        (current.model.elements || []).map(function (element) {
          return element.viewpoint;
        })
      );
      const hasUnassignedView = (current.model.elements || []).some(function (element) {
        return !element.viewpoint;
      });
      const allowed = new Set(
        ["All"].concat(dedupe((baseline.viewpoints || []).concat(modelViews, hasUnassignedView ? ["Unassigned"] : [])))
      );
      const nextValue = allowed.has(rawValue) ? rawValue : "All";
      if (event.target) {
        event.target.value = nextValue;
      }
      setUi({ relationshipViewFilter: nextValue });
    });
    on(dom.relationshipViewFilter, "input", function (event) {
      const rawValue = String((event.target && event.target.value) || "").trim();
      const current = getState();
      const baseline = getEffectiveBaseline(current.baseline);
      const modelViews = dedupe(
        (current.model.elements || []).map(function (element) {
          return element.viewpoint;
        })
      );
      const hasUnassignedView = (current.model.elements || []).some(function (element) {
        return !element.viewpoint;
      });
      const allowed = new Set(
        ["All"].concat(dedupe((baseline.viewpoints || []).concat(modelViews, hasUnassignedView ? ["Unassigned"] : [])))
      );
      if (allowed.has(rawValue)) {
        setUi({ relationshipViewFilter: rawValue });
      }
    });
    on(dom.relSource, "input", function () {
      render();
    });
    on(dom.relTarget, "input", function () {
      render();
    });
    on(dom.relType, "input", function () {
      render();
    });
    on(dom.relTypeFilter, "input", function () {
      render();
    });
    on(dom.selectedEdgeType, "input", function () {
      refreshSelectedEdgeTypeValidity();
    });
    on(dom.selectedEdgeType, "change", function () {
      refreshSelectedEdgeTypeValidity();
    });

    on(dom.resetColorDefaultsBtn, "click", function () {
      const current = getState();
      const baseline = clone(current.baseline || defaultState.baseline);
      const architecture = baseline.architecture || { views: [], categories: [], nodeTypes: [], edgeTypes: [] };
      const loadedCategoryColors = baseline.loadedCategoryColors || {};
      architecture.categories = (architecture.categories || []).map(function (entry) {
        const categoryId = String((entry && entry.id) || "").trim().toUpperCase();
        const loaded = loadedCategoryColors[categoryId] || {};
        const fallback = defaultCategoryColorMap[categoryId] || defaultCategoryColorMap.DEFAULT;
        return {
          ...(entry || {}),
          id: categoryId,
          bg: isValidCssColor(loaded.bg) ? String(loaded.bg).trim() : fallback.bg,
          font: isValidCssColor(loaded.font) ? String(loaded.font).trim() : fallback.font
        };
      });
      baseline.architecture = architecture;
      setBaseline(baseline);
    });

    on(dom.clearNodeColorOverridesBtn, "click", function () {
      clearNodeColorOverrides();
    });

    populateCssNamedColorDatalist();
    bindCustomSelect(dom.elementType, "Type / Stereotype");
    bindCustomSelect(dom.elementViewpoint, "Viewpoint");
    bindCustomSelect(dom.newDiagramElementType, "Element Type");
    bindCustomSelect(dom.newDiagramElementViewpoint, "Element Viewpoint");
    bindCustomSelect(dom.selectedNodeType, "Node Type");
    bindCustomSelect(dom.selectedNodeViewpoint, "Node Viewpoint");
    bindCustomSelect(dom.selectedEdgeType, "Edge Type");
    bindDatalistFallback(dom.elementType);
    bindDatalistFallback(dom.elementViewpoint);
    bindDatalistFallback(dom.viewpointFilter);
    bindDatalistFallback(dom.elementViewFilter);
    bindDatalistFallback(dom.elementOrphanFilter);
    bindDatalistFallback(dom.elementBgColor);
    bindDatalistFallback(dom.elementFontColor);
    bindDatalistFallback(dom.relationshipViewFilter);
    bindDatalistFallback(dom.relSource);
    bindDatalistFallback(dom.relTarget);
    bindDatalistFallback(dom.relTypeFilter);
    bindDatalistFallback(dom.relType);
    bindDatalistFallback(dom.selectedNodeType);
    bindDatalistFallback(dom.selectedNodeViewpoint);
    bindDatalistFallback(dom.selectedNodeBgColor);
    bindDatalistFallback(dom.selectedNodeFontColor);
    bindDatalistFallback(dom.selectedEdgeType);
    bindDatalistFallback(dom.diagramTypeSelect);
    bindDatalistFallback(dom.diagramElementPicker);
    bindDatalistFallback(dom.diagramElementList);
    bindDatalistFallback(dom.newDiagramElementType);
    bindDatalistFallback(dom.newDiagramElementViewpoint);
    bindDatalistFallback(dom.diagramFocusSelect);
    bindDatalistFallback(dom.diagramViewInput);
    bindDatalistFallback(dom.diagramRelType);
    bindDatalistFallback(dom.diagramAllocationSourceView);
    bindDatalistFallback(dom.diagramAllocationTargetView);
    bindDatalistFallback(dom.diagramAllocationRelType);
    bindDatalistFallback(dom.roadmapRowNode);
    bindDatalistFallback(dom.roadmapRowStartAttr);
    bindDatalistFallback(dom.roadmapRowEndAttr);

    on(dom.categoryLegend, "change", function (event) {
      const input = event.target;
      if (!input || !input.dataset || !input.dataset.category || !input.dataset.field) {
        return;
      }
      const category = input.dataset.category;
      const field = input.dataset.field;
      const value = String(input.value || "").trim();
      if (!isValidCssColor(value)) {
        render();
        return;
      }
      if (field === "bg" || field === "font") {
        const current = getState();
        const baseline = clone(current.baseline || defaultState.baseline);
        const architecture = baseline.architecture || { views: [], categories: [], nodeTypes: [], edgeTypes: [] };
        const categories = Array.isArray(architecture.categories) ? architecture.categories.slice() : [];
        const index = categories.findIndex(function (entry) {
          return String((entry && entry.id) || "").trim().toUpperCase() === category;
        });
        if (index < 0) {
          return;
        }
        categories[index] = {
          ...(categories[index] || {}),
          id: category,
          [field]: value
        };
        architecture.categories = categories;
        baseline.architecture = architecture;
        setBaseline(baseline);
      }
    });
    on(dom.categoryLegend, "click", function (event) {
      const button = event.target && event.target.closest
        ? event.target.closest('button[data-action="deleteOrphanCategory"]')
        : null;
      if (!button) {
        return;
      }
      const category = String((button.dataset && button.dataset.category) || "").trim().toUpperCase();
      if (!category) {
        return;
      }
      const current = getState();
      const baseline = clone(current.baseline || defaultState.baseline);
      const architecture = baseline.architecture || { views: [], categories: [], nodeTypes: [], edgeTypes: [] };
      const hasReference = (architecture.views || []).some(function (viewEntry) {
        return splitCategoryTokens(viewEntry && viewEntry.category).indexOf(category) >= 0;
      });
      if (hasReference) {
        return;
      }
      architecture.categories = (architecture.categories || []).filter(function (entry) {
        return String((entry && entry.id) || "").trim().toUpperCase() !== category;
      });
      if (baseline.loadedCategoryColors && typeof baseline.loadedCategoryColors === "object") {
        delete baseline.loadedCategoryColors[category];
      }
      baseline.architecture = architecture;
      setBaseline(baseline);
    });

    on(dom.lineModeSelect, "change", function (event) {
      const nextMode = normalizeLineMode(event.target.value);
      const current = getState();
      const activeDiagram = getActiveDiagram(current);
      if (activeDiagram) {
        upsertDiagram({
          ...activeDiagram,
          lineMode: nextMode
        });
      } else {
        event.target.value = normalizeLineMode((current.ui && current.ui.lineMode) || "straight");
      }
    });

    const applyZoomInput = function () {
      const parsed = parseZoomPercent(dom.diagramZoomSelect.value);
      if (parsed == null) {
        dom.diagramZoomSelect.value = String(getState().ui.diagramZoom || 100);
        return;
      }
      setUi({ diagramZoom: parsed });
    };
    on(dom.diagramZoomSelect, "change", applyZoomInput);
    on(dom.diagramZoomSelect, "blur", applyZoomInput);
    on(dom.resetDiagramViewBtn, "click", function () {
      setUi({ diagramZoom: 100, diagramPanX: 0, diagramPanY: 0 });
    });

    dom.toggleRightToolbarBtn.addEventListener("click", function () {
      const current = getState();
      setUi({ rightToolbarCollapsed: !current.ui.rightToolbarCollapsed });
    });

    dom.toggleRightMetaBtn.addEventListener("click", function () {
      const current = getState();
      setUi({ rightMetaCollapsed: !current.ui.rightMetaCollapsed });
    });

    dom.toggleLeftDiagramsBtn.addEventListener("click", function () {
      const current = getState();
      setUi({ leftDiagramsCollapsed: !current.ui.leftDiagramsCollapsed });
    });

    dom.toggleLeftCreateBtn.addEventListener("click", function () {
      const current = getState();
      setUi({ leftCreateCollapsed: !current.ui.leftCreateCollapsed });
    });

    dom.toggleLeftEditBtn.addEventListener("click", function () {
      const current = getState();
      setUi({ leftEditCollapsed: !current.ui.leftEditCollapsed });
    });

    dom.toggleLeftAllBtn.addEventListener("click", function () {
      const current = getState();
      const allCollapsed =
        !!current.ui.leftDiagramsCollapsed &&
        !!current.ui.leftCreateCollapsed &&
        !!current.ui.leftEditCollapsed;
      if (allCollapsed) {
        setUi({
          leftDiagramsCollapsed: false,
          leftCreateCollapsed: false,
          leftEditCollapsed: false
        });
        return;
      }
      setUi({
        leftDiagramsCollapsed: true,
        leftCreateCollapsed: true,
        leftEditCollapsed: true
      });
    });

    dom.toggleRightAllBtn.addEventListener("click", function () {
      const current = getState();
      const allCollapsed = !!current.ui.rightToolbarCollapsed && !!current.ui.rightMetaCollapsed;
      if (allCollapsed) {
        setUi({ rightToolbarCollapsed: false, rightMetaCollapsed: false });
        return;
      }
      setUi({ rightToolbarCollapsed: true, rightMetaCollapsed: true });
    });

    on(dom.elementSearchInput, "input", function (event) {
      setUi({ elementSearch: event.target.value });
    });

    on(dom.relationshipSearchInput, "input", function (event) {
      setUi({ relationshipSearch: event.target.value });
    });

    const onDrawerCloseRequest = function (event) {
      event.preventDefault();
      event.stopPropagation();
      closeSelectionDrawer();
    };

    on(dom.selectionDrawerBackdrop, "pointerdown", onDrawerCloseRequest);
    on(dom.selectionDrawerBackdrop, "click", onDrawerCloseRequest);

    on(dom.selectionDrawerCloseBtn, "pointerdown", onDrawerCloseRequest);
    on(dom.selectionDrawerCloseBtn, "click", onDrawerCloseRequest);

    on(dom.selectionDrawer, "pointerdown", function (event) {
      event.stopPropagation();
    });
    on(dom.selectionDrawer, "click", function (event) {
      event.stopPropagation();
    });

    on(document, "click", function (event) {
      const closeTarget = event.target && event.target.closest
        ? event.target.closest("#selectionDrawerCloseBtn")
        : null;
      if (!closeTarget) {
        return;
      }
      onDrawerCloseRequest(event);
    });

    on(window, "keydown", function (event) {
      if (event.key !== "Escape") {
        return;
      }
      const current = getState();
      if (!current.ui.selectionDrawerOpen) {
        return;
      }
      closeSelectionDrawer();
    });

    dom.diagramList.addEventListener("click", async function (event) {
      const target = event.target && event.target.closest
        ? event.target.closest("[data-action][data-diagram-id]")
        : null;
      if (!target || !target.dataset) {
        return;
      }
      const action = target.dataset.action;
      const diagramId = target.dataset.diagramId;
      if (!diagramId) {
        return;
      }
      if (action === "selectDiagram") {
        setUi({ activeDiagramId: diagramId, activeTab: "diagramTab" });
        return;
      }
      if (action === "deleteDiagram") {
        deleteDiagram(diagramId);
        return;
      }
      if (action === "saveDiagramSvg") {
        try {
          await exportDiagramAsSvg(diagramId);
        } catch (error) {
          console.error("Save diagram SVG failed", error);
        }
        return;
      }
      if (action === "saveDiagramPng") {
        try {
          await exportDiagramAsPng(diagramId);
        } catch (error) {
          console.error("Save diagram PNG failed", error);
        }
      }
    });

    dom.createDiagramBtn.addEventListener("click", function () {
      const name = (dom.newDiagramName.value || "").trim() || "New Diagram";
      const id = "dia_" + Math.random().toString(36).slice(2, 9);
      const diagram = {
        id: id,
        name: name,
        title: name,
        view: "",
        type: "standard",
        lineMode: normalizeLineMode((getState().ui && getState().ui.lineMode) || "straight"),
        elementIds: [],
        elementLayout: {},
        allocationSourceView: "All",
        allocationTargetView: "All",
        allocationRelationshipType: "All",
        roadmapTimeScale: "month",
        roadmapStartDate: "",
        roadmapEndDate: "",
        roadmapRows: [],
        focusElementId: getState().model.elements[0] ? getState().model.elements[0].id : null,
        depth: 1
      };
      upsertDiagram(diagram);
      setUi({ activeDiagramId: id, activeTab: "diagramTab" });
      dom.newDiagramName.value = "";
    });

    dom.deleteActiveDiagramBtn.addEventListener("click", function () {
      const current = getState();
      const activeDiagram = getActiveDiagram(current);
      if (!activeDiagram) {
        return;
      }
      deleteDiagram(activeDiagram.id);
    });

    dom.diagramTypeSelect.addEventListener("input", function (event) {
      const current = getState();
      const activeDiagram = getActiveDiagram(current);
      if (!activeDiagram) {
        return;
      }
      const nextType = normalizeDiagramType(event.target.value || "standard");
      event.target.value = nextType;
      if (nextType !== "roadmap") {
        editingRoadmapRowId = null;
      }
      upsertDiagram({
        ...activeDiagram,
        type: nextType,
        title: activeDiagram.title || activeDiagram.name || "Diagram",
        view: activeDiagram.view || "",
        allocationSourceView: activeDiagram.allocationSourceView || "All",
        allocationTargetView: activeDiagram.allocationTargetView || "All",
        allocationRelationshipType: activeDiagram.allocationRelationshipType || "All",
        roadmapTimeScale: normalizeRoadmapScale(activeDiagram.roadmapTimeScale || "month"),
        roadmapStartDate: String(activeDiagram.roadmapStartDate || "").trim(),
        roadmapEndDate: String(activeDiagram.roadmapEndDate || "").trim(),
        roadmapRows: Array.isArray(activeDiagram.roadmapRows) ? activeDiagram.roadmapRows : [],
        depth: activeDiagram.depth || 1,
        focusElementId: activeDiagram.focusElementId || (current.model.elements[0] ? current.model.elements[0].id : null)
      });
    });

    function updateActiveAllocationDiagramFilters() {
      const current = getState();
      const activeDiagram = getActiveDiagram(current);
      if (!activeDiagram || activeDiagram.type !== "allocationMatrix") {
        return;
      }
      upsertDiagram({
        ...activeDiagram,
        allocationSourceView: (dom.diagramAllocationSourceView && dom.diagramAllocationSourceView.value) || "All",
        allocationTargetView: (dom.diagramAllocationTargetView && dom.diagramAllocationTargetView.value) || "All",
        allocationRelationshipType: (dom.diagramAllocationRelType && dom.diagramAllocationRelType.value) || "All"
      });
    }

    on(dom.diagramAllocationSourceView, "input", updateActiveAllocationDiagramFilters);
    on(dom.diagramAllocationTargetView, "input", updateActiveAllocationDiagramFilters);
    on(dom.diagramAllocationRelType, "input", updateActiveAllocationDiagramFilters);

    function resetRoadmapRowEditor() {
      editingRoadmapRowId = null;
      if (dom.roadmapRowsList) {
        dom.roadmapRowsList.value = "";
      }
      if (dom.roadmapRowNode) {
        dom.roadmapRowNode.value = "";
      }
      if (dom.roadmapRowStartAttr) {
        dom.roadmapRowStartAttr.value = "";
      }
      if (dom.roadmapRowEndAttr) {
        dom.roadmapRowEndAttr.value = "";
      }
      if (dom.roadmapRowLabel) {
        dom.roadmapRowLabel.value = "";
      }
      if (dom.roadmapStartDateValue) {
        dom.roadmapStartDateValue.value = "";
      }
      if (dom.roadmapEndDateValue) {
        dom.roadmapEndDateValue.value = "";
      }
      updateRoadmapRowAttributePickers(getState().model.elements || []);
      updateRoadmapRowValidityBadges(getState().model.elements || []);
      updateRoadmapDateInputStatuses();
      render();
    }

    on(dom.roadmapRowNode, "input", function () {
      updateRoadmapRowAttributePickers(getState().model.elements || []);
      updateRoadmapRowValidityBadges(getState().model.elements || []);
    });
    on(dom.roadmapRowStartAttr, "input", function () {
      updateRoadmapRowValidityBadges(getState().model.elements || []);
    });
    on(dom.roadmapRowEndAttr, "input", function () {
      updateRoadmapRowValidityBadges(getState().model.elements || []);
    });
    on(dom.roadmapStartDateValue, "input", function () {
      updateRoadmapDateInputStatuses();
    });
    on(dom.roadmapEndDateValue, "input", function () {
      updateRoadmapDateInputStatuses();
    });
    on(dom.roadmapRowsList, "change", function () {
      const current = getState();
      const activeDiagram = getActiveDiagram(current);
      if (!activeDiagram || activeDiagram.type !== "roadmap") {
        return;
      }
      const rowId = String((dom.roadmapRowsList && dom.roadmapRowsList.value) || "").trim();
      const row = (activeDiagram.roadmapRows || []).find(function (entry) {
        return entry.id === rowId;
      });
      if (!row) {
        editingRoadmapRowId = null;
        return;
      }
      editingRoadmapRowId = row.id;
      const selectedNode = (current.model.elements || []).find(function (entry) {
        return entry.id === row.nodeId;
      });
      if (dom.roadmapRowNode) {
        dom.roadmapRowNode.value = selectedNode ? formatElementInputLabel(selectedNode) : (row.nodeId || "");
      }
      if (dom.roadmapRowStartAttr) {
        dom.roadmapRowStartAttr.value = row.startAttr || "";
      }
      if (dom.roadmapRowEndAttr) {
        dom.roadmapRowEndAttr.value = row.endAttr || "";
      }
      if (dom.roadmapRowLabel) {
        dom.roadmapRowLabel.value = row.label || "";
      }
      const selectedElementForValues = selectedNode || null;
      if (dom.roadmapStartDateValue) {
        dom.roadmapStartDateValue.value = selectedElementForValues
          ? getElementMemberValueByName(selectedElementForValues, row.startAttr || "")
          : "";
      }
      if (dom.roadmapEndDateValue) {
        dom.roadmapEndDateValue.value = selectedElementForValues
          ? getElementMemberValueByName(selectedElementForValues, row.endAttr || "")
          : "";
      }
      updateRoadmapRowAttributePickers(current.model.elements || []);
      updateRoadmapRowValidityBadges(current.model.elements || []);
      updateRoadmapDateInputStatuses();
      render();
    });
    on(dom.roadmapAddOrUpdateRowBtn, "click", function () {
      const current = getState();
      const activeDiagram = getActiveDiagram(current);
      if (!activeDiagram || activeDiagram.type !== "roadmap") {
        return;
      }
      const nodeId = resolveElementInputToId(dom.roadmapRowNode && dom.roadmapRowNode.value, current.model.elements || []);
      if (!nodeId) {
        return;
      }
      const startAttr = String((dom.roadmapRowStartAttr && dom.roadmapRowStartAttr.value) || "").trim();
      const endAttr = String((dom.roadmapRowEndAttr && dom.roadmapRowEndAttr.value) || "").trim();
      const inferredMode = startAttr && endAttr ? "range" : "milestone";
      const row = {
        id: editingRoadmapRowId || createId("rr"),
        nodeId: nodeId,
        mode: inferredMode,
        startAttr: startAttr,
        endAttr: endAttr,
        milestoneAttr: "",
        label: String((dom.roadmapRowLabel && dom.roadmapRowLabel.value) || "").trim()
      };
      if (!row.startAttr && !row.endAttr) {
        return;
      }
      const rows = Array.isArray(activeDiagram.roadmapRows) ? activeDiagram.roadmapRows.slice() : [];
      const index = rows.findIndex(function (entry) {
        return entry.id === row.id;
      });
      if (index >= 0) {
        rows[index] = row;
      } else {
        rows.push(row);
      }
      upsertDiagram({
        ...activeDiagram,
        roadmapRows: rows
      });
      editingRoadmapRowId = row.id;
    });
    on(dom.roadmapCancelEditRowBtn, "click", function () {
      resetRoadmapRowEditor();
    });
    on(dom.roadmapRemoveRowBtn, "click", function () {
      const current = getState();
      const activeDiagram = getActiveDiagram(current);
      if (!activeDiagram || activeDiagram.type !== "roadmap") {
        return;
      }
      const rowId = String((dom.roadmapRowsList && dom.roadmapRowsList.value) || "").trim();
      if (!rowId) {
        return;
      }
      upsertDiagram({
        ...activeDiagram,
        roadmapRows: (activeDiagram.roadmapRows || []).filter(function (row) {
          return row.id !== rowId;
        })
      });
      resetRoadmapRowEditor();
    });
    function upsertRoadmapNodeAttribute(attributeName, attributeValue) {
      const current = getState();
      const nodeId = resolveElementInputToId(dom.roadmapRowNode && dom.roadmapRowNode.value, current.model.elements || []);
      if (!nodeId || !attributeName || !attributeValue) {
        return;
      }
      if (parseIsoDateToUtcMs(attributeValue) == null) {
        return;
      }
      const node = (current.model.elements || []).find(function (entry) {
        return entry.id === nodeId;
      });
      if (!node) {
        return;
      }
      const nextMembers = Array.isArray(node.members)
        ? node.members.map(function (entry) { return normalizeMemberItem(entry); })
        : [];
      const index = nextMembers.findIndex(function (entry) {
        return String(entry.name || "").trim() === attributeName;
      });
      if (index >= 0) {
        nextMembers[index] = { name: attributeName, value: attributeValue };
      } else {
        nextMembers.push({ name: attributeName, value: attributeValue });
      }
      upsertElement({
        ...node,
        members: nextMembers
      });
      updateRoadmapRowAttributePickers(getState().model.elements || []);
      updateRoadmapRowValidityBadges(getState().model.elements || []);
    }
    on(dom.roadmapSetStartAttrBtn, "click", function () {
      const attributeName = String((dom.roadmapRowStartAttr && dom.roadmapRowStartAttr.value) || "").trim();
      const attributeValue = String((dom.roadmapStartDateValue && dom.roadmapStartDateValue.value) || "").trim();
      upsertRoadmapNodeAttribute(attributeName, attributeValue);
      updateRoadmapDateInputStatuses();
    });
    on(dom.roadmapSetEndAttrBtn, "click", function () {
      const attributeName = String((dom.roadmapRowEndAttr && dom.roadmapRowEndAttr.value) || "").trim();
      const attributeValue = String((dom.roadmapEndDateValue && dom.roadmapEndDateValue.value) || "").trim();
      upsertRoadmapNodeAttribute(attributeName, attributeValue);
      updateRoadmapDateInputStatuses();
    });
    on(dom.roadmapPanel, "click", function (event) {
      const target = event.target && event.target.closest ? event.target.closest("[data-action][data-row-id]") : null;
      if (!target || String(target.dataset.action || "") !== "selectRoadmapRow") {
        return;
      }
      const rowId = String(target.dataset.rowId || "").trim();
      if (!rowId) {
        return;
      }
      if (dom.roadmapRowsList) {
        dom.roadmapRowsList.value = rowId;
      }
      if (dom.roadmapRowsList) {
        dom.roadmapRowsList.dispatchEvent(new Event("change"));
      }
    });

    on(dom.allocationMatrixPanel, "click", function (event) {
      const target = event.target && event.target.closest ? event.target.closest("[data-action]") : null;
      if (!target) {
        return;
      }
      const action = String(target.dataset.action || "");
      if (action === "selectAllocationCell") {
        const sourceId = String(target.dataset.sourceId || "").trim();
        const targetId = String(target.dataset.targetId || "").trim();
        if (!sourceId || !targetId) {
          return;
        }
        allocationMatrixSelection = { sourceId: sourceId, targetId: targetId };
        render();
        return;
      }
      if (action === "deleteAllocationRelationship") {
        const relationshipId = String(target.dataset.relationshipId || "").trim();
        if (!relationshipId) {
          return;
        }
        deleteRelationship(relationshipId);
        return;
      }
      if (action === "addAllocationRelationship") {
        const current = getState();
        const activeDiagram = getActiveDiagram(current);
        if (!activeDiagram || activeDiagram.type !== "allocationMatrix" || !allocationMatrixSelection) {
          return;
        }
        const addTypeInput = document.getElementById("allocationMatrixAddType");
        const nextType = String((addTypeInput && addTypeInput.value) || "").trim();
        const baseline = getEffectiveBaseline(current.baseline);
        const fallbackType = (baseline.edgeTypes && baseline.edgeTypes[0]) || "Association";
        const sourceElement = (current.model.elements || []).find(function (entry) {
          return entry.id === allocationMatrixSelection.sourceId;
        }) || null;
        const targetElement = (current.model.elements || []).find(function (entry) {
          return entry.id === allocationMatrixSelection.targetId;
        }) || null;
        const edgeRules = ((baseline.architecture && baseline.architecture.edgeTypes) || []);
        const edgeRuleById = new Map();
        edgeRules.forEach(function (rule) {
          if (!rule || !rule.id) {
            return;
          }
          edgeRuleById.set(normalizeTypeToken(rule.id), rule);
        });
        const chosenType = nextType || fallbackType;
        const chosenRule = edgeRuleById.get(normalizeTypeToken(chosenType)) || null;
        if (!isEdgeTypeValidForNodeSelection(chosenRule, sourceElement, targetElement)) {
          return;
        }
        addRelationship({
          sourceId: allocationMatrixSelection.sourceId,
          targetId: allocationMatrixSelection.targetId,
          type: chosenType,
          description: ""
        });
      }
    });

    dom.applyDiagramMetaBtn.addEventListener("click", function () {
      const current = getState();
      const activeDiagram = getActiveDiagram(current);
      if (!activeDiagram) {
        return;
      }
      const nextName = (dom.diagramNameInput.value || "").trim() || activeDiagram.name || "Diagram";
      const nextTitle = (dom.diagramTitleInput.value || "").trim() || activeDiagram.name || "Diagram";
      const nextView = (dom.diagramViewInput.value || "").trim();
      upsertDiagram({
        ...activeDiagram,
        name: nextName,
        title: nextTitle,
        view: nextView
      });
    });

    dom.applySelectedNodeBtn.addEventListener("click", function () {
      const current = getState();
      const selectedNode = current.model.elements.find(function (element) {
        return element.id === current.ui.selectedNodeId;
      });
      if (!selectedNode) {
        return;
      }
      upsertElement({
        ...selectedNode,
        name: (dom.selectedNodeName.value || "").trim(),
        type: resolveSelectValue(dom.selectedNodeType),
        viewpoint: resolveSelectValue(dom.selectedNodeViewpoint),
        description: (dom.selectedNodeDescription.value || "").trim(),
        members: parseMembersField(dom.selectedNodeMembers.value),
        functions: parseCsvField(dom.selectedNodeFunctions.value),
        bgColor: (dom.selectedNodeBgColor.value || "").trim(),
        fontColor: (dom.selectedNodeFontColor.value || "").trim()
      });
    });

    dom.deleteSelectedNodeBtn.addEventListener("click", function () {
      const current = getState();
      if (!current.ui.selectedNodeId) {
        return;
      }
      const deleteId = current.ui.selectedNodeId;
      setUi({ selectedNodeId: null, selectedNodeIds: [], selectionDrawerOpen: false });
      deleteElement(deleteId);
    });

    if (dom.removeSelectedNodeFromDiagramBtn) {
      dom.removeSelectedNodeFromDiagramBtn.addEventListener("click", function () {
        const current = getState();
        const activeDiagram = getActiveDiagram(current);
        const selectedNodeId = current.ui.selectedNodeId;
        if (
          !selectedNodeId ||
          !activeDiagram ||
          activeDiagram.type !== "standard" ||
          !Array.isArray(activeDiagram.elementIds) ||
          activeDiagram.elementIds.indexOf(selectedNodeId) < 0
        ) {
          return;
        }
        upsertDiagram({
          ...activeDiagram,
          elementIds: activeDiagram.elementIds.filter(function (id) {
            return id !== selectedNodeId;
          }),
          elementLayout: Object.keys(activeDiagram.elementLayout || {}).reduce(function (acc, key) {
            if (key !== selectedNodeId) {
              acc[key] = activeDiagram.elementLayout[key];
            }
            return acc;
          }, {})
        });
        setUi({ selectedNodeId: null, selectedNodeIds: [], selectionDrawerOpen: false });
      });
    }

    dom.applySelectedEdgeBtn.addEventListener("click", function () {
      const current = getState();
      const selectedEdge = current.model.relationships.find(function (relationship) {
        return relationship.id === current.ui.selectedEdgeId;
      });
      if (!selectedEdge) {
        return;
      }
      upsertRelationship({
        ...selectedEdge,
        type: resolveSelectValue(dom.selectedEdgeType),
        description: (dom.selectedEdgeDescription.value || "").trim()
      });
    });

    dom.deleteSelectedEdgeBtn.addEventListener("click", function () {
      const current = getState();
      if (!current.ui.selectedEdgeId) {
        return;
      }
      const deleteId = current.ui.selectedEdgeId;
      setUi({ selectedEdgeId: null, selectionDrawerOpen: false });
      deleteRelationship(deleteId);
    });

    dom.addElementToDiagramBtn.addEventListener("click", function () {
      const current = getState();
      const activeDiagram = getActiveDiagram(current);
      if (!activeDiagram || activeDiagram.type !== "standard") {
        return;
      }
      const listedIds = Array.isArray(activeDiagram.elementIds) ? activeDiagram.elementIds : [];
      const elementId = resolveElementInputToId(dom.diagramElementPicker.value, current.model.elements);
      if (!elementId || listedIds.includes(elementId)) {
        return;
      }
      const selectedElement = (current.model.elements || []).find(function (entry) {
        return entry.id === elementId;
      });
      let nextElementLayout = { ...(activeDiagram.elementLayout || {}) };
      if (selectedElement) {
        const viewBox = getCurrentDiagramViewBox(dom.diagramSvg);
        const insertionIndex = listedIds.length;
        const positioned = {
          ...selectedElement,
          ...(getDiagramElementPosition(activeDiagram, selectedElement) || {})
        };
        if (!isElementVisibleInViewBox(positioned, viewBox)) {
          const placement = computeVisiblePlacementForNode(viewBox, getNodeMetrics(positioned), insertionIndex);
          nextElementLayout[elementId] = { x: placement.x, y: placement.y };
        } else if (!nextElementLayout[elementId]) {
          const basePosition = getDiagramElementPosition(activeDiagram, selectedElement);
          nextElementLayout[elementId] = { x: basePosition.x, y: basePosition.y };
        }
      }
      upsertDiagram({
        ...activeDiagram,
        elementIds: listedIds.concat([elementId]),
        elementLayout: nextElementLayout
      });
    });

    dom.diagramElementPicker.addEventListener("input", function () {
      const current = getState();
      const isValid = !!resolveElementInputToId(dom.diagramElementPicker.value, current.model.elements || []);
      dom.addElementToDiagramBtn.disabled = !isValid;
    });

    dom.removeElementFromDiagramBtn.addEventListener("click", function () {
      const current = getState();
      const activeDiagram = getActiveDiagram(current);
      if (!activeDiagram || activeDiagram.type !== "standard") {
        return;
      }
      const removeId = resolveElementInputToId(dom.diagramElementList.value, current.model.elements);
      if (!removeId) {
        return;
      }
      upsertDiagram({
        ...activeDiagram,
        elementIds: activeDiagram.elementIds.filter(function (id) {
          return id !== removeId;
        }),
        elementLayout: Object.keys(activeDiagram.elementLayout || {}).reduce(function (acc, key) {
          if (key !== removeId) {
            acc[key] = activeDiagram.elementLayout[key];
          }
          return acc;
        }, {})
      });
    });

    dom.diagramElementList.addEventListener("input", function () {
      const current = getState();
      const activeDiagram = getActiveDiagram(current);
      if (!activeDiagram || activeDiagram.type !== "standard") {
        return;
      }
      const diagramElements = applyDiagramLayoutToElements(current.model.elements || [], activeDiagram);
      const targetId = resolveElementInputToId(dom.diagramElementList.value, current.model.elements || []);
      if (!targetId) {
        return;
      }
      const targetElement = (diagramElements || []).find(function (entry) {
        return entry.id === targetId;
      });
      if (!targetElement) {
        return;
      }

      const viewpointFilter = current.ui.viewpointFilter || "All";
      const listedIds = new Set(Array.isArray(activeDiagram.elementIds) ? activeDiagram.elementIds : []);
      const scopedElements = (diagramElements || []).filter(function (entry) {
        if (!listedIds.has(entry.id)) {
          return false;
        }
        return viewpointFilter === "All" || (entry.viewpoint || "") === viewpointFilter;
      });
      const metricsById = new Map(
        scopedElements.map(function (entry) {
          return [entry.id, getNodeMetrics(entry)];
        })
      );
      const contentBounds = computeContentBounds(scopedElements, metricsById);
      const targetMetrics = metricsById.get(targetElement.id) || getNodeMetrics(targetElement);

      const zoom = clamp((Number(current.ui.diagramZoom) || 100) / 100, 0.1, 4);
      const visibleWidth = 1200 / zoom;
      const visibleHeight = 700 / zoom;
      const contentMinX = Number(contentBounds.minX) || 0;
      const contentMinY = Number(contentBounds.minY) || 0;
      const contentWidth = Math.max(1, Number(contentBounds.width) || 1);
      const contentHeight = Math.max(1, Number(contentBounds.height) || 1);
      const centeredX = contentMinX + (contentWidth - visibleWidth) / 2;
      const centeredY = contentMinY + (contentHeight - visibleHeight) / 2;
      const targetCenterX = (Number(targetElement.x) || 0) + targetMetrics.halfWidth;
      const targetCenterY = (Number(targetElement.y) || 0) + targetMetrics.halfHeight;
      const desiredOffsetX = targetCenterX - visibleWidth / 2;
      const desiredOffsetY = targetCenterY - visibleHeight / 2;

      setUi({
        activeTab: "diagramTab",
        selectedNodeId: targetId,
        selectedNodeIds: [targetId],
        selectedEdgeId: null,
        selectionDrawerOpen: false,
        diagramPanX: desiredOffsetX - centeredX,
        diagramPanY: desiredOffsetY - centeredY
      });
    });

    dom.diagramFindFilter.addEventListener("input", function (event) {
      setUi({ diagramFindQuery: event.target.value || "" });
    });

    dom.diagramFindList.addEventListener("change", function () {
      const selectedIds = Array.from(dom.diagramFindList.selectedOptions || [])
        .map(function (option) {
          return option.value;
        })
        .filter(Boolean);
      const current = getState();
      const fitState = fitSelectedNodesInDiagram(current, selectedIds);
      setUi({
        selectedNodeIds: selectedIds,
        selectedNodeId: selectedIds.length ? selectedIds[0] : null,
        selectedEdgeId: null,
        selectionDrawerOpen: false,
        diagramZoom: fitState ? fitState.diagramZoom : current.ui.diagramZoom,
        diagramPanX: fitState ? fitState.diagramPanX : current.ui.diagramPanX,
        diagramPanY: fitState ? fitState.diagramPanY : current.ui.diagramPanY
      });
    });

    dom.createAndAddElementBtn.addEventListener("click", function () {
      const current = getState();
      const activeDiagram = getActiveDiagram(current);
      if (!activeDiagram || activeDiagram.type !== "standard") {
        return;
      }
      const name = (dom.newDiagramElementName.value || "").trim();
      const currentBaseline = getEffectiveBaseline(current.baseline);
      const type =
        resolveSelectValue(dom.newDiagramElementType) ||
        ((currentBaseline.nodeTypes && currentBaseline.nodeTypes[0]) || "Capability");
      const viewpoint =
        resolveSelectValue(dom.newDiagramElementViewpoint) ||
        (currentBaseline.viewpoints[0] || "Custom");
      if (!name) {
        return;
      }
      const createPlacement = computeVisiblePlacementForNode(
        getCurrentDiagramViewBox(dom.diagramSvg),
        getNodeMetrics({ name: name, type: type, members: [], functions: [] }),
        Array.isArray(activeDiagram.elementIds) ? activeDiagram.elementIds.length : 0
      );
      const created = addElement({
        name: name,
        type: type,
        viewpoint: viewpoint,
        description: "Created from diagram manager",
        members: [],
        functions: [],
        x: createPlacement.x,
        y: createPlacement.y
      });
      upsertDiagram({
        ...activeDiagram,
        elementIds: activeDiagram.elementIds.concat([created.id]),
        elementLayout: {
          ...(activeDiagram.elementLayout || {}),
          [created.id]: { x: createPlacement.x, y: createPlacement.y }
        }
      });
      dom.newDiagramElementName.value = "";
    });

    dom.diagramFocusSelect.addEventListener("input", function (event) {
      const current = getState();
      const activeDiagram = getActiveDiagram(current);
      if (!activeDiagram || activeDiagram.type !== "clickable") {
        return;
      }
      const focusElementId = resolveElementInputToId(event.target.value, current.model.elements);
      upsertDiagram({
        ...activeDiagram,
        focusElementId: focusElementId || activeDiagram.focusElementId || null
      });
    });

    dom.diagramDepthInput.addEventListener("change", function (event) {
      const current = getState();
      const activeDiagram = getActiveDiagram(current);
      if (!activeDiagram || activeDiagram.type !== "clickable") {
        return;
      }
      const depth = Math.max(1, parseInt(event.target.value || "1", 10) || 1);
      upsertDiagram({
        ...activeDiagram,
        depth: depth
      });
    });

    dom.addElementForm.addEventListener("submit", function (event) {
      event.preventDefault();
      const currentBaseline = getEffectiveBaseline(getState().baseline);
      const payload = {
        name: document.getElementById("elementName").value.trim(),
        type: resolveSelectValue(dom.elementType) || ((currentBaseline.nodeTypes && currentBaseline.nodeTypes[0]) || "Capability"),
        viewpoint: resolveSelectValue(dom.elementViewpoint),
        description: document.getElementById("elementDescription").value.trim(),
        members: parseMembersField(dom.elementMembers.value),
        functions: parseCsvField(dom.elementFunctions.value),
        bgColor: dom.elementBgColor.value.trim(),
        fontColor: dom.elementFontColor.value.trim()
      };

      if (editingElementId) {
        const current = getState().model.elements.find(function (entry) {
          return entry.id === editingElementId;
        });
        if (current) {
          upsertElement({
            ...current,
            name: payload.name,
            type: payload.type,
            viewpoint: payload.viewpoint,
            description: payload.description,
            members: payload.members,
            functions: payload.functions,
            bgColor: payload.bgColor,
            fontColor: payload.fontColor
          });
        }
        resetElementEditMode();
        return;
      }

      addElement(payload);
      dom.addElementForm.reset();
    });

    dom.elementCancelEditBtn.addEventListener("click", function () {
      resetElementEditMode();
    });

    dom.addRelationshipForm.addEventListener("submit", function (event) {
      event.preventDefault();
      const currentBaseline = getEffectiveBaseline(getState().baseline);
      const elements = getState().model.elements || [];
      const sourceId = resolveElementInputToId(dom.relSource.value, elements);
      const targetId = resolveElementInputToId(dom.relTarget.value, elements);
      const payload = {
        sourceId: sourceId,
        targetId: targetId,
        type: resolveSelectValue(dom.relType) || ((currentBaseline.edgeTypes && currentBaseline.edgeTypes[0]) || "Association"),
        description: document.getElementById("relDescription").value.trim()
      };
      if (!payload.sourceId || !payload.targetId) {
        return;
      }

      if (editingRelationshipId) {
        const current = getState().model.relationships.find(function (entry) {
          return entry.id === editingRelationshipId;
        });
        if (current) {
          upsertRelationship({
            ...current,
            sourceId: payload.sourceId,
            targetId: payload.targetId,
            type: payload.type,
            description: payload.description
          });
        }
        resetRelationshipEditMode();
        return;
      }

      addRelationship(payload);
      dom.addRelationshipForm.reset();
    });

    dom.relationshipCancelEditBtn.addEventListener("click", function () {
      resetRelationshipEditMode();
    });

    on(dom.applyMetaModelChangesBtn, "click", function () {
      try {
        const currentBaseline = getEffectiveBaseline(getState().baseline);
        const metaModel = buildEditableMetaModel(getState());
        if (currentBaseline.isDefaultMetaModel) {
          metaModel.name = String(metaModel.name || "MetaModel") + " (Draft)";
          metaModel.source = "metaModel-draft";
          if (metaModel.metaModelId) {
            metaModel.metaModelId = String(metaModel.metaModelId) + "-draft";
          }
        }
        applyMetaModelAndLog(
          metaModel,
          "metamodel editor apply",
          currentBaseline.isDefaultMetaModel ? "metaModel-draft" : "metaModel-json",
          { isDefaultMetaModel: false, fileName: "" }
        );
        if (currentBaseline.isDefaultMetaModel) {
          setBaselineLoadStatus("Draft created from default MetaModel. Export as new .meta.json to persist changes.");
        }
      } catch (error) {
        console.error("MetaModel apply failed", error);
      }
    });

    on(dom.loadMetaModelBtn, "click", async function () {
      await handleMetaModelLoadButton();
    });

    on(dom.unloadMetaModelBtn, "click", function () {
      setBaseline(clone(defaultState.baseline));
      setBaselineLoadStatus("MetaModel unloaded: no metamodel active");
      resetMetaModelViewEditMode();
      resetMetaModelNodeTypeEditMode();
      resetMetaModelEdgeTypeEditMode();
    });

    on(dom.resetDefaultMetaModelBtn, "click", async function () {
      const success = await loadBundledMetaModelByFileName(defaultBundledMetaModelFileName);
      if (success && dom.settingsBaselineSelect) {
        dom.settingsBaselineSelect.value = defaultBundledMetaModelFileName;
      }
    });

    on(dom.exportMetaModelJsonBtn, "click", async function () {
      try {
        const metaModel = buildEditableMetaModel(getState());
        const safeName = String(metaModel.name || "architectureMetaModel")
          .trim()
          .replace(/[^a-zA-Z0-9._-]+/g, "_");
        const fileName = safeName + ".meta.json";
        if (isTauriRuntime()) {
          await invokeTauri("save_json_file", {
            suggestedName: fileName,
            jsonContent: JSON.stringify(metaModel, null, 2)
          });
        } else {
          downloadJson(fileName, metaModel);
        }
      } catch (error) {
        console.error("MetaModel export failed", error);
      }
    });

    on(dom.metaModelViewForm, "submit", function (event) {
      event.preventDefault();
      const nextId = String(dom.metaModelViewName.value || "").trim();
      if (!nextId) {
        return;
      }
      const payload = {
        id: nextId,
        name: nextId,
        category: String(dom.metaModelViewCategory.value || "").trim(),
        description: String(dom.metaModelViewDescription.value || "").trim()
      };
      applyMetaModelEditorMutation(function (architecture) {
        architecture.views = Array.isArray(architecture.views) ? architecture.views : [];
        const targetId = editingMetaModelViewId || payload.id;
        const index = architecture.views.findIndex(function (entry) {
          return entry.id === targetId;
        });
        if (index >= 0) {
          architecture.views[index] = payload;
        } else {
          architecture.views.push(payload);
        }
        architecture.views.sort(function (a, b) {
          return String(a.id || "").localeCompare(String(b.id || ""));
        });
      }, "metamodel editor: upsert view");
      resetMetaModelViewEditMode();
    });

    on(dom.metaModelViewCancelBtn, "click", function () {
      resetMetaModelViewEditMode();
    });

    on(dom.metaModelEditViewBtn, "click", function () {
      const selectedId = getSelectedListValue(dom.metaModelViewList);
      if (!selectedId) {
        return;
      }
      const views = (((getEffectiveBaseline(getState().baseline) || {}).architecture || {}).views) || [];
      const entry = views.find(function (view) {
        return view.id === selectedId;
      });
      if (!entry) {
        return;
      }
      editingMetaModelViewId = entry.id;
      dom.metaModelViewName.value = entry.id || "";
      dom.metaModelViewCategory.value = entry.category || "";
      dom.metaModelViewDescription.value = entry.description || "";
      dom.metaModelViewSubmitBtn.textContent = "Update View";
      dom.metaModelViewCancelBtn.hidden = false;
    });

    on(dom.metaModelDeleteViewBtn, "click", function () {
      const selectedId = getSelectedListValue(dom.metaModelViewList);
      if (!selectedId) {
        return;
      }
      applyMetaModelEditorMutation(function (architecture) {
        architecture.views = (architecture.views || []).filter(function (entry) {
          return entry.id !== selectedId;
        });
      }, "metamodel editor: delete view");
      if (editingMetaModelViewId === selectedId) {
        resetMetaModelViewEditMode();
      }
    });

    on(dom.metaModelNodeTypeForm, "submit", function (event) {
      event.preventDefault();
      const nextId = String(dom.metaModelNodeTypeId.value || "").trim();
      if (!nextId) {
        return;
      }
      const payload = {
        id: nextId,
        label: String(dom.metaModelNodeTypeLabel.value || "").trim() || nextId,
        stereotype: nextId,
        allowedViews: getMultiSelectValues(dom.metaModelNodeTypeAllowedViews),
        isAbstract: !!dom.metaModelNodeTypeAbstract.checked,
        generalizes: [],
        baseStereotypes: [],
        attributes: []
      };
      applyMetaModelEditorMutation(function (architecture) {
        architecture.nodeTypes = Array.isArray(architecture.nodeTypes) ? architecture.nodeTypes : [];
        const targetId = editingMetaModelNodeTypeId || payload.id;
        const index = architecture.nodeTypes.findIndex(function (entry) {
          return entry.id === targetId;
        });
        if (index >= 0) {
          architecture.nodeTypes[index] = {
            ...architecture.nodeTypes[index],
            ...payload
          };
        } else {
          architecture.nodeTypes.push(payload);
        }
        architecture.nodeTypes.sort(function (a, b) {
          return String(a.id || "").localeCompare(String(b.id || ""));
        });
      }, "metamodel editor: upsert node type");
      resetMetaModelNodeTypeEditMode();
    });

    on(dom.metaModelNodeTypeCancelBtn, "click", function () {
      resetMetaModelNodeTypeEditMode();
    });

    on(dom.metaModelEditNodeTypeBtn, "click", function () {
      const selectedId = getSelectedListValue(dom.metaModelNodeTypeList);
      if (!selectedId) {
        return;
      }
      const nodeTypes = (((getEffectiveBaseline(getState().baseline) || {}).architecture || {}).nodeTypes) || [];
      const entry = nodeTypes.find(function (item) {
        return item.id === selectedId;
      });
      if (!entry) {
        return;
      }
      editingMetaModelNodeTypeId = entry.id;
      dom.metaModelNodeTypeId.value = entry.id || "";
      dom.metaModelNodeTypeLabel.value = entry.label || "";
      assignMultiSelectValues(dom.metaModelNodeTypeAllowedViews, entry.allowedViews);
      dom.metaModelNodeTypeAbstract.checked = !!entry.isAbstract;
      dom.metaModelNodeTypeSubmitBtn.textContent = "Update Node Type";
      dom.metaModelNodeTypeCancelBtn.hidden = false;
    });

    on(dom.metaModelDeleteNodeTypeBtn, "click", function () {
      const selectedId = getSelectedListValue(dom.metaModelNodeTypeList);
      if (!selectedId) {
        return;
      }
      applyMetaModelEditorMutation(function (architecture) {
        architecture.nodeTypes = (architecture.nodeTypes || []).filter(function (entry) {
          return entry.id !== selectedId;
        });
      }, "metamodel editor: delete node type");
      if (editingMetaModelNodeTypeId === selectedId) {
        resetMetaModelNodeTypeEditMode();
      }
    });

    on(dom.metaModelEdgeTypeForm, "submit", function (event) {
      event.preventDefault();
      const nextId = String(dom.metaModelEdgeTypeId.value || "").trim();
      if (!nextId) {
        return;
      }
      const payload = {
        id: nextId,
        label: String(dom.metaModelEdgeTypeLabel.value || "").trim() || nextId,
        stereotype: nextId,
        direction: "directed",
        umlTypes: [],
        sourceNodeTypes: getMultiSelectValues(dom.metaModelEdgeTypeSourceTypes),
        targetNodeTypes: getMultiSelectValues(dom.metaModelEdgeTypeTargetTypes),
        allowedViews: getMultiSelectValues(dom.metaModelEdgeTypeAllowedViews),
        strokeStyle: normalizeStrokeStyle(dom.metaModelEdgeTypeStrokeStyle.value)
      };
      applyMetaModelEditorMutation(function (architecture) {
        architecture.edgeTypes = Array.isArray(architecture.edgeTypes) ? architecture.edgeTypes : [];
        const targetId = editingMetaModelEdgeTypeId || payload.id;
        const index = architecture.edgeTypes.findIndex(function (entry) {
          return entry.id === targetId;
        });
        if (index >= 0) {
          architecture.edgeTypes[index] = {
            ...architecture.edgeTypes[index],
            ...payload
          };
        } else {
          architecture.edgeTypes.push(payload);
        }
        architecture.edgeTypes.sort(function (a, b) {
          return String(a.id || "").localeCompare(String(b.id || ""));
        });
      }, "metamodel editor: upsert edge type");
      resetMetaModelEdgeTypeEditMode();
    });

    on(dom.metaModelEdgeTypeCancelBtn, "click", function () {
      resetMetaModelEdgeTypeEditMode();
    });

    on(dom.metaModelEditEdgeTypeBtn, "click", function () {
      const selectedId = getSelectedListValue(dom.metaModelEdgeTypeList);
      if (!selectedId) {
        return;
      }
      const edgeTypes = (((getEffectiveBaseline(getState().baseline) || {}).architecture || {}).edgeTypes) || [];
      const entry = edgeTypes.find(function (item) {
        return item.id === selectedId;
      });
      if (!entry) {
        return;
      }
      editingMetaModelEdgeTypeId = entry.id;
      dom.metaModelEdgeTypeId.value = entry.id || "";
      dom.metaModelEdgeTypeLabel.value = entry.label || "";
      assignMultiSelectValues(dom.metaModelEdgeTypeSourceTypes, entry.sourceNodeTypes);
      assignMultiSelectValues(dom.metaModelEdgeTypeTargetTypes, entry.targetNodeTypes);
      assignMultiSelectValues(dom.metaModelEdgeTypeAllowedViews, entry.allowedViews);
      dom.metaModelEdgeTypeStrokeStyle.value = normalizeStrokeStyle(entry.strokeStyle);
      dom.metaModelEdgeTypeSubmitBtn.textContent = "Update Edge Type";
      dom.metaModelEdgeTypeCancelBtn.hidden = false;
    });

    on(dom.metaModelDeleteEdgeTypeBtn, "click", function () {
      const selectedId = getSelectedListValue(dom.metaModelEdgeTypeList);
      if (!selectedId) {
        return;
      }
      applyMetaModelEditorMutation(function (architecture) {
        architecture.edgeTypes = (architecture.edgeTypes || []).filter(function (entry) {
          return entry.id !== selectedId;
        });
      }, "metamodel editor: delete edge type");
      if (editingMetaModelEdgeTypeId === selectedId) {
        resetMetaModelEdgeTypeEditMode();
      }
    });

    dom.elementsTableBody.addEventListener("click", function (event) {
      const button = event.target.closest("button");
      if (!button) {
        return;
      }
      const action = button.dataset.action;
      const id = button.dataset.id;
      if (action === "editElement") {
        enterElementEditMode(id);
        return;
      }
      if (action === "deleteElement") {
        if (editingElementId === id) {
          resetElementEditMode();
        }
        if (
          editingRelationshipId &&
          getState().model.relationships.some(function (relationship) {
            return relationship.id === editingRelationshipId &&
              (relationship.sourceId === id || relationship.targetId === id);
          })
        ) {
          resetRelationshipEditMode();
        }
        const current = getState();
        const selectedRelationship = current.model.relationships.find(function (relationship) {
          return relationship.id === current.ui.selectedEdgeId;
        });
        const nextUi = {};
        if (current.ui.selectedNodeId === id) {
          nextUi.selectedNodeId = null;
        }
        if (Array.isArray(current.ui.selectedNodeIds) && current.ui.selectedNodeIds.indexOf(id) >= 0) {
          nextUi.selectedNodeIds = current.ui.selectedNodeIds.filter(function (entryId) {
            return entryId !== id;
          });
        }
        if (
          selectedRelationship &&
          (selectedRelationship.sourceId === id || selectedRelationship.targetId === id)
        ) {
          nextUi.selectedEdgeId = null;
        }
        if (Object.keys(nextUi).length) {
          const nextSelectedNodeId = Object.prototype.hasOwnProperty.call(nextUi, "selectedNodeId")
            ? nextUi.selectedNodeId
            : current.ui.selectedNodeId;
          const nextSelectedNodeIds = Object.prototype.hasOwnProperty.call(nextUi, "selectedNodeIds")
            ? nextUi.selectedNodeIds
            : current.ui.selectedNodeIds;
          const nextSelectedEdgeId = Object.prototype.hasOwnProperty.call(nextUi, "selectedEdgeId")
            ? nextUi.selectedEdgeId
            : current.ui.selectedEdgeId;
          if (!nextSelectedNodeId && (!Array.isArray(nextSelectedNodeIds) || !nextSelectedNodeIds.length) && !nextSelectedEdgeId) {
            nextUi.selectionDrawerOpen = false;
          }
          setUi(nextUi);
        }
        deleteElement(id);
        return;
      }
      if (action === "toggleElementDeviation") {
        const entry = getState().model.elements.find(function (element) {
          return element.id === id;
        });
        if (!entry) {
          return;
        }
        upsertElement({ ...entry, allowDeviation: !entry.allowDeviation });
      }
    });

    dom.relationshipsTableBody.addEventListener("click", function (event) {
      const button = event.target.closest("button");
      if (!button) {
        return;
      }
      const action = button.dataset.action;
      const id = button.dataset.id;
      if (action === "editRelationship") {
        enterRelationshipEditMode(id);
        return;
      }
      if (action === "deleteRelationship") {
        if (editingRelationshipId === id) {
          resetRelationshipEditMode();
        }
        if (getState().ui.selectedEdgeId === id) {
          setUi({ selectedEdgeId: null, selectedNodeIds: [], selectionDrawerOpen: false });
        }
        deleteRelationship(id);
        return;
      }
      if (action === "toggleRelationshipDeviation") {
        const entry = getState().model.relationships.find(function (relationship) {
          return relationship.id === id;
        });
        if (!entry) {
          return;
        }
        upsertRelationship({ ...entry, allowDeviation: !entry.allowDeviation });
      }
    });

    on(dom.openSettingsBtn, "click", function () {
      if (!dom.settingsDialog) {
        return;
      }
      const current = getState();
      const nextDefault = String((current.ui && current.ui.defaultBaselineFile) || "").trim();
      if (dom.settingsBaselineSelect && nextDefault) {
        dom.settingsBaselineSelect.value = nextDefault;
      }
      if (dom.settingsThemeSelect) {
        dom.settingsThemeSelect.value = (current.ui && current.ui.theme) || "dark";
      }
      if (dom.settingsLineModeSelect) {
        dom.settingsLineModeSelect.value = normalizeLineMode((current.ui && current.ui.lineMode) || "straight");
      }
      dom.settingsDialog.showModal();
    });

    on(dom.closeSettingsBtn, "click", function () {
      if (dom.settingsDialog) {
        dom.settingsDialog.close();
      }
    });

    on(dom.applySettingsBtn, "click", async function () {
      if (!dom.settingsBaselineSelect) {
        return;
      }
      const nextTheme = dom.settingsThemeSelect ? String(dom.settingsThemeSelect.value || "dark") : "dark";
      const nextFallbackLineMode = dom.settingsLineModeSelect
        ? normalizeLineMode(dom.settingsLineModeSelect.value)
        : normalizeLineMode((getState().ui && getState().ui.lineMode) || "straight");
      const selected = String(dom.settingsBaselineSelect.value || "").trim();
      if (!selected) {
        setUi({ theme: nextTheme, lineMode: nextFallbackLineMode });
        if (dom.settingsDialog) {
          dom.settingsDialog.close();
        }
        return;
      }
      const success = await loadBundledMetaModelByFileName(selected);
      if (!success) {
        console.error("Unable to load bundled metamodel file:", selected);
        return;
      }
      setUi({ defaultBaselineFile: selected, theme: nextTheme, lineMode: nextFallbackLineMode });
      if (dom.settingsDialog) {
        dom.settingsDialog.close();
      }
    });

    dom.addNodeAtCenterBtn.addEventListener("click", function () {
      const currentState = getState();
      const activeDiagram = getActiveDiagram(currentState);
      const baseline = getEffectiveBaseline(currentState.baseline);
      const viewpoint =
        currentState.ui.viewpointFilter === "All"
          ? baseline.viewpoints[0] || "Custom"
          : currentState.ui.viewpointFilter;
      const placement = computeVisiblePlacementForNode(
        getCurrentDiagramViewBox(dom.diagramSvg),
        getNodeMetrics({ name: "New Element", type: (baseline.nodeTypes && baseline.nodeTypes[0]) || "Capability", members: [], functions: [] }),
        activeDiagram && Array.isArray(activeDiagram.elementIds) ? activeDiagram.elementIds.length : 0
      );
      const created = addElement({
        name: "New Element " + (currentState.model.elements.length + 1),
        type: (baseline.nodeTypes && baseline.nodeTypes[0]) || "Capability",
        viewpoint: viewpoint,
        description: "Created from diagram",
        x: placement.x,
        y: placement.y
      });
      if (activeDiagram && activeDiagram.type === "standard" && !activeDiagram.elementIds.includes(created.id)) {
        upsertDiagram({
          ...activeDiagram,
          elementIds: activeDiagram.elementIds.concat([created.id]),
          elementLayout: {
            ...(activeDiagram.elementLayout || {}),
            [created.id]: { x: placement.x, y: placement.y }
          }
        });
      }
    });

    dom.connectModeBtn.addEventListener("click", function () {
      diagram.setConnectMode(!diagram.connectMode);
      render();
    });

    dom.resetOrthoLayoutBtn.addEventListener("click", function () {
      const currentState = getState();
      const activeDiagram = getActiveDiagram(currentState);
      if (!activeDiagram) {
        return;
      }
      const effectiveLineMode = normalizeLineMode(
        (activeDiagram && activeDiagram.lineMode) || (currentState.ui && currentState.ui.lineMode) || "straight"
      );
      const changed = resetDiagramLayoutToDefault(currentState, activeDiagram);
      if (!changed) {
        return;
      }
      console.info("Layout reset to default for", effectiveLineMode, "mode", "(" + changed + " connector(s))");
    });

    on(window, "beforeunload", function () {
      if (typeof tauriMenuUnlisten === "function") {
        tauriMenuUnlisten();
        tauriMenuUnlisten = null;
      }
      eventBinder.destroy();
    });
  }

  async function bootstrap() {
    const bundledMetaModelFiles = await loadBundledMetaModelList();
    setBundledMetaModelOptions(bundledMetaModelFiles);
    const currentState = getState();
    const defaultFile = getPreferredBaselineFileName(currentState, bundledMetaModelFiles);
    if (dom.settingsBaselineSelect) {
      dom.settingsBaselineSelect.value = defaultFile;
    }
    await loadBundledMetaModelByFileName(defaultFile);
    if ((currentState.ui && currentState.ui.defaultBaselineFile) !== defaultFile) {
      setUi({ defaultBaselineFile: defaultFile });
    }
    await setupTauriMenuBridge();
    installEvents();
    subscribe(render);
    render();
  }

  bootstrap();
})();
