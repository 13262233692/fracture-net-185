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
