import { useState } from "react";
import { SHAPES, ShapeType, supportsHollow } from "../core/shapes";
import { GenesisConfig } from "../hooks/useGenesisConfigs";

export interface MainMenuProps {
  // Actions
  running: boolean;
  onPlayStop: () => void;
  onStep: () => void;
  onRandom: () => void;
  onReset: () => void;
  onClear: () => void;

  // Environment
  gridSize: number;
  onGridSizeChange: (size: number) => void;

  // Simulation
  speed: number;
  onSpeedChange: (speed: number) => void;
  density: number;
  onDensityChange: (density: number) => void;
  cellMargin: number;
  onCellMarginChange: (margin: number) => void;

  // Rules
  surviveMin: number;
  onSurviveMinChange: (val: number) => void;
  surviveMax: number;
  onSurviveMaxChange: (val: number) => void;
  birthMin: number;
  onBirthMinChange: (val: number) => void;
  birthMax: number;
  onBirthMaxChange: (val: number) => void;
  birthMargin: number;
  onBirthMarginChange: (val: number) => void;

  // Shape Brush
  selectedShape: ShapeType;
  onShapeChange: (shape: ShapeType) => void;
  shapeSize: number;
  onShapeSizeChange: (size: number) => void;
  isHollow: boolean;
  onHollowChange: (hollow: boolean) => void;

  // Genesis Configs
  savedConfigs: Record<string, GenesisConfig>;
  selectedConfigName: string;
  onSelectConfig: (name: string) => void;
  newConfigName: string;
  onNewConfigNameChange: (name: string) => void;
  onSaveConfig: () => void;
  onExportConfig: () => void;
  onImportConfig: () => void;
  onDeleteConfig: () => void;
}

