/**
 * files.ts — utilidades de archivo para la versión web.
 * - Descargar un archivo (Backup → Blob de descarga).
 * - Elegir un archivo local (import → input[type=file]).
 */

export function downloadBlob(
  filename: string,
  data: string | Blob,
  mime = 'application/octet-stream',
): void {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export interface PickedFile {
  name: string
  bytes: Uint8Array
}

/** Abre el diálogo de selección de archivo y devuelve el contenido como bytes. */
export function pickFile(accept = ''): Promise<PickedFile | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    if (accept) input.accept = accept
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return resolve(null)
      file.arrayBuffer().then((buf) => resolve({ name: file.name, bytes: new Uint8Array(buf) }))
    }
    input.click()
  })
}
