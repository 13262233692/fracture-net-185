import { VolumeData, HessianMatrix, Eigenvalues, ProcessingParameters } from '../types';

export class HessianFilter {
  private gaussianKernel(sigma: number, radius: number): number[] {
    const size = radius * 2 + 1;
    const kernel: number[] = [];
    let sum = 0;

    for (let i = 0; i < size; i++) {
      const x = i - radius;
      const val = Math.exp(-(x * x) / (2 * sigma * sigma));
      kernel.push(val);
      sum += val;
    }

    for (let i = 0; i < size; i++) {
      kernel[i] /= sum;
    }

    return kernel;
  }

  private gaussianDerivativeKernel(sigma: number, radius: number): number[] {
    const size = radius * 2 + 1;
    const kernel: number[] = [];
    let sum = 0;

    for (let i = 0; i < size; i++) {
      const x = i - radius;
      const val = -x * Math.exp(-(x * x) / (2 * sigma * sigma)) / (sigma * sigma);
      kernel.push(val);
      sum += Math.abs(val);
    }

    if (sum > 0) {
      for (let i = 0; i < size; i++) {
        kernel[i] /= sum;
      }
    }

    return kernel;
  }

  private gaussianSecondDerivativeKernel(sigma: number, radius: number): number[] {
    const size = radius * 2 + 1;
    const kernel: number[] = [];
    let sum = 0;

    for (let i = 0; i < size; i++) {
      const x = i - radius;
      const val = (x * x / (sigma * sigma) - 1) * Math.exp(-(x * x) / (2 * sigma * sigma)) / (sigma * sigma);
      kernel.push(val);
      sum += Math.abs(val);
    }

    if (sum > 0) {
      for (let i = 0; i < size; i++) {
        kernel[i] /= sum;
      }
    }

    return kernel;
  }

  private convolve1D(
    data: Float32Array,
    dims: { x: number; y: number; z: number },
    axis: 'x' | 'y' | 'z',
    kernel: number[]
  ): Float32Array {
    const result = new Float32Array(data.length);
    const radius = Math.floor(kernel.length / 2);

    for (let z = 0; z < dims.z; z++) {
      for (let y = 0; y < dims.y; y++) {
        for (let x = 0; x < dims.x; x++) {
          let sum = 0;
          const idx = z * dims.x * dims.y + y * dims.x + x;

          for (let k = -radius; k <= radius; k++) {
            let xi = x, yi = y, zi = z;

            if (axis === 'x') {
              xi = Math.max(0, Math.min(dims.x - 1, x + k));
            } else if (axis === 'y') {
              yi = Math.max(0, Math.min(dims.y - 1, y + k));
            } else {
              zi = Math.max(0, Math.min(dims.z - 1, z + k));
            }

            const kidx = zi * dims.x * dims.y + yi * dims.x + xi;
            sum += data[kidx] * kernel[k + radius];
          }

          result[idx] = sum;
        }
      }
    }

    return result;
  }

  private gaussianSmooth3D(
    data: Float32Array,
    dims: { x: number; y: number; z: number },
    sigma: number
  ): Float32Array {
    if (sigma <= 0) return new Float32Array(data);
    
    const radius = Math.ceil(3 * sigma);
    const kernel = this.gaussianKernel(sigma, radius);
    
    let result = this.convolve1D(data, dims, 'x', kernel);
    result = this.convolve1D(result, dims, 'y', kernel);
    result = this.convolve1D(result, dims, 'z', kernel);
    
    return result;
  }

  private preprocess(
    data: Float32Array,
    dims: { x: number; y: number; z: number },
    params: ProcessingParameters
  ): Float32Array {
    let result = new Float32Array(data) as Float32Array;
    
    if (params.preprocessSigma > 0) {
      result = this.gaussianSmooth3D(result, dims, params.preprocessSigma) as Float32Array;
    }
    
    return result;
  }

