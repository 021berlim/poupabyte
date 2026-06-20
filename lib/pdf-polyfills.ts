/**
 * Polyfills exigidos pelo pdfjs-dist em ambientes Node/serverless (ex.: Vercel).
 * Deve ser carregado antes de importar pdfjs-dist.
 */
import DOMMatrixPolyfill from "@thednp/dommatrix"

type GlobalWithCanvas = typeof globalThis & {
  DOMMatrix?: typeof globalThis.DOMMatrix
  ImageData?: typeof ImageData
  Path2D?: typeof Path2D
}

const globalRef = globalThis as GlobalWithCanvas

if (typeof globalRef.DOMMatrix === "undefined") {
  globalRef.DOMMatrix = DOMMatrixPolyfill as unknown as typeof globalThis.DOMMatrix
}

if (typeof globalRef.ImageData === "undefined") {
  globalRef.ImageData = class ImageData {
    data: Uint8ClampedArray
    width: number
    height: number

    constructor(data: Uint8ClampedArray | number, width?: number, height?: number) {
      if (typeof data === "number") {
        this.width = data
        this.height = width ?? 0
        this.data = new Uint8ClampedArray(this.width * this.height * 4)
        return
      }
      this.data = data
      this.width = width ?? 0
      this.height = height ?? 0
    }
  } as unknown as typeof ImageData
}

if (typeof globalRef.Path2D === "undefined") {
  globalRef.Path2D = class Path2D {
    // Stub mínimo — extração de texto não renderiza canvas.
  } as unknown as typeof Path2D
}