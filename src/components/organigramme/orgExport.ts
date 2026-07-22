import { getNodesBounds, getViewportForBounds, type ReactFlowInstance } from "@xyflow/react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

/**
 * Rasterise the CURRENT react-flow chart to a real PNG (or PDF). window.print produced
 * a blank page: the flow is virtualised and CSS-transformed, so the print DOM held no
 * cards. The caller turns virtualisation off for a frame (so every visible card is in
 * the DOM) before invoking this, which frames all nodes into a fixed-size image and,
 * when asked, wraps that image in a single-page PDF. Never blank, always centered.
 */
export async function exportOrgChart(rf: ReactFlowInstance, format: "png" | "pdf"): Promise<void> {
  const viewportEl = document.querySelector(".org-flow .react-flow__viewport") as HTMLElement | null;
  if (!viewportEl) return;
  const bounds = getNodesBounds(rf.getNodes());
  const pad = 80;
  const imgW = Math.min(6000, Math.max(1200, Math.round(bounds.width) + pad * 2));
  const imgH = Math.min(6000, Math.max(800, Math.round(bounds.height) + pad * 2));
  const vp = getViewportForBounds(bounds, imgW, imgH, 0.2, 2, pad / Math.max(bounds.width, bounds.height, 1));
  const dataUrl = await toPng(viewportEl, {
    backgroundColor: "#ffffff",
    width: imgW,
    height: imgH,
    pixelRatio: 2,
    style: {
      width: `${imgW}px`,
      height: `${imgH}px`,
      transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})`,
    },
  });
  if (format === "png") {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = "organigramme.png";
    a.click();
    return;
  }
  const pdf = new jsPDF({ orientation: imgW >= imgH ? "landscape" : "portrait", unit: "px", format: [imgW, imgH] });
  pdf.addImage(dataUrl, "PNG", 0, 0, imgW, imgH);
  pdf.save("organigramme.pdf");
}