export function MainMenu(props: MainMenuProps) {
  const configOptions = Object.keys(props.savedConfigs);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`main-menu glass-panel ${collapsed ? "collapsed" : ""} ${!props.running ? "has-sidebar" : ""}`}
    >
      <div className="menu-sticky-container">
        <header
          className="menu-header"
          onClick={() => setCollapsed(!collapsed)}
        >
          <h2>Controls</h2>
          <button
            className="collapse-toggle"
            tabIndex={-1}
            aria-label="Toggle menu"
          >
            {collapsed ? "▼" : "▲"}
          </button>
        </header>

        <section className="menu-section actions-section">
          <h3>Actions</h3>
          <div className="button-group actions-grid">
            <button className="glass-button primary" onClick={props.onPlayStop}>
              {props.running ? "Stop" : "Play"}
            </button>
            <button
              className="glass-button"
              onClick={props.onStep}
              disabled={props.running}
            >
              Step
            </button>
            <button className="glass-button" onClick={props.onRandom}>
              Random
            </button>
            <button className="glass-button" onClick={props.onReset}>
              Reset
            </button>
            <button className="glass-button danger" onClick={props.onClear}>
              Clear
            </button>
          </div>
        </section>
      </div>

      <div className="menu-scrollable-content">
        <section className="menu-section">
          <h3>Environment</h3>
          <label className="control-label">
            <span>Grid Size: {props.gridSize}</span>
            <input
              type="range"
              min={10}
              max={40}
              step={10}
              value={props.gridSize}
              onChange={(e) => props.onGridSizeChange(Number(e.target.value))}
            />
          </label>
        </section>

        <section className="menu-section">
          <h3>Simulation</h3>
          <label className="control-label">
            <span>Speed (fps): {props.speed}</span>
            <input
              type="range"
              min={1}
              max={30}
              step={1}
              value={props.speed}
              onChange={(e) => props.onSpeedChange(Number(e.target.value))}
            />
          </label>
          <label className="control-label">
            <span>Random Density: {props.density.toFixed(2)}</span>
            <input
              type="range"
              min={0.01}
              max={0.3}
              step={0.01}
              value={props.density}
              onChange={(e) => props.onDensityChange(Number(e.target.value))}
            />
          </label>
          <label className="control-label">
            <span>Cell Margin: {props.cellMargin.toFixed(2)}</span>
            <input
              type="range"
              min={0}
              max={0.45}
              step={0.05}
              value={props.cellMargin}
              onChange={(e) => props.onCellMarginChange(Number(e.target.value))}
            />
          </label>
        </section>

        <section className="menu-section">
          <h3>Rules (18 neighbors)</h3>
          <div className="rules-grid">
            <label className="control-label mini">
              <span>Survive Min: {props.surviveMin}</span>
              <input
                type="range"
                min={0}
                max={18}
                step={1}
                value={props.surviveMin}
                onChange={(e) =>
                  props.onSurviveMinChange(Number(e.target.value))
                }
              />
            </label>
            <label className="control-label mini">
              <span>Survive Max: {props.surviveMax}</span>
              <input
                type="range"
                min={0}
                max={18}
                step={1}
                value={props.surviveMax}
                onChange={(e) =>
                  props.onSurviveMaxChange(Number(e.target.value))
                }
              />
            </label>
            <label className="control-label mini">
              <span>Birth Min: {props.birthMin}</span>
              <input
                type="range"
                min={0}
                max={18}
                step={1}
                value={props.birthMin}
                onChange={(e) => props.onBirthMinChange(Number(e.target.value))}
              />
            </label>
            <label className="control-label mini">
              <span>Birth Max: {props.birthMax}</span>
              <input
                type="range"
                min={0}
                max={18}
                step={1}
                value={props.birthMax}
                onChange={(e) => props.onBirthMaxChange(Number(e.target.value))}
              />
            </label>
            <label className="control-label mini">
              <span>Birth Margin: {props.birthMargin}</span>
              <input
                type="range"
                min={0}
                max={10}
                step={1}
                value={props.birthMargin}
                onChange={(e) =>
                  props.onBirthMarginChange(Number(e.target.value))
                }
              />
            </label>
          </div>
        </section>

        <section className="menu-section">
          <h3>Shape Brush</h3>
          <label className="control-label">
            <span>Shape</span>
            <select
              className="glass-select"
              value={props.selectedShape}
              onChange={(e) => props.onShapeChange(e.target.value as ShapeType)}
            >
              {SHAPES.map((shape) => (
                <option key={shape} value={shape}>
                  {shape}
                </option>
              ))}
            </select>
          </label>
          <label className="control-label">
            <span>Size: {props.shapeSize}</span>
            <input
              type="range"
              min={1}
              max={props.gridSize}
              step={1}
              value={props.shapeSize}
              onChange={(e) => props.onShapeSizeChange(Number(e.target.value))}
            />
          </label>
          {supportsHollow(props.selectedShape) && (
            <label className="control-label row">
              <span>Hollow</span>
              <input
                type="checkbox"
                className="glass-checkbox"
                checked={props.isHollow}
                onChange={(e) => props.onHollowChange(e.target.checked)}
              />
            </label>
          )}
        </section>

        <section className="menu-section">
          <h3>Genesis Config</h3>
          <label className="control-label">
            <span>Load Config</span>
            <select
              className="glass-select"
              value={props.selectedConfigName}
              onChange={(e) => props.onSelectConfig(e.target.value)}
            >
              <option value="">Select a config...</option>
              {configOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="control-label">
            <span>Config Name</span>
            <input
              type="text"
              className="glass-input"
              value={props.newConfigName}
              onChange={(e) => props.onNewConfigNameChange(e.target.value)}
              placeholder="New config name..."
            />
          </label>
          <div className="button-group actions-grid config-actions">
            <button className="glass-button" onClick={props.onSaveConfig}>
              Save Current
            </button>
            <button className="glass-button" onClick={props.onExportConfig}>
              Export
            </button>
            <button className="glass-button" onClick={props.onImportConfig}>
              Import
            </button>
            <button
              className="glass-button danger"
              onClick={props.onDeleteConfig}
              disabled={!props.selectedConfigName}
            >
              Delete Selected
            </button>
          </div>
        </section>
      </div>
    </aside>
  );
}
