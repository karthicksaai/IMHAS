export function fileToBase64(file) {
  if (!file || !file.data) return null;
  return file.data.toString("base64");
}

export function sanitizeInput(input) {
  if (typeof input !== "string") return input;
  return input.trim().replace(/[<>]/g, "");
}

export function generatePseudonym(prefix = "P") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
