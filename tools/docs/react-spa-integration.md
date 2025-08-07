# 🎼 MusicalConductor React SPA Integration Guide

A comprehensive guide for integrating MusicalConductor into React single-page applications with plugin-based UI workflows.

## 🚀 Overview

This guide demonstrates how to use MusicalConductor to orchestrate complex UI workflows in a React SPA with the following components:

- **App Shell** - Main application container with theme management
- **Element Library** - Component library with draggable elements
- **Control Panel** - Dynamic property editor for selected components
- **Canvas** - Drop zone for components with positioning and layout
- **Canvas Element** - Dynamic components loaded from JSON definitions
- **Drag Preview** - Visual feedback during drag operations

## 🏗️ Application Architecture

```
React SPA
├── AppShell (Theme management)
├── ElementLibrary (Component catalog)
├── ControlPanel (Property editor)
├── Canvas (Layout container)
├── CanvasElement (Dynamic components)
└── DragPreview (Drag feedback)

MusicalConductor Plugins
├── AppShell.theme-symphony
├── ElementLibrary.load-components-symphony
├── Component.drag-symphony
├── ElementLibrary.component-drag-symphony
├── Canvas.drop-symphony
├── Canvas.move-symphony
├── Canvas.resize-symphony
├── Canvas.delete-symphony
└── Canvas.select-symphony
```

## 🎯 Plugin Naming Convention

Plugins follow the pattern: `[domain].[action]-symphony`

- `AppShell.theme-symphony` - Theme switching workflow
- `ElementLibrary.load-components-symphony` - Component loading workflow
- `Component.drag-symphony` - Generic component drag workflow
- `ElementLibrary.component-drag-symphony` - Library-specific drag workflow
- `Canvas.drop-symphony` - Canvas drop handling workflow
- `Canvas.move-symphony` - Canvas element repositioning workflow
- `Canvas.resize-symphony` - Canvas element resizing workflow
- `Canvas.delete-symphony` - Canvas element deletion workflow
- `Canvas.select-symphony` - Canvas element selection workflow

## 🔧 Setup and Initialization

### 1. Initialize MusicalConductor

```typescript
// src/services/ConductorService.ts
import { MusicalConductor } from "../modules/communication/sequences/MusicalConductor";
import { EventBus } from "../modules/communication/EventBus";

export class ConductorService {
  private static instance: ConductorService;
  private conductor: MusicalConductor;
  private eventBus: EventBus;

  private constructor() {
    this.eventBus = new EventBus();
    this.conductor = MusicalConductor.getInstance(this.eventBus);
  }

  public static getInstance(): ConductorService {
    if (!ConductorService.instance) {
      ConductorService.instance = new ConductorService();
    }
    return ConductorService.instance;
  }

  public getConductor(): MusicalConductor {
    return this.conductor;
  }

  public getEventBus(): EventBus {
    return this.eventBus;
  }

  // Initialize all UI workflow plugins
  public async initializePlugins(): Promise<void> {
    await this.conductor.registerCIAPlugins();
    console.log("🎼 All UI workflow plugins loaded");
  }
}
```

### 2. React App Integration

```typescript
// src/App.tsx
import React, { useEffect, useState } from "react";
import { ConductorService } from "./services/ConductorService";
import { AppShell } from "./components/AppShell";
import { ElementLibrary } from "./components/ElementLibrary";
import { ControlPanel } from "./components/ControlPanel";
import { Canvas } from "./components/Canvas";
import { DragPreview } from "./components/DragPreview";

export const App: React.FC = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedElement, setSelectedElement] = useState(null);
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const initializeConductor = async () => {
      const conductorService = ConductorService.getInstance();
      await conductorService.initializePlugins();
      setIsInitialized(true);
    };

    initializeConductor();
  }, []);

  if (!isInitialized) {
    return <div>Loading MusicalConductor...</div>;
  }

  return (
    <AppShell theme={theme} onThemeChange={setTheme}>
      <div className="app-layout">
        <ElementLibrary />
        <Canvas
          selectedElement={selectedElement}
          onElementSelect={setSelectedElement}
        />
        <ControlPanel selectedElement={selectedElement} />
      </div>
      <DragPreview />
    </AppShell>
  );
};
```

## 🎨 Component Examples

### AppShell with Theme Management

