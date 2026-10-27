import { randomUUID } from 'node:crypto';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { supabaseAdmin } from '../lib/supabase.js';

const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15MB — covers X-ray images/PDFs comfortably
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/dicom']);

export interface UploadFileInput {
  patientId: string;
  uploadedBy: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}

export class FileService {
  async upload(input: UploadFileInput) {
    if (input.buffer.length > MAX_SIZE_BYTES) {
      throw new ValidationError('File exceeds the 15MB limit', ['file']);
    }
    if (!ALLOWED_TYPES.has(input.mimeType)) {
      throw new ValidationError('Unsupported file type — use JPEG, PNG, WEBP, PDF, or DICOM', ['file']);
    }

    const storagePath = `${input.patientId}/${randomUUID()}-${input.fileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('patient-files')
      .upload(storagePath, input.buffer, { contentType: input.mimeType });

    if (uploadError) throw new NotFoundError(uploadError.message);

    const { data, error } = await supabaseAdmin
      .from('patient_files')
      .insert({
        patient_id: input.patientId,
        uploaded_by: input.uploadedBy,
        file_name: input.fileName,
        storage_path: storagePath,
        file_type: input.mimeType,
        size_bytes: input.buffer.length,
      })
      .select('*')
      .single();

    if (error || !data) throw new NotFoundError(error?.message ?? 'Could not save file record');

    const { data: signed } = await supabaseAdmin.storage
      .from('patient-files')
      .createSignedUrl(storagePath, 3600);

    return { ...data, url: signed?.signedUrl ?? null };
  }

  async listForPatient(patientId: string) {
    const { data, error } = await supabaseAdmin
      .from('patient_files')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) throw new NotFoundError(error.message);

    return Promise.all(
      (data ?? []).map(async (f) => {
        const { data: signed } = await supabaseAdmin.storage
          .from('patient-files')
          .createSignedUrl(f.storage_path, 3600);
        return { ...f, url: signed?.signedUrl ?? null };
      }),
    );
  }
}
