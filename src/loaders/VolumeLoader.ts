import { VolumeData } from '../types';

export class VolumeLoader {
  async loadFromFiles(files: File[]): Promise<VolumeData> {
    if (files.length === 0) {
      throw new Error('No files selected');
    }

    const firstFile = files[0].name.toLowerCase();
    
    if (firstFile.endsWith('.vti') || firstFile.endsWith('.vtk')) {
      return this.loadVTKData(files[0]);
    }
    
    if (this.isImageFile(firstFile)) {
      return this.loadImageSequence(files);
    }

    if (firstFile.endsWith('.raw')) {
      return this.loadRawData(files[0]);
    }

    throw new Error('Unsupported file format');
  }

  private isImageFile(filename: string): boolean {
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.tiff', '.tif', '.bmp', '.dcm', '.dicom'];
    return imageExtensions.some(ext => filename.endsWith(ext));
  }

  private async loadImageSequence(files: File[]): Promise<VolumeData> {
    const sortedFiles = files.sort((a, b) => {
      const numA = this.extractNumber(a.name);
      const numB = this.extractNumber(b.name);
      return numA - numB;
    });

    const images: ImageData[] = [];
    let width = 0;
    let height = 0;

    for (const file of sortedFiles) {
      const imgData = await this.loadImageFile(file);
      if (images.length === 0) {
        width = imgData.width;
        height = imgData.height;
      }
      images.push(imgData);
    }

    const depth = images.length;
    const scalarData = new Float32Array(width * height * depth);
    
    let minVal = Infinity;
    let maxVal = -Infinity;

    for (let z = 0; z < depth; z++) {
      const imgData = images[z];
      const data = imgData.data;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx2d = (y * width + x) * 4;
          const idx3d = z * width * height + y * width + x;
          const gray = (data[idx2d] + data[idx2d + 1] + data[idx2d + 2]) / 3;
          scalarData[idx3d] = gray;
          minVal = Math.min(minVal, gray);
          maxVal = Math.max(maxVal, gray);
        }
      }
    }

    return {
      dimensions: { x: width, y: height, z: depth },
      spacing: { x: 1, y: 1, z: 1 },
      origin: { x: 0, y: 0, z: 0 },
      scalarData,
      scalarRange: [minVal, maxVal]
    };
  }

  private async loadImageFile(file: File): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Cannot get 2D context'));
            return;
          }
          ctx.drawImage(img, 0, 0);
          resolve(ctx.getImageData(0, 0, img.width, img.height));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private extractNumber(filename: string): number {
    const match = filename.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  private async loadVTKData(file: File): Promise<VolumeData> {
    const buffer = await file.arrayBuffer();
    const text = new TextDecoder().decode(buffer);
    
    if (file.name.toLowerCase().endsWith('.vti')) {
      return this.parseVTI(text, buffer);
    }
    return this.parseLegacyVTK(text);
  }

  private parseVTI(xmlText: string, buffer: ArrayBuffer): VolumeData {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    
    const imageData = xmlDoc.querySelector('ImageData');
    if (!imageData) throw new Error('Invalid VTI file');

    const wholeExtent = imageData.getAttribute('WholeExtent')?.split(' ').map(Number);
    const spacingAttr = imageData.getAttribute('Spacing')?.split(' ').map(Number);
    const originAttr = imageData.getAttribute('Origin')?.split(' ').map(Number);

    if (!wholeExtent || !spacingAttr || !originAttr) {
      throw new Error('Invalid VTI metadata');
    }

    const dimensions = {
      x: wholeExtent[1] - wholeExtent[0] + 1,
      y: wholeExtent[3] - wholeExtent[2] + 1,
      z: wholeExtent[5] - wholeExtent[4] + 1
    };

    const spacing = {
      x: spacingAttr[0],
      y: spacingAttr[1],
      z: spacingAttr[2]
    };

    const origin = {
      x: originAttr[0],
      y: originAttr[1],
      z: originAttr[2]
    };

    const dataArray = xmlDoc.querySelector('DataArray');
    if (!dataArray) throw new Error('No data array found');

    const format = dataArray.getAttribute('format');
    const type = dataArray.getAttribute('type');
    const offset = parseInt(dataArray.getAttribute('offset') || '0', 10);

    let scalarData: Float32Array;
    const dataSize = dimensions.x * dimensions.y * dimensions.z;

    if (format === 'binary' || format === 'appended') {
      const dataView = new DataView(buffer, offset);
      scalarData = new Float32Array(dataSize);
      
      for (let i = 0; i < dataSize; i++) {
        if (type === 'Float32') {
          scalarData[i] = dataView.getFloat32(i * 4, true);
        } else if (type === 'UInt16') {
          scalarData[i] = dataView.getUint16(i * 2, true);
        } else if (type === 'UInt8') {
          scalarData[i] = dataView.getUint8(i);
        } else {
          scalarData[i] = dataView.getFloat32(i * 4, true);
        }
      }
    } else {
      const values = dataArray.textContent?.trim().split(/\s+/).map(Number) || [];
      scalarData = new Float32Array(values);
    }

    let minVal = Infinity;
    let maxVal = -Infinity;
    for (let i = 0; i < scalarData.length; i++) {
      minVal = Math.min(minVal, scalarData[i]);
      maxVal = Math.max(maxVal, scalarData[i]);
    }

    return {
      dimensions,
      spacing,
      origin,
      scalarData,
      scalarRange: [minVal, maxVal]
    };
  }

  private parseLegacyVTK(text: string): VolumeData {
    const lines = text.split('\n');
    let idx = 0;

    while (idx < lines.length && !lines[idx].includes('DATASET')) idx++;
    if (idx >= lines.length) throw new Error('Invalid VTK file');

    idx++;

    let dimensions = { x: 0, y: 0, z: 0 };
    let spacing = { x: 1, y: 1, z: 1 };
    let origin = { x: 0, y: 0, z: 0 };
    let scalarData: Float32Array | null = null;

    while (idx < lines.length) {
      const line = lines[idx].trim();
      if (line.startsWith('DIMENSIONS')) {
        const parts = line.split(/\s+/);
        dimensions = { x: parseInt(parts[1]), y: parseInt(parts[2]), z: parseInt(parts[3]) };
      } else if (line.startsWith('SPACING')) {
        const parts = line.split(/\s+/);
        spacing = { x: parseFloat(parts[1]), y: parseFloat(parts[2]), z: parseFloat(parts[3]) };
      } else if (line.startsWith('ORIGIN')) {
        const parts = line.split(/\s+/);
        origin = { x: parseFloat(parts[1]), y: parseFloat(parts[2]), z: parseFloat(parts[3]) };
      } else if (line.startsWith('LOOKUP_TABLE') || line.startsWith('METADATA')) {
        break;
      } else if (line.startsWith('SCALARS') || line.startsWith('VECTORS')) {
        const parts = line.split(/\s+/);
        const dataType = parts[1];
        const numComp = parseInt(parts[2] || '1');
        idx++;
        const values: number[] = [];
        while (idx < lines.length && values.length < dimensions.x * dimensions.y * dimensions.z * numComp) {
          const valLine = lines[idx].trim();
          if (valLine && !valLine.startsWith('LOOKUP_TABLE')) {
            const vals = valLine.split(/\s+/).map(Number);
            values.push(...vals);
          }
          idx++;
        }
        if (dataType.includes('float')) {
          scalarData = new Float32Array(values);
        } else {
          scalarData = new Float32Array(values);
        }
        break;
      }
      idx++;
    }

    if (!scalarData) {
      throw new Error('No scalar data found in VTK file');
    }

    let minVal = Infinity;
    let maxVal = -Infinity;
    for (let i = 0; i < scalarData.length; i++) {
      minVal = Math.min(minVal, scalarData[i]);
      maxVal = Math.max(maxVal, scalarData[i]);
    }

    return {
      dimensions,
      spacing,
      origin,
      scalarData,
      scalarRange: [minVal, maxVal]
    };
  }

  private async loadRawData(file: File): Promise<VolumeData> {
    const buffer = await file.arrayBuffer();
    const dataView = new DataView(buffer);
    
    const headerSize = 0;
    const bytesPerVoxel = 2;
    const dimX = 256;
    const dimY = 256;
    const dimZ = Math.floor((buffer.byteLength - headerSize) / (dimX * dimY * bytesPerVoxel));
    
    const totalVoxels = dimX * dimY * dimZ;
    const scalarData = new Float32Array(totalVoxels);
    
    let minVal = Infinity;
    let maxVal = -Infinity;
    
    for (let i = 0; i < totalVoxels; i++) {
      const val = dataView.getUint16(headerSize + i * bytesPerVoxel, true);
      scalarData[i] = val;
      minVal = Math.min(minVal, val);
      maxVal = Math.max(maxVal, val);
    }

    return {
      dimensions: { x: dimX, y: dimY, z: dimZ },
      spacing: { x: 1, y: 1, z: 1 },
      origin: { x: 0, y: 0, z: 0 },
      scalarData,
      scalarRange: [minVal, maxVal]
    };
  }

  createSyntheticFractureData(): VolumeData {
    const dimX = 128;
    const dimY = 128;
    const dimZ = 128;
    const totalVoxels = dimX * dimY * dimZ;
    const scalarData = new Float32Array(totalVoxels);

    for (let z = 0; z < dimZ; z++) {
      for (let y = 0; y < dimY; y++) {
        for (let x = 0; x < dimX; x++) {
          const idx = z * dimX * dimY + y * dimX + x;
          let val = 128 + Math.random() * 20;

          const cx = dimX / 2;
          const cy = dimY / 2;
          const cz = dimZ / 2;

          const plane1Dist = Math.abs(0.5 * (x - cx) + 0.8 * (y - cy) + 0.3 * (z - cz));
          if (plane1Dist < 2) {
            val = 50 + Math.random() * 10;
          }

          const plane2Dist = Math.abs(0.7 * (x - cx) - 0.4 * (y - cy) + 0.6 * (z - cz) - 15);
          if (plane2Dist < 1.5) {
            val = 45 + Math.random() * 10;
          }

          const plane3Dist = Math.abs(-0.3 * (x - cx) + 0.2 * (y - cy) + 0.9 * (z - cz) + 20);
          if (plane3Dist < 2.5) {
            val = 55 + Math.random() * 10;
          }

          const sphereDist = Math.sqrt(
            Math.pow(x - cx - 20, 2) + 
            Math.pow(y - cy + 10, 2) + 
            Math.pow(z - cz, 2)
          );
          if (sphereDist < 15 && sphereDist > 12) {
            val = 40 + Math.random() * 15;
          }

          const noise = Math.random() * 10 - 5;
          val += noise;

          scalarData[idx] = Math.max(0, Math.min(255, val));
        }
      }
    }

    return {
      dimensions: { x: dimX, y: dimY, z: dimZ },
      spacing: { x: 1, y: 1, z: 1 },
      origin: { x: 0, y: 0, z: 0 },
      scalarData,
      scalarRange: [0, 255]
    };
  }
}
