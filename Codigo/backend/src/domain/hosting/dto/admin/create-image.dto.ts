export class CreateImageDTO {
  imageUrl: string;
  imageKey: string;
  fileSizeBytes: number;
  mimeType?: string;
  position?: number;
}
