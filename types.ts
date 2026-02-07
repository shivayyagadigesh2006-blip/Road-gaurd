export enum Severity {
  LOW = 0,
  MINOR = 1,
  MODERATE = 2,
  SEVERE = 3,
  CRITICAL = 4
}

export enum Department {
  ROADS = 'ROADS',
  DRAINAGE = 'DRAINAGE',
  TRAFFIC = 'TRAFFIC',
  UTILITY = 'UTILITY'
}

export enum ReportStatus {
  PENDING = 'PENDING',
  ASSIGNED_TO_WARD = 'ASSIGNED_TO_WARD',
  IN_PROGRESS = 'IN_PROGRESS',
  FIXED = 'FIXED',
  REJECTED = 'REJECTED'
}

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  CORPORATION = 'CORPORATION',
  CONTRACTOR = 'CONTRACTOR'
}

export interface User {
  id: string;
  username: string;
  email: string;
  password?: string; // Optional for simulation
  role: UserRole;
  department?: Department;
  phone?: string;
  city?: string;
}

export interface BoundingBox {
  box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax]
  label: string;
}

export interface VideoDetectionFrame {
  timestamp: number;
  boxes: BoundingBox[];
}

export interface RoadAnalysis {
  detected: boolean;
  damageTypes: string[];
  severity: Severity;
  description: string;
  boundingBoxes: BoundingBox[];
  videoDetections?: VideoDetectionFrame[];
  imageDimensions?: { width: number, height: number };
  processedMediaUrl?: string;
  originalMediaUrl?: string;
  location?: { lat: number, lng: number };
  department?: Department;
  assignedContractorId?: string;
  assignedWardId?: string;
}

export interface RoadReport {
  id: string;
  userId: string;
  userName: string;
  userDescription?: string;
  timestamp: number;
  mediaUrl: string; // base64 for local persistence simulation
  mediaType: 'image' | 'video';
  analysis: RoadAnalysis;
  status: ReportStatus;
  repairMediaUrl?: string; // New field for repair evidence
  location?: {
    lat: number;
    lng: number;
  };
  locationAddress?: string; // Manual text address input
  resolvedTimestamp?: number;
  department?: Department;
  assignedContractorId?: string;
}