  computeHessian(
    data: Float32Array,
    dims: { x: number; y: number; z: number },
    sigma: number
  ): {
    xx: Float32Array;
    xy: Float32Array;
    xz: Float32Array;
    yy: Float32Array;
    yz: Float32Array;
    zz: Float32Array;
  } {
    const radius = Math.ceil(3 * sigma);
    const dKernel = this.gaussianDerivativeKernel(sigma, radius);
    const ddKernel = this.gaussianSecondDerivativeKernel(sigma, radius);
    const gKernel = this.gaussianKernel(sigma, radius);

    let xx = this.convolve1D(data, dims, 'x', ddKernel);
    xx = this.convolve1D(xx, dims, 'y', gKernel);
    xx = this.convolve1D(xx, dims, 'z', gKernel);

    let yy = this.convolve1D(data, dims, 'y', ddKernel);
    yy = this.convolve1D(yy, dims, 'x', gKernel);
    yy = this.convolve1D(yy, dims, 'z', gKernel);

    let zz = this.convolve1D(data, dims, 'z', ddKernel);
    zz = this.convolve1D(zz, dims, 'x', gKernel);
    zz = this.convolve1D(zz, dims, 'y', gKernel);

    let xy = this.convolve1D(data, dims, 'x', dKernel);
    xy = this.convolve1D(xy, dims, 'y', dKernel);
    xy = this.convolve1D(xy, dims, 'z', gKernel);

    let xz = this.convolve1D(data, dims, 'x', dKernel);
    xz = this.convolve1D(xz, dims, 'z', dKernel);
    xz = this.convolve1D(xz, dims, 'y', gKernel);

    let yz = this.convolve1D(data, dims, 'y', dKernel);
    yz = this.convolve1D(yz, dims, 'z', dKernel);
    yz = this.convolve1D(yz, dims, 'x', gKernel);

    return { xx, xy, xz, yy, yz, zz };
  }

  computeEigenvalues(hessian: HessianMatrix): Eigenvalues {
    const { xx, xy, xz, yy, yz, zz } = hessian;

    const I1 = xx + yy + zz;
    const I2 = xx * yy + xx * zz + yy * zz - xy * xy - xz * xz - yz * yz;
    const I3 = xx * yy * zz + 2 * xy * yz * xz - xx * yz * yz - yy * xz * xz - zz * xy * xy;

    const phi = (2 * I1 * I1 * I1 - 9 * I1 * I2 + 27 * I3) / 54;
    const q = (I1 * I1 - 3 * I2) / 9;
    const qCubed = q * q * q;

    const rho = Math.sqrt(Math.max(0, qCubed));
    const theta = rho > 1e-10 ? Math.acos(Math.max(-1, Math.min(1, -phi / rho))) : 0;

    const lambda1 = -2 * Math.sqrt(Math.max(0, q)) * Math.cos(theta / 3) - I1 / 3;
    const lambda2 = -2 * Math.sqrt(Math.max(0, q)) * Math.cos((theta + 2 * Math.PI) / 3) - I1 / 3;
    const lambda3 = -2 * Math.sqrt(Math.max(0, q)) * Math.cos((theta + 4 * Math.PI) / 3) - I1 / 3;

    const sorted = [lambda1, lambda2, lambda3].sort((a, b) => Math.abs(b) - Math.abs(a));

    return {
      lambda1: sorted[0],
      lambda2: sorted[1],
      lambda3: sorted[2]
    };
  }

  private computeSingleScaleResponse(
    data: Float32Array,
    dims: { x: number; y: number; z: number },
    sigma: number,
    params: ProcessingParameters
  ): {
    response: Float32Array;
    hessian: { xx: Float32Array; xy: Float32Array; xz: Float32Array; yy: Float32Array; yz: Float32Array; zz: Float32Array };
    eigenvalues: { lambda1: Float32Array; lambda2: Float32Array; lambda3: Float32Array };
  } {
    const hessian = this.computeHessian(data, dims, sigma);
    const totalVoxels = dims.x * dims.y * dims.z;
    const response = new Float32Array(totalVoxels);
    const lambda1Arr = new Float32Array(totalVoxels);
    const lambda2Arr = new Float32Array(totalVoxels);
    const lambda3Arr = new Float32Array(totalVoxels);

    const plateLikeThreshold = params.plateLikeThreshold || 0.1;
    const eigenvalueRatio = params.eigenvalueRatio;
    const threshold = params.threshold;
    const structureSaliency = params.structureSaliencyThreshold || 0.0;

    for (let i = 0; i < totalVoxels; i++) {
      const hessianMatrix: HessianMatrix = {
        xx: hessian.xx[i],
        xy: hessian.xy[i],
        xz: hessian.xz[i],
        yy: hessian.yy[i],
        yz: hessian.yz[i],
        zz: hessian.zz[i]
      };

      const eig = this.computeEigenvalues(hessianMatrix);
      lambda1Arr[i] = eig.lambda1;
      lambda2Arr[i] = eig.lambda2;
      lambda3Arr[i] = eig.lambda3;

      const absLambda1 = Math.abs(eig.lambda1);
      const absLambda2 = Math.abs(eig.lambda2);
      const absLambda3 = Math.abs(eig.lambda3);

      let resp = 0;

      if (absLambda2 > threshold && absLambda3 > threshold) {
        const ratio = Math.min(absLambda2 / absLambda3, absLambda3 / absLambda2);
        
        if (ratio > eigenvalueRatio) {
          const plateLike = absLambda1 < absLambda2 * plateLikeThreshold;
          
          if (plateLike) {
            const structureScore = (absLambda2 + absLambda3) * (1 - absLambda1 / Math.max(absLambda2, 1e-10));
            const noiseRatio = absLambda1 / (absLambda2 + absLambda3 + 1e-10);
            
            if (noiseRatio < 0.5 && structureScore > structureSaliency) {
              resp = (absLambda2 + absLambda3) * sigma * sigma;
            }
          }
        }
      }

      response[i] = resp;
    }

    return {
      response,
      hessian,
      eigenvalues: {
        lambda1: lambda1Arr,
        lambda2: lambda2Arr,
        lambda3: lambda3Arr
      }
    };
  }

