import { randomUUID } from "node:crypto";
import path from "node:path";
import multer from "multer";

export function createDocumentUpload(filesDir) {
  const storage = multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, filesDir),
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname || "").replace(/[^.\w-]/g, "");
      callback(null, `${Date.now()}-${randomUUID()}${extension}`);
    },
  });
  return multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });
}
