import {
  VolumeData,
  Point3D,
  GraphNode,
  GraphEdge,
  FractureGraph,
  ConnectedComponent,
  FlowPath,
  PercolationResult,
  FlowProperties
} from '../types';

export class FractureNetworkAnalyzer {
  private volume: VolumeData;
  private fractureMask: Uint8Array;
  private normals?: Float32Array;
  private response?: Float32Array;

  private graph: FractureGraph | null = null;
  private components: ConnectedComponent[] = [];

  constructor(
    volume: VolumeData,
    fractureMask: Uint8Array,
    normals?: Float32Array,
    response?: Float32Array
  ) {
    this.volume = volume;
    this.fractureMask = fractureMask;
    this.normals = normals;
    this.response = response;
  }

  buildGraph(connectivity: 6 | 18 | 26 = 6): FractureGraph {
    const { dimensions } = this.volume;
    const totalVoxels = dimensions.x * dimensions.y * dimensions.z;

    const nodes = new Map<number, GraphNode>();
    const edges = new Map<string, GraphEdge>();
    const voxelToNode = new Map<number, number>();

    let nodeId = 0;

    const neighbors = this.getNeighborOffsets(connectivity);

    for (let i = 0; i < totalVoxels; i++) {
      if (this.fractureMask[i] === 0) continue;

      if (!voxelToNode.has(i)) {
        const pos = this.indexToPosition(i);
        const node: GraphNode = {
          id: nodeId,
          position: pos,
          voxelIndex: i,
          connectedNodes: [],
          normal: this.getNormal(i),
          aperture: this.getAperture(i)
        };
        nodes.set(nodeId, node);
        voxelToNode.set(i, nodeId);
        nodeId++;
      }

      const currentNodeId = voxelToNode.get(i)!;

      for (const [dx, dy, dz] of neighbors) {
        const ni = this.getNeighborIndex(i, dx, dy, dz);
        if (ni === -1 || this.fractureMask[ni] === 0) continue;

        if (!voxelToNode.has(ni)) {
          const npos = this.indexToPosition(ni);
          const neighborNode: GraphNode = {
            id: nodeId,
            position: npos,
            voxelIndex: ni,
            connectedNodes: [],
            normal: this.getNormal(ni),
            aperture: this.getAperture(ni)
          };
          nodes.set(nodeId, neighborNode);
          voxelToNode.set(ni, nodeId);
          nodeId++;
        }

        const neighborNodeId = voxelToNode.get(ni)!;
        if (currentNodeId < neighborNodeId) {
          const edgeId = `${currentNodeId}-${neighborNodeId}`;
          if (!edges.has(edgeId)) {
            const distance = this.calculateDistance(
              nodes.get(currentNodeId)!.position,
              nodes.get(neighborNodeId)!.position
            );
            const avgAperture = this.calculateAvgAperture(
              nodes.get(currentNodeId)!.aperture,
              nodes.get(neighborNodeId)!.aperture
            );
            const edge: GraphEdge = {
              id: edgeId,
              from: currentNodeId,
              to: neighborNodeId,
              weight: distance / Math.max(avgAperture, 0.01),
              distance,
              aperture: avgAperture
            };
            edges.set(edgeId, edge);

            nodes.get(currentNodeId)!.connectedNodes.push(neighborNodeId);
            nodes.get(neighborNodeId)!.connectedNodes.push(currentNodeId);
          }
        }
      }
    }

    this.graph = {
      nodes,
      edges,
      nodeCount: nodes.size,
      edgeCount: edges.size
    };

    return this.graph;
  }