```typescript
// src/components/AppShell.tsx
import React, { useEffect } from "react";
import { ConductorService } from "../services/ConductorService";

interface AppShellProps {
  theme: string;
  onThemeChange: (theme: string) => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  theme,
  onThemeChange,
  children,
}) => {
  const conductor = ConductorService.getInstance().getConductor();

  useEffect(() => {
    // Subscribe to theme change events
    const unsubscribe = conductor.subscribe("theme-changed", (event) => {
      onThemeChange(event.theme);
    });

    return unsubscribe;
  }, [conductor, onThemeChange]);

  const handleThemeToggle = () => {
    // Execute theme change symphony
    conductor.play("AppShell", "theme-symphony", {
      currentTheme: theme,
      targetTheme: theme === "light" ? "dark" : "light",
    });
  };

  return (
    <div className={`app-shell theme-${theme}`}>
      <header className="app-header">
        <h1>React SPA with MusicalConductor</h1>
        <button onClick={handleThemeToggle}>
          Switch to {theme === "light" ? "Dark" : "Light"} Theme
        </button>
      </header>
      <main className="app-content">{children}</main>
    </div>
  );
};
```

### Element Library with Component Loading

```typescript
// src/components/ElementLibrary.tsx
import React, { useEffect, useState } from "react";
import { ConductorService } from "../services/ConductorService";

interface ComponentDefinition {
  id: string;
  name: string;
  type: string;
  icon: string;
  properties: Record<string, any>;
}

export const ElementLibrary: React.FC = () => {
  const [components, setComponents] = useState<ComponentDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const conductor = ConductorService.getInstance().getConductor();

  useEffect(() => {
    // Load components on mount
    loadComponents();

    // Subscribe to component library updates
    const unsubscribe = conductor.subscribe("components-loaded", (event) => {
      setComponents(event.components);
      setIsLoading(false);
    });

    return unsubscribe;
  }, [conductor]);

  const loadComponents = () => {
    // Execute component loading symphony
    conductor.play("ElementLibrary", "load-components-symphony", {
      source: "component-definitions.json",
      category: "ui-components",
    });
  };

  const handleDragStart = (
    component: ComponentDefinition,
    event: React.DragEvent
  ) => {
    // Execute drag start symphony
    conductor.play("ElementLibrary", "component-drag-symphony", {
      component,
      dragEvent: event,
      source: "library",
    });
  };

  if (isLoading) {
    return <div className="element-library loading">Loading components...</div>;
  }

  return (
    <div className="element-library">
      <h3>Component Library</h3>
      <div className="component-grid">
        {components.map((component) => (
          <div
            key={component.id}
            className="component-item"
            draggable
            onDragStart={(e) => handleDragStart(component, e)}
          >
            <div className="component-icon">{component.icon}</div>
            <div className="component-name">{component.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### Canvas with Drop, Move, Resize, Delete, and Select

```typescript
// src/components/Canvas.tsx
import React, { useEffect, useState, useRef } from "react";
import { ConductorService } from "../services/ConductorService";
import { CanvasElement } from "./CanvasElement";

interface CanvasProps {
  selectedElement: any;
  onElementSelect: (element: any) => void;
}

interface CanvasElementData {
  id: string;
  type: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  properties: Record<string, any>;
}

