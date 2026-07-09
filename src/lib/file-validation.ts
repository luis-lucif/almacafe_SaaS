const SIGNATURES: {
  ext: string;
  contentType: string;
  kind: "image" | "pdf";
  magic: number[];
  webpMarker?: number[];
}[] = [
  { ext: "jpg", contentType: "image/jpeg", kind: "image", magic: [0xff, 0xd8, 0xff] },
  {
    ext: "png",
    contentType: "image/png",
    kind: "image",
    magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  },
  { ext: "gif", contentType: "image/gif", kind: "image", magic: [0x47, 0x49, 0x46, 0x38] },
  {
    ext: "webp",
    contentType: "image/webp",
    kind: "image",
    magic: [0x52, 0x49, 0x46, 0x46],
    webpMarker: [0x57, 0x45, 0x42, 0x50],
  },
  { ext: "pdf", contentType: "application/pdf", kind: "pdf", magic: [0x25, 0x50, 0x44, 0x46] },
];

/**
 * Verifica el contenido real del archivo por firma binaria (magic bytes),
 * ignorando por completo el nombre y el `type` que reporta el cliente
 * (ambos son controlados por quien sube el archivo y no son confiables).
 * Esto también descarta SVG y otros formatos no permitidos (ej. HTML
 * disfrazado de PDF) ya que solo se aceptan las firmas de esta lista.
 */
export async function detectFileType(
  file: File,
): Promise<{ ext: string; contentType: string; kind: "image" | "pdf" } | null> {
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());

  for (const sig of SIGNATURES) {
    const matches = sig.magic.every((byte, i) => head[i] === byte);
    if (!matches) continue;

    if (sig.webpMarker) {
      const isWebp = sig.webpMarker.every((byte, i) => head[8 + i] === byte);
      if (!isWebp) continue;
    }

    return { ext: sig.ext, contentType: sig.contentType, kind: sig.kind };
  }

  return null;
}
