import { VolumeData, MeshData, FractureStatistics, FracturePlane, Point3D } from '../types';
import * as THREE from 'three';

export class FractureAnalyzer {
  computeFractureDensity(
    volume: VolumeData,
    fractureMask: Uint8Array,
    normals: Float32Array
  ): FractureStatistics {
    const { dimensions, spacing } = volume;
    const totalVoxels = dimensions.x * dimensions.y * dimensions.z;
    const voxelVolume = spacing.x * spacing.y * spacing.z;

    let fractureVoxelCount = 0;
    let totalArea = 0;
    const dipBins = 18;
    const dipDirBins = 36;
    const dipRange = 90;
    const dipDirRange = 360;

    const dipStep = dipRange / dipBins;
    const dipDirStep = dipDirRange / dipDirBins;

    const orientationCounts: number[][] = [];
    for (let i = 0; i < dipBins; i++) {
      orientationCounts.push(new Array(dipDirBins).fill(0));
    }

    const fracturePlanes: FracturePlane[] = [];
    const planeMap = new Map<string, { normal: Point3D; area: number; points: Point3D[] }>();

    for (let i = 0; i < totalVoxels; i++) {
      if (fractureMask[i] === 1) {
        fractureVoxelCount++;

        const nx = normals[i * 3];
        const ny = normals[i * 3 + 1];
        const nz = normals[i * 3 + 2];

        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
        if (len > 0) {
          const dip = Math.acos(Math.abs(nz / len)) * (180 / Math.PI);
          const dipDir = Math.atan2(ny, nx) * (180 / Math.PI);
          const dipDirNormalized = dipDir < 0 ? dipDir + 360 : dipDir;

          const dipBin = Math.min(Math.floor(dip / dipStep), dipBins - 1);
          const dipDirBin = Math.min(Math.floor(dipDirNormalized / dipDirStep), dipDirBins - 1);

          orientationCounts[dipBin][dipDirBin]++;

          totalArea += voxelVolume;

          const z = Math.floor(i / (dimensions.x * dimensions.y));
          const y = Math.floor((i % (dimensions.x * dimensions.y)) / dimensions.x);
          const x = i % dimensions.x;

          const normalKey = `${Math.round(nx * 10) / 10},${Math.round(ny * 10) / 10},${Math.round(nz * 10) / 10}`;
          
          if (!planeMap.has(normalKey)) {
            planeMap.set(normalKey, {
              normal: { x: nx, y: ny, z: nz },
              area: 0,
              points: []
            });
          }
          
          const plane = planeMap.get(normalKey)!;
          plane.area += voxelVolume;
          plane.points.push({ x, y, z });
        }
      }
    }

    planeMap.forEach((value) => {
      if (value.points.length > 10) {
        const center = value.points.reduce(
          (acc, p) => ({
            x: acc.x + p.x,
            y: acc.y + p.y,
            z: acc.z + p.z
          }),
          { x: 0, y: 0, z: 0 }
        );
        
        center.x /= value.points.length;
        center.y /= value.points.length;
        center.z /= value.points.length;

        const normal = value.normal;
        const len = Math.sqrt(normal.x ** 2 + normal.y ** 2 + normal.z ** 2);
        const dip = Math.acos(Math.abs(normal.z / len)) * (180 / Math.PI);
        const dipDir = Math.atan2(normal.y, normal.x) * (180 / Math.PI);
        const dipDirNormalized = dipDir < 0 ? dipDir + 360 : dipDir;

        fracturePlanes.push({
          normal,
          center,
          area: value.area,
          dip,
          dipDirection: dipDirNormalized
        });
      }
    });

    const totalVolume = totalVoxels * voxelVolume;
    const density = fractureVoxelCount / totalVoxels;

    const dipArray: number[] = [];
    const dipDirArray: number[] = [];
    
    for (let i = 0; i < dipBins; i++) {
      dipArray.push((i + 0.5) * dipStep);
    }
    
    for (let i = 0; i < dipDirBins; i++) {
      dipDirArray.push((i + 0.5) * dipDirStep);
    }

    return {
      density,
      orientationHistogram: {
        dip: dipArray,
        dipDirection: dipDirArray,
        counts: orientationCounts
      },
      totalArea,
      totalVolume,
      fractureCount: fracturePlanes.length
    };
  }

