/**
 * Link preview (Open Graph / X card): the landing page's hero in one image: the headline on bottle
 * green beside the stack of edge-on gold coins. Roadmap: K11.3
 */

import { ImageResponse } from "next/og";

export const alt = "Stack: savings on a schedule. A stack of gold coins on green.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const OFFSETS = [44, 10, 58, 22, 0, 40, 14];

/** The page's display face (Bricolage Grotesque 800). Falls back to the default face if unreachable. */
async function displayFont(): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@800")).text();
    const url = css.match(/src: url\((https:[^)]+\.ttf)\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function OpengraphImage() {
  const font = await displayFont();
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#133621", position: "relative", overflow: "hidden", fontFamily: font ? "Bricolage" : undefined }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 72px", width: 660, color: "#f4d96c" }}>
          <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: -1 }}>Stack</div>
          <div style={{ fontSize: 92, fontWeight: 800, lineHeight: 0.98, letterSpacing: -3, marginTop: 36 }}>Savings on a schedule</div>
          <div style={{ fontSize: 30, lineHeight: 1.35, marginTop: 34, color: "#f4d96c", letterSpacing: -0.5 }}>
            Bitcoin, Ether or NEAR every week. Expensive weeks skipped. Coins in your own wallet.
          </div>
        </div>
        <div style={{ position: "absolute", left: 700, top: -20, display: "flex", flexDirection: "column", gap: 14 }}>
          {OFFSETS.map((x, i) => (
            <div key={i} style={{ marginLeft: x, width: 620, height: 78, borderRadius: 39, background: "#f4d96c" }} />
          ))}
        </div>
      </div>
    ),
    { ...size, fonts: font ? [{ name: "Bricolage", data: font, weight: 800, style: "normal" }] : [] },
  );
}
