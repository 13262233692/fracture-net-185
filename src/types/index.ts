export interface VolumeData {
  dimensions: {
    x: number;
    y: number;
    z: number;
  };
  spacing: {
    x: number;
    y: number;
    z: number;
  };
  origin: {
    x: number;
    y: number;
    z: number;
  };
  scalarData: Float32Array | Uint16Array | Uint8Array;
  scalarRange: [number, number];
  metadata?: Record<string, unknown>;
}

export interface FractureStatistics {
  density: number;
  orientationHistogram: {
    dip: number[];
    dipDirection: number[];
    counts: number[][];
  };
  totalArea: number;
  totalVolume: number;
  fractureCount: number;
}

export interface MeshData {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
  values?: Float32Array;
}

export interface ProcessingParameters {
  sigma: number;
  threshold: number;
  eigenvalueRatio: number;
  isoValue: number;
  preprocessSigma: number;
  multiScaleSigmaMin: number;
  multiScaleSigmaMax: number;
  multiScaleSigmaStep: number;
  plateLikeThreshold: number;
  minFractureArea: number;
  minConnectedVoxels: number;
  useNonMaximumSuppression: boolean;
  suppressRadius: number;
  structureSaliencyThreshold: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface HessianMatrix {
  xx: number;
  xy: number;
  xz: number;
  yy: number;
  yz: number;
  zz: number;
}

export interface Eigenvalues {
  lambda1: number;
  lambda2: number;
  lambda3: number;
}

export interface FracturePlane {
  normal: Point3D;
  center: Point3D;
  area: number;
  dip: number;
  dipDirection: number;
}

export interface GraphNode {
  id: number;
  position: Point3D;
  voxelIndex: number;
  connectedNodes: number[];
  normal?: Point3D;
  aperture?: number;
  componentId?: number;
}

export interface GraphEdge {
  id: string;
  from: number;
  to: number;
  weight: number;
  distance: number;
  aperture?: number;
}

export interface FractureGraph {
  nodes: Map<number, GraphNode>;
  edges: Map<string, GraphEdge>;
  nodeCount: number;
  edgeCount: number;
}

export interface ConnectedComponent {
  id: number;
  nodeIds: number[];
  size: number;
  boundingBox: {
    min: Point3D;
    max: Point3D;
  };
  isPercolating?: boolean;
}

export interface FlowPath {
  nodeIds: number[];
  positions: Point3D[];
  totalLength: number;
  minAperture: number;
  avgAperture: number;
  tortuosity: number;
}

export interface PercolationResult {
  hasPercolatingPath: boolean;
  paths: FlowPath[];
  shortestPath?: FlowPath;
  widestPath?: FlowPath;
  connectivity: number;
  percolationThreshold?: number;
}

export interface FlowProperties {
  porosity: number;
  permeability: number;
  connectivity: number;
  clusterCount: number;
  largestClusterSize: number;
  percolationProbability: number;
}
