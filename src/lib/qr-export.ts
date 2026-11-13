/**
 * QR Code export utilities for PNG, SVG, clipboard copying, and mobile sharing.
 */

export async function exportSvgToPngBlob(
  svgElement: SVGSVGElement,
  targetWidth = 1200
): Promise<Blob> {
  const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
  clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");

  const viewBoxAttr = svgElement.getAttribute("viewBox");
  let originalWidth = 400;
  let originalHeight = 400;

  if (viewBoxAttr) {
    const parts = viewBoxAttr.trim().split(/[\s,]+/);
    if (parts.length === 4) {
      originalWidth = parseFloat(parts[2]) || 400;
      originalHeight = parseFloat(parts[3]) || 400;
    }
  } else {
    originalWidth = parseFloat(svgElement.getAttribute("width") || "400");
    originalHeight = parseFloat(svgElement.getAttribute("height") || "400");
  }

  const scale = targetWidth / originalWidth;
  const targetHeight = Math.round(originalHeight * scale);

  clonedSvg.setAttribute("width", targetWidth.toString());
  clonedSvg.setAttribute("height", targetHeight.toString());

  const svgString = new XMLSerializer().serializeToString(clonedSvg);
  const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error("Unable to create 2D canvas context"));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        URL.revokeObjectURL(url);

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Canvas toBlob returned null"));
          }
        }, "image/png");
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to render SVG image onto canvas"));
    };
    img.src = url;
  });
}

export function exportSvgToSvgBlob(svgElement: SVGSVGElement): Blob {
  const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
  clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const svgString = '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(clonedSvg);
  return new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
}

export function triggerDownload(blob: Blob, filename: string): void {
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
}

export async function copyImageBlobToClipboard(blob: Blob): Promise<boolean> {
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof ClipboardItem !== "undefined"
  ) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      return true;
    } catch (e) {
      console.warn("Clipboard write failed", e);
      return false;
    }
  }
  return false;
}

export async function shareQrBlob(
  blob: Blob,
  filename: string,
  title = "SurpriseQR Code",
  text = ""
): Promise<boolean> {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      const file = new File([blob], filename, { type: blob.type || "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title,
          text,
          files: [file],
        });
        return true;
      }
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        console.warn("Web Share API failed", err);
      }
    }
  }
  return false;
}

