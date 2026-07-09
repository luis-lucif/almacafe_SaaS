"use client";

import { useState } from "react";

const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.8;
const MAX_FILE_BYTES = 15 * 1024 * 1024;

async function compressImage(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob || blob.size >= file.size) return file;

    const newName = file.name.replace(/\.\w+$/, "") + ".jpg";
    return new File([blob], newName, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export function ProductFileInput({ name, className }: { name: string; className?: string }) {
  const [status, setStatus] = useState<"idle" | "compressing">("idle");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-1">
      <input
        type="file"
        name={name}
        accept="image/*,application/pdf"
        className={className}
        disabled={status === "compressing"}
        onChange={async (e) => {
          const input = e.currentTarget;
          const file = input.files?.[0];
          setError(null);
          if (!file) return;

          // Los PDF pasan sin cambios: solo se comprimen las imágenes.
          if (!file.type.startsWith("image/")) {
            if (file.size > MAX_FILE_BYTES) {
              setError("El archivo es demasiado pesado (máx. 15MB).");
              input.value = "";
            }
            return;
          }

          setStatus("compressing");
          try {
            const compressed = await compressImage(file);
            if (compressed.size > MAX_FILE_BYTES) {
              setError("La imagen sigue siendo demasiado pesada (máx. 15MB).");
              input.value = "";
              return;
            }
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(compressed);
            input.files = dataTransfer.files;
          } finally {
            setStatus("idle");
          }
        }}
      />
      {status === "compressing" && (
        <p className="text-xs text-coffee/50">Optimizando imagen…</p>
      )}
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
