/**
 * Utility function to trigger a local browser download for any file or attachment.
 * Supports Data URLs, Blob URLs, relative paths (/uploads/...), and HTTP/HTTPS file URLs.
 */
export async function downloadFileLocally(
  fileUrlOrData: string,
  suggestedFileName?: string
): Promise<void> {
  if (!fileUrlOrData) return;

  const rawUrl = fileUrlOrData.trim();
  let fileName = suggestedFileName;

  // Extract name if encoded in data url parameters e.g. data:application/pdf;name=Project_Pitch.pdf;base64,...
  if (!fileName && rawUrl.startsWith('data:')) {
    const match = rawUrl.match(/name=([^;]+)/i);
    if (match) {
      fileName = decodeURIComponent(match[1]);
    }
  }

  // Fallback filename extraction from URL path or default
  if (!fileName) {
    if (rawUrl.includes('/')) {
      const parts = rawUrl.split('/');
      const lastPart = parts[parts.length - 1].split('?')[0];
      if (lastPart && lastPart.includes('.')) {
        // Strip leading timestamp e.g. 1786444303761_ filename
        fileName = lastPart.replace(/^\d+_/, '');
      }
    }
    if (!fileName) {
      fileName = 'assignment_deliverable';
    }
  }

  // Ensure clean filename
  fileName = fileName.replace(/[^a-zA-Z0-9._\-]/g, '_');

  // 1. Data URL or Blob URL -> Direct anchor download
  if (rawUrl.startsWith('data:') || rawUrl.startsWith('blob:')) {
    const a = document.createElement('a');
    a.href = rawUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  // Build full URL for relative paths like /uploads/xyz.pdf
  const fullUrl = rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
    ? rawUrl
    : (window.location.origin + (rawUrl.startsWith('/') ? rawUrl : '/' + rawUrl));

  // 2. Fetch as Blob and trigger local browser file save
  try {
    const res = await fetch(fullUrl);
    if (res.ok) {
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
      return;
    }
  } catch (err) {
    console.warn('Direct fetch download failed, falling back to anchor download', err);
  }

  // 3. Fallback anchor click
  const a = document.createElement('a');
  a.href = fullUrl;
  a.download = fileName;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Format raw file size in bytes to human readable KB/MB string
 */
export function formatFileSize(bytes: number): string {
  if (!bytes || isNaN(bytes) || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Extract clean display name from a file url or data string
 */
export function getCleanFileName(fileUrl?: string): string {
  if (!fileUrl) return 'Submitted_Document';
  if (fileUrl.startsWith('data:')) {
    const match = fileUrl.match(/name=([^;]+)/i);
    if (match) return decodeURIComponent(match[1]);
    const mimeMatch = fileUrl.match(/^data:([^;]+);/);
    const mime = mimeMatch ? mimeMatch[1] : '';
    if (mime.includes('pdf')) return 'Submitted_Document.pdf';
    if (mime.includes('word') || mime.includes('docx')) return 'Submitted_Document.docx';
    if (mime.includes('sheet') || mime.includes('excel') || mime.includes('xlsx')) return 'Submitted_Spreadsheet.xlsx';
    if (mime.includes('zip')) return 'Submitted_Archive.zip';
    if (mime.includes('image')) return 'Submitted_Image.png';
    return 'Attached_Deliverable_File';
  }
  if (fileUrl.includes('/')) {
    const parts = fileUrl.split('/');
    const lastPart = parts[parts.length - 1].split('?')[0];
    if (lastPart && lastPart.includes('.')) {
      return lastPart.replace(/^\d+_/, '');
    }
  }
  return fileUrl.length > 40 ? fileUrl.slice(0, 37) + '...' : fileUrl;
}

/**
 * Interface for individual attachment items associated with an assignment.
 */
export interface AssignmentAttachment {
  name: string;
  url: string;
  size?: number;
}

/**
 * Robust parser for assignment attachments.
 * Handles JSON arrays of {name, url, size}, single legacy URLs, or newline-separated URLs.
 */
export function parseAssignmentAttachments(raw: string | undefined | null): AssignmentAttachment[] {
  if (!raw || typeof raw !== 'string' || !raw.trim()) return [];
  const trimmed = raw.trim();
  try {
    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const results: AssignmentAttachment[] = [];
        for (const item of parsed) {
          if (typeof item === 'string' && item.trim()) {
            results.push({ name: getCleanFileName(item), url: item.trim() });
          } else if (item && typeof item === 'object' && item.url) {
            results.push({
              name: item.name || getCleanFileName(item.url),
              url: item.url,
              size: typeof item.size === 'number' ? item.size : undefined
            });
          }
        }
        return results;
      } else if (parsed && typeof parsed === 'object' && parsed.url) {
        return [{
          name: parsed.name || getCleanFileName(parsed.url),
          url: parsed.url,
          size: typeof parsed.size === 'number' ? parsed.size : undefined
        }];
      }
    }
  } catch (e) {
    // Ignore JSON parse error, treat as raw url string
  }

  // Handle newline separated URLs if any
  if (trimmed.includes('\n')) {
    return trimmed
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
      .map(url => ({ name: getCleanFileName(url), url }));
  }

  return [{
    name: getCleanFileName(trimmed),
    url: trimmed
  }];
}

