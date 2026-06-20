import "@/lib/pdf-polyfills"
import type { TextItem } from "pdfjs-dist/types/src/display/api"

export class PdfExtractError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message)
  }
}

export async function extractPdfText(data: Uint8Array, password?: string): Promise<string> {
  const [pdfjs, pdfWorker] = await Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    import("pdfjs-dist/legacy/build/pdf.worker.mjs"),
  ])

  ;(globalThis as typeof globalThis & { pdfjsWorker?: typeof pdfWorker }).pdfjsWorker = pdfWorker

  let document
  try {
    document = await pdfjs.getDocument({
      data,
      password,
      useSystemFonts: true,
      disableFontFace: true,
      isEvalSupported: false,
    }).promise
  } catch (error) {
    const pdfError = error as { code?: number; name?: string }
    if (pdfError.name === "PasswordException" || pdfError.code === 1 || pdfError.code === 2) {
      throw new PdfExtractError(
        password ? "INVALID_PASSWORD" : "PASSWORD_REQUIRED",
        password ? "A senha informada não abriu este PDF." : "Este PDF é protegido. Informe a senha para continuar.",
      )
    }
    console.error("PDF extraction failed", error)
    throw new PdfExtractError("INVALID_PDF", "Não foi possível abrir este PDF.")
  }

  const pages: string[] = []
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber)
    const content = await page.getTextContent()
    const lines = new Map<number, Array<{ x: number; text: string }>>()
    for (const item of content.items) {
      if (!("str" in item)) continue
      const textItem = item as TextItem
      const y = Math.round(textItem.transform[5] * 2) / 2
      const line = lines.get(y) ?? []
      line.push({ x: textItem.transform[4], text: textItem.str })
      lines.set(y, line)
    }
    pages.push(
      [...lines.entries()]
        .sort(([a], [b]) => b - a)
        .map(([, items]) =>
          items
            .sort((a, b) => a.x - b.x)
            .map((item) => item.text)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim(),
        )
        .filter(Boolean)
        .join("\n"),
    )
  }
  await document.destroy()
  return pages.join("\n")
}