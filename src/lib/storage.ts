import { supabase } from './supabase';

const BUCKET_NAME = 'pds-docs';

export async function uploadDocument(
  file: File,
  projectId: string,
  docCode: string
): Promise<{ path: string; publicUrl: string }> {
  // Construct a clean filename: project-id/doc-code_timestamp.pdf
  const fileExt = file.name.split('.').pop() || 'pdf';
  const fileName = `${projectId}/${docCode}_${Date.now()}.${fileExt}`;

  // Upload the file to Supabase Storage
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    throw error;
  }

  // Get the public URL
  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path);

  return { path: data.path, publicUrl };
}

export async function deleteDocument(filePath: string) {
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([filePath]);

  if (error) {
    throw error;
  }
}

export function getDocumentPublicUrl(filePath: string) {
  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return publicUrl;
}
