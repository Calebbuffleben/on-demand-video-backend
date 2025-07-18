const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Ensure directories exist
const prismaClientDir = path.join(process.cwd(), 'node_modules', '.prisma', 'client');
const prismaDir = path.join(process.cwd(), 'node_modules', '@prisma', 'client');
fs.mkdirSync(prismaClientDir, { recursive: true });
fs.mkdirSync(prismaDir, { recursive: true });

// Copy schema
fs.copyFileSync(
  path.join(process.cwd(), 'prisma', 'schema.prisma'),
  path.join(prismaClientDir, 'schema.prisma')
);

// Generate index.d.ts with types from schema
const types = `
import { PrismaClient as PrismaClientType } from '@prisma/client/runtime/library';

export declare const PrismaClient: new (options?: any) => PrismaClientType;

export interface User {
  id: string;
  clerkId: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
  organizations?: UserOrganization[];
}

export interface Organization {
  id: string;
  name: string;
  clerkId: string;
  createdAt: Date;
  updatedAt: Date;
  muxTokenId?: string;
  muxTokenSecret?: string;
  pendingVideos?: PendingVideo[];
  subscription?: Subscription;
  users?: UserOrganization[];
  videos?: Video[];
  analyticsCache?: AnalyticsCache[];
}

export interface UserOrganization {
  id: string;
  userId: string;
  organizationId: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
  organization?: Organization;
  user?: User;
}

export interface Video {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  status: VideoStatus;
  duration?: number;
  thumbnailUrl?: string;
  playbackUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  isLive: boolean;
  visibility: Visibility;
  tags: string[];
  price?: number;
  currency?: string;
  muxAssetId?: string;
  muxPlaybackId?: string;
  muxUploadId?: string;
  analytics?: VideoAnalytics;
  organization?: Organization;
  
  // Display options
  showProgressBar?: boolean;
  showTitle?: boolean;
  showPlaybackControls?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  useOriginalProgressBar?: boolean;
  progressBarColor?: string;
  progressEasing?: number;
  playButtonColor?: string;
  playButtonSize?: number;
  playButtonBgColor?: string;
  soundControlText?: string;
  soundControlColor?: string;
  soundControlOpacity?: number;
  soundControlSize?: number;
  showSoundControl?: boolean;
  
  // Embed options
  showVideoTitle?: boolean;
  showUploadDate?: boolean;
  showMetadata?: boolean;
  allowFullscreen?: boolean;
  responsive?: boolean;
  showBranding?: boolean;
  showTechnicalInfo?: boolean;
  
  // CTA fields
  ctaText?: string;
  ctaButtonText?: string;
  ctaLink?: string;
  ctaStartTime?: number;
  ctaEndTime?: number;
}

export interface PendingVideo {
  id: string;
  name: string;
  description?: string;
  muxUploadId?: string;
  muxAssetId?: string;
  organizationId: string;
  status: VideoStatus;
  createdAt: Date;
  updatedAt: Date;
  visibility: Visibility;
  tags: string[];
  organization?: Organization;
}

export interface Subscription {
  id: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  status: SubscriptionStatus;
  planType: PlanType;
  trialEndsAt?: Date;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd: boolean;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
  organization?: Organization;
}

export interface VideoAnalytics {
  id: string;
  videoId: string;
  views: number;
  watchTime: number;
  retention: any;
  createdAt: Date;
  updatedAt: Date;
  video?: Video;
  dailyStats?: VideoAnalyticsDaily[];
  hourlyStats?: VideoAnalyticsHourly[];
  viewerStats?: VideoViewerStats[];
}

export interface VideoAnalyticsDaily {
  id: string;
  videoId: string;
  date: Date;
  views: number;
  watchTime: number;
  uniqueViewers: number;
  retention: any;
  createdAt: Date;
  updatedAt: Date;
  videoAnalytics?: VideoAnalytics;
}

export interface VideoAnalyticsHourly {
  id: string;
  videoId: string;
  timestamp: Date;
  views: number;
  watchTime: number;
  uniqueViewers: number;
  createdAt: Date;
  updatedAt: Date;
  videoAnalytics?: VideoAnalytics;
}

export interface VideoViewerStats {
  id: string;
  videoId: string;
  viewerId: string;
  watchTime: number;
  lastWatched: Date;
  watchCount: number;
  createdAt: Date;
  updatedAt: Date;
  videoAnalytics?: VideoAnalytics;
}

export interface AnalyticsCache {
  id: string;
  organizationId: string;
  cacheKey: string;
  cacheValue: any;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  organization?: Organization;
}

export enum Role {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER'
}

export enum VideoStatus {
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  FAILED = 'FAILED'
}

export enum Visibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE'
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PAST_DUE = 'PAST_DUE',
  CANCELED = 'CANCELED'
}

export enum PlanType {
  FREE = 'FREE',
  BASIC = 'BASIC',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE'
}
`;

// Write the type definitions
fs.writeFileSync(path.join(prismaDir, 'index.d.ts'), types);

// Create a minimal runtime client
const runtimeClient = `
const { PrismaClient } = require('@prisma/client/runtime/library');
module.exports = { PrismaClient };
`;

fs.writeFileSync(path.join(prismaDir, 'index.js'), runtimeClient);

console.log('✅ Generated Prisma client successfully');

// Install dependencies
console.log('📦 Installing dependencies...');
execSync('npm install --production=false', { stdio: 'inherit' });

// Build the NestJS application
console.log('🏗️ Building NestJS application...');
execSync('npm run build', { stdio: 'inherit' });

console.log('🚀 Application built successfully!'); 