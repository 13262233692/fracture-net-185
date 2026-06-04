import { VolumeData, MeshData, Point3D } from '../types';

const EDGE_TABLE = new Uint32Array([
  0x0  , 0x109, 0x203, 0x30a, 0x406, 0x50f, 0x605, 0x70c,
  0x80c, 0x905, 0xa0f, 0xb06, 0xc0a, 0xd03, 0xe09, 0xf00,
  0x190, 0x99 , 0x393, 0x29a, 0x596, 0x49f, 0x795, 0x69c,
  0x99c, 0x895, 0xb9f, 0xa96, 0xd9a, 0xc93, 0xf99, 0xe90,
  0x230, 0x339, 0x33 , 0x13a, 0x636, 0x73f, 0x435, 0x53c,
  0xa3c, 0xb35, 0x83f, 0x936, 0xe3a, 0xf33, 0xc39, 0xd30,
  0x3a0, 0x2a9, 0x1a3, 0xaa , 0x7a6, 0x6af, 0x5a5, 0x4ac,
  0xbac, 0xaa5, 0x9af, 0x8a6, 0xfaa, 0xea3, 0xda9, 0xca0,
  0x460, 0x569, 0x663, 0x76a, 0x66 , 0x16f, 0x265, 0x36c,
  0xc6c, 0xd65, 0xe6f, 0xf66, 0x86a, 0x963, 0xa69, 0xb60,
  0x5f0, 0x4f9, 0x7f3, 0x6fa, 0x1f6, 0xff , 0x3f5, 0x2fc,
  0xdfc, 0xcf5, 0xfff, 0xef6, 0x9fa, 0x8f3, 0xbf9, 0xaf0,
  0x650, 0x759, 0x453, 0x55a, 0x256, 0x35f, 0x55 , 0x15c,
  0xe5c, 0xf55, 0xc5f, 0xd56, 0xa5a, 0xb53, 0x859, 0x950,
  0x7c0, 0x6c9, 0x5c3, 0x4ca, 0x3c6, 0x2cf, 0x1c5, 0xcc ,
  0xfcc, 0xec5, 0xdcf, 0xcc6, 0xbca, 0xac3, 0x9c9, 0x8c0,
  0x8c0, 0x9c9, 0xac3, 0xbca, 0xcc6, 0xdcf, 0xec5, 0xfcc,
  0xcc , 0x1c5, 0x2cf, 0x3c6, 0x4ca, 0x5c3, 0x6c9, 0x7c0,
  0x950, 0x859, 0xb53, 0xa5a, 0xd56, 0xc5f, 0xf55, 0xe5c,
  0x15c, 0x55 , 0x35f, 0x256, 0x55a, 0x453, 0x759, 0x650,
  0xaf0, 0xbf9, 0x8f3, 0x9fa, 0xef6, 0xfff, 0xcf5, 0xdfc,
  0x2fc, 0x3f5, 0xff , 0x1f6, 0x6fa, 0x7f3, 0x4f9, 0x5f0,
  0xb60, 0xa69, 0x963, 0x86a, 0xf66, 0xe6f, 0xd65, 0xc6c,
  0x36c, 0x265, 0x16f, 0x66 , 0x76a, 0x663, 0x569, 0x460,
  0xca0, 0xda9, 0xea3, 0xfaa, 0x8a6, 0x9af, 0xaa5, 0xbac,
  0x4ac, 0x5a5, 0x6af, 0x7a6, 0xaa , 0x1a3, 0x2a9, 0x3a0,
  0xd30, 0xc39, 0xf33, 0xe3a, 0x936, 0x83f, 0xb35, 0xa3c,
  0x53c, 0x435, 0x73f, 0x636, 0x13a, 0x33 , 0x339, 0x230,
  0xe90, 0xf99, 0xc93, 0xd9a, 0xa96, 0xb9f, 0x895, 0x99c,
  0x69c, 0x795, 0x49f, 0x596, 0x29a, 0x393, 0x99 , 0x190,
  0xf00, 0xe09, 0xd03, 0xc0a, 0xb06, 0xa0f, 0x905, 0x80c,
  0x70c, 0x605, 0x50f, 0x406, 0x30a, 0x203, 0x109, 0x0
]);

