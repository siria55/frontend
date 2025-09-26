export interface SceneGrid {
  cols: number;
  rows: number;
  tileSize?: number;
}

export interface SceneDimensions {
  width: number;
  height: number;
}

export interface SceneEnergy {
  type: 'storage' | 'consumer';
  capacity?: number;
  current?: number;
  output?: number;
  rate?: number;
}

export interface SceneBuilding {
  id: string;
  label: string;
  rect: number[];
  energy?: SceneEnergy;
}

export interface SceneAgent {
  id: string;
  label: string;
  position: number[];
  color?: number;
  actions?: string[];
}

export interface SceneDefinition {
  id: string;
  name: string;
  grid: SceneGrid;
  dimensions: SceneDimensions;
  buildings: SceneBuilding[];
  agents?: SceneAgent[];
}

export interface SceneResponse extends SceneDefinition {}