  private nonMaximumSuppression(
    response: Float32Array,
    dims: { x: number; y: number; z: number },
    radius: number = 1
  ): Float32Array {
    const result = new Float32Array(response.length);
    
    for (let z = 0; z < dims.z; z++) {
      for (let y = 0; y < dims.y; y++) {
        for (let x = 0; x < dims.x; x++) {
          const idx = z * dims.x * dims.y + y * dims.x + x;
          const val = response[idx];
          
          if (val <= 0) {
            result[idx] = 0;
            continue;
          }
          
          let isMax = true;
          
          for (let dz = -radius; dz <= radius && isMax; dz++) {
            for (let dy = -radius; dy <= radius && isMax; dy++) {
              for (let dx = -radius; dx <= radius && isMax; dx++) {
                if (dx === 0 && dy === 0 && dz === 0) continue;
                
                const xi = Math.max(0, Math.min(dims.x - 1, x + dx));
                const yi = Math.max(0, Math.min(dims.y - 1, y + dy));
                const zi = Math.max(0, Math.min(dims.z - 1, z + dz));
                const kidx = zi * dims.x * dims.y + yi * dims.x + xi;
                
                if (response[kidx] > val) {
                  isMax = false;
                }
              }
            }
          }
          
          result[idx] = isMax ? val : 0;
        }
      }
    }
    
    return result;
  }

  private connectedComponentAnalysis(
    response: Float32Array,
    dims: { x: number; y: number; z: number },
    threshold: number,
    minVoxels: number
  ): { filtered: Float32Array; labels: Int32Array; componentSizes: Map<number, number> } {
    const totalVoxels = dims.x * dims.y * dims.z;
    const labels = new Int32Array(totalVoxels);
    const filtered = new Float32Array(totalVoxels);
    const componentSizes = new Map<number, number>();
    let currentLabel = 0;

    const neighbors = [
      [-1, 0, 0], [1, 0, 0],
      [0, -1, 0], [0, 1, 0],
      [0, 0, -1], [0, 0, 1]
    ];

    for (let i = 0; i < totalVoxels; i++) {
      if (response[i] > threshold && labels[i] === 0) {
        currentLabel++;
        const queue: number[] = [i];
        labels[i] = currentLabel;
        let size = 0;

        while (queue.length > 0) {
          const idx = queue.shift()!;
          size++;

          const z = Math.floor(idx / (dims.x * dims.y));
          const y = Math.floor((idx % (dims.x * dims.y)) / dims.x);
          const x = idx % dims.x;

          for (const [dx, dy, dz] of neighbors) {
            const xi = x + dx;
            const yi = y + dy;
            const zi = z + dz;

            if (xi >= 0 && xi < dims.x && yi >= 0 && yi < dims.y && zi >= 0 && zi < dims.z) {
              const nidx = zi * dims.x * dims.y + yi * dims.x + xi;
              if (response[nidx] > threshold && labels[nidx] === 0) {
                labels[nidx] = currentLabel;
                queue.push(nidx);
              }
            }
          }
        }

        componentSizes.set(currentLabel, size);

        if (size >= minVoxels) {
          for (let j = 0; j < totalVoxels; j++) {
            if (labels[j] === currentLabel) {
              filtered[j] = response[j];
            }
          }
        }
      }
    }

    return { filtered, labels, componentSizes };
  }

