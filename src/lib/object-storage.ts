import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export type ObjectStorageConfig = {
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
};

export function objectStorageConfig(env: NodeJS.ProcessEnv = process.env): ObjectStorageConfig | null {
  const bucket =
    env.S3_BUCKET?.trim() ||
    env.AWS_S3_BUCKET_NAME?.trim() ||
    env.RAILWAY_BUCKET_NAME?.trim() ||
    "";
  const accessKeyId = env.S3_ACCESS_KEY_ID?.trim() || env.AWS_ACCESS_KEY_ID?.trim() || "";
  const secretAccessKey = env.S3_SECRET_ACCESS_KEY?.trim() || env.AWS_SECRET_ACCESS_KEY?.trim() || "";
  if (!bucket || !accessKeyId || !secretAccessKey) return null;
  const endpoint = env.S3_ENDPOINT?.trim() || env.AWS_ENDPOINT_URL?.trim() || undefined;
  const region = env.S3_REGION?.trim() || env.AWS_DEFAULT_REGION?.trim() || env.AWS_REGION?.trim() || "auto";
  return { bucket, region, endpoint, accessKeyId, secretAccessKey };
}

function clientFor(config: ObjectStorageConfig) {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: Boolean(config.endpoint),
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });
}

export async function putStoredObject(config: ObjectStorageConfig, key: string, body: Buffer, contentType: string) {
  const client = clientFor(config);
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function storedObjectExists(config: ObjectStorageConfig, key: string) {
  const client = clientFor(config);
  try {
    await client.send(new HeadObjectCommand({ Bucket: config.bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

export async function getStoredObject(config: ObjectStorageConfig, key: string) {
  const client = clientFor(config);
  try {
    const result = await client.send(new GetObjectCommand({ Bucket: config.bucket, Key: key }));
    const bytes = await result.Body?.transformToByteArray();
    return bytes ? Buffer.from(bytes) : null;
  } catch {
    return null;
  }
}