export const Canvas: React.FC<CanvasProps> = ({
  selectedElement,
  onElementSelect,
}) => {
  const [elements, setElements] = useState<CanvasElementData[]>([]);
  const canvasRef = useRef<HTMLDivElement>(null);
  const conductor = ConductorService.getInstance().getConductor();

  useEffect(() => {
    // Subscribe to canvas events
    const unsubscribeElementAdded = conductor.subscribe(
      "element-added",
      (event) => {
        setElements((prev) => [...prev, event.element]);
      }
    );

    const unsubscribeElementMoved = conductor.subscribe(
      "element-moved",
      (event) => {
        setElements((prev) =>
          prev.map((el) =>
            el.id === event.elementId
              ? { ...el, position: event.newPosition }
              : el
          )
        );
      }
    );

    const unsubscribeElementResized = conductor.subscribe(
      "element-resized",
      (event) => {
        setElements((prev) =>
          prev.map((el) =>
            el.id === event.elementId ? { ...el, size: event.newSize } : el
          )
        );
      }
    );

    const unsubscribeElementDeleted = conductor.subscribe(
      "element-deleted",
      (event) => {
        setElements((prev) => prev.filter((el) => el.id !== event.elementId));
        if (selectedElement?.id === event.elementId) {
          onElementSelect(null);
        }
      }
    );

    return () => {
      unsubscribeElementAdded();
      unsubscribeElementMoved();
      unsubscribeElementResized();
      unsubscribeElementDeleted();
    };
  }, [conductor, selectedElement, onElementSelect]);

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const dropPosition = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    // Execute drop symphony
    conductor.play("Canvas", "drop-symphony", {
      dropPosition,
      dragEvent: event,
      canvasRect: rect,
    });
  };

  const handleElementSelect = (element: CanvasElementData) => {
    onElementSelect(element);

    // Execute select symphony
    conductor.play("Canvas", "select-symphony", {
      element,
      previousSelection: selectedElement,
    });
  };

  const handleElementMove = (
    elementId: string,
    newPosition: { x: number; y: number }
  ) => {
    // Execute move symphony
    conductor.play("Canvas", "move-symphony", {
      elementId,
      newPosition,
      oldPosition: elements.find((el) => el.id === elementId)?.position,
    });
  };

  const handleElementResize = (
    elementId: string,
    newSize: { width: number; height: number }
  ) => {
    // Execute resize symphony
    conductor.play("Canvas", "resize-symphony", {
      elementId,
      newSize,
      oldSize: elements.find((el) => el.id === elementId)?.size,
    });
  };

  const handleElementDelete = (elementId: string) => {
    // Execute delete symphony
    conductor.play("Canvas", "delete-symphony", {
      elementId,
      element: elements.find((el) => el.id === elementId),
    });
  };

  return (
    <div
      ref={canvasRef}
      className="canvas"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <h3>Canvas</h3>
      <div className="canvas-content">
        {elements.map((element) => (
          <CanvasElement
            key={element.id}
            element={element}
            isSelected={selectedElement?.id === element.id}
            onSelect={() => handleElementSelect(element)}
            onMove={(newPosition) => handleElementMove(element.id, newPosition)}
            onResize={(newSize) => handleElementResize(element.id, newSize)}
            onDelete={() => handleElementDelete(element.id)}
          />
        ))}
      </div>
    </div>
  );
};
```

### Canvas Element with Dynamic Component Loading

```typescript
// src/components/CanvasElement.tsx
import React, { useState, useRef, useEffect } from "react";

interface CanvasElementProps {
  element: {
    id: string;
    type: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
    properties: Record<string, any>;
  };
  isSelected: boolean;
  onSelect: () => void;
  onMove: (position: { x: number; y: number }) => void;
  onResize: (size: { width: number; height: number }) => void;
  onDelete: () => void;
}

export const CanvasElement: React.FC<CanvasElementProps> = ({
  element,
  isSelected,
  onSelect,
  onMove,
  onResize,
  onDelete,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const elementRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (event: React.MouseEvent) => {
    if (event.target === elementRef.current) {
      setIsDragging(true);
      setDragStart({
        x: event.clientX - element.position.x,
        y: event.clientY - element.position.y,
      });
      onSelect();
    }
  };

  const handleMouseMove = (event: MouseEvent) => {
    if (isDragging) {
      const newPosition = {
        x: event.clientX - dragStart.x,
        y: event.clientY - dragStart.y,
      };
      onMove(newPosition);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragStart]);

  const handleResizeStart = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsResizing(true);
    onSelect();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Delete" && isSelected) {
      onDelete();
    }
  };

  // Render dynamic component based on type
  const renderComponent = () => {
    switch (element.type) {
      case "button":
        return (
          <button style={element.properties.style}>
            {element.properties.text || "Button"}
          </button>
        );
      case "text":
        return (
          <div style={element.properties.style}>
            {element.properties.content || "Text Element"}
          </div>
        );
      case "image":
        return (
          <img
            src={element.properties.src}
            alt={element.properties.alt}
            style={element.properties.style}
          />
        );
      default:
        return <div>Unknown Component</div>;
    }
  };

  return (
    <div
      ref={elementRef}
      className={`canvas-element ${isSelected ? "selected" : ""}`}
      style={{
        position: "absolute",
        left: element.position.x,
        top: element.position.y,
        width: element.size.width,
        height: element.size.height,
        cursor: isDragging ? "grabbing" : "grab",
      }}
      onMouseDown={handleMouseDown}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {renderComponent()}

      {isSelected && (
        <>
          {/* Selection handles */}
          <div className="selection-handles">
            <div className="handle top-left" />
            <div className="handle top-right" />
            <div className="handle bottom-left" />
            <div
              className="handle bottom-right"
              onMouseDown={handleResizeStart}
            />
          </div>

          {/* Delete button */}
          <button className="delete-button" onClick={onDelete}>
            ×
          </button>
        </>
      )}
    </div>
  );
};
```

### Control Panel and Drag Preview

```typescript
// src/components/ControlPanel.tsx
import React, { useEffect, useState } from "react";
import { ConductorService } from "../services/ConductorService";

