import { mkdir, writeFile } from "node:fs/promises"
import { resolve } from "node:path"

const root = resolve("public/vibeya/assets/products/vibeya-custom-pu-wallet")

const copy = {
  "en-US": [
    ["YOUR ART,", "YOUR WALLET", "ONE SIDE OR BOTH", "UPLOAD ART OR", "DESIGN BY PROMPT", "PREVIEW BEFORE", "YOU ORDER"],
    ["TWO SIDES,", "YOUR STORY.", "DESIGN EACH SIDE YOUR WAY", "FRONT · RIGHT PANEL", "BACK · LEFT PANEL"],
    ["PRINT THE FRONT", "BACK STAYS BLACK", "YOUR DESIGN ON THE RIGHT.", "CLEAN BLACK ON THE LEFT."],
    ["QUALITY YOU CAN FEEL", "SOFT PU LEATHER", "NEAT EDGE STITCHING", "PRINT ON THE RIGHT PANEL"],
    ["DESIGN IT YOUR WAY", "UPLOAD ART OR DESCRIBE YOUR IDEA", "1  CHOOSE YOUR METHOD", "2  SELECT PRINT SIDES", "3  PREVIEW & CONFIRM", "FRONT = RIGHT PANEL", "BACK = LEFT PANEL"],
    ["ROOM FOR THE", "ESSENTIALS", "CARD SLOTS + FULL-LENGTH CASH POCKET", "BLACK, UNPRINTED INTERIOR"],
  ],
  "ja-JP": [
    ["好きなアートを", "財布にプリント", "片面も、両面も", "画像をアップロード", "または文章でデザイン", "注文前に", "仕上がりを確認"],
    ["両面で広がる", "あなたのストーリー", "左右を自由にデザイン", "表面 · 右側", "裏面 · 左側"],
    ["表面にプリント", "裏面はブラック", "デザインは右側に。", "左側は黒のまま。"],
    ["手に取ってわかる品質", "やわらかなPUレザー", "丁寧な縁のステッチ", "右側のパネルに印刷"],
    ["デザインは自由に", "画像をアップロード、または文章で指定", "1  方法を選ぶ", "2  印刷面を選ぶ", "3  プレビューして確認", "表面 = 右側", "裏面 = 左側"],
    ["毎日の必需品を", "すっきり収納", "カードポケット + 長札入れ", "内側はブラック・印刷なし"],
  ],
  "es-MX": [
    ["TU ARTE,", "TU CARTERA", "UNA CARA O AMBAS", "SUBE TU IMAGEN", "O DESCRIBE TU DISEÑO", "REVISA LA VISTA", "ANTES DE PEDIR"],
    ["DOS LADOS,", "TU HISTORIA.", "DISEÑA CADA LADO A TU GUSTO", "FRENTE · PANEL DERECHO", "REVERSO · PANEL IZQUIERDO"],
    ["IMPRIME EL FRENTE", "REVERSO NEGRO", "TU DISEÑO VA A LA DERECHA.", "IZQUIERDA EN NEGRO."],
    ["CALIDAD QUE SE NOTA", "PU SUAVE AL TACTO", "COSTURAS LIMPIAS", "IMPRESIÓN EN EL PANEL DERECHO"],
    ["DISEÑA A TU MANERA", "SUBE UNA IMAGEN O DESCRIBE TU IDEA", "1  ELIGE CÓMO CREAR", "2  ELIGE LOS LADOS", "3  REVISA Y CONFIRMA", "FRENTE = DERECHA", "REVERSO = IZQUIERDA"],
    ["ESPACIO PARA", "LO ESENCIAL", "RANURAS PARA TARJETAS + BILLETERA", "INTERIOR NEGRO SIN IMPRESIÓN"],
  ],
}

const escape = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")

function text(lines, x, y, size, color, font, weight = 800, gap = 1.08, italic = false) {
  return `<text x="${x}" y="${y}" fill="${color}" font-family="${font}" font-size="${size}" font-weight="${weight}" font-style="${italic ? "italic" : "normal"}" letter-spacing="-1">${lines.map((line, index) => `<tspan x="${x}" dy="${index ? size * gap : 0}">${escape(line)}</tspan>`).join("")}</text>`
}

function sideSwap(index) {
  if (index !== 2 && index !== 4) return ""
  const area = index === 2
    ? { left: [105, 440, 435, 390], right: [615, 440, 405, 390] }
    : { left: [285, 1080, 240, 170], right: [550, 1080, 300, 170] }
  const [lx, ly, lw, lh] = area.left
  const [rx, ry, rw, rh] = area.right
  const shift = index === 2 ? 505 : 255
  return `<defs><clipPath id="left-panel"><rect x="${lx}" y="${ly}" width="${lw}" height="${lh}" rx="18"/></clipPath><clipPath id="right-panel"><rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" rx="18"/></clipPath></defs><g clip-path="url(#left-panel)"><image href="../../wallet-gallery-${String(index + 1).padStart(2, "0")}.jpg" x="-${shift}" y="0" width="1122" height="1402" preserveAspectRatio="none"/></g><g clip-path="url(#right-panel)"><image href="../../wallet-gallery-${String(index + 1).padStart(2, "0")}.jpg" x="${shift}" y="0" width="1122" height="1402" preserveAspectRatio="none"/></g>`
}

