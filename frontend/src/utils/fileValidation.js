const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/webp',
])

const MAX_SIZE_MB = 30

/**
 * Returns an error string if the file is invalid, or null if it's fine.
 */
export function validateUploadFile(file) {
  if (!file) return 'No file selected.'
  if (!ALLOWED_TYPES.has(file.type))
    return 'Only PDF, DOCX, PPTX, JPG, PNG and WEBP files are allowed.'
  if (file.size > MAX_SIZE_MB * 1024 * 1024)
    return `File must be under ${MAX_SIZE_MB} MB.`
  return null
}