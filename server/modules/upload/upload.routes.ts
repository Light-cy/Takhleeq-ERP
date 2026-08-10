import { Router } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();
const uploadDir = path.join(process.cwd(), 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

router.post('/upload', (req, res) => {
  try {
    const { fileName, fileData } = req.body;
    if (!fileData) {
      return res.status(400).json({ error: 'No file data provided.' });
    }

    const cleanName = (fileName || 'file.bin').replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const timestamp = Date.now();
    const finalFileName = `${timestamp}_${cleanName}`;
    const filePath = path.join(uploadDir, finalFileName);

    let buffer: Buffer;
    if (typeof fileData === 'string' && fileData.startsWith('data:')) {
      const base64Data = fileData.split(';base64,').pop() || '';
      buffer = Buffer.from(base64Data, 'base64');
    } else if (typeof fileData === 'string') {
      buffer = Buffer.from(fileData, 'utf-8');
    } else {
      buffer = Buffer.from(fileData);
    }

    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${finalFileName}`;
    res.json({
      success: true,
      url: publicUrl,
      fileName: cleanName,
      fileSize: buffer.length
    });
  } catch (err: any) {
    console.error('File upload failed:', err);
    res.status(500).json({ error: 'Failed to process file upload.' });
  }
});

export default router;