function slideOverlay(locale, index) {
  const lines = copy[locale][index]
  const japanese = locale === "ja-JP"
  const font = japanese ? "Yu Gothic, Hiragino Kaku Gothic ProN, Noto Sans JP, sans-serif" : "Arial, sans-serif"
  const italic = !japanese
  const green = "#d7ff00"
  const purple = "#6429d3"
  const light = "#8b42e5"
  const brand = `<text x="54" y="57" fill="#d7ff00" font-family="Arial,sans-serif" font-size="38" font-weight="900">V</text><text x="92" y="58" fill="white" font-family="Arial,sans-serif" font-size="30" font-weight="800" letter-spacing="1">VIBEYA</text>`
  let out = ""
  if (index === 0) {
    out += `<rect x="25" y="82" width="660" height="520" fill="url(#purple)"/>${text(lines.slice(0, 2), 55, 175, japanese ? 66 : 73, "white", font, 900, 1.06, italic)}<rect x="52" y="330" width="590" height="72" rx="36" fill="${green}"/>${text([lines[2]], 78, 380, japanese ? 38 : 42, purple, font, 900, 1, italic)}${text(lines.slice(3, 5), 62, 475, japanese ? 36 : 39, "#35106f", font, 900, 1.13, italic)}<rect x="57" y="983" width="275" height="88" rx="22" fill="${light}"/>${text(lines.slice(5), 77, 1020, japanese ? 25 : 27, "white", font, 800, 1.15, italic)}`
  } else if (index === 1) {
    out += `<rect x="42" y="78" width="1040" height="330" fill="url(#purple)"/>${text(lines.slice(0, 2), 74, 177, japanese ? 67 : 78, "white", font, 900, 1.05, italic)}<rect x="116" y="302" width="890" height="76" rx="38" fill="${green}"/>${text([lines[2]], 145, 353, japanese ? 38 : 42, purple, font, 900, 1, italic)}<rect x="230" y="982" width="270" height="90" rx="36" fill="${green}"/><rect x="605" y="982" width="290" height="90" rx="36" fill="${green}"/>${text([lines[3]], 252, 1038, japanese ? 25 : 28, purple, font, 900, 1, italic)}${text([lines[4]], 628, 1038, japanese ? 25 : 28, purple, font, 900, 1, italic)}`
  } else if (index === 2) {
    out += sideSwap(index)
    out += `<rect x="35" y="72" width="1045" height="310" fill="url(#purple)"/>${text(lines.slice(0, 2), 70, 174, japanese ? 65 : 76, "white", font, 900, 1.08, italic)}<rect x="48" y="965" width="470" height="245" fill="url(#purple)"/>${text(lines.slice(2), 80, 1030, japanese ? 33 : 38, "white", font, 900, 1.2, italic)}`
  } else if (index === 3) {
    out += `<rect x="35" y="74" width="1045" height="230" fill="url(#purple)"/>${text([lines[0]], 72, 205, japanese ? 60 : 70, "white", font, 900, 1, italic)}<rect x="28" y="955" width="510" height="330" fill="url(#purple)"/>${text(lines.slice(1), 60, 1015, japanese ? 30 : 36, green, font, 900, 1.45, italic)}`
  } else if (index === 4) {
    out += sideSwap(index)
    out += `<rect x="32" y="75" width="1055" height="280" fill="url(#purple)"/>${text(lines.slice(0, 2), 67, 170, japanese ? 60 : 72, "white", font, 900, 1.08, italic)}<rect x="28" y="375" width="365" height="700" rx="28" fill="url(#purple)"/>${text(lines.slice(2, 5), 56, 470, japanese ? 30 : 34, "white", font, 900, 2.5, italic)}<rect x="435" y="375" width="605" height="555" rx="28" fill="#fff" stroke="${green}" stroke-width="12"/><rect x="468" y="410" width="540" height="82" rx="24" fill="${green}"/>${text(lines.slice(5), 495, 465, japanese ? 27 : 30, purple, font, 900, 2.2, italic)}<rect x="510" y="555" width="460" height="205" rx="34" fill="#131318"/><rect x="530" y="575" width="195" height="165" rx="25" fill="#121722" stroke="#d7ff00" stroke-width="4"/><rect x="750" y="575" width="195" height="165" rx="25" fill="#121722" stroke="#d7ff00" stroke-width="4"/><rect x="760" y="585" width="175" height="145" rx="18" fill="#253f58"/><text x="720" y="825" text-anchor="middle" fill="${purple}" font-family="${font}" font-size="28" font-weight="900">${japanese ? "右側に表面を印刷" : locale === "es-MX" ? "FRENTE IMPRESO A LA DERECHA" : "FRONT PRINTS ON THE RIGHT"}</text>`
  } else {
    out += `<rect x="32" y="70" width="1050" height="320" fill="url(#purple)"/>${text(lines.slice(0, 2), 74, 180, japanese ? 68 : 82, "white", font, 900, 1.03, italic)}<rect x="72" y="1060" width="980" height="250" fill="url(#purple)"/>${text(lines.slice(2), 120, 1140, japanese ? 36 : 41, green, font, 900, 1.35, italic)}`
  }
  return `${brand}${out}<path d="M1010 65l14 31 34-9-19 29 28 21-35-4-8 35-12-33-34 11 20-28-26-23 35 6z" fill="${green}"/>`
}

for (const locale of Object.keys(copy)) {
  const dir = resolve(root, "localized", locale)
  await mkdir(dir, { recursive: true })
  for (let index = 0; index < 6; index++) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1122" height="1402" viewBox="0 0 1122 1402"><defs><linearGradient id="purple" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#6429d3"/><stop offset="1" stop-color="#bd70ef"/></linearGradient></defs><image href="../../wallet-gallery-${String(index + 1).padStart(2, "0")}.jpg" x="0" y="0" width="1122" height="1402" preserveAspectRatio="none"/>${slideOverlay(locale, index)}</svg>`
    await writeFile(resolve(dir, `wallet-gallery-${String(index + 1).padStart(2, "0")}.svg`), svg, "utf8")
  }
}