const TRIANGLE_TABLE = new Int32Array([
  -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  0, 8, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  0, 1, 9, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  1, 8, 3, 9, 8, 1, -1, -1, -1, -1, -1, -1,
  1, 2, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  0, 8, 3, 1, 2, 10, -1, -1, -1, -1, -1, -1,
  9, 2, 10, 0, 2, 9, -1, -1, -1, -1, -1, -1,
  2, 8, 3, 2, 10, 8, 10, 9, 8, -1, -1, -1,
  3, 11, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  0, 11, 2, 8, 11, 0, -1, -1, -1, -1, -1, -1,
  1, 9, 0, 2, 3, 11, -1, -1, -1, -1, -1, -1,
  1, 11, 2, 1, 9, 11, 9, 8, 11, -1, -1, -1,
  3, 10, 1, 11, 10, 3, -1, -1, -1, -1, -1, -1,
  0, 10, 1, 0, 8, 10, 8, 11, 10, -1, -1, -1,
  3, 9, 0, 3, 11, 9, 11, 10, 9, -1, -1, -1,
  9, 8, 10, 10, 8, 11, -1, -1, -1, -1, -1, -1,
  4, 7, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  4, 3, 0, 7, 3, 4, -1, -1, -1, -1, -1, -1,
  0, 1, 9, 8, 4, 7, -1, -1, -1, -1, -1, -1,
  4, 1, 9, 4, 7, 1, 7, 3, 1, -1, -1, -1,
  1, 2, 10, 8, 4, 7, -1, -1, -1, -1, -1, -1,
  3, 4, 7, 3, 0, 4, 1, 2, 10, -1, -1, -1,
  9, 2, 10, 9, 0, 2, 8, 4, 7, -1, -1, -1,
  2, 10, 9, 2, 9, 7, 2, 7, 3, 7, 9, 4,
  8, 4, 7, 3, 11, 2, -1, -1, -1, -1, -1, -1,
  11, 4, 7, 11, 2, 4, 2, 0, 4, -1, -1, -1,
  9, 0, 1, 8, 4, 7, 2, 3, 11, -1, -1, -1,
  4, 7, 11, 9, 4, 11, 9, 11, 2, 9, 2, 1,
  3, 10, 1, 3, 11, 10, 7, 8, 4, -1, -1, -1,
  1, 11, 10, 1, 4, 11, 1, 0, 4, 7, 11, 4,
  4, 7, 8, 9, 0, 11, 9, 11, 10, 11, 0, 3,
  4, 7, 11, 4, 11, 9, 9, 11, 10, -1, -1, -1,
  9, 5, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  9, 5, 4, 0, 8, 3, -1, -1, -1, -1, -1, -1,
  0, 5, 4, 1, 5, 0, -1, -1, -1, -1, -1, -1,
  8, 5, 4, 8, 3, 5, 3, 1, 5, -1, -1, -1,
  1, 2, 10, 9, 5, 4, -1, -1, -1, -1, -1, -1,
  3, 0, 8, 1, 2, 10, 4, 9, 5, -1, -1, -1,
  5, 2, 10, 5, 4, 2, 4, 0, 2, -1, -1, -1,
  2, 10, 5, 3, 2, 5, 3, 5, 4, 3, 4, 8,
  9, 5, 4, 2, 3, 11, -1, -1, -1, -1, -1, -1,
  0, 11, 2, 0, 8, 11, 4, 9, 5, -1, -1, -1,
  0, 5, 4, 0, 1, 5, 2, 3, 11, -1, -1, -1,
  8, 11, 2, 8, 5, 11, 8, 4, 5, 6, 11, 5,
  10, 3, 11, 10, 1, 3, 9, 5, 4, -1, -1, -1,
  4, 9, 5, 0, 8, 1, 8, 10, 1, 8, 11, 10,
  5, 4, 0, 5, 0, 11, 5, 11, 10, 11, 0, 3,
  5, 4, 8, 5, 8, 10, 10, 8, 11, -1, -1, -1,
  9, 7, 8, 5, 7, 9, -1, -1, -1, -1, -1, -1,
  9, 3, 0, 9, 5, 3, 5, 7, 3, -1, -1, -1,
  0, 7, 8, 0, 1, 7, 1, 5, 7, -1, -1, -1,
  1, 5, 3, 3, 5, 7, -1, -1, -1, -1, -1, -1,
  9, 7, 8, 9, 5, 7, 10, 1, 2, -1, -1, -1,
  10, 1, 2, 9, 5, 0, 5, 3, 0, 5, 7, 3,
  8, 0, 2, 8, 2, 5, 8, 5, 7, 10, 5, 2,
  2, 10, 5, 2, 5, 3, 3, 5, 7, -1, -1, -1,
  7, 9, 5, 7, 8, 9, 3, 11, 2, -1, -1, -1,
  9, 5, 7, 9, 7, 2, 9, 2, 0, 2, 7, 11,
  2, 3, 11, 0, 1, 8, 1, 7, 8, 1, 5, 7,
  11, 2, 1, 11, 1, 7, 7, 1, 5, -1, -1, -1,
  9, 5, 8, 8, 5, 7, 10, 1, 3, 10, 3, 11,
  5, 7, 0, 5, 0, 9, 7, 11, 0, 1, 0, 10, 11, 10, 0,
  11, 10, 0, 11, 0, 3, 10, 5, 0, 8, 0, 7, 5, 7, 0,
  11, 10, 5, 7, 11, 5, -1, -1, -1, -1, -1, -1,
  10, 6, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  0, 8, 3, 5, 10, 6, -1, -1, -1, -1, -1, -1,
  9, 0, 1, 5, 10, 6, -1, -1, -1, -1, -1, -1,
  1, 8, 3, 1, 9, 8, 5, 10, 6, -1, -1, -1,
  1, 6, 5, 2, 6, 1, -1, -1, -1, -1, -1, -1,
  1, 6, 5, 1, 2, 6, 3, 0, 8, -1, -1, -1,
  9, 6, 5, 9, 0, 6, 0, 2, 6, -1, -1, -1,
  5, 9, 8, 5, 8, 2, 5, 2, 6, 3, 2, 8,
  2, 3, 11, 10, 6, 5, -1, -1, -1, -1, -1, -1,
  11, 0, 8, 11, 2, 0, 10, 6, 5, -1, -1, -1,
  0, 1, 9, 2, 3, 11, 5, 10, 6, -1, -1, -1,
  5, 10, 6, 1, 9, 2, 9, 11, 2, 9, 8, 11,
  6, 3, 11, 6, 5, 3, 5, 1, 3, -1, -1, -1,
  0, 8, 11, 0, 11, 5, 0, 5, 1, 5, 11, 6,
  3, 11, 6, 0, 3, 6, 0, 6, 5, 0, 5, 9,
  6, 5, 9, 6, 9, 11, 11, 9, 8, -1, -1, -1,
  5, 10, 6, 4, 7, 8, -1, -1, -1, -1, -1, -1,
  4, 3, 0, 4, 7, 3, 6, 5, 10, -1, -1, -1,
  1, 9, 0, 5, 10, 6, 8, 4, 7, -1, -1, -1,
  10, 6, 5, 1, 9, 7, 1, 7, 3, 7, 9, 4,
  6, 1, 2, 6, 5, 1, 4, 7, 8, -1, -1, -1,
  1, 2, 5, 5, 2, 6, 3, 0, 4, 3, 4, 7,
  8, 4, 7, 9, 0, 5, 0, 6, 5, 0, 2, 6,
  7, 3, 9, 7, 9, 4, 3, 2, 9, 5, 9, 6, 2, 6, 9,
  3, 11, 2, 7, 8, 4, 10, 6, 5, -1, -1, -1,
  5, 10, 6, 4, 7, 2, 4, 2, 0, 2, 7, 11,
  0, 1, 9, 4, 7, 8, 2, 3, 11, 5, 10, 6,
  9, 2, 1, 9, 11, 2, 9, 4, 11, 7, 11, 4, 5, 10, 6,
  8, 4, 7, 3, 11, 5, 3, 5, 1, 5, 11, 6,
  5, 1, 11, 5, 11, 6, 1, 0, 11, 7, 11, 4, 0, 4, 11,
  0, 5, 9, 0, 6, 5, 0, 3, 6, 11, 6, 3, 8, 4, 7,
  6, 5, 9, 6, 9, 11, 4, 7, 9, 7, 11, 9, -1, -1, -1,
  10, 4, 9, 6, 4, 10, -1, -1, -1, -1, -1, -1,
  4, 10, 6, 4, 9, 10, 0, 8, 3, -1, -1, -1,
  10, 0, 1, 10, 6, 0, 6, 4, 0, -1, -1, -1,
  8, 3, 1, 8, 1, 6, 8, 6, 4, 6, 1, 10,
  1, 4, 9, 1, 2, 4, 2, 6, 4, -1, -1, -1,
  3, 0, 8, 1, 2, 9, 2, 4, 9, 2, 6, 4,
  0, 2, 4, 4, 2, 6, -1, -1, -1, -1, -1, -1,
  8, 3, 2, 8, 2, 4, 4, 2, 6, -1, -1, -1,
  10, 4, 9, 10, 6, 4, 11, 2, 3, -1, -1, -1,
  0, 8, 2, 2, 8, 11, 4, 9, 10, 4, 10, 6,
  3, 11, 2, 0, 1, 6, 0, 6, 4, 6, 1, 10,
  6, 4, 1, 6, 1, 10, 4, 8, 1, 2, 1, 11, 8, 11, 1,
  9, 6, 4, 9, 3, 6, 9, 1, 3, 11, 6, 3,
  8, 11, 1, 8, 1, 0, 11, 6, 1, 9, 1, 4, 6, 4, 1,
  3, 11, 6, 3, 6, 0, 0, 6, 4, -1, -1, -1,
  6, 4, 8, 11, 6, 8, -1, -1, -1, -1, -1, -1,
  7, 10, 6, 7, 8, 10, 8, 9, 10, -1, -1, -1,
  0, 7, 3, 0, 10, 7, 0, 9, 10, 6, 7, 10,
  10, 6, 7, 1, 10, 7, 1, 7, 8, 1, 8, 0,
  10, 6, 7, 10, 7, 1, 1, 7, 3, -1, -1, -1,
  1, 2, 6, 1, 6, 8, 1, 8, 9, 8, 6, 7,
  2, 6, 9, 2, 9, 1, 6, 7, 9, 0, 9, 3, 7, 3, 9,
  7, 8, 0, 7, 0, 6, 6, 0, 2, -1, -1, -1,
  7, 3, 2, 6, 7, 2, -1, -1, -1, -1, -1, -1,
  2, 3, 11, 10, 6, 8, 10, 8, 9, 8, 6, 7,
  2, 0, 7, 2, 7, 11, 0, 9, 7, 6, 7, 10, 9, 10, 7,
  1, 8, 0, 1, 7, 8, 1, 10, 7, 6, 7, 10, 2, 3, 11,
  11, 2, 1, 11, 1, 7, 10, 6, 1, 6, 7, 1, -1, -1, -1,
  8, 9, 6, 8, 6, 7, 9, 1, 6, 11, 6, 3, 1, 3, 6,
  0, 9, 1, 11, 6, 7, -1, -1, -1, -1, -1, -1,
  7, 8, 0, 7, 0, 6, 3, 11, 0, 11, 6, 0, -1, -1, -1,
  7, 11, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  7, 6, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  3, 0, 8, 11, 7, 6, -1, -1, -1, -1, -1, -1,
  0, 1, 9, 11, 7, 6, -1, -1, -1, -1, -1, -1,
  8, 1, 9, 8, 3, 1, 11, 7, 6, -1, -1, -1,
  10, 1, 2, 6, 11, 7, -1, -1, -1, -1, -1, -1,
  1, 2, 10, 3, 0, 8, 6, 11, 7, -1, -1, -1,
  2, 9, 0, 2, 10, 9, 6, 11, 7, -1, -1, -1,
  6, 11, 7, 2, 10, 3, 10, 8, 3, 10, 9, 8,
  7, 2, 3, 6, 2, 7, -1, -1, -1, -1, -1, -1,
  7, 0, 8, 7, 6, 0, 6, 2, 0, -1, -1, -1,
  2, 7, 6, 2, 3, 7, 0, 1, 9, -1, -1, -1,
  1, 6, 2, 1, 8, 6, 1, 9, 8, 8, 7, 6,
  10, 7, 6, 10, 1, 7, 1, 3, 7, -1, -1, -1,
  10, 7, 6, 1, 7, 10, 1, 8, 7, 1, 0, 8, -1, -1, -1,
  0, 3, 7, 0, 7, 10, 0, 10, 9, 6, 10, 7, -1, -1, -1,
  7, 6, 10, 7, 10, 8, 8, 10, 9, -1, -1, -1,
  6, 8, 4, 11, 8, 6, -1, -1, -1, -1, -1, -1,
  3, 6, 11, 3, 0, 6, 0, 4, 6, -1, -1, -1,
  8, 6, 11, 8, 4, 6, 9, 0, 1, -1, -1, -1,
  9, 4, 6, 9, 6, 3, 9, 3, 1, 11, 3, 6,
  6, 8, 4, 6, 11, 8, 2, 10, 1, -1, -1, -1,
  1, 2, 10, 3, 0, 11, 0, 6, 11, 0, 4, 6,
  4, 11, 8, 4, 6, 11, 0, 2, 9, 2, 10, 9, -1, -1, -1,
  10, 9, 3, 10, 3, 2, 9, 4, 3, 11, 3, 6, 4, 6, 3,
  8, 2, 3, 8, 4, 2, 4, 6, 2, -1, -1, -1,
  0, 4, 2, 4, 6, 2, -1, -1, -1, -1, -1, -1,
  1, 9, 0, 2, 3, 4, 2, 4, 6, 4, 3, 8, -1, -1, -1,
  1, 9, 4, 1, 4, 2, 2, 4, 6, -1, -1, -1,
  8, 1, 3, 8, 6, 1, 8, 4, 6, 6, 10, 1, -1, -1, -1,
  10, 1, 0, 10, 0, 6, 6, 0, 4, -1, -1, -1,
  4, 6, 3, 4, 3, 8, 6, 10, 3, 0, 3, 9, 10, 9, 3,
  10, 9, 4, 6, 10, 4, -1, -1, -1, -1, -1, -1,
  4, 9, 5, 7, 6, 11, -1, -1, -1, -1, -1, -1,
  0, 8, 3, 4, 9, 5, 11, 7, 6, -1, -1, -1,
  5, 0, 1, 5, 4, 0, 7, 6, 11, -1, -1, -1,
  11, 7, 6, 8, 3, 4, 3, 5, 4, 3, 1, 5, -1, -1, -1,
  9, 5, 4, 10, 1, 2, 7, 6, 11, -1, -1, -1,
  6, 11, 7, 1, 2, 10, 0, 8, 3, 4, 9, 5, -1, -1, -1,
  7, 6, 11, 5, 4, 10, 4, 2, 10, 4, 0, 2, -1, -1, -1,
  3, 4, 8, 3, 5, 4, 3, 2, 5, 10, 5, 2, 11, 7, 6,
  7, 2, 3, 7, 6, 2, 5, 4, 9, -1, -1, -1,
  9, 5, 4, 0, 8, 6, 0, 6, 2, 6, 8, 7, -1, -1, -1,
  3, 6, 2, 3, 7, 6, 1, 5, 0, 5, 4, 0, -1, -1, -1,
  6, 2, 8, 6, 8, 7, 2, 1, 8, 4, 8, 5, 1, 5, 8,
  9, 5, 4, 10, 1, 6, 1, 7, 6, 1, 3, 7, -1, -1, -1,
  1, 6, 10, 1, 7, 6, 1, 0, 7, 8, 7, 0, 9, 5, 4,
  4, 0, 10, 4, 10, 5, 0, 3, 10, 6, 10, 7, 3, 7, 10,
  7, 6, 10, 7, 10, 8, 5, 4, 10, 4, 8, 10, -1, -1, -1,
  6, 9, 5, 6, 11, 9, 11, 8, 9, -1, -1, -1,
  3, 6, 11, 0, 6, 3, 0, 5, 6, 0, 9, 5, -1, -1, -1,
  0, 11, 8, 0, 5, 11, 0, 1, 5, 5, 6, 11, -1, -1, -1,
  6, 11, 3, 6, 3, 5, 5, 3, 1, -1, -1, -1,
  1, 2, 10, 9, 5, 11, 9, 11, 8, 11, 5, 6, -1, -1, -1,
  0, 11, 3, 0, 6, 11, 0, 9, 6, 5, 6, 9, 1, 2, 10,
  11, 8, 5, 11, 5, 6, 8, 0, 5, 10, 5, 2, 0, 2, 5,
  6, 11, 3, 6, 3, 5, 2, 10, 3, 10, 5, 3, -1, -1, -1,
  5, 8, 9, 5, 2, 8, 5, 6, 2, 3, 8, 2, -1, -1, -1,
  9, 5, 6, 9, 6, 0, 0, 6, 2, -1, -1, -1,
  1, 5, 8, 1, 8, 0, 5, 6, 8, 3, 8, 2, 6, 2, 8,
  1, 5, 6, 2, 1, 6, -1, -1, -1, -1, -1, -1,
  1, 3, 6, 1, 6, 10, 3, 8, 6, 5, 6, 9, 8, 9, 6,
  10, 1, 0, 10, 0, 6, 9, 5, 0, 5, 6, 0, -1, -1, -1,
  0, 3, 8, 5, 6, 10, -1, -1, -1, -1, -1, -1,
  10, 5, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  11, 5, 10, 7, 5, 11, -1, -1, -1, -1, -1, -1,
  11, 5, 10, 11, 7, 5, 8, 3, 0, -1, -1, -1,
  5, 11, 7, 5, 10, 11, 1, 9, 0, -1, -1, -1,
  10, 7, 5, 10, 11, 7, 9, 8, 1, 8, 3, 1, -1, -1, -1,
  11, 1, 2, 11, 7, 1, 7, 5, 1, -1, -1, -1,
  0, 8, 3, 1, 2, 7, 1, 7, 5, 7, 2, 11, -1, -1, -1,
  9, 7, 5, 9, 2, 7, 9, 0, 2, 2, 11, 7, -1, -1, -1,
  7, 5, 2, 7, 2, 11, 5, 9, 2, 3, 2, 8, 9, 8, 2,
  2, 5, 10, 2, 3, 5, 3, 7, 5, -1, -1, -1,
  8, 2, 0, 8, 5, 2, 8, 7, 5, 10, 2, 5, -1, -1, -1,
  9, 0, 1, 5, 10, 3, 5, 3, 7, 3, 10, 2, -1, -1, -1,
  9, 8, 2, 9, 2, 1, 8, 7, 2, 10, 2, 5, 7, 5, 2,
  1, 3, 5, 3, 7, 5, -1, -1, -1, -1, -1, -1,
  0, 8, 7, 0, 7, 1, 1, 7, 5, -1, -1, -1,
  9, 0, 3, 9, 3, 5, 5, 3, 7, -1, -1, -1,
  9, 8, 7, 5, 9, 7, -1, -1, -1, -1, -1, -1,
  5, 8, 4, 5, 10, 8, 10, 11, 8, -1, -1, -1,
  5, 0, 4, 5, 11, 0, 5, 10, 11, 11, 3, 0, -1, -1, -1,
  0, 1, 9, 8, 4, 10, 8, 10, 11, 10, 4, 5, -1, -1, -1,
  10, 11, 4, 10, 4, 5, 11, 3, 4, 9, 4, 1, 3, 1, 4,
  2, 5, 1, 2, 8, 5, 2, 11, 8, 4, 5, 8, -1, -1, -1,
  0, 4, 11, 0, 11, 3, 4, 5, 11, 2, 11, 1, 5, 1, 11,
  0, 2, 5, 0, 5, 9, 2, 11, 5, 4, 5, 8, 11, 8, 5,
  9, 4, 5, 2, 11, 3, -1, -1, -1, -1, -1, -1,
  2, 5, 10, 3, 5, 2, 3, 4, 5, 3, 8, 4, -1, -1, -1,
  5, 10, 2, 5, 2, 4, 4, 2, 0, -1, -1, -1,
  3, 10, 2, 3, 5, 10, 3, 8, 5, 4, 5, 8, 0, 1, 9,
  5, 10, 2, 5, 2, 4, 1, 9, 2, 9, 4, 2, -1, -1, -1,
  8, 4, 5, 8, 5, 3, 3, 5, 1, -1, -1, -1,
  0, 4, 5, 1, 0, 5, -1, -1, -1, -1, -1, -1,
  8, 4, 5, 8, 5, 3, 9, 0, 5, 0, 3, 5, -1, -1, -1,
  9, 4, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  4, 11, 7, 4, 9, 11, 9, 10, 11, -1, -1, -1,
  0, 8, 3, 4, 9, 7, 9, 11, 7, 9, 10, 11, -1, -1, -1,
  1, 10, 11, 1, 11, 4, 1, 4, 0, 7, 4, 11, -1, -1, -1,
  3, 1, 4, 3, 4, 8, 1, 10, 4, 7, 4, 11, 10, 11, 4,
  4, 11, 7, 9, 11, 4, 9, 2, 11, 9, 1, 2, -1, -1, -1,
  9, 7, 4, 9, 11, 7, 9, 1, 11, 2, 11, 1, 0, 8, 3,
  11, 7, 4, 11, 4, 2, 2, 4, 0, -1, -1, -1,
  11, 7, 4, 11, 4, 2, 8, 3, 4, 3, 2, 4, -1, -1, -1,
  2, 9, 10, 2, 7, 9, 2, 3, 7, 7, 4, 9, -1, -1, -1,
  9, 10, 7, 9, 7, 4, 10, 2, 7, 8, 7, 0, 2, 0, 7,
  3, 7, 10, 3, 10, 2, 7, 4, 10, 1, 10, 0, 4, 0, 10,
  1, 10, 2, 8, 7, 4, -1, -1, -1, -1, -1, -1,
  4, 9, 1, 4, 1, 7, 7, 1, 3, -1, -1, -1,
  4, 9, 1, 4, 1, 7, 0, 8, 1, 8, 7, 1, -1, -1, -1,
  4, 0, 3, 7, 4, 3, -1, -1, -1, -1, -1, -1,
  4, 8, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  9, 10, 8, 10, 11, 8, -1, -1, -1, -1, -1, -1,
  3, 0, 9, 3, 9, 11, 11, 9, 10, -1, -1, -1,
  0, 1, 10, 0, 10, 8, 8, 10, 11, -1, -1, -1,
  3, 1, 10, 11, 3, 10, -1, -1, -1, -1, -1, -1,
  1, 2, 11, 1, 11, 9, 9, 11, 8, -1, -1, -1,
  3, 0, 9, 3, 9, 11, 1, 2, 9, 2, 11, 9, -1, -1, -1,
  0, 2, 11, 8, 0, 11, -1, -1, -1, -1, -1, -1,
  3, 2, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  2, 3, 8, 2, 8, 10, 10, 8, 9, -1, -1, -1,
  9, 10, 2, 0, 9, 2, -1, -1, -1, -1, -1, -1,
  2, 3, 8, 2, 8, 10, 0, 1, 8, 1, 10, 8, -1, -1, -1,
  1, 10, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  1, 3, 8, 9, 1, 8, -1, -1, -1, -1, -1, -1,
  0, 9, 1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  0, 3, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1,
  -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1
]);

