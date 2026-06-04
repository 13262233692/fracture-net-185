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

    const rho = Math.sqrt(qCubed);
    const theta = Math.acos(Math.max(-1, Math.min(1, -phi / rho)));

    const lambda1 = -2 * Math.sqrt(q) * Math.cos(theta / 3) - I1 / 3;
    const lambda2 = -2 * Math.sqrt(q) * Math.cos((theta + 2 * Math.PI) / 3) - I1 / 3;
    const lambda3 = -2 * Math.sqrt(q) * Math.cos((theta + 4 * Math.PI) / 3) - I1 / 3;

    const sorted = [lambda1, lambda2, lambda3].sort((a, b) => Math.abs(b) - Math.abs(a));

    return {
      lambda1: sorted[0],
      lambda2: sorted[1],
      lambda3: sorted[2]
    };
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
  } {
    const { dimensions, scalarData } = volume;
    const { sigma, threshold, eigenvalueRatio } = params;

    const hessian = this.computeHessian(
      scalarData as Float32Array,
      dimensions,
      sigma
    );

    const totalVoxels = dimensions.x * dimensions.y * dimensions.z;
    const responseVolume = new Float32Array(totalVoxels);
    const lambda1Arr = new Float32Array(totalVoxels);
    const lambda2Arr = new Float32Array(totalVoxels);
    const lambda3Arr = new Float32Array(totalVoxels);
    const enhancedData = new Float32Array(scalarData);

    let maxResponse = -Infinity;

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

      const absLambda2 = Math.abs(eig.lambda2);
      const absLambda3 = Math.abs(eig.lambda3);

      let response = 0;

      if (absLambda2 > threshold && absLambda3 > threshold) {
        const ratio = Math.min(absLambda2 / absLambda3, absLambda3 / absLambda2);
        
        if (ratio > eigenvalueRatio) {
          const plateLike = Math.abs(eig.lambda1) < Math.abs(eig.lambda2) * 0.1;
          
          if (plateLike) {
            response = absLambda2 + absLambda3;
            enhancedData[i] = scalarData[i] * 0.3 + 255 * 0.7;
          }
        }
      }

      responseVolume[i] = response;
      maxResponse = Math.max(maxResponse, response);
    }

    if (maxResponse > 0) {
      for (let i = 0; i < totalVoxels; i++) {
        responseVolume[i] /= maxResponse;
      }
    }

    return {
      enhancedVolume: {
        ...volume,
        scalarData: enhancedData,
        scalarRange: [0, 255]
      },
      responseVolume,
      eigenvalues: {
        lambda1: lambda1Arr,
        lambda2: lambda2Arr,
        lambda3: lambda3Arr
      }
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
    }
  ): {
    normals: Float32Array;
    fractureMask: Uint8Array;
  } {
    const { dimensions } = volume;
    const totalVoxels = dimensions.x * dimensions.y * dimensions.z;
    const normals = new Float32Array(totalVoxels * 3);
    const fractureMask = new Uint8Array(totalVoxels);

    for (let i = 0; i < totalVoxels; i++) {
      const eig1 = eigenvalues.lambda1[i];
      const eig2 = eigenvalues.lambda2[i];

      const absEig1 = Math.abs(eig1);
      const absEig2 = Math.abs(eig2);

      const isFracture = absEig1 < absEig2 * 0.1 && absEig2 > 1e-5;

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
