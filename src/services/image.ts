import sharp from 'sharp';

export interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  format?: keyof sharp.FormatEnum;
}

export class ImageService {
  /**
   * Processes an image with the given options
   * @param buffer Input image buffer
   * @param options Processing options
   * @returns Processed image buffer
   */
  static async processImage(
    buffer: Buffer,
    options: ImageProcessingOptions = {}
  ): Promise<Buffer> {
    const {
      maxWidth,
      maxHeight,
      format = 'jpeg'
    } = options;

    let pipeline = sharp(buffer);

    if (maxWidth || maxHeight) {
      pipeline = pipeline.resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    return pipeline
      .toFormat(format)
      .toBuffer();
  }
}