  computeStatisticsFromMesh(meshData: MeshData): FractureStatistics {
    const positions = meshData.positions;
    const indices = meshData.indices;
    const normals = meshData.normals;

    let totalArea = 0;
    const dipBins = 18;
    const dipDirBins = 36;
    const dipRange = 90;
    const dipDirRange = 360;

    const dipStep = dipRange / dipBins;
    const dipDirStep = dipDirRange / dipDirBins;

    const orientationCounts: number[][] = [];
    for (let i = 0; i < dipBins; i++) {
      orientationCounts.push(new Array(dipDirBins).fill(0));
    }

    const triangleAreas: number[] = [];

    for (let i = 0; i < indices.length; i += 3) {
      const i0 = indices[i] * 3;
      const i1 = indices[i + 1] * 3;
      const i2 = indices[i + 2] * 3;

      const v0 = new THREE.Vector3(positions[i0], positions[i0 + 1], positions[i0 + 2]);
      const v1 = new THREE.Vector3(positions[i1], positions[i1 + 1], positions[i1 + 2]);
      const v2 = new THREE.Vector3(positions[i2], positions[i2 + 1], positions[i2 + 2]);

      const edge1 = new THREE.Vector3().subVectors(v1, v0);
      const edge2 = new THREE.Vector3().subVectors(v2, v0);
      const cross = new THREE.Vector3().crossVectors(edge1, edge2);
      const area = cross.length() / 2;
      totalArea += area;
      triangleAreas.push(area);

      const nx = (normals[i0] + normals[i1] + normals[i2]) / 3;
      const ny = (normals[i0 + 1] + normals[i1 + 1] + normals[i2 + 1]) / 3;
      const nz = (normals[i0 + 2] + normals[i1 + 2] + normals[i2 + 2]) / 3;

      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (len > 0) {
        const dip = Math.acos(Math.abs(nz / len)) * (180 / Math.PI);
        let dipDir = Math.atan2(ny, nx) * (180 / Math.PI);
        const dipDirNormalized = dipDir < 0 ? dipDir + 360 : dipDir;

        const dipBin = Math.min(Math.floor(dip / dipStep), dipBins - 1);
        const dipDirBin = Math.min(Math.floor(dipDirNormalized / dipDirStep), dipDirBins - 1);

        orientationCounts[dipBin][dipDirBin]++;
      }
    }

    const dipArray: number[] = [];
    const dipDirArray: number[] = [];
    
    for (let i = 0; i < dipBins; i++) {
      dipArray.push((i + 0.5) * dipStep);
    }
    
    for (let i = 0; i < dipDirBins; i++) {
      dipDirArray.push((i + 0.5) * dipDirStep);
    }

    const bbox = this.computeBoundingBox(meshData);
    const volume = (bbox.max.x - bbox.min.x) * (bbox.max.y - bbox.min.y) * (bbox.max.z - bbox.min.z);

    return {
      density: totalArea / volume,
      orientationHistogram: {
        dip: dipArray,
        dipDirection: dipDirArray,
        counts: orientationCounts
      },
      totalArea,
      totalVolume: volume,
      fractureCount: Math.floor(indices.length / 3)
    };
  }

