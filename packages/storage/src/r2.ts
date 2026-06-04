/**
 * r2.ts — Cloudflare R2 implementation of StorageProvider (Brief §4/§16).
 *
 * R2 is S3-compatible, so we use the AWS S3 SDK pointed at the R2 endpoint. Media is
 * delivered to the browser via signed URLs straight from R2 — never proxied through the
 * API. Env is validated lazily so importing this module never throws.
 */
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { SignedUrlOptions, StorageProvider } from './types';

const DEFAULT_EXPIRY = 3600;

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint: string;
}

function readConfig(): R2Config {
  const {
    R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_BUCKET,
    R2_ENDPOINT,
  } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_ENDPOINT) {
    throw new Error('R2 storage is not configured — set R2_* environment variables.');
  }
  return {
    accountId: R2_ACCOUNT_ID,
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    bucket: R2_BUCKET,
    endpoint: R2_ENDPOINT,
  };
}

export class R2Storage implements StorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: R2Config = readConfig()) {
    this.bucket = config.bucket;
    this.client = new S3Client({
      region: 'auto',
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async put(key: string, body: Uint8Array | Buffer, contentType: string): Promise<string> {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }),
    );
    return key;
  }

  async get(key: string): Promise<Uint8Array> {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    if (!response.Body) {
      throw new Error(`Storage key not found: ${key}`);
    }
    // response.Body is a ReadableStream in Node.js SDK v3
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    const total = chunks.reduce((acc, c) => acc + c.byteLength, 0);
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return merged;
  }

  getSignedUrl(key: string, options?: SignedUrlOptions): Promise<string> {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: options?.expiresInSeconds ?? DEFAULT_EXPIRY,
    });
  }

  getSignedUploadUrl(
    key: string,
    contentType: string,
    options?: SignedUrlOptions,
  ): Promise<string> {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType }),
      { expiresIn: options?.expiresInSeconds ?? DEFAULT_EXPIRY },
    );
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

let singleton: R2Storage | undefined;

/** Lazily-constructed shared R2 storage instance (reads env on first use). */
export function getStorage(): StorageProvider {
  if (!singleton) singleton = new R2Storage();
  return singleton;
}