interface ControlPanelProps {
  selectedElement: any;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  selectedElement,
}) => {
  const [properties, setProperties] = useState<Record<string, any>>({});
  const conductor = ConductorService.getInstance().getConductor();

  useEffect(() => {
    if (selectedElement) {
      setProperties(selectedElement.properties || {});
    } else {
      setProperties({});
    }
  }, [selectedElement]);

  const handlePropertyChange = (key: string, value: any) => {
    const newProperties = { ...properties, [key]: value };
    setProperties(newProperties);

    // Execute property update symphony
    conductor.play("ControlPanel", "property-update-symphony", {
      elementId: selectedElement.id,
      property: key,
      value,
      oldValue: properties[key],
    });
  };

  if (!selectedElement) {
    return (
      <div className="control-panel">
        <h3>Properties</h3>
        <p>Select an element to edit properties</p>
      </div>
    );
  }

  return (
    <div className="control-panel">
      <h3>Properties - {selectedElement.type}</h3>
      <div className="property-editor">
        {Object.entries(properties).map(([key, value]) => (
          <div key={key} className="property-field">
            <label>{key}:</label>
            <input
              type="text"
              value={value}
              onChange={(e) => handlePropertyChange(key, e.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

// src/components/DragPreview.tsx
import React, { useEffect, useState } from "react";
import { ConductorService } from "../services/ConductorService";

export const DragPreview: React.FC = () => {
  const [dragData, setDragData] = useState<any>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const conductor = ConductorService.getInstance().getConductor();

  useEffect(() => {
    const unsubscribeDragStart = conductor.subscribe(
      "drag-started",
      (event) => {
        setDragData(event.component);
      }
    );

    const unsubscribeDragMove = conductor.subscribe("drag-moved", (event) => {
      setPosition({ x: event.x, y: event.y });
    });

    const unsubscribeDragEnd = conductor.subscribe("drag-ended", () => {
      setDragData(null);
    });

    return () => {
      unsubscribeDragStart();
      unsubscribeDragMove();
      unsubscribeDragEnd();
    };
  }, [conductor]);

  if (!dragData) return null;

  return (
    <div
      className="drag-preview"
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
        pointerEvents: "none",
        zIndex: 1000,
      }}
    >
      <div className="preview-content">
        {dragData.icon} {dragData.name}
      </div>
    </div>
  );
};
```

## 🔌 Plugin Examples

### AppShell.theme-symphony Plugin

```typescript
// plugins/AppShell.theme-symphony.ts
import {
  MusicalSequence,
  SEQUENCE_CATEGORIES,
  MUSICAL_DYNAMICS,
  MUSICAL_TIMING,
} from "../modules/communication/sequences/SequenceTypes";

export const sequence: MusicalSequence = {
  name: "AppShell.theme-symphony",
  description: "Orchestrates theme switching with smooth transitions",
  key: "C Major",
  tempo: 120,
  category: SEQUENCE_CATEGORIES.COMPONENT_UI,
  movements: [
    {
      name: "theme-transition",
      description: "Handle theme switching workflow",
      beats: [
        {
          beat: 1,
          event: "theme-validate",
          title: "Validate Theme",
          description: "Validate the target theme",
          dynamics: MUSICAL_DYNAMICS.FORTE,
          timing: MUSICAL_TIMING.IMMEDIATE,
          data: {},
          errorHandling: "stop",
        },
        {
          beat: 2,
          event: "theme-apply",
          title: "Apply Theme",
          description: "Apply the new theme to the application",
          dynamics: MUSICAL_DYNAMICS.FORTE,
          timing: MUSICAL_TIMING.AFTER_BEAT,
          data: {},
          errorHandling: "continue",
        },
        {
          beat: 3,
          event: "theme-persist",
          title: "Persist Theme",
          description: "Save theme preference to localStorage",
          dynamics: MUSICAL_DYNAMICS.MEZZO_FORTE,
          timing: MUSICAL_TIMING.AFTER_BEAT,
          data: {},
          errorHandling: "continue",
        },
      ],
    },
  ],
};

export const handlers = {
  "theme-validate": (data: any, context: any) => {
    const { targetTheme } = context;
    const validThemes = ["light", "dark", "auto"];

    if (!validThemes.includes(targetTheme)) {
      throw new Error(`Invalid theme: ${targetTheme}`);
    }

    console.log(`🎨 Theme validation passed: ${targetTheme}`);
    return { validated: true, theme: targetTheme };
  },

  "theme-apply": (data: any, context: any) => {
    const { targetTheme } = context;

    // Apply theme to document root
    document.documentElement.setAttribute("data-theme", targetTheme);
    document.body.className = `theme-${targetTheme}`;

    // Emit theme changed event
    context.eventBus.emit("theme-changed", { theme: targetTheme });

    console.log(`🎨 Theme applied: ${targetTheme}`);
    return { applied: true, theme: targetTheme };
  },

  "theme-persist": (data: any, context: any) => {
    const { targetTheme } = context;

    try {
      localStorage.setItem("app-theme", targetTheme);
      console.log(`🎨 Theme persisted: ${targetTheme}`);
      return { persisted: true };
    } catch (error) {
      console.warn("Failed to persist theme:", error);
      return { persisted: false, error: error.message };
    }
  },
};
```

### ElementLibrary.load-components-symphony Plugin

```typescript
// plugins/ElementLibrary.load-components-symphony.ts
export const sequence: MusicalSequence = {
  name: "ElementLibrary.load-components-symphony",
  description: "Loads component definitions from JSON files",
  key: "D Major",
  tempo: 140,
  category: SEQUENCE_CATEGORIES.DATA_PROCESSING,
  movements: [
    {
      name: "component-loading",
      description: "Load and validate component definitions",
      beats: [
        {
          beat: 1,
          event: "fetch-definitions",
          title: "Fetch Component Definitions",
          description: "Load component definitions from JSON",
          dynamics: MUSICAL_DYNAMICS.FORTE,
          timing: MUSICAL_TIMING.IMMEDIATE,
          data: {},
          errorHandling: "stop",
        },
        {
          beat: 2,
          event: "validate-components",
          title: "Validate Components",
          description: "Validate component structure and properties",
          dynamics: MUSICAL_DYNAMICS.MEZZO_FORTE,
          timing: MUSICAL_TIMING.AFTER_BEAT,
          data: {},
          errorHandling: "continue",
        },
        {
          beat: 3,
          event: "emit-loaded",
          title: "Emit Loaded Event",
          description: "Notify components are ready",
          dynamics: MUSICAL_DYNAMICS.FORTE,
          timing: MUSICAL_TIMING.AFTER_BEAT,
          data: {},
          errorHandling: "continue",
        },
      ],
    },
  ],
};

export const handlers = {
  "fetch-definitions": async (data: any, context: any) => {
    const { source } = context;

    try {
      const response = await fetch(`/api/components/${source}`);
      const components = await response.json();

      console.log(`📚 Loaded ${components.length} component definitions`);
      return { components, loaded: true };
    } catch (error) {
      console.error("Failed to load components:", error);
      throw error;
    }
  },

  "validate-components": (data: any, context: any) => {
    const { components } = context.payload;
    const requiredFields = ["id", "name", "type", "icon"];

    const validComponents = components.filter((component: any) => {
      return requiredFields.every((field) => component[field]);
    });

    console.log(
      `✅ Validated ${validComponents.length}/${components.length} components`
    );
    return { validComponents, validationPassed: true };
  },

  "emit-loaded": (data: any, context: any) => {
    const { validComponents } = context.payload;

    // Emit components loaded event
    context.eventBus.emit("components-loaded", {
      components: validComponents,
      timestamp: new Date().toISOString(),
    });

    console.log(`📚 Components loaded and emitted: ${validComponents.length}`);
    return { emitted: true, count: validComponents.length };
  },
};
```

### Canvas.drop-symphony Plugin

```typescript
// plugins/Canvas.drop-symphony.ts
export const sequence: MusicalSequence = {
  name: "Canvas.drop-symphony",
  description: "Handles component drops onto canvas with positioning",
  key: "E Major",
  tempo: 160,
  category: SEQUENCE_CATEGORIES.COMPONENT_UI,
  movements: [
    {
      name: "drop-handling",
      description: "Process component drop and create canvas element",
      beats: [
        {
          beat: 1,
          event: "validate-drop",
          title: "Validate Drop",
          description: "Validate drop position and component data",
          dynamics: MUSICAL_DYNAMICS.FORTE,
          timing: MUSICAL_TIMING.IMMEDIATE,
          data: {},
          errorHandling: "stop",
        },
        {
          beat: 2,
          event: "create-element",
          title: "Create Canvas Element",
          description: "Create new canvas element from component",
          dynamics: MUSICAL_DYNAMICS.FORTE,
          timing: MUSICAL_TIMING.AFTER_BEAT,
          data: {},
          errorHandling: "stop",
        },
        {
          beat: 3,
          event: "emit-added",
          title: "Emit Element Added",
          description: "Notify that element was added to canvas",
          dynamics: MUSICAL_DYNAMICS.MEZZO_FORTE,
          timing: MUSICAL_TIMING.AFTER_BEAT,
          data: {},
          errorHandling: "continue",
        },
      ],
    },
  ],
};

export const handlers = {
  "validate-drop": (data: any, context: any) => {
    const { dropPosition, canvasRect } = context;

    // Validate drop position is within canvas bounds
    if (
      dropPosition.x < 0 ||
      dropPosition.y < 0 ||
      dropPosition.x > canvasRect.width ||
      dropPosition.y > canvasRect.height
    ) {
      throw new Error("Drop position is outside canvas bounds");
    }

    console.log(
      `📍 Drop validated at position: ${dropPosition.x}, ${dropPosition.y}`
    );
    return { validated: true, position: dropPosition };
  },

  "create-element": (data: any, context: any) => {
    const { dropPosition, dragEvent } = context;

    // Get component data from drag event
    const componentData = JSON.parse(
      dragEvent.dataTransfer.getData("application/json")
    );

    const newElement = {
      id: `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: componentData.type,
      position: dropPosition,
      size: { width: 100, height: 50 }, // Default size
      properties: { ...componentData.properties },
    };

    console.log(`🎯 Created canvas element: ${newElement.id}`);
    return { element: newElement, created: true };
  },

  "emit-added": (data: any, context: any) => {
    const { element } = context.payload;

    // Emit element added event
    context.eventBus.emit("element-added", {
      element,
      timestamp: new Date().toISOString(),
    });

    console.log(`✨ Element added to canvas: ${element.id}`);
    return { emitted: true, elementId: element.id };
  },
};
```

## 🎼 Usage Patterns

### Event-Driven Workflows

```typescript
// Subscribe to multiple related events
const conductor = ConductorService.getInstance().getConductor();

// Theme workflow
conductor.subscribe("theme-*", (event) => {
  console.log("Theme event:", event.type, event);
});

// Canvas workflow
conductor.subscribe("element-*", (event) => {
  console.log("Canvas event:", event.type, event);

  // Update UI state based on canvas changes
  if (event.type === "element-added") {
    updateCanvasState(event.element);
  }
});
```

### Chained Workflows

```typescript
// Execute multiple symphonies in sequence
const executeComplexWorkflow = async () => {
  // Load components first
  await conductor.play("ElementLibrary", "load-components-symphony", {
    source: "ui-components.json",
  });

  // Then apply theme
  conductor.play(
    "AppShell",
    "theme-symphony",
    {
      targetTheme: "dark",
    },
    "CHAINED"
  ); // Execute after previous completes
};
```

## 🚀 Getting Started

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Create Plugin Directory**

   ```bash
   mkdir -p plugins
   ```

3. **Add Plugin Files**

   - Copy the plugin examples above into the `plugins/` directory
   - Each plugin should export `sequence` and `handlers`

4. **Initialize in Your App**

   ```typescript
   const conductorService = ConductorService.getInstance();
   await conductorService.initializePlugins();
   ```

5. **Start Building**
   - Use the component examples as starting points
   - Create custom plugins for your specific workflows
   - Subscribe to events to keep UI in sync

## 📚 Additional Resources

- [MusicalConductor API Reference](../README.md)
- [Plugin Development Guide](./plugin-development.md)
- [Event System Documentation](./events.md)

---

**Happy Orchestrating!** 🎼✨
