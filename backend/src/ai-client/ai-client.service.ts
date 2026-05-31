import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MediaFileType } from '@prisma/client';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {
  AiAnalysisResponse,
  AiDetectionEvent,
  VideoDetectionOptions,
} from './ai-analysis.types';

@Injectable()
export class AiClientService {
  private readonly logger = new Logger(AiClientService.name);

  constructor(private readonly configService: ConfigService) {}

  async checkHealth(): Promise<unknown> {
    const response = await fetch(`${this.baseUrl()}/health`, {
      signal: AbortSignal.timeout(this.timeoutMs()),
    });

    if (!response.ok) {
      throw new Error(`AI health returned HTTP ${response.status}`);
    }

    return response.json();
  }

  detectImage(filePath: string): Promise<AiAnalysisResponse> {
    return this.callDetectionEndpoint('/detect/image', filePath, MediaFileType.IMAGE);
  }

  detectVideo(
    filePath: string,
    options: VideoDetectionOptions = {},
  ): Promise<AiAnalysisResponse> {
    return this.callDetectionEndpoint(
      '/detect/video',
      filePath,
      MediaFileType.VIDEO,
      options,
    );
  }

  analyzeImage(filePath: string): Promise<AiAnalysisResponse> {
    return this.detectImage(filePath);
  }

  analyzeVideo(filePath: string): Promise<AiAnalysisResponse> {
    return this.detectVideo(filePath);
  }

  private async callDetectionEndpoint(
    endpoint: '/detect/image' | '/detect/video',
    filePath: string,
    fileType: MediaFileType,
    options: VideoDetectionOptions = {},
  ): Promise<AiAnalysisResponse> {
    const absolutePath = this.resolveFilePath(filePath);
    const form = new FormData();
    const fileBuffer = await fs.readFile(absolutePath);
    const blob = new Blob([fileBuffer]);
    form.append('file', blob, path.basename(absolutePath));

    if (fileType === MediaFileType.VIDEO) {
      this.appendOptionalNumber(
        form,
        'frame_interval_seconds',
        options.frameIntervalSeconds,
      );
      this.appendOptionalNumber(
        form,
        'confidence_threshold',
        options.confidenceThreshold,
      );
      this.appendOptionalNumber(form, 'event_gap_seconds', options.eventGapSeconds);
      this.appendOptionalNumber(
        form,
        'clip_padding_seconds',
        options.clipPaddingSeconds,
      );
      this.appendOptionalNumber(form, 'max_frames', options.maxFrames);
    }

    try {
      const response = await fetch(`${this.baseUrl()}${endpoint}`, {
        method: 'POST',
        body: form,
        signal: AbortSignal.timeout(this.timeoutMs()),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(
          `AI service ${endpoint} returned HTTP ${response.status}: ${body}`,
        );
      }

      const payload: unknown = await response.json();

      return this.normalizeResponse(payload, fileType);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`AI service call failed: ${message}`);
      throw new Error(`AI service unavailable or failed: ${message}`);
    }
  }

  private normalizeResponse(
    payload: unknown,
    fileType: MediaFileType,
  ): AiAnalysisResponse {
    if (!payload || typeof payload !== 'object') {
      throw new Error('AI service returned an invalid JSON response');
    }

    const response = payload as Record<string, unknown>;
    if (response.status === 'not_ready') {
      throw new Error(String(response.message ?? 'AI model is not ready'));
    }

    const rawEvents = Array.isArray(response.events)
      ? response.events
      : Array.isArray(response.detections)
        ? response.detections
        : [];

    return {
      fileType,
      events: rawEvents.map((event) => this.normalizeEvent(event)),
      summary: response.summary,
      raw: payload,
    };
  }

  private normalizeEvent(value: unknown): AiDetectionEvent {
    const event = value as Record<string, unknown>;
    const aiSpecies = this.pickString(event, ['aiSpecies', 'ai_species', 'className']);
    const aiConfidence = this.pickNumber(event, [
      'aiConfidence',
      'ai_confidence',
      'confidence',
    ]);

    if (!aiSpecies || aiConfidence === undefined) {
      throw new Error('AI event is missing species or confidence');
    }

    const startTime = this.pickNumber(event, ['startTime', 'start_time']);
    const timestampSeconds =
      this.pickNumber(event, ['timestampSeconds', 'timestamp_seconds']) ??
      startTime;

    return {
      timestampVideo: this.pickString(event, [
        'timestampVideo',
        'timestamp_video',
      ]),
      timestampSeconds,
      startTime,
      endTime: this.pickNumber(event, ['endTime', 'end_time']),
      framePath: this.pickString(event, ['framePath', 'frame_path', 'outputPath']),
      clipPath: this.pickString(event, ['clipPath', 'clip_path']),
      aiSpecies,
      aiConfidence,
      bbox: event.bbox ?? event.xyxy,
    };
  }

  private pickString(
    source: Record<string, unknown>,
    keys: string[],
  ): string | undefined {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string' && value.length > 0) {
        return value;
      }
    }
    return undefined;
  }

  private pickNumber(
    source: Record<string, unknown>,
    keys: string[],
  ): number | undefined {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
    }
    return undefined;
  }

  private appendOptionalNumber(
    form: FormData,
    key: string,
    value: number | undefined,
  ) {
    if (value !== undefined) {
      form.append(key, String(value));
    }
  }

  private resolveFilePath(filePath: string): string {
    return path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);
  }

  private baseUrl(): string {
    return this.configService
      .get<string>('AI_SERVICE_URL', 'http://127.0.0.1:8010')
      .replace(/\/+$/, '');
  }

  private timeoutMs(): number {
    return Number(this.configService.get<string>('AI_SERVICE_TIMEOUT_MS', '300000'));
  }
}