  enhanceFractures(
    volume: VolumeData,
    params: ProcessingParameters
  ): {
    enhancedVolume: VolumeData;
    responseVolume: Float32Array;
    eigenvalues: {
      lambda1: Float32Array;
      lambda2: Float32Array;
      lambda3: Float32Array;
    };
    hessian: {
      xx: Float32Array;
      xy: Float32Array;
      xz: Float32Array;
      yy: Float32Array;
      yz: Float32Array;
      zz: Float32Array;
    };
    componentSizes: Map<number, number>;
  } {
    const { dimensions, scalarData } = volume;
    const totalVoxels = dimensions.x * dimensions.y * dimensions.z;

    const preprocessed = this.preprocess(scalarData as Float32Array, dimensions, params);

    const sigmaMin = params.multiScaleSigmaMin || params.sigma;
    const sigmaMax = params.multiScaleSigmaMax || params.sigma;
    const sigmaStep = params.multiScaleSigmaStep || 0.5;

    let bestResponse = new Float32Array(totalVoxels) as Float32Array;
    let bestHessian: { xx: Float32Array; xy: Float32Array; xz: Float32Array; yy: Float32Array; yz: Float32Array; zz: Float32Array } | null = null;
    let bestEigenvalues: { lambda1: Float32Array; lambda2: Float32Array; lambda3: Float32Array } | null = null;

    for (let sigma = sigmaMin; sigma <= sigmaMax; sigma += sigmaStep) {
      const scaleResult = this.computeSingleScaleResponse(preprocessed, dimensions, sigma, params);
      
      for (let i = 0; i < totalVoxels; i++) {
        if (scaleResult.response[i] > bestResponse[i]) {
          bestResponse[i] = scaleResult.response[i];
          
          if (!bestHessian) {
            bestHessian = {
              xx: new Float32Array(scaleResult.hessian.xx),
              xy: new Float32Array(scaleResult.hessian.xy),
              xz: new Float32Array(scaleResult.hessian.xz),
              yy: new Float32Array(scaleResult.hessian.yy),
              yz: new Float32Array(scaleResult.hessian.yz),
              zz: new Float32Array(scaleResult.hessian.zz)
            };
            bestEigenvalues = {
              lambda1: new Float32Array(scaleResult.eigenvalues.lambda1),
              lambda2: new Float32Array(scaleResult.eigenvalues.lambda2),
              lambda3: new Float32Array(scaleResult.eigenvalues.lambda3)
            };
          } else {
            bestHessian!.xx[i] = scaleResult.hessian.xx[i];
            bestHessian!.xy[i] = scaleResult.hessian.xy[i];
            bestHessian!.xz[i] = scaleResult.hessian.xz[i];
            bestHessian!.yy[i] = scaleResult.hessian.yy[i];
            bestHessian!.yz[i] = scaleResult.hessian.yz[i];
            bestHessian!.zz[i] = scaleResult.hessian.zz[i];
            
            bestEigenvalues!.lambda1[i] = scaleResult.eigenvalues.lambda1[i];
            bestEigenvalues!.lambda2[i] = scaleResult.eigenvalues.lambda2[i];
            bestEigenvalues!.lambda3[i] = scaleResult.eigenvalues.lambda3[i];
          }
        }
      }
    }

    if (!bestHessian || !bestEigenvalues) {
      const singleResult = this.computeSingleScaleResponse(preprocessed, dimensions, params.sigma, params);
      bestHessian = singleResult.hessian as { xx: Float32Array; xy: Float32Array; xz: Float32Array; yy: Float32Array; yz: Float32Array; zz: Float32Array };
      bestEigenvalues = singleResult.eigenvalues as { lambda1: Float32Array; lambda2: Float32Array; lambda3: Float32Array };
      bestResponse = singleResult.response as Float32Array;
    }

    if (params.useNonMaximumSuppression) {
      bestResponse = this.nonMaximumSuppression(bestResponse, dimensions, params.suppressRadius || 1);
    }

    const { filtered, componentSizes } = this.connectedComponentAnalysis(
      bestResponse,
      dimensions,
      params.isoValue * 0.1,
      params.minConnectedVoxels || 10
    );
    bestResponse = filtered as Float32Array;

    let maxResponse = -Infinity;
    for (let i = 0; i < totalVoxels; i++) {
      maxResponse = Math.max(maxResponse, bestResponse[i]);
    }

    if (maxResponse > 0) {
      for (let i = 0; i < totalVoxels; i++) {
        bestResponse[i] /= maxResponse;
      }
    }

    const enhancedData = new Float32Array(scalarData);
    for (let i = 0; i < totalVoxels; i++) {
      if (bestResponse[i] > params.isoValue * 0.5) {
        enhancedData[i] = scalarData[i] * 0.3 + 255 * 0.7;
      }
    }

    return {
      enhancedVolume: {
        ...volume,
        scalarData: enhancedData,
        scalarRange: [0, 255]
      },
      responseVolume: bestResponse,
      eigenvalues: bestEigenvalues!,
      hessian: bestHessian!,
      componentSizes
    };
  }

