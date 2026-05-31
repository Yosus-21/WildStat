import { MediaFileType } from '@prisma/client';

export type AiDetectionEvent = {
  timestampVideo?: string;
  timestampSeconds?: number;
  startTime?: number;
  endTime?: number;
  framePath?: string;
  clipPath?: string;
  aiSpecies: string;
  aiConfidence: number;
  bbox?: unknown;
  detectedAt?: Date;
  month?: number;
  hour?: number;
};

export type AiAnalysisResponse = {
  mediaFileId?: string;
  fileType: MediaFileType;
  events: AiDetectionEvent[];
  summary?: unknown;
  raw?: unknown;
};

export type VideoDetectionOptions = {
  frameIntervalSeconds?: number;
  confidenceThreshold?: number;
  eventGapSeconds?: number;
  clipPaddingSeconds?: number;
  maxFrames?: number;
};