  private computeBoundingBox(meshData: MeshData): { min: Point3D; max: Point3D } {
    const positions = meshData.positions;
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (let i = 0; i < positions.length; i += 3) {
      minX = Math.min(minX, positions[i]);
      minY = Math.min(minY, positions[i + 1]);
      minZ = Math.min(minZ, positions[i + 2]);
      maxX = Math.max(maxX, positions[i]);
      maxY = Math.max(maxY, positions[i + 1]);
      maxZ = Math.max(maxZ, positions[i + 2]);
    }

    return {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ }
    };
  }

  generateRosePlotData(stats: FractureStatistics): {
    angles: number[];
    radii: number[];
    maxRadius: number;
    dipData: {
      angles: number[];
      counts: number[];
    };
  } {
    const { orientationHistogram } = stats;
    const { dip, dipDirection, counts } = orientationHistogram;

    const angles: number[] = [];
    const radii: number[] = [];
    let maxRadius = 0;

    for (let i = 0; i < dipDirection.length; i++) {
      let sum = 0;
      for (let j = 0; j < dip.length; j++) {
        sum += counts[j][i];
      }
      angles.push(dipDirection[i] * Math.PI / 180);
      radii.push(sum);
      maxRadius = Math.max(maxRadius, sum);
    }

    const dipAngles: number[] = [];
    const dipCounts: number[] = [];

    for (let i = 0; i < dip.length; i++) {
      let sum = 0;
      for (let j = 0; j < dipDirection.length; j++) {
        sum += counts[i][j];
      }
      dipAngles.push(dip[i] * Math.PI / 180);
      dipCounts.push(sum);
    }

    return {
      angles,
      radii,
      maxRadius,
      dipData: {
        angles: dipAngles,
        counts: dipCounts
      }
    };
  }

  drawRosePlot(
    canvas: HTMLCanvasElement,
    stats: FractureStatistics,
    type: 'strike' | 'dip'
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 20;

    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;

    for (let i = 1; i <= 5; i++) {
      const r = (radius * i) / 5;
      ctx.beginPath();
      ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI) / 6;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + radius * Math.cos(angle),
        centerY - radius * Math.sin(angle)
      );
      ctx.stroke();
    }

    const roseData = this.generateRosePlotData(stats);
    let radii: number[];
    let angles: number[];
    let maxRadius: number;

    if (type === 'strike') {
      angles = roseData.angles;
      radii = roseData.radii;
      maxRadius = roseData.maxRadius;
    } else {
      angles = roseData.dipData.angles;
      radii = roseData.dipData.counts;
      maxRadius = Math.max(...radii);
    }

    if (maxRadius === 0) return;

    ctx.beginPath();
    ctx.fillStyle = 'rgba(255, 107, 107, 0.7)';
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 2;

    for (let i = 0; i <= angles.length; i++) {
      const idx = i % angles.length;
      const angle = angles[idx];
      const r = (radii[idx] / maxRadius) * radius;
      const x = centerX + r * Math.cos(angle);
      const y = centerY - r * Math.sin(angle);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';

    if (type === 'strike') {
      for (let i = 0; i < 12; i++) {
        const angle = (i * Math.PI) / 6;
        const labelAngle = angle * 180 / Math.PI;
        const x = centerX + (radius + 15) * Math.cos(angle);
        const y = centerY - (radius + 15) * Math.sin(angle);

        if (i % 3 === 0) {
          ctx.fillText(`${Math.round(labelAngle)}°`, x, y);
        }
      }
    } else {
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 6;
        const dipAngle = angle * 180 / Math.PI;
        const x = centerX + (radius + 15) * Math.cos(angle);
        const y = centerY - (radius + 15) * Math.sin(angle);
        ctx.fillText(`${Math.round(dipAngle)}°`, x, y);
      }
    }

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(type === 'strike' ? '走向玫瑰花图' : '倾角玫瑰花图', centerX, 20);
  }

  generateStatisticsReport(stats: FractureStatistics): string {
    const report = [];
    report.push('=== 裂隙统计分析报告 ===\n');
    report.push(`裂隙密度: ${(stats.density * 100).toFixed(4)}%\n`);
    report.push(`裂隙总面积: ${stats.totalArea.toFixed(2)} 像素²\n`);
    report.push(`岩体总体积: ${stats.totalVolume.toFixed(2)} 像素³\n`);
    report.push(`检测到的裂隙数量: ${stats.fractureCount}\n`);
    report.push('\n方向分布统计:\n');

    const { orientationHistogram } = stats;
    let maxCount = 0;
    let maxDipIdx = 0;
    let maxDirIdx = 0;

    for (let i = 0; i < orientationHistogram.dip.length; i++) {
      for (let j = 0; j < orientationHistogram.dipDirection.length; j++) {
        if (orientationHistogram.counts[i][j] > maxCount) {
          maxCount = orientationHistogram.counts[i][j];
          maxDipIdx = i;
          maxDirIdx = j;
        }
      }
    }

    report.push(`优势走向: ${orientationHistogram.dipDirection[maxDirIdx].toFixed(1)}°\n`);
    report.push(`优势倾角: ${orientationHistogram.dip[maxDipIdx].toFixed(1)}°\n`);

    return report.join('');
  }
}
