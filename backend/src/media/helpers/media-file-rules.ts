import { BadRequestException } from '@nestjs/common';
import { MediaFileType } from '@prisma/client';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.avi', '.mov', '.mkv']);

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png']);
const VIDEO_MIME_TYPES = new Set([
  'application/octet-stream',
  'video/mp4',
  'video/x-msvideo',
  'video/quicktime',
  'video/x-matroska',
]);

export const MAX_IMAGE_SIZE_BYTES = 25 * 1024 * 1024;
export const MAX_VIDEO_SIZE_BYTES = 500 * 1024 * 1024;
export const MAX_UPLOAD_SIZE_BYTES = MAX_VIDEO_SIZE_BYTES;

export type MediaClassification = {
  fileType: MediaFileType;
  extension: string;
  folder: 'images' | 'videos';
};

export function classifyMediaFile(
  originalName: string,
  mimeType: string,
  size: number,
): MediaClassification {
  const extension = path.extname(originalName).toLowerCase();

  if (IMAGE_EXTENSIONS.has(extension) && IMAGE_MIME_TYPES.has(mimeType)) {
    if (size > MAX_IMAGE_SIZE_BYTES) {
      throw new BadRequestException('Image files must be 25 MB or smaller');
    }

    return { fileType: MediaFileType.IMAGE, extension, folder: 'images' };
  }

  if (VIDEO_EXTENSIONS.has(extension) && VIDEO_MIME_TYPES.has(mimeType)) {
    if (size > MAX_VIDEO_SIZE_BYTES) {
      throw new BadRequestException('Video files must be 500 MB or smaller');
    }

    return { fileType: MediaFileType.VIDEO, extension, folder: 'videos' };
  }

  throw new BadRequestException(
    'Unsupported media format. Allowed images: jpg, jpeg, png. Allowed videos: mp4, avi, mov, mkv',
  );
}

export function createSafeFileName(extension: string): string {
  return `${Date.now()}-${randomUUID()}${extension}`;
}