export class MarchingCubes {
  private volume: VolumeData;
  private isoValue: number;
  private positions: number[] = [];
  private normals: number[] = [];
  private indices: number[] = [];
  private values: number[] = [];

  constructor(volume: VolumeData, isoValue: number = 80) {
    this.volume = volume;
    this.isoValue = isoValue;
  }

  private getVoxelValue(x: number, y: number, z: number): number {
    const { dimensions, scalarData } = this.volume;
    
    if (x < 0 || x >= dimensions.x || 
        y < 0 || y >= dimensions.y || 
        z < 0 || z >= dimensions.z) {
      return 0;
    }
    
    const idx = z * dimensions.x * dimensions.y + y * dimensions.x + x;
    return scalarData[idx];
  }

  private interpolate(p1: Point3D, p2: Point3D, v1: number, v2: number): Point3D {
    const t = (this.isoValue - v1) / (v2 - v1);
    return {
      x: p1.x + t * (p2.x - p1.x),
      y: p1.y + t * (p2.y - p1.y),
      z: p1.z + t * (p2.z - p1.z)
    };
  }

  private computeNormal(x: number, y: number, z: number): Point3D {
    const dx = this.getVoxelValue(x + 1, y, z) - this.getVoxelValue(x - 1, y, z);
    const dy = this.getVoxelValue(x, y + 1, z) - this.getVoxelValue(x, y - 1, z);
    const dz = this.getVoxelValue(x, y, z + 1) - this.getVoxelValue(x, y, z - 1);
    
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len === 0) {
      return { x: 0, y: 0, z: 1 };
    }
    
