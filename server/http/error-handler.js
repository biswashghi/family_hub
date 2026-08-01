export function errorHandler(error, _req, res, _next) {
  console.error(error);
  if (error?.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "file too large (max 25 MB)" });
  }
  return res.status(500).json({ error: "internal server error" });
}