  computeFractureNormals(
    volume: VolumeData,
    eigenvalues: {
      lambda1: Float32Array;
      lambda2: Float32Array;
      lambda3: Float32Array;
    },
    hessian: {
      xx: Float32Array;
      xy: Float32Array;
      xz: Float32Array;
      yy: Float32Array;
      yz: Float32Array;
      zz: Float32Array;
    },
    params: ProcessingParameters
  ): {
    normals: Float32Array;
    fractureMask: Uint8Array;
  } {
    const { dimensions } = volume;
    const totalVoxels = dimensions.x * dimensions.y * dimensions.z;
    const normals = new Float32Array(totalVoxels * 3);
    const fractureMask = new Uint8Array(totalVoxels);
    const plateLikeThreshold = params.plateLikeThreshold || 0.1;

    for (let i = 0; i < totalVoxels; i++) {
      const eig1 = eigenvalues.lambda1[i];
      const eig2 = eigenvalues.lambda2[i];

      const absEig1 = Math.abs(eig1);
      const absEig2 = Math.abs(eig2);

      const isFracture = absEig1 < absEig2 * plateLikeThreshold && absEig2 > 1e-5;

      if (isFracture) {
        fractureMask[i] = 1;

        const hess = [
          [hessian.xx[i], hessian.xy[i], hessian.xz[i]],
          [hessian.xy[i], hessian.yy[i], hessian.yz[i]],
          [hessian.xz[i], hessian.yz[i], hessian.zz[i]]
        ];

        const eigenvector = this.computeEigenvector(hess, eig1);

        normals[i * 3] = eigenvector[0];
        normals[i * 3 + 1] = eigenvector[1];
        normals[i * 3 + 2] = eigenvector[2];
      } else {
        fractureMask[i] = 0;
        normals[i * 3] = 0;
        normals[i * 3 + 1] = 0;
        normals[i * 3 + 2] = 0;
      }
    }

    return { normals, fractureMask };
  }

  private computeEigenvector(matrix: number[][], eigenvalue: number): number[] {
    const a = [
      [matrix[0][0] - eigenvalue, matrix[0][1], matrix[0][2]],
      [matrix[1][0], matrix[1][1] - eigenvalue, matrix[1][2]],
      [matrix[2][0], matrix[2][1], matrix[2][2] - eigenvalue]
    ];

    const x = this.solveHomogeneousSystem(a);

    const len = Math.sqrt(x[0] * x[0] + x[1] * x[1] + x[2] * x[2]);
    if (len > 0) {
      x[0] /= len;
      x[1] /= len;
      x[2] /= len;
    }

    return x;
  }

  private solveHomogeneousSystem(a: number[][]): number[] {
    const m = a.map(row => [...row]);
    
    for (let col = 0; col < 3; col++) {
      let maxRow = col;
      for (let row = col + 1; row < 3; row++) {
        if (Math.abs(m[row][col]) > Math.abs(m[maxRow][col])) {
          maxRow = row;
        }
      }

      [m[col], m[maxRow]] = [m[maxRow], m[col]];

      const pivot = m[col][col];
      if (Math.abs(pivot) < 1e-10) continue;

      for (let row = col + 1; row < 3; row++) {
        const factor = m[row][col] / pivot;
        for (let k = col; k < 3; k++) {
          m[row][k] -= factor * m[col][k];
        }
      }
    }

    const x = [0, 0, 1];
    
    for (let row = 2; row >= 0; row--) {
      let sum = 0;
      for (let col = row + 1; col < 3; col++) {
        sum += m[row][col] * x[col];
      }
      if (Math.abs(m[row][row]) > 1e-10) {
        x[row] = -sum / m[row][row];
      }
    }

    return x;
  }
}