    return {
      x: dx / len,
      y: dy / len,
      z: dz / len
    };
  }

  extractSurface(useResponseVolume?: Float32Array): MeshData {
    const { dimensions, spacing } = this.volume;
    const sx = spacing.x;
    const sy = spacing.y;
    const sz = spacing.z;

    this.positions = [];
    this.normals = [];
    this.indices = [];
    this.values = [];

    const edgeVertices: Point3D[] = new Array(12);
    const edgeValues: number[] = new Array(12);
    const edgeNormals: Point3D[] = new Array(12);

    const cubeVertices = [
      { x: 0, y: 0, z: 0 },
      { x: sx, y: 0, z: 0 },
      { x: sx, y: sy, z: 0 },
      { x: 0, y: sy, z: 0 },
      { x: 0, y: 0, z: sz },
      { x: sx, y: 0, z: sz },
      { x: sx, y: sy, z: sz },
      { x: 0, y: sy, z: sz }
    ];

    const edgeConnections = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7]
    ];

    for (let z = 0; z < dimensions.z - 1; z++) {
      for (let y = 0; y < dimensions.y - 1; y++) {
        for (let x = 0; x < dimensions.x - 1; x++) {
          const cubeValues: number[] = [];
          
          for (let i = 0; i < 8; i++) {
            const vx = x + cubeVertices[i].x / sx;
            const vy = y + cubeVertices[i].y / sy;
            const vz = z + cubeVertices[i].z / sz;
            
            if (useResponseVolume) {
              const idx = vz * dimensions.x * dimensions.y + vy * dimensions.x + vx;
              cubeValues.push(useResponseVolume[idx]);
            } else {
              cubeValues.push(this.getVoxelValue(vx, vy, vz));
            }
          }

          let cubeIndex = 0;
          for (let i = 0; i < 8; i++) {
            if (cubeValues[i] > this.isoValue) {
              cubeIndex |= 1 << i;
            }
          }

          if (cubeIndex === 0 || cubeIndex === 255) {
            continue;
          }

          const edges = EDGE_TABLE[cubeIndex];
          
          for (let i = 0; i < 12; i++) {
            if (edges & (1 << i)) {
              const [v1, v2] = edgeConnections[i];
              const p1 = {
                x: x * sx + cubeVertices[v1].x,
                y: y * sy + cubeVertices[v1].y,
                z: z * sz + cubeVertices[v1].z
              };
              const p2 = {
                x: x * sx + cubeVertices[v2].x,
                y: y * sy + cubeVertices[v2].y,
                z: z * sz + cubeVertices[v2].z
              };
              
              edgeVertices[i] = this.interpolate(p1, p2, cubeValues[v1], cubeValues[v2]);
              
              const midX = Math.floor(x + (cubeVertices[v1].x + cubeVertices[v2].x) / (2 * sx));
              const midY = Math.floor(y + (cubeVertices[v1].y + cubeVertices[v2].y) / (2 * sy));
              const midZ = Math.floor(z + (cubeVertices[v1].z + cubeVertices[v2].z) / (2 * sz));
              edgeNormals[i] = this.computeNormal(midX, midY, midZ);
              
              const avgValue = (cubeValues[v1] + cubeValues[v2]) / 2;
              edgeValues[i] = avgValue;
            }
          }

          let triIndex = 0;
          while (TRIANGLE_TABLE[cubeIndex * 16 + triIndex] !== -1) {
            for (let i = 0; i < 3; i++) {
              const edgeIndex = TRIANGLE_TABLE[cubeIndex * 16 + triIndex + i];
              const vertex = edgeVertices[edgeIndex];
              const normal = edgeNormals[edgeIndex];
              const value = edgeValues[edgeIndex];
              
              this.positions.push(vertex.x, vertex.y, vertex.z);
              this.normals.push(normal.x, normal.y, normal.z);
              this.values.push(value);
              this.indices.push(this.positions.length / 3 - 1);
            }
            triIndex += 3;
          }
        }
      }
    }

    return {
      positions: new Float32Array(this.positions),
      normals: new Float32Array(this.normals),
      indices: new Uint32Array(this.indices),
      values: new Float32Array(this.values)
    };
  }

  extractFractureSurface(
    fractureMask: Uint8Array,
    normals: Float32Array,
    responseVolume: Float32Array
  ): MeshData {
    const { dimensions, spacing } = this.volume;
    const sx = spacing.x;
    const sy = spacing.y;
    const sz = spacing.z;

    this.positions = [];
    this.normals = [];
    this.indices = [];
    this.values = [];

    const edgeVertices: Point3D[] = new Array(12);
    const edgeNormals: Point3D[] = new Array(12);
    const edgeValues: number[] = new Array(12);

    const cubeVertices = [
      { x: 0, y: 0, z: 0 },
      { x: sx, y: 0, z: 0 },
      { x: sx, y: sy, z: 0 },
      { x: 0, y: sy, z: 0 },
      { x: 0, y: 0, z: sz },
      { x: sx, y: 0, z: sz },
      { x: sx, y: sy, z: sz },
      { x: 0, y: sy, z: sz }
    ];

    const edgeConnections = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7]
    ];

    for (let z = 0; z < dimensions.z - 1; z++) {
      for (let y = 0; y < dimensions.y - 1; y++) {
        for (let x = 0; x < dimensions.x - 1; x++) {
          const cubeMask: number[] = [];
          const cubeValues: number[] = [];
          
          for (let i = 0; i < 8; i++) {
            const vx = x + cubeVertices[i].x / sx;
            const vy = y + cubeVertices[i].y / sy;
            const vz = z + cubeVertices[i].z / sz;
            const idx = vz * dimensions.x * dimensions.y + vy * dimensions.x + vx;
            
            cubeMask.push(fractureMask[idx]);
            cubeValues.push(responseVolume[idx]);
          }

          let hasFracture = false;
          for (let i = 0; i < 8; i++) {
            if (cubeMask[i] === 1) {
              hasFracture = true;
              break;
            }
          }

          if (!hasFracture) continue;

          let cubeIndex = 0;
          for (let i = 0; i < 8; i++) {
            if (cubeValues[i] > this.isoValue) {
              cubeIndex |= 1 << i;
            }
          }

          if (cubeIndex === 0 || cubeIndex === 255) {
            continue;
          }

          const edges = EDGE_TABLE[cubeIndex];
          
          for (let i = 0; i < 12; i++) {
            if (edges & (1 << i)) {
              const [v1, v2] = edgeConnections[i];
              const p1 = {
                x: x * sx + cubeVertices[v1].x,
                y: y * sy + cubeVertices[v1].y,
                z: z * sz + cubeVertices[v1].z
              };
              const p2 = {
                x: x * sx + cubeVertices[v2].x,
                y: y * sy + cubeVertices[v2].y,
                z: z * sz + cubeVertices[v2].z
              };
              
              edgeVertices[i] = this.interpolate(p1, p2, cubeValues[v1], cubeValues[v2]);
              
              const midX = Math.floor(x + (cubeVertices[v1].x + cubeVertices[v2].x) / (2 * sx));
              const midY = Math.floor(y + (cubeVertices[v1].y + cubeVertices[v2].y) / (2 * sy));
              const midZ = Math.floor(z + (cubeVertices[v1].z + cubeVertices[v2].z) / (2 * sz));
              const normalIdx = (midZ * dimensions.x * dimensions.y + midY * dimensions.x + midX) * 3;
              
              edgeNormals[i] = {
                x: normals[normalIdx],
                y: normals[normalIdx + 1],
                z: normals[normalIdx + 2]
              };
              
              const avgValue = (cubeValues[v1] + cubeValues[v2]) / 2;
              edgeValues[i] = avgValue;
            }
          }

          let triIndex = 0;
          while (TRIANGLE_TABLE[cubeIndex * 16 + triIndex] !== -1) {
            for (let i = 0; i < 3; i++) {
              const edgeIndex = TRIANGLE_TABLE[cubeIndex * 16 + triIndex + i];
              const vertex = edgeVertices[edgeIndex];
              const normal = edgeNormals[edgeIndex];
              const value = edgeValues[edgeIndex];
              
              this.positions.push(vertex.x, vertex.y, vertex.z);
              this.normals.push(normal.x, normal.y, normal.z);
              this.values.push(value);
              this.indices.push(this.positions.length / 3 - 1);
            }
            triIndex += 3;
          }
        }
      }
    }

    return {
      positions: new Float32Array(this.positions),
      normals: new Float32Array(this.normals),
      indices: new Uint32Array(this.indices),
      values: new Float32Array(this.values)
    };
  }

  setIsoValue(value: number): void {
    this.isoValue = value;
  }
}
