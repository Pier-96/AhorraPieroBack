import pdfParse from "pdf-parse";

export async function extractPdfText(buffer) {
  const data = await pdfParse(buffer);
  const text = data.text || "";
  if (!text.trim()) {
    throw new Error(
      "No se pudo extraer texto del PDF. ¿Es un extracto escaneado (imagen)?"
    );
  }
  return text;
}
