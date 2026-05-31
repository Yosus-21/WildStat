import { MediaFileType } from '@prisma/client';

export const MEDIA_PROCESSING_QUEUE = 'media-processing';

export type MediaProcessingJob = {
  mediaFileId: string;
  projectId: string;
  cameraId: string;
  filePath: string;
  fileType: MediaFileType;
};