  private getNeighborOffsets(connectivity: 6 | 18 | 26): number[][] {
    const offsets: number[][] = [];

    for (let dz = -1; dz <= 1; dz++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0 && dz === 0) continue;

          const sumAbs = Math.abs(dx) + Math.abs(dy) + Math.abs(dz);

          if (connectivity === 6 && sumAbs === 1) {
            offsets.push([dx, dy, dz]);
          } else if (connectivity === 18 && sumAbs <= 2) {
            offsets.push([dx, dy, dz]);
          } else if (connectivity === 26) {
            offsets.push([dx, dy, dz]);
          }
        }
      }
    }

    return offsets;
  }

  private indexToPosition(index: number): Point3D {
    const { dimensions, spacing, origin } = this.volume;
    const z = Math.floor(index / (dimensions.x * dimensions.y));
    const y = Math.floor((index % (dimensions.x * dimensions.y)) / dimensions.x);
    const x = index % dimensions.x;

    return {
      x: origin.x + x * spacing.x,
      y: origin.y + y * spacing.y,
      z: origin.z + z * spacing.z
    };
  }

  private getNeighborIndex(index: number, dx: number, dy: number, dz: number): number {
    const { dimensions } = this.volume;
    const z = Math.floor(index / (dimensions.x * dimensions.y));
    const y = Math.floor((index % (dimensions.x * dimensions.y)) / dimensions.x);
    const x = index % dimensions.x;

    const nx = x + dx;
    const ny = y + dy;
    const nz = z + dz;

    if (nx < 0 || nx >= dimensions.x || ny < 0 || ny >= dimensions.y || nz < 0 || nz >= dimensions.z) {
      return -1;
    }

    return nz * dimensions.x * dimensions.y + ny * dimensions.x + nx;
  }

  private getNormal(index: number): Point3D | undefined {
    if (!this.normals) return undefined;
    return {
      x: this.normals[index * 3],
      y: this.normals[index * 3 + 1],
      z: this.normals[index * 3 + 2]
    };
  }

  private getAperture(index: number): number {
    if (!this.response) return 1.0;
    return Math.max(0.1, this.response[index] * 5);
  }

  private calculateDistance(p1: Point3D, p2: Point3D): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dz = p2.z - p1.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private calculateAvgAperture(a1?: number, a2?: number): number {
    return ((a1 || 1.0) + (a2 || 1.0)) / 2;
  }

  findConnectedComponents(): ConnectedComponent[] {
    if (!this.graph) {
      this.buildGraph();
    }

    const { nodes } = this.graph!;
    const visited = new Set<number>();
    const components: ConnectedComponent[] = [];
    let componentId = 0;

    for (const [nodeId, _node] of nodes) {
      if (visited.has(nodeId)) continue;

      const queue: number[] = [nodeId];
      visited.add(nodeId);
      const componentNodes: number[] = [];

      let minX = Infinity, minY = Infinity, minZ = Infinity;
      let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

      while (queue.length > 0) {
        const currentId = queue.shift()!;
        const currentNode = nodes.get(currentId)!;
        componentNodes.push(currentId);
        currentNode.componentId = componentId;

        minX = Math.min(minX, currentNode.position.x);
        minY = Math.min(minY, currentNode.position.y);
        minZ = Math.min(minZ, currentNode.position.z);
        maxX = Math.max(maxX, currentNode.position.x);
        maxY = Math.max(maxY, currentNode.position.y);
        maxZ = Math.max(maxZ, currentNode.position.z);

        for (const neighborId of currentNode.connectedNodes) {
          if (!visited.has(neighborId)) {
            visited.add(neighborId);
            queue.push(neighborId);
          }
        }
      }

      components.push({
        id: componentId,
        nodeIds: componentNodes,
        size: componentNodes.length,
        boundingBox: {
          min: { x: minX, y: minY, z: minZ },
          max: { x: maxX, y: maxY, z: maxZ }
        }
      });

      componentId++;
    }

    this.components = components.sort((a, b) => b.size - a.size);
    return this.components;
  }

  findBoundaryNodes(
    boundary: 'minX' | 'maxX' | 'minY' | 'maxY' | 'minZ' | 'maxZ'
  ): number[] {
    if (!this.graph) {
      this.buildGraph();
    }

    const { dimensions, spacing, origin } = this.volume;
    const boundaryNodes: number[] = [];
    const threshold = spacing.x * 0.5;

    let boundaryValue: number;
    let coordGetter: (pos: Point3D) => number;

    switch (boundary) {
      case 'minX':
        boundaryValue = origin.x;
        coordGetter = (p) => p.x;
        break;
      case 'maxX':
        boundaryValue = origin.x + (dimensions.x - 1) * spacing.x;
        coordGetter = (p) => p.x;
        break;
      case 'minY':
        boundaryValue = origin.y;
        coordGetter = (p) => p.y;
        break;
      case 'maxY':
        boundaryValue = origin.y + (dimensions.y - 1) * spacing.y;
        coordGetter = (p) => p.y;
        break;
      case 'minZ':
        boundaryValue = origin.z;
        coordGetter = (p) => p.z;
        break;
      case 'maxZ':
        boundaryValue = origin.z + (dimensions.z - 1) * spacing.z;
        coordGetter = (p) => p.z;
        break;
    }

    for (const [nodeId, node] of this.graph!.nodes) {
      if (Math.abs(coordGetter(node.position) - boundaryValue) < threshold) {
        boundaryNodes.push(nodeId);
      }
    }

    return boundaryNodes;
  }

  findShortestPath(
    startNodeId: number,
    endNodeId: number,
    weightType: 'distance' | 'aperture' | 'combined' = 'distance'
  ): FlowPath | null {
    if (!this.graph) {
      this.buildGraph();
    }

    const { nodes, edges } = this.graph!;

    if (!nodes.has(startNodeId) || !nodes.has(endNodeId)) {
      return null;
    }

    const distances = new Map<number, number>();
    const previous = new Map<number, number | null>();
    const visited = new Set<number>();

    for (const [nodeId] of nodes) {
      distances.set(nodeId, Infinity);
      previous.set(nodeId, null);
    }
    distances.set(startNodeId, 0);

    const priorityQueue: number[] = [startNodeId];

    while (priorityQueue.length > 0) {
      priorityQueue.sort((a, b) => distances.get(a)! - distances.get(b)!);
      const currentId = priorityQueue.shift()!;

      if (currentId === endNodeId) break;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const currentNode = nodes.get(currentId)!;

      for (const neighborId of currentNode.connectedNodes) {
        if (visited.has(neighborId)) continue;

        const edgeId = currentId < neighborId
          ? `${currentId}-${neighborId}`
          : `${neighborId}-${currentId}`;
        const edge = edges.get(edgeId);

        if (!edge) continue;

        let weight: number;
        switch (weightType) {
          case 'aperture':
            weight = 1 / Math.max(edge.aperture || 1, 0.01);
            break;
          case 'combined':
            weight = edge.weight;
            break;
          case 'distance':
          default:
            weight = edge.distance;
            break;
        }

        const newDistance = distances.get(currentId)! + weight;
        if (newDistance < distances.get(neighborId)!) {
          distances.set(neighborId, newDistance);
          previous.set(neighborId, currentId);
          priorityQueue.push(neighborId);
        }
      }
    }

    if (distances.get(endNodeId) === Infinity) {
      return null;
    }

    const pathNodeIds: number[] = [];
    let current: number | null = endNodeId;

    while (current !== null) {
      pathNodeIds.unshift(current);
      current = previous.get(current) || null;
    }

    return this.buildFlowPath(pathNodeIds);
  }

  findPathsBetweenBoundaries(
    inletBoundary: 'minX' | 'maxX' | 'minY' | 'maxY' | 'minZ' | 'maxZ',
    outletBoundary: 'minX' | 'maxX' | 'minY' | 'maxY' | 'minZ' | 'maxZ',
    maxPaths: number = 5
  ): PercolationResult {
    const inletNodes = this.findBoundaryNodes(inletBoundary);
    const outletNodes = this.findBoundaryNodes(outletBoundary);

    const paths: FlowPath[] = [];
    const visitedPairs = new Set<string>();

    for (const inletId of inletNodes.slice(0, 10)) {
      for (const outletId of outletNodes.slice(0, 10)) {
        const pairKey = `${inletId}-${outletId}`;
        if (visitedPairs.has(pairKey)) continue;
        visitedPairs.add(pairKey);

        const path = this.findShortestPath(inletId, outletId, 'combined');
        if (path) {
          paths.push(path);
          if (paths.length >= maxPaths) break;
        }
      }
      if (paths.length >= maxPaths) break;
    }

    paths.sort((a, b) => a.totalLength - b.totalLength);

    const uniquePaths = this.deduplicatePaths(paths);

    return {
      hasPercolatingPath: uniquePaths.length > 0,
      paths: uniquePaths,
      shortestPath: uniquePaths[0],
      widestPath: uniquePaths.sort((a, b) => b.minAperture - a.minAperture)[0],
      connectivity: this.calculateConnectivity(inletNodes, outletNodes),
      percolationThreshold: this.estimatePercolationThreshold()
    };
  }

  private deduplicatePaths(paths: FlowPath[]): FlowPath[] {
    const unique: FlowPath[] = [];
    const pathSignatures = new Set<string>();

    for (const path of paths) {
      const signature = path.nodeIds.slice(0, 3).join('-') + '-' + path.nodeIds.slice(-3).join('-');
      if (!pathSignatures.has(signature)) {
        pathSignatures.add(signature);
        unique.push(path);
      }
    }

    return unique;
  }

  private buildFlowPath(nodeIds: number[]): FlowPath {
    if (!this.graph || nodeIds.length < 2) {
      return {
        nodeIds,
        positions: [],
        totalLength: 0,
        minAperture: 0,
        avgAperture: 0,
        tortuosity: 1
      };
    }

    const positions: Point3D[] = [];
    let totalLength = 0;
    let minAperture = Infinity;
    let sumAperture = 0;

    for (let i = 0; i < nodeIds.length; i++) {
      const node = this.graph.nodes.get(nodeIds[i])!;
      positions.push(node.position);

      if (node.aperture !== undefined) {
        minAperture = Math.min(minAperture, node.aperture);
        sumAperture += node.aperture;
      }

      if (i > 0) {
        const prevNode = this.graph.nodes.get(nodeIds[i - 1])!;
        totalLength += this.calculateDistance(prevNode.position, node.position);
      }
    }

    const startPos = positions[0];
    const endPos = positions[positions.length - 1];
    const straightDistance = this.calculateDistance(startPos, endPos);
    const tortuosity = straightDistance > 0 ? totalLength / straightDistance : 1;

    return {
      nodeIds,
      positions,
      totalLength,
      minAperture: minAperture === Infinity ? 1 : minAperture,
      avgAperture: sumAperture / nodeIds.length,
      tortuosity
    };
  }

  private calculateConnectivity(inletNodes: number[], outletNodes: number[]): number {
    if (this.components.length === 0) {
      this.findConnectedComponents();
    }

    let connectedPairs = 0;
    const totalPairs = inletNodes.length * outletNodes.length;

    if (totalPairs === 0) return 0;

    const inletComponents = new Set<number>();
    const outletComponents = new Set<number>();

    for (const nodeId of inletNodes) {
      const node = this.graph?.nodes.get(nodeId);
      if (node && node.componentId !== undefined) {
        inletComponents.add(node.componentId);
      }
    }

    for (const nodeId of outletNodes) {
      const node = this.graph?.nodes.get(nodeId);
      if (node && node.componentId !== undefined) {
        outletComponents.add(node.componentId);
      }
    }

    for (const compId of inletComponents) {
      if (outletComponents.has(compId)) {
        connectedPairs++;
      }
    }

    return connectedPairs / Math.max(inletComponents.size, 1);
  }

  private estimatePercolationThreshold(): number {
    if (this.components.length === 0) {
      this.findConnectedComponents();
    }

    const { dimensions } = this.volume;
    const totalVoxels = dimensions.x * dimensions.y * dimensions.z;
    const fractureVoxels = this.fractureMask.filter(v => v > 0).length;
    const porosity = fractureVoxels / totalVoxels;

    const largestComponent = this.components[0];
    if (!largestComponent) return 0;

    const largestComponentRatio = largestComponent.size / this.graph!.nodeCount;

    return porosity * largestComponentRatio;
  }

  calculateFlowProperties(): FlowProperties {
    if (this.components.length === 0) {
      this.findConnectedComponents();
    }

    const { dimensions } = this.volume;
    const totalVoxels = dimensions.x * dimensions.y * dimensions.z;
    const fractureVoxels = this.fractureMask.filter(v => v > 0).length;
    const porosity = fractureVoxels / totalVoxels;

    const largestComponent = this.components[0];
    const largestClusterSize = largestComponent ? largestComponent.size : 0;

    const xInlet = this.findBoundaryNodes('minX');
    const xOutlet = this.findBoundaryNodes('maxX');
    const xConnectivity = this.calculateConnectivity(xInlet, xOutlet);

    const yInlet = this.findBoundaryNodes('minY');
    const yOutlet = this.findBoundaryNodes('maxY');
    const yConnectivity = this.calculateConnectivity(yInlet, yOutlet);

    const zInlet = this.findBoundaryNodes('minZ');
    const zOutlet = this.findBoundaryNodes('maxZ');
    const zConnectivity = this.calculateConnectivity(zInlet, zOutlet);

    const avgConnectivity = (xConnectivity + yConnectivity + zConnectivity) / 3;

    const permeability = this.estimatePermeability(porosity, avgConnectivity);

    const xResult = this.findPathsBetweenBoundaries('minX', 'maxX', 1);
    const yResult = this.findPathsBetweenBoundaries('minY', 'maxY', 1);
    const zResult = this.findPathsBetweenBoundaries('minZ', 'maxZ', 1);

    const percolationProbability =
      (xResult.hasPercolatingPath ? 1 : 0) +
      (yResult.hasPercolatingPath ? 1 : 0) +
      (zResult.hasPercolatingPath ? 1 : 0) / 3;

    return {
      porosity,
      permeability,
      connectivity: avgConnectivity,
      clusterCount: this.components.length,
      largestClusterSize,
      percolationProbability
    };
  }

  private estimatePermeability(porosity: number, connectivity: number): number {
    const k0 = 1e-12;
    const cementationFactor = 2.5;
    return k0 * Math.pow(porosity, cementationFactor) * connectivity;
  }

  getGraph(): FractureGraph | null {
    return this.graph;
  }

  getComponents(): ConnectedComponent[] {
    return this.components;
  }

  getNodePositions(): Float32Array {
    if (!this.graph) {
      this.buildGraph();
    }

    const positions = new Float32Array(this.graph!.nodeCount * 3);
    let idx = 0;

    for (const [, node] of this.graph!.nodes) {
      positions[idx++] = node.position.x;
      positions[idx++] = node.position.y;
      positions[idx++] = node.position.z;
    }

    return positions;
  }

  getEdgePositions(): Float32Array {
    if (!this.graph) {
      this.buildGraph();
    }

    const positions = new Float32Array(this.graph!.edgeCount * 6);
    let idx = 0;

    for (const [, edge] of this.graph!.edges) {
      const fromNode = this.graph!.nodes.get(edge.from)!;
      const toNode = this.graph!.nodes.get(edge.to)!;

      positions[idx++] = fromNode.position.x;
      positions[idx++] = fromNode.position.y;
      positions[idx++] = fromNode.position.z;
      positions[idx++] = toNode.position.x;
      positions[idx++] = toNode.position.y;
      positions[idx++] = toNode.position.z;
    }

    return positions;
  }

  getPathPositions(path: FlowPath): { positions: Float32Array; indices: Uint32Array } {
    const positions = new Float32Array(path.positions.length * 3);
    const indices = new Uint32Array(path.positions.length);

    for (let i = 0; i < path.positions.length; i++) {
      positions[i * 3] = path.positions[i].x;
      positions[i * 3 + 1] = path.positions[i].y;
      positions[i * 3 + 2] = path.positions[i].z;
      indices[i] = i;
    }

    return { positions, indices };
  }
}
