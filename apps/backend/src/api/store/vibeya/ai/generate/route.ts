import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import sharp from "sharp"
import { decryptAISecret, isVibeyaAIConfig, modelUsesPixelSizes, validateAIBaseUrl, VIBEYA_AI_METADATA_KEY } from "../../../../../lib/vibeya-ai"
import { getVibeyaProductPrintAreaReference, getVibeyaProductReference } from "../../../../../lib/vibeya-product-references"

type GenerateBody = {
  prompt?: unknown
  productId?: unknown
  product?: unknown
  color?: unknown
  size?: unknown
  printPlacement?: unknown
  preserveOriginalDesign?: unknown
  preserveBaseComposite?: unknown
  productReference?: unknown
  productPrintAreaReference?: unknown
  providerTaskId?: unknown
  mode?: unknown
  references?: unknown
}

type GrsAIResponse = {
  id?: string
  status?: string
  results?: Array<{ url?: string; b64_json?: string; image?: string }>
  error?: string | { message?: string }
  failure_reason?: string
  message?: string
}

type PrintZones = {
  front: readonly [number, number, number, number]
  back: readonly [number, number, number, number]
}

const TEE_PRINT_ZONES: PrintZones = {
  front: [0.129, 0.289, 0.380, 0.605],
  back: [0.624, 0.291, 0.874, 0.609],
}

// Exact regions derived from the user's black hoodie guides within its 1254px composite.
const BLACK_HOODIE_PRINT_ZONES: PrintZones = {
  front: [0.143541, 0.467305, 0.355662, 0.593301],
  back: [0.642743, 0.416268, 0.858054, 0.653907],
}

const normalizeGeneratedImage = async (image: Buffer): Promise<Buffer> => {
  const metadata = await sharp(image, { limitInputPixels: 40_000_000 }).metadata()
  if (!metadata.format || !["png", "jpeg", "webp", "gif"].includes(metadata.format)) {
    throw new Error("GrsAI returned data that is not a supported image.")
  }
  return sharp(image, { limitInputPixels: 40_000_000 }).png().toBuffer()
}

const generationAttempts = new Map<string, { count: number; resetAt: number }>()
const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT = 8

const imageBufferFromDataUrl = (value: string): Buffer => {
  const match = value.match(/^data:image\/(?:webp|jpeg|png);base64,([A-Za-z0-9+/]+={0,2})$/)
  if (!match) throw new Error("Uploaded artwork is not a supported image.")
  return Buffer.from(match[1], "base64")
}

type ImageBounds = { left: number; top: number; width: number; height: number }
type ArtworkAlignment = { horizontal: "left" | "center" | "right"; vertical: "top" | "center" | "bottom" }

const requestedArtworkAlignment = (prompt: string): ArtworkAlignment => {
  const value = prompt.toLowerCase()
  const locations: Array<{ pattern: RegExp; alignment: ArtworkAlignment }> = [
    { pattern: /(?:upper\s*left|top\s*left|left\s*top|左上(?:角)?|上方靠左)/i, alignment: { horizontal: "left", vertical: "top" } },
    { pattern: /(?:upper\s*right|top\s*right|right\s*top|右上(?:角)?|上方靠右)/i, alignment: { horizontal: "right", vertical: "top" } },
    { pattern: /(?:lower\s*left|bottom\s*left|left\s*bottom|左下(?:角)?|下方靠左)/i, alignment: { horizontal: "left", vertical: "bottom" } },
    { pattern: /(?:lower\s*right|bottom\s*right|right\s*bottom|右下(?:角)?|下方靠右)/i, alignment: { horizontal: "right", vertical: "bottom" } },
    { pattern: /(?:top|upper|顶部|上方|上面|靠上)/i, alignment: { horizontal: "center", vertical: "top" } },
    { pattern: /(?:bottom|lower|底部|下方|下面|靠下)/i, alignment: { horizontal: "center", vertical: "bottom" } },
    { pattern: /(?:left|左侧|左边|靠左)/i, alignment: { horizontal: "left", vertical: "center" } },
    { pattern: /(?:right|右侧|右边|靠右)/i, alignment: { horizontal: "right", vertical: "center" } },
    { pattern: /(?:center|middle|中央|正中|居中)/i, alignment: { horizontal: "center", vertical: "center" } },
  ]
  const hasWholeArtworkPlacementVerb = (text: string) => /(?:整张|整个|整体)?(?:图案|印花|设计|图片).{0,18}(?:放|摆|印|移|挪|置|定位|靠|位于)|(?:place|put|position|move|align|locate)\s+(?:the\s+)?(?:(?:whole|entire|full)\s+)?(?:artwork|design|image|graphic|print)\b/i.test(text)
  const refersToGarmentPosition = (text: string) => /(?:印刷区域|印花区域|印刷框|衣服上|胸口|胸前|shirt|garment|chest|printable area|print area)/i.test(text)
  for (const { pattern, alignment } of locations) {
    const match = pattern.exec(value)
    if (!match || match.index === undefined) continue
    const sentenceStart = Math.max(value.lastIndexOf(".", match.index), value.lastIndexOf("!", match.index), value.lastIndexOf("?", match.index), value.lastIndexOf("。", match.index), value.lastIndexOf("！", match.index), value.lastIndexOf("？", match.index), value.lastIndexOf("\n", match.index)) + 1
    const sentenceEndCandidates = [".", "!", "?", "。", "！", "？", "\n"].map((separator) => value.indexOf(separator, match.index + match[0].length)).filter((index) => index >= 0)
    const sentenceEnd = sentenceEndCandidates.length ? Math.min(...sentenceEndCandidates) : value.length
    const before = value.slice(sentenceStart, match.index)
    const after = value.slice(match.index + match[0].length, sentenceEnd)
    if (hasWholeArtworkPlacementVerb(before) || refersToGarmentPosition(after)) return alignment
  }
  return { horizontal: "center", vertical: "center" }
}

const findGarmentBounds = (pixels: Buffer, width: number, height: number, channels: number, side: "front" | "back", colorKey: string): ImageBounds => {
  const half = Math.floor(width / 2)
  const xStart = side === "front" ? 0 : half
  const xEnd = side === "front" ? half : width
  const halfWidth = xEnd - xStart
  const garmentColors: Record<string, [number, number, number]> = {
    Black: [23, 23, 27], White: [255, 255, 255], Red: [229, 37, 55], Gray: [100, 102, 108],
    LightGray: [215, 215, 217], Cream: [242, 228, 207], Navy: [40, 52, 86],
    Khaki: [121, 103, 90], Green: [116, 125, 113], Pink: [201, 81, 120], Purple: [119, 107, 134],
  }
  const target = garmentColors[colorKey] ?? garmentColors.Black
  const backgroundSamples = [
    [xStart + 2, 2], [xEnd - 3, 2], [xStart + 2, height - 3], [xEnd - 3, height - 3],
    [Math.floor((xStart + xEnd) / 2), 2], [Math.floor((xStart + xEnd) / 2), height - 3],
  ].map(([x, y]) => {
    const offset = (y * width + x) * channels
    return [pixels[offset], pixels[offset + 1], pixels[offset + 2]]
  })
  const background = [0, 1, 2].map((channel) => {
    const values = backgroundSamples.map((sample) => sample[channel]).sort((a, b) => a - b)
    return values[Math.floor(values.length / 2)]
  })
  const backgroundLuminance = background[0] * 0.2126 + background[1] * 0.7152 + background[2] * 0.0722
  const targetLuminance = target[0] * 0.2126 + target[1] * 0.7152 + target[2] * 0.0722
  const isLightGarment = targetLuminance > backgroundLuminance - 90
  const colorDistance = Math.hypot(target[0] - background[0], target[1] - background[1], target[2] - background[2])
  const minimumBackgroundDistance = Math.max(12, colorDistance * 0.12)
  const visited = new Uint8Array(halfWidth * height)
  const queue = new Uint32Array(halfWidth * height)
  let largestCount = 0
  let bounds: ImageBounds | null = null
  const isGarmentPixel = (localIndex: number) => {
    const x = xStart + localIndex % halfWidth
    const y = Math.floor(localIndex / halfWidth)
    const offset = (y * width + x) * channels
    const red = pixels[offset]
    const green = pixels[offset + 1]
    const blue = pixels[offset + 2]
    const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722
    if (isLightGarment) return luminance < backgroundLuminance - 3
    const distanceFromBackground = Math.hypot(red - background[0], green - background[1], blue - background[2])
    const distanceFromGarment = Math.hypot(red - target[0], green - target[1], blue - target[2])
    return distanceFromBackground > minimumBackgroundDistance && distanceFromGarment < distanceFromBackground
  }
  for (let start = 0; start < visited.length; start += 1) {
    if (visited[start] || !isGarmentPixel(start)) continue
    let head = 0
    let tail = 0
    queue[tail++] = start
    visited[start] = 1
    let left = width
    let right = 0
    let top = height
    let bottom = 0
    while (head < tail) {
      const current = queue[head++]
      const x = xStart + current % halfWidth
      const y = Math.floor(current / halfWidth)
      left = Math.min(left, x)
      right = Math.max(right, x)
      top = Math.min(top, y)
      bottom = Math.max(bottom, y)
      const column = current % halfWidth
      const addNeighbor = (neighbor: number) => {
        if (visited[neighbor] || !isGarmentPixel(neighbor)) return
        visited[neighbor] = 1
        queue[tail++] = neighbor
      }
      if (column > 0) addNeighbor(current - 1)
      if (column + 1 < halfWidth) addNeighbor(current + 1)
      if (y > 0) addNeighbor(current - halfWidth)
      if (y + 1 < height) addNeighbor(current + halfWidth)
      if (column > 0 && y > 0) addNeighbor(current - halfWidth - 1)
      if (column + 1 < halfWidth && y > 0) addNeighbor(current - halfWidth + 1)
      if (column > 0 && y + 1 < height) addNeighbor(current + halfWidth - 1)
      if (column + 1 < halfWidth && y + 1 < height) addNeighbor(current + halfWidth + 1)
    }
    if (tail > largestCount) {
      largestCount = tail
      bounds = { left, top, width: right - left + 1, height: bottom - top + 1 }
    }
  }
  if (!bounds || largestCount < halfWidth * height * 0.01) {
    throw new Error(`Could not accurately locate the ${side} garment for artwork placement.`)
  }
  return bounds
}

const applyFabricInkTexture = async (artwork: Buffer, garment: Buffer, left: number, top: number, width: number, height: number): Promise<Buffer> => {
  const [ink, fabric, softFabric] = await Promise.all([
    sharp(artwork).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(garment).extract({ left, top, width, height }).removeAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(garment).extract({ left, top, width, height }).removeAlpha().blur(2).raw().toBuffer({ resolveWithObject: true }),
  ])
  const output = Buffer.from(ink.data)
  const pixelCount = width * height
  let luminanceTotal = 0
  for (let index = 0; index < pixelCount; index += 1) {
    const offset = index * fabric.info.channels
    luminanceTotal += fabric.data[offset] * 0.2126 + fabric.data[offset + 1] * 0.7152 + fabric.data[offset + 2] * 0.0722
  }
  const averageLuminance = luminanceTotal / pixelCount

  for (let index = 0; index < pixelCount; index += 1) {
    const inkOffset = index * 4
    const alpha = output[inkOffset + 3]
    if (!alpha) continue
    const fabricOffset = index * fabric.info.channels
    const smoothOffset = index * softFabric.info.channels
    const clothLuminance = fabric.data[fabricOffset] * 0.2126 + fabric.data[fabricOffset + 1] * 0.7152 + fabric.data[fabricOffset + 2] * 0.0722
    const foldLuminance = softFabric.data[smoothOffset] * 0.2126 + softFabric.data[smoothOffset + 1] * 0.7152 + softFabric.data[smoothOffset + 2] * 0.0722
    const foldFactor = 1 + Math.max(-0.12, Math.min(0.12, (foldLuminance - averageLuminance) * 0.003))
    const fiberFactor = 1 + Math.max(-0.07, Math.min(0.07, (clothLuminance - foldLuminance) * 0.006))
    const inkFactor = foldFactor * fiberFactor
    for (let channel = 0; channel < 3; channel += 1) {
      const pigment = output[inkOffset + channel] * inkFactor
      const fabricColor = fabric.data[fabricOffset + channel]
      output[inkOffset + channel] = Math.max(0, Math.min(255, Math.round(pigment * 0.94 + fabricColor * 0.06)))
    }
  }
  return sharp(output, { raw: { width, height, channels: 4 } }).png().toBuffer()
}

const composePreservedArtwork = async (baseImage: Buffer, artworkImage: Buffer, calibrationImage: Buffer, placement: unknown, prompt: string, colorKey: string, zones: PrintZones = TEE_PRINT_ZONES): Promise<string> => {
  const base = sharp(baseImage, { limitInputPixels: 40_000_000 })
  const [metadata, calibration] = await Promise.all([
    base.metadata(),
    sharp(calibrationImage, { limitInputPixels: 40_000_000 }).removeAlpha().raw().toBuffer({ resolveWithObject: true }),
  ])
  if (!metadata.width || !metadata.height) throw new Error("Generated product image has invalid dimensions.")
  const generatedPixels = await sharp(baseImage, { limitInputPixels: 40_000_000 }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const generatedBounds = {
    front: findGarmentBounds(generatedPixels.data, generatedPixels.info.width, generatedPixels.info.height, generatedPixels.info.channels, "front", colorKey),
    back: findGarmentBounds(generatedPixels.data, generatedPixels.info.width, generatedPixels.info.height, generatedPixels.info.channels, "back", colorKey),
  }
  const calibrationBounds = {
    front: findGarmentBounds(calibration.data, calibration.info.width, calibration.info.height, calibration.info.channels, "front", colorKey),
    back: findGarmentBounds(calibration.data, calibration.info.width, calibration.info.height, calibration.info.channels, "back", colorKey),
  }

  const sides = placement === "both" ? ["front", "back"] as const
    : placement === "back" ? ["back"] as const
      : placement === "front" ? ["front"] as const
        : []
  if (!sides.length) throw new Error("Choose a print side before preserving uploaded artwork.")

  const artwork = sharp(artworkImage, { limitInputPixels: 40_000_000 })
  const artworkMetadata = await artwork.metadata()
  if (!artworkMetadata.width || !artworkMetadata.height) throw new Error("Uploaded artwork has invalid dimensions.")
  const alignment = requestedArtworkAlignment(prompt)

  const composites: sharp.OverlayOptions[] = []
  for (const side of sides) {
    const [leftRatio, topRatio, rightRatio, bottomRatio] = zones[side]
    const referenceBounds = calibrationBounds[side]
    const targetBounds = generatedBounds[side]
    const referenceZoneLeft = leftRatio * calibration.info.width
    const referenceZoneTop = topRatio * calibration.info.height
    const referenceZoneRight = rightRatio * calibration.info.width
    const referenceZoneBottom = bottomRatio * calibration.info.height
    const zoneLeft = Math.round(targetBounds.left + (referenceZoneLeft - referenceBounds.left) / referenceBounds.width * targetBounds.width)
    const zoneTop = Math.round(targetBounds.top + (referenceZoneTop - referenceBounds.top) / referenceBounds.height * targetBounds.height)
    const zoneWidth = Math.round((referenceZoneRight - referenceZoneLeft) / referenceBounds.width * targetBounds.width)
    const zoneHeight = Math.round((referenceZoneBottom - referenceZoneTop) / referenceBounds.height * targetBounds.height)
    // Keep a small safety margin while allowing the complete source canvas to use
    // nearly all of the printable area. Larger fixed margins made preserved art
    // look undersized, especially when the uploaded image already had whitespace.
    const insetX = Math.max(1, Math.round(zoneWidth * 0.04))
    const insetY = Math.max(1, Math.round(zoneHeight * 0.04))
    const fitWidth = Math.max(1, zoneWidth - insetX * 2)
    const fitHeight = Math.max(1, zoneHeight - insetY * 2)
    const fitted = await sharp(artworkImage, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width: fitWidth, height: fitHeight, fit: "inside" })
      .png()
      .toBuffer({ resolveWithObject: true })
    const horizontalOffset = alignment.horizontal === "left" ? 0
      : alignment.horizontal === "right" ? fitWidth - fitted.info.width
        : Math.floor((fitWidth - fitted.info.width) / 2)
    const verticalOffset = alignment.vertical === "top" ? 0
      : alignment.vertical === "bottom" ? fitHeight - fitted.info.height
        : Math.floor((fitHeight - fitted.info.height) / 2)
    const left = zoneLeft + insetX + horizontalOffset
    const top = zoneTop + insetY + verticalOffset
    const inkIntegratedWithFabric = await applyFabricInkTexture(fitted.data, baseImage, left, top, fitted.info.width, fitted.info.height)
    composites.push({ input: inkIntegratedWithFabric, left, top })
  }

  const output = await base.composite(composites).png().toBuffer()
  return `data:image/png;base64,${output.toString("base64")}`
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  if (!(req as MedusaRequest & { vibeyaCreditReserved?: boolean }).vibeyaCreditReserved) {
    return res.status(403).json({ error: "请通过设计工作室提交图片生成任务。" })
  }

  const now = Date.now()
  const clientKey = req.ip || "unknown"
  const body = req.body as GenerateBody | undefined
  const isProviderResume = typeof body?.providerTaskId === "string" && body.providerTaskId.length > 0
  if (!isProviderResume && !(req as MedusaRequest & { vibeyaBackgroundJob?: boolean }).vibeyaBackgroundJob) {
    const attempts = generationAttempts.get(clientKey)
    if (attempts && attempts.resetAt > now && attempts.count >= RATE_LIMIT) {
      return res.status(429).json({ error: "生成请求较多，请 10 分钟后再试。" })
    }
    if (!attempts || attempts.resetAt <= now) generationAttempts.set(clientKey, { count: 1, resetAt: now + RATE_WINDOW_MS })
    else attempts.count += 1
  }
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : ""
  const productId = typeof body?.productId === "string" ? body.productId : ""
  const isBlanket = productId === "sds-97226"
  const isBathMat = productId === "sds-138708"
  const isBeanie = productId === "sds-172647"
  const isShowerCurtain = productId === "vibeya-shower-curtain"
  const isTankini = productId === "sds-137892"
  const isFullSurfaceProduct = isBlanket || isBathMat || isShowerCurtain || isTankini
  const size = typeof body?.size === "string" ? body.size : ""
  if (isShowerCurtain && !["36x70.8in", "60x70.8in", "70.8x70.8in", "70.8x84in"].includes(size)) {
    return res.status(400).json({ error: "请选择有效的浴帘尺寸后重新生成。" })
  }
  const printPlacement = isBlanket || isBathMat || isBeanie || isShowerCurtain || isTankini ? "front" : body?.printPlacement === "front" || body?.printPlacement === "back" || body?.printPlacement === "both" || body?.printPlacement === "wrap" || body?.printPlacement === "none"
    ? body.printPlacement
    : "none"
  const isTumbler = productId === "sds-128646"
  const rawReferences = Array.isArray(body?.references) ? body.references : []
  const hasTumblerArtwork = isTumbler && rawReferences.length > 0
  // Never let an entered design idea silently fall through to blank-product mode.
  // The storefront defaults to "none" until a print side is chosen, so reject that
  // mismatch instead of spending a generation credit on another blank image.
  const mode = printPlacement === "none" && !prompt ? "blank-product" : "designed-product"
  if (prompt.length > 1800 || (mode === "designed-product" && !prompt && !hasTumblerArtwork)) {
    return res.status(400).json({ error: "请填写设计说明（最多 1800 个字符）。" })
  }
  if (mode === "designed-product" && printPlacement === "none") {
    return res.status(400).json({ error: "请先选择印花位置：正面、背面或正反面。" })
  }

  const products: Record<string, { name: string; colorAliases: Record<string, string> }> = {
    "sds-167256": {
      name: "Custom Cotton Long Sleeve Tee",
      colorAliases: { Black: "Black", White: "White", Red: "Red", Gray: "Heather Gray", LightGray: "Light Heather Gray", Cream: "Cream", Navy: "Navy" },
    },
    "vibeya-washed-hoodie": {
      name: "Washed Vintage Hooded Sweatshirt",
      colorAliases: { Khaki: "Washed Brown", Gray: "Washed Light Gray", Black: "Washed Black", Green: "Washed Muted Green", Pink: "Washed Pink", Purple: "Washed Lavender" },
    },
    "sds-128646": {
      name: "Custom 20 oz Stainless Steel Tumbler",
      colorAliases: { White: "White", NightGarden: "White" },
    },
    "sds-97226": {
      name: "Custom Flannel Throw Blanket",
      colorAliases: { White: "White" },
    },
    "sds-138708": {
      name: "Custom Full-Surface Bath Mat",
      colorAliases: { White: "White" },
    },
    "sds-172647": {
      name: "Custom Knitted Beanie",
      colorAliases: { Black: "Black", Red: "Red", Gray: "Medium Gray" },
    },
    "vibeya-shower-curtain": {
      name: "Custom Shower Curtain",
      colorAliases: { White: "White" },
    },
    "sds-137892": {
      name: "Custom Women's Two-Piece Tankini Swimsuit Set",
      colorAliases: { Black: "Black", Red: "Red", Pink: "Pink", Blue: "Blue", Cyan: "Cyan" },
    },
  }
  const productConfig = products[productId]
  const colorKey = typeof body?.color === "string" ? body.color : ""
  if (!productConfig || !productConfig.colorAliases[colorKey]) {
    return res.status(400).json({ error: "请选择有效的 VIBEYA 商品和颜色。" })
  }

  const references = rawReferences
  let productReference = typeof body?.productReference === "string" ? body.productReference : ""
  let productPrintAreaReference = typeof body?.productPrintAreaReference === "string" ? body.productPrintAreaReference : ""
  if ((isBlanket || isBathMat || isBeanie || isShowerCurtain || isTankini) && !productReference) {
    try {
      productReference = await getVibeyaProductReference(productId, colorKey, typeof body?.size === "string" ? body.size : undefined)
    } catch (error) {
      console.error("Unable to load the VIBEYA product print reference", error)
      return res.status(503).json({ error: isBeanie ? "帽子印刷区域参考图暂时无法读取，请稍后重试。" : "商品满印底板暂时无法读取，请稍后重试。" })
    }
  }
  if (isTankini && !productPrintAreaReference) {
    try {
      productPrintAreaReference = await getVibeyaProductPrintAreaReference(productId)
    } catch (error) {
      console.error("Unable to load the VIBEYA product print-area guide", error)
      return res.status(503).json({ error: "泳衣印花区域参考图暂时无法读取，请稍后重试。" })
    }
  }
  const preserveBaseComposite = typeof body?.preserveBaseComposite === "string" ? body.preserveBaseComposite : ""
  const preserveOriginalDesign = body?.preserveOriginalDesign === true
  const isWashedHoodie = productId === "vibeya-washed-hoodie"
  const isLongSleeveTee = productId === "sds-167256"
  const placementGuideCount = isFullSurfaceProduct || isBeanie || printPlacement === "none" ? 0 : printPlacement === "both" ? 2 : 1
  const artworkReferenceStart = isTumbler || isFullSurfaceProduct || isBeanie ? 0 : 2 + placementGuideCount
  const artworkReferenceNumbers = references.slice(artworkReferenceStart).map((_, index) => artworkReferenceStart + index + 1)
  const artworkReferenceLabel = artworkReferenceNumbers.length
    ? `Customer artwork reference${artworkReferenceNumbers.length > 1 ? "s" : ""}: image${artworkReferenceNumbers.length > 1 ? "s" : ""} ${artworkReferenceNumbers.join(", ")}.`
    : "No uploaded artwork reference was provided."
  const compositeReferenceNumber = preserveBaseComposite ? references.length + 1 : 0
  const hasUploadedArtwork = isTumbler || isFullSurfaceProduct || isBeanie ? references.length > 0 : references.length > 2 + placementGuideCount
  const uploadedArtworkReferences = isTumbler || isFullSurfaceProduct || isBeanie ? references : references.slice(2 + placementGuideCount)
  const preserveArtworkAfterGeneration = preserveOriginalDesign && hasUploadedArtwork && !isFullSurfaceProduct && !isBeanie
  if (preserveArtworkAfterGeneration && !isTumbler && !preserveBaseComposite) {
    return res.status(400).json({ error: "无法校准这款衣服的印刷区域，请重新选择商品颜色后再提交。" })
  }
  const minimumReferences = isTumbler || isFullSurfaceProduct || isBeanie ? 0 : mode === "designed-product" ? 2 + placementGuideCount : 2
  const maximumReferences = isTumbler || isFullSurfaceProduct || isBeanie ? 6 : minimumReferences + 6
  if (!isProviderResume && (references.length < minimumReferences || references.length > maximumReferences ||
    references.reduce((total, reference) => total + (typeof reference === "string" ? reference.length : 0), 0) > 300000 ||
    references.some((reference, index) =>
      typeof reference !== "string" || reference.length > (isTumbler || isFullSurfaceProduct || isBeanie ? (preserveOriginalDesign ? 150000 : 36000) : index < 2 + placementGuideCount ? 14000 : preserveOriginalDesign ? 150000 : 36000) ||
    !/^data:image\/(?:webp|jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(reference)
  ))) {
    return res.status(400).json({ error: "商品正反面图或印花区域参考图缺失，或参考图格式、数量、大小不符合要求。" })
  }
  if (isTumbler && !isProviderResume && !productReference) {
    return res.status(400).json({ error: "白色杯子的满印区域参考图缺失，请刷新页面后重新提交。" })
  }
  if (isBlanket && !isProviderResume && !productReference) {
    return res.status(400).json({ error: "毛毯印刷底板缺失，请刷新后重新提交。" })
  }
  if (isBathMat && !isProviderResume && !productReference) {
    return res.status(400).json({ error: "地毯满印底板缺失，请刷新后重新提交。" })
  }
  if (isShowerCurtain && !isProviderResume && !productReference) {
    return res.status(400).json({ error: "对应尺寸的浴帘底图缺失，请重新选择尺寸后提交。" })
  }
  if (isTankini && !isProviderResume && !productReference) {
    return res.status(400).json({ error: "泳衣印花区域底图缺失，请刷新页面后重新提交。" })
  }
  if (isTankini && !isProviderResume && !productPrintAreaReference) {
    return res.status(400).json({ error: "泳衣印花位置参考图缺失，请刷新页面后重新提交。" })
  }
  if (productReference && (productReference.length > (isTankini ? 2500000 : isBeanie || isShowerCurtain ? 32000 : 14000) || !/^data:image\/(?:webp|jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(productReference))) {
    return res.status(400).json({ error: isBlanket ? "毛毯印刷底板无效，请刷新页面后重新提交。" : isBathMat ? "地毯满印底板无效，请刷新页面后重新提交。" : isShowerCurtain ? "浴帘底图无效，请重新选择尺寸后提交。" : "杯子印刷区域参考图无效，请刷新页面后重新提交。" })
  }
  if (productPrintAreaReference && (productPrintAreaReference.length > 2500000 || !/^data:image\/(?:webp|jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(productPrintAreaReference))) {
    return res.status(400).json({ error: "泳衣印花位置参考图无效，请刷新页面后重新提交。" })
  }
  if (preserveBaseComposite && (preserveBaseComposite.length > 150000 || !/^data:image\/(?:webp|jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(preserveBaseComposite))) {
    return res.status(400).json({ error: "原创印花底图无效，请重新选择图片并提交。" })
  }
  const placementInstruction = printPlacement === "front"
    ? "Apply the generated print to the FRONT view only. The BACK view must be completely blank."
    : printPlacement === "back"
      ? "Apply the generated print to the BACK view only. The FRONT view must be completely blank."
      : printPlacement === "both"
        ? "Apply a coordinated print concept to both views; keep front and back artwork distinct but visually related."
        : "Keep both garment views completely blank with no print."
  const blackHoodiePrintBoundaryInstruction = printPlacement === "front"
    ? "PRINT AREA LOCK — FRONT ONLY. Image 3 shows the front hoodie with the exact printable rectangle marked in white. The white rectangle is a hard closed boundary on the chest. Replace only this white placeholder with ink. Keep the entire design, every letter, outline, shadow, glow, and decorative detail inside the inner 80% of the rectangle, leaving at least 10% clear margin on each edge. Treat any pixel outside this safe interior as forbidden. Nothing may cross the rectangle or print onto the hood, collar, sleeves, pocket, hem, or background. Respect any position named in the customer's instructions only if the complete design fits inside the safe interior; otherwise use the nearest position that fits. If no position is specified, center the design and scale it uniformly to the largest size that fits inside the safe interior. Leave the back completely blank."
    : printPlacement === "back"
      ? "PRINT AREA LOCK — BACK ONLY. Image 3 shows the back hoodie with the exact printable rectangle marked in white. The white rectangle is a hard closed boundary on the back. Replace only this white placeholder with ink. Keep the entire design, every letter, outline, shadow, glow, and decorative detail inside the inner 80% of the rectangle, leaving at least 10% clear margin on each edge. Treat any pixel outside this safe interior as forbidden. Nothing may cross the rectangle or print onto the hood, shoulders, sleeves, hem, or background. Respect any position named in the customer's instructions only if the complete design fits inside the safe interior; otherwise use the nearest position that fits. If no position is specified, center the design and scale it uniformly to the largest size that fits inside the safe interior. Leave the front completely blank."
      : "PRINT AREA LOCK — FRONT AND BACK. Image 3 is the front-view guide; image 4 is the back-view guide. Each white rectangle is a separate hard closed boundary for that side. Replace only each white placeholder with its matching print. Keep every part of each complete design inside the inner 80% of its own rectangle, leaving at least 10% clear margin on each edge. Treat any pixel outside either safe interior as forbidden. Never cross a rectangle, move the front design to the back, or move the back design to the front. Respect any position named in the customer's instructions only if the complete design fits inside that side's safe interior; otherwise use the nearest position that fits. If no position is specified, center and uniformly scale each design to the largest size that fits inside its safe interior. Keep the hood, collar, sleeves, pocket, hem, and all other unselected areas blank."
  const blankBaseGuideInstruction = printPlacement === "both"
    ? "Images 3 and 4 show the front and back print zones. They are placement guides only: return both garment views completely blank. Do not copy the white guide rectangles into the product image."
    : `Image 3 shows the selected ${printPlacement} print zone. It is a placement guide only: return both garment views completely blank and do not copy the white guide rectangle into the product image.`
  const teePrintBoundaryInstruction = printPlacement === "front"
    ? "PRINT AREA LOCK — FRONT ONLY. Image 3 is the front-view long-sleeve tee with the exact printable rectangle marked in white. The white rectangle is the only printable area on the shirt. Replace only that placeholder with ink. Keep the complete design, every letter, outline, shadow, glow, and decoration inside the inner 80% of the rectangle, leaving at least 10% clear margin on every edge. Treat anything outside this safe interior as forbidden. Do not print on the collar, shoulders, sleeves, hem, or background. Follow a requested position only if the full design fits inside the safe interior; otherwise move it to the nearest position that fits. If no position is specified, center and scale uniformly to the largest size that fits inside the safe interior. Keep the back blank."
    : printPlacement === "back"
      ? "PRINT AREA LOCK — BACK ONLY. Image 3 is the back-view long-sleeve tee with the exact printable rectangle marked in white. The white rectangle is the only printable area on the shirt. Replace only that placeholder with ink. Keep the complete design, every letter, outline, shadow, glow, and decoration inside the inner 80% of the rectangle, leaving at least 10% clear margin on every edge. Treat anything outside this safe interior as forbidden. Do not print on the collar, shoulders, sleeves, hem, or background. Follow a requested position only if the full design fits inside the safe interior; otherwise move it to the nearest position that fits. If no position is specified, center and scale uniformly to the largest size that fits inside the safe interior. Keep the front blank."
      : "PRINT AREA LOCK — FRONT AND BACK. Image 3 is the front-view tee guide and image 4 is the back-view tee guide. Each white rectangle marks the only printable area for its side. Replace only those placeholders with the matching prints. Keep every part of each complete design inside the inner 80% of its own rectangle, with at least 10% clear margin on every edge. Nothing may print outside either safe interior, including on the collar, shoulders, sleeves, hem, or background. Follow a requested position only if the complete design fits inside that side's safe interior; otherwise move it to the nearest position that fits. If no position is specified, center and scale each design uniformly to the largest size that fits. Keep front and back artwork on their matching sides."
  const artworkHandlingInstruction = !hasUploadedArtwork
    ? "No uploaded artwork reference was provided. Create the requested original artwork by following the customer's written instructions closely."
    : preserveOriginalDesign
      ? "KEEP ORIGINAL DESIGN MODE (PRESERVE ON): Treat the complete uploaded image canvas as the locked artwork, including its background. Preserve every visible pixel, subject, wording, layout, colors, textures, and details; do not cut out, remove, replace, blur, recolor, rewrite, rearrange, redraw, or invent any part. If the image has transparency, preserve the transparent areas. Only uniformly scale the complete image and move it to fit inside the selected print area with margin. Do not crop any edge."
      : "PROMPT-LED ADAPTATION MODE (PRESERVE OFF): Treat the customer's written instructions as the primary requirements for the final artwork. Follow the requested subject, wording, colors, style, composition, scale, and placement closely. Use all uploaded images as visual references and keep the result strongly related to their subjects, mood, and recognizable visual cues; do not replace them with an unrelated concept. When the prompt asks for changes, adapt the references to satisfy those instructions. Keep all requested content together and fit it proportionally inside the printable area; do not crop any required content."
  const safePrompt = isTankini
    ? [
        "Create exactly ONE photorealistic square e-commerce product image on a pure white (#FFFFFF) background. Show the exact two-piece women's tankini from the CLEAN GARMENT REFERENCE: one black halter-neck swim top above one separate pair of side-tie shorts below it. Both pieces are front-facing, fully visible, neatly arranged with the top clearly separated above the shorts. Preserve the reference's exact silhouette, neckline, neck ties, top length and hem, shorts rise and leg cut, side ties, seams, fabric texture, relative scale, alignment, and gap. Give the fabric gentle natural 3D volume and soft realistic folds with subtle studio shading so the pieces do not look collapsed or paper-flat; keep them only lightly shaped, never inflated, stuffed, stiff, or exaggerated. Do not rearrange, overlap, crop, simplify, or redesign either garment. Never turn it into a one-piece or another swimsuit style. No person, mannequin, hanger, room, pool, props, decoration, alternate views, collage, labels, or extra objects.",
        `Image ${references.length + 1} is the CLEAN GARMENT REFERENCE and is the sole authority for the swimsuit pattern, construction, silhouette, two-piece arrangement, proportions, fabric, and studio presentation. It has no print-area marker: do not infer or invent the print location from it. Reproduce its garment exactly and render the selected ${productConfig.colorAliases[colorKey]} fabric color.`,
        `Image ${references.length + 2} is the PRINT-LOCATION GUIDE ONLY. It is aligned to the clean garment reference on the same 1254 × 1254 canvas. The white rectangle marks the absolute maximum print boundary on the FRONT FABRIC OF THE TOP. Its outer bounds are x=493–746 and y=339–736. Do not estimate the area from the garment photo, enlarge it, or transfer it to another garment layout.`,
        `TANKINI PRINT BOUNDARY — the white rectangle in image ${references.length + 2} is the maximum printable zone on the top. Keep the complete artwork within its outer bounds; there is no additional 80% inner box or mandatory 10% margin. The customer may choose the artwork's size and position within this rectangle, including a large or near-edge design when requested. If no position is specified, center the design and make it as large as reasonably fits. If any part would cross the rectangle, make the smallest necessary uniform reduction and position adjustment to bring the complete artwork inside it, preserving the requested composition and placement as much as possible. Print only on the front fabric panel of the top. Keep the shorts, side ties, neck ties, neckline, seams, garment edges, and white photo background unprinted. The white guide rectangle is a placement marker and must not appear in the result.`,
        hasUploadedArtwork
          ? `${artworkReferenceLabel} Use the uploaded artwork as the customer's swim-top print, preserving its recognizable content and following the written brief.`
          : "Create original artwork directly from the customer's written instructions.",
        artworkHandlingInstruction,
        `CUSTOMER DESIGN BRIEF (follow the requested subject, wording, palette, style, print size, and position, while keeping all artwork inside the marked printable rectangle): ${prompt}`,
        "Render the artwork as a continuous sublimation print dyed into the nylon-spandex fibers, not as an object attached to the surface. Preserve the fine swimwear knit and sheen through the ink; let the single whole composition follow the top's stretch, gathers, folds, lighting, and perspective without breaking it into pieces. No sticker/decal/patch, floating overlay, hard rectangular edge, raised rim, backing, shadow around the artwork, or artificial segmentation. Keep the print cleanly within the marked fabric zone. Do not add text unless it belongs in the requested artwork; never add branding or a watermark. Output one complete, front-facing product photo only, on pure white.",
        "FINAL TANKINI BOUNDARY CHECK — on the 1254 × 1254 canvas, the printable bounds are x=493–746 and y=339–736 on the front fabric of the top, matching the white rectangle in the print-location guide. The print may fill this area and approach its edges; do not impose a smaller inset box. Keep the complete requested artwork inside these bounds. If it overflows, reduce and reposition it only as much as needed, preserving the requested size, composition, and placement otherwise. Do not alter the garment reference or print on the remaining top fabric, neckline, ties, shorts, or background. Check for overflow before returning the image; the guide rectangle itself must not appear in the result.",
      ].join("\n")
    : isShowerCurtain
    ? [
        "Create exactly ONE photorealistic Amazon-style product image on a pure white background. Show exactly one complete shower curtain hanging vertically from a simple horizontal shower rod with evenly spaced rings through its reinforced top holes. View it straight-on, centered, fully visible from top edge to bottom hem, with natural vertical folds and realistic soft fabric drape. Do not show a bathroom, bathtub, person, hands, dimensions, labels, text, collage, or additional product views.",
        `${references.length ? `Customer artwork is supplied in image${references.length > 1 ? "s 1–" + references.length : " 1"}; the selected-size blank shower-curtain product reference is the final image (${references.length + 1}).` : "Image 1 is the selected-size blank shower-curtain product reference."} Use that product reference as the authority for the curtain's white fabric, exact width-to-height proportions, and construction. The supplied reference may be a flat product/dimension diagram: ignore and do not reproduce its measurement arrows, dimensions, icons, captions, background, or diagram layout. Render a clean, realistic hanging product view with its top header and rings visible.`,
        "SINGLE-SIDED FULL-BLEED PRINT: cover the complete visible curtain fabric face edge to edge, from below the reinforced header to the bottom hem and from side seam to side seam. The selected size reference determines the curtain proportions. There must be no white border, margin, inset panel, blank band, or unprinted fabric area anywhere on the printable face. This is a continuous all-over print, not a centered chest graphic.",
        "Keep the print strictly on curtain fabric. Do not print on the rod, rings, grommets, reinforced header, stitching, hem, or white background. Preserve seams and natural folds; make artwork follow the folds and lighting so it looks printed into real fabric, never like a pasted sticker or flat overlay.",
        hasUploadedArtwork ? artworkReferenceLabel + " Use the uploaded artwork as the design reference and follow the written instructions closely. Fit it across the full curtain face without stretching or cropping important content." : "Create original artwork directly from the customer's written instructions as an edge-to-edge shower curtain print.",
        preserveOriginalDesign && hasUploadedArtwork ? "PRESERVE ORIGINAL DESIGN: retain the uploaded image's artwork, colors, background, and composition as closely as possible. Adapt only its proportional layout to cover the full curtain face; do not remove the background or distort the artwork. Extend its existing background naturally to the fabric edges if needed." : artworkHandlingInstruction,
        "Customer instructions (follow closely): " + prompt,
        "Do not add VIBEYA branding, product names, logos, watermarks, borders, or extra text unless explicitly requested. Keep the whole hanging curtain visible against pure white. Output one finished product image only.",
      ].join("\n")
    : isBathMat
    ? [
        "Create exactly ONE photorealistic Amazon-style product image on a pure white (#FFFFFF) background. Show exactly ONE complete white rectangular bath mat/rug in landscape orientation, viewed from slightly above so the full face is clearly visible. Keep the mat centered and fully inside the frame; do not create a collage, alternate views, room scene, feet, furniture, or extra products.",
        `Image ${references.length + 1} is the exact blank white bath mat product reference. Preserve its landscape proportions, softly rounded corners, stitched construction, subtle plush surface texture, and clean white product-photo appearance. Do not change the mat into a blanket or reshape its corners. The white reference is only the blank base: do not preserve a visible white strip or unprinted border on the printable top face.`,
        hasUploadedArtwork
          ? `${artworkReferenceLabel} Use the uploaded artwork as the design reference, following the customer's written instructions closely.`
          : "Create original artwork directly from the customer's written instructions.",
        "HIGHEST-PRIORITY FULL-BLEED MAT PRINT: cover every visible printable pixel of the mat's top fabric face, all the way to the outer stitched seam and around every rounded corner. There must be no visible white base strip, white rim, blank margin, inset panel, frame, or artificial border between the artwork and the seam. Continue the artwork/colors naturally to the seam; preserve the real seam and plush texture, but do not leave the seam-side fabric unprinted. Keep ink on the mat only; never spill onto the white photo background or underside.",
        hasUploadedArtwork && preserveOriginalDesign
          ? "PRESERVE ORIGINAL ARTWORK: keep the uploaded artwork's complete canvas, background, colors, composition, wording, and proportions. Scale it uniformly without stretching or cropping. If its aspect ratio leaves gaps at the mat edges, extend the existing background/colors outward seamlessly to cover the full printable face; do not fill gaps with white or add a border. Blend the extended edges into the plush surface."
          : artworkHandlingInstruction,
        `Customer instructions (follow closely while keeping the design fitted to the mat's printable face): ${prompt}`,
        "Keep all important subjects and text fully visible. If needed, scale and arrange the complete composition proportionally, then extend background/color details to the perimeter so the entire printable face reaches the stitched seam without a white border. Never stretch the artwork or let ink spill beyond the mat silhouette.",
        "Render the print naturally into the soft plush fibers with subtle pile texture, realistic lighting, and no sticker-like surface, hard rectangular panel, logo, watermark, brand name, or extra text unless explicitly requested as part of the artwork. Keep the entire mat visible on pure white. Output one image only.",
      ].join("\n")
    : isBlanket
    ? [
        "Create exactly ONE square, photorealistic Amazon-style product display image on a pure white (#FFFFFF) background. Show exactly ONE complete white flannel throw blanket hanging vertically from exactly TWO small, simple wall hooks attached at the top corners. The blanket should have natural gravity-driven drape, gentle soft folds, and a few realistic fabric wrinkles. No person, hands, hanger, rod, second view, folded blanket, room scene, or extra objects.",
        `Image ${references.length + 1} is the exact blank blanket product reference. Preserve its white flannel material, soft surface texture, rectangular proportions, edge finish, and overall product identity. Do not reproduce the model or hands visible in the reference; show the blanket suspended only by two hooks.`,
        hasUploadedArtwork
          ? `${artworkReferenceLabel} Use the uploaded artwork as the print design, following the written instructions. Keep the complete intended composition legible and adapt its overall scale and layout to cover the blanket naturally.`
          : "Create original artwork directly from the customer's written instructions.",
        "SINGLE-SIDED FULL-BLEED PRINT: print only the visible front face of the blanket. Cover the entire printable fabric face edge to edge with one continuous design, including areas that fall into natural folds. Do not leave a blank margin, frame, inset rectangle, or unprinted border. The reverse side is not shown and must not be added as another view.",
        preserveOriginalDesign && hasUploadedArtwork
          ? "PRESERVE ORIGINAL DESIGN: keep the uploaded image's complete canvas, background, colors, composition, wording, and proportions intact. Fit it proportionally across the full front face without cropping or stretching; only adapt the overall scale and position to cover the blanket."
          : "Follow the customer's written design instructions closely. If the artwork needs adaptation to fill the blanket, preserve the requested subject and visual style while composing a clean edge-to-edge layout.",
        `Customer instructions: ${prompt}`,
        "Make the print look physically applied to soft flannel: preserve visible pile and fine fabric texture, and let the artwork follow the blanket's drape, folds, lighting, and perspective. No sticker-like surface, separate panel, hard rectangular edge, logo, watermark, brand name, labels, or extra text unless explicitly requested as part of the artwork.",
        "Keep the whole blanket visible, centered, and hanging from exactly two hooks against pure white. Output one image only.",
      ].join("\n")
    : isTumbler
    ? [
        "Create exactly ONE square, photorealistic Amazon-style product display image on a pure white (#FFFFFF) background. Show exactly THREE identical white 20 oz stainless-steel tumblers upright in one horizontal row, evenly spaced and at the same scale: FRONT view, SIDE view, and BACK view, in that order. Add only the simple labels 'Front', 'Side', and 'Back' beneath the corresponding tumblers, as in the product reference. This must be a multi-view product image, never a flat artwork file.",
        `Image ${references.length + 1} is the product and print-area guide. It shows the white tumbler from front, side, and back. The FULL BLEED printable region is the complete cylindrical cup body from just below the metal rim to just above the bottom edge, wrapping continuously around the entire circumference. Apply the design across that entire body on all three views; the side view must reveal the wrap continuing around the cup. Leave the metal rim, lid, and bottom edge unprinted. Preserve the tumbler's white color, tapered cylindrical form, stainless rim, proportions, and clean product-photo lighting.`,
        artworkReferenceLabel,
        hasUploadedArtwork
          ? preserveOriginalDesign
            ? "KEEP ORIGINAL DESIGN MODE: Treat the complete uploaded image canvas, including its background, as the locked wrap artwork. Preserve all visible content, colors, wording, layout, and proportions. Map the complete image uniformly onto the full cylindrical print area; do not crop, stretch, remove the background, redraw, or replace details. Show the same continuous wrap at the correct rotated angles across the front, side, and back product views."
            : "PROMPT-LED DESIGN MODE: follow the customer's written instructions as the primary design requirements and use uploaded artwork as relevant visual reference. Apply the resulting full-bleed design across the complete cylindrical body, with the same wrap shown at the front, side, and back angles."
          : "Create original artwork from the customer's written description.",
        prompt ? `Customer's design brief: ${prompt}` : "The uploaded image is the complete artwork; preserve it and fit it proportionally.",
        "Keep all printing on the cup body only. No extra products, hands, props, packaging, borders, watermarks, VIBEYA branding, or text other than the three view labels and wording explicitly requested as part of the design. Output exactly one finished square three-view tumbler product image.",
      ].join("\n")
    : isBeanie
    ? [
        "Create exactly ONE photorealistic, square e-commerce product image on a pure white (#FFFFFF) background. Show exactly TWO complete views of the SAME knitted beanie, side by side at equal scale: straight-on FRONT view on the left and straight-on BACK view on the right. Keep both upright, centered, and fully visible. No model, mannequin, hanger, scene, collage, text, labels, badges, borders, or extra objects.",
        `Product: a classic 100% acrylic knit beanie, approximately 300g, selected color ${productConfig.colorAliases[colorKey]}, one size. Image ${references.length + 1} is the exact FRONT product and print-area guide. Preserve the beanie silhouette, rib-knit texture, crown seams, folded cuff shape, proportions, and clean white product-photo lighting. The guide is black only to show the product shape; render BOTH views in the selected ${productConfig.colorAliases[colorKey]} color.`,
        `PRINT AREA LOCK — FRONT CUFF ONLY: in image ${references.length + 1}, the white rectangle on the front folded cuff marks the ONLY printable area and the maximum print boundary. Replace that white guide rectangle with the complete design, keeping every visible part of the print inside the rectangle with a clear knit margin on all four sides. If the requested art does not fit, uniformly reduce and reposition the whole design until it fits; never crop or stretch it. Do not print on the beanie crown, side panels, seams, fold edge, back, or background. The BACK view on the right must remain completely plain and unprinted.`,
        hasUploadedArtwork
          ? `${artworkReferenceLabel} Use the uploaded image as the customer's cuff artwork. Preserve its recognizable subject and follow the written brief.`
          : "Create an original small-format cuff graphic from the customer's written instructions. Keep the composition legible at the scale of a folded beanie cuff.",
        artworkHandlingInstruction,
        `Customer design brief: ${prompt}`,
        "Render the print as ink integrated into the knitted fibers, following the cuff curvature, yarn texture, lighting, and perspective. Do not make it embroidered, raised, sticker-like, or a separate patch unless specifically requested. Do not add a brand name, logo, watermark, or extra text. Output exactly one front-and-back product image.",
      ].join("\n")
    : preserveArtworkAfterGeneration && isWashedHoodie
    ? [
        "Create exactly ONE square Amazon-style main product image on a pure white (#FFFFFF) background as a clean blank garment base. The uploaded artwork is supplied for the final print process only; do not put it on the garment in this base image. Do not include guide rectangles or placeholder blocks.",
        `Use image 1 as the exact blank FRONT reference and image 2 as the exact blank BACK reference for the same ${productConfig.colorAliases[colorKey]} hoodie. Show exactly two full views side by side, front on the left and back on the right. Preserve this garment's exact ${productConfig.colorAliases[colorKey]} wash, fabric texture, cut, hood, pocket, seams, sleeves, cuffs, hem, proportions, lighting, and white background.`,
        blankBaseGuideInstruction,
        `${artworkReferenceLabel} Use this image only to understand the original artwork; do not render it in the blank base. Image ${compositeReferenceNumber} is a blank layout and garment reference only.`,
        `Customer instructions for the saved artwork: ${prompt}`,
        "Return an unprinted garment base so the complete original artwork can be uniformly scaled and integrated into the exact print region afterward. Do not crop or stretch the garment itself.",
      ].join("\n")
    : preserveArtworkAfterGeneration && isLongSleeveTee
    ? [
        "Create one square Amazon-style product image on pure white as a clean blank long-sleeve tee base, with front on the left and back on the right. The uploaded artwork is supplied for the final print process only; do not put it on the garment in this base image. Do not include guide rectangles or placeholder blocks.",
        `Images 1 and 2 are the exact blank front and back references for the ${productConfig.colorAliases[colorKey]} VIBEYA Custom Cotton Long Sleeve Tee. Preserve the shirt's exact color, fabric, shape, seams, cuffs, and proportions.`,
        blankBaseGuideInstruction,
        `${artworkReferenceLabel} Use this image only to identify the original artwork; do not render it in the blank base. Image ${compositeReferenceNumber} is a blank layout and garment reference only.`,
        `Customer instructions for the saved artwork: ${prompt}`,
        "Return an unprinted garment base so the complete original artwork can be uniformly scaled and integrated into the exact print region afterward. Do not crop or stretch the garment itself.",
      ].join("\n")
    : preserveArtworkAfterGeneration
    ? [
        "IMAGE EDIT TASK: use the supplied unprinted garment and print-area guide images, then apply the uploaded original artwork to the selected side(s). Return one finished square Amazon-style product image on pure white (#FFFFFF), with exactly two full views side by side: front on the left, back on the right.",
        `Images 1 and 2 are the exact blank front and back garment references for ${productConfig.name}, color ${productConfig.colorAliases[colorKey]}. Preserve their garment cut, seams, cuffs, fabric texture, wash pattern, color, lighting, and proportions.`,
        printPlacement === "front"
          ? "Image 3 is the front print-area guide. Its white rectangle is the only area where ink may appear. Replace that placeholder with the complete uploaded artwork, fitted wholly inside the rectangle with a clear margin. Keep the back blank."
          : printPlacement === "back"
            ? "Image 3 is the back print-area guide. Its white rectangle is the only area where ink may appear. Replace that placeholder with the complete uploaded artwork, fitted wholly inside the rectangle with a clear margin. Keep the front blank."
            : "Image 3 is the front print-area guide and image 4 is the back print-area guide. Each white rectangle is the only printable area on its side. Apply the complete uploaded artwork to both selected sides, contained inside the matching rectangles, with no ink beyond either boundary.",
        `${artworkReferenceLabel} The uploaded reference is the artwork itself and must be used in the image model. Preserve its background, composition, wording, colors, and recognizable details. Do not remove or replace the background, crop, split, rearrange, or invent new elements.`,
        "Scale the complete image uniformly until it fits inside the printable rectangle. Follow any requested position only if the complete design fits inside the rectangle; otherwise use the nearest position that fits. If no position is specified, center the artwork. Keep a visible margin so no edge, word, shadow, or decoration touches the print boundary.",
        `Customer instructions: ${prompt}`,
        "Render the artwork as realistic ink integrated with the garment fabric and natural folds. Do not add a sticker edge, backing panel, brand name, or logo. Keep all unselected areas completely blank. Do not post-process, crop, or recompose the returned image.",
      ].join("\n")
    : mode === "blank-product"
    ? [
        "Create exactly ONE square Amazon-style main product image on a pure white (#FFFFFF) background.",
        `Use the attached blank garment reference images as the source product. Show exactly TWO views of the same garment side by side: front view on the left and back view on the right. Product: ${productConfig.name}. Selected color: ${productConfig.colorAliases[colorKey]}.`,
        "Preserve the exact garment cut, seams, cuffs, neckline/hood, fabric texture, wash pattern, and selected color from the references. Keep both sides completely blank with NO print, artwork, text, logos, brand names, VIBEYA wordmarks, or watermarks.",
        "Show garment only, no model, mannequin, hanger, props, badges, captions, borders, or extra garments. Keep both views centered, fully visible, and realistically photographed. Output one image only.",
      ].join("\n")
    : [
        "IMAGE EDIT TASK: use the attached unprinted garment reference images as the source product, then ADD a clearly visible original garment print. Do not return the references unchanged or return a blank garment.",
        "Create exactly ONE square Amazon-style main product image on a pure white (#FFFFFF) background, with exactly TWO views of the same garment side by side: FRONT view on the left and BACK view on the right.",
        `Product: ${productConfig.name}. Selected color: ${productConfig.colorAliases[colorKey]}.${typeof body?.size === "string" && body.size ? ` Selected garment size: ${body.size}.` : ""} Image 1 is the unprinted FRONT product reference; image 2 is the unprinted BACK product reference. Preserve their exact garment cut, seams, cuffs, neckline, fabric texture, wash pattern, and color. Use them to construct the final two-view product image.${preserveArtworkAfterGeneration && preserveBaseComposite ? ` Image ${compositeReferenceNumber} is an additional blank front/back composite for garment appearance and layout only. It is NOT the artwork reference and must never be copied as a print.` : ""}`,
        isWashedHoodie
          ? blackHoodiePrintBoundaryInstruction
          : isLongSleeveTee
            ? teePrintBoundaryInstruction
          : printPlacement === "front"
          ? "Image 3 is the FRONT print-area guide and must be treated as a hard clipping mask, not a suggestion. The white rectangle is the maximum printable boundary. Fit the complete design inside the inner 84% of this rectangle, preserving a clear blank margin on all four edges. Every pixel of ink, text, outlines, shadows, glow, and decorative marks must remain inside the white rectangle. Replace the white placeholder with the print; do not leave a white block in the final image."
          : printPlacement === "back"
            ? "Image 3 is the BACK print-area guide and must be treated as a hard clipping mask, not a suggestion. The white rectangle is the maximum printable boundary. Fit the complete design inside the inner 84% of this rectangle, preserving a clear blank margin on all four edges. Every pixel of ink, text, outlines, shadows, glow, and decorative marks must remain inside the white rectangle. Replace the white placeholder with the print; do not leave a white block in the final image."
            : "Images 3 and 4 are the FRONT and BACK print-area guides, in that order. Treat each white rectangle as a separate hard clipping mask, not a suggestion. Each is the maximum printable boundary for its side. Fit each complete design inside the inner 84% of its own rectangle, preserving a clear blank margin on all four edges. Every pixel of ink, text, outlines, shadows, glow, and decorative marks must remain inside its matching white rectangle. Replace each white placeholder with its print; do not leave white blocks in the final image.",
        artworkHandlingInstruction,
        `PRINT PLACEMENT: ${placementInstruction} The selected side(s) must have an obvious finished print; every unselected side must stay completely blank.`,
        preserveOriginalDesign && hasUploadedArtwork
          ? `Customer's notes (follow for garment placement and print-area fit while keeping the original design recognizable): ${prompt}`
          : `Follow the customer's written print instructions closely: ${prompt}`,
        hasUploadedArtwork ? `${artworkReferenceLabel} Treat those numbered images as artwork only; the product photos and print-area guides have different roles.${preserveOriginalDesign ? " In preserve mode the complete image canvas, including its visible background, is the artwork. Preserve every visible pixel and preserve transparency where present. Do not remove, replace, or retouch the background." : ""}` : "",
        "REALISTIC GARMENT PRINT: render the artwork as authentic direct-to-garment ink printed into the cotton fibers. The knit texture and natural fabric grain should remain subtly visible through the ink; the print must follow the shirt's drape, folds, seams, perspective, and light naturally. Keep edges integrated with the fabric. It must NOT look like a sticker, decal, vinyl transfer, patch, embroidery, separate sheet, floating graphic, or flat image pasted on top. Do not add a backing panel that was not in the uploaded design. Keep the garment fabric visible around the print. Do not add a brand name, logo, VIBEYA wordmark, watermark, or extra text unless it is explicitly part of the customer's artwork. No raised edges, artificial drop shadow, or visible print-area guide.",
        preserveOriginalDesign && hasUploadedArtwork
          ? "OVERFLOW RULE: keep the complete uploaded image canvas, including its background, inside the printable boundary. Automatically scale the entire image uniformly, center it, and adjust its position to leave a clear margin. Never crop, split, erase, or let any part cross the print boundary. The source image may only change in overall scale and position."
          : "OVERFLOW RULE: keep all required artwork and wording inside the print boundary. If it is crowded, scale it proportionally and refine spacing or secondary flourishes so the composition looks intentional. Never crop required content, leave cut-off fragments, add a square background, or create a hard rectangular edge.",
        isWashedHoodie
          ? `WASHED HOODIE PRINT BOUNDARY — ABSOLUTE MANUFACTURING LIMIT, INCLUDING FOR ${productConfig.colorAliases[colorKey].toUpperCase()}: the white rectangle in the selected print-area guide is the maximum printable region. This boundary overrides any customer request for oversized, edge-to-edge, sleeve, or off-center artwork. Keep the entire design and every letter, outline, glow, shadow, and decorative mark inside the rectangle with visible fabric margin. If the requested design or position would exceed it, uniformly reduce the complete composition and reposition it until it fits; never crop the garment, expand the print area, or let ink cross the rectangle onto the hood, pocket, sleeves, seams, cuffs, hem, or background. Preserve the requested position only when the whole composition fits. For Front + Back, enforce each side's own guide independently.`
          : "",
        isLongSleeveTee
          ? `LONG-SLEEVE TEE PRINT BOUNDARY — ABSOLUTE MANUFACTURING LIMIT, INCLUDING FOR ${productConfig.colorAliases[colorKey].toUpperCase()}: the white rectangle in the selected print-area guide is the maximum printable region. This boundary overrides any customer request for oversized, edge-to-edge, sleeve, shoulder, collar, or off-center artwork. Keep the entire design and every letter, outline, glow, shadow, and decorative mark inside the rectangle with visible fabric margin. If the requested design or position would exceed it, uniformly reduce the complete composition and reposition it until it fits; never crop the garment, expand the print area, or let ink cross the rectangle onto the collar, shoulders, sleeves, seams, cuffs, hem, or background. Preserve the requested position only when the whole composition fits. For Front + Back, enforce each side's own guide independently.`
          : "",
        preserveOriginalDesign && hasUploadedArtwork
          ? "FINAL CHECK: compare against the numbered artwork reference. Preserve its original composition, background, colors, wording, and recognizable details. Fit the complete artwork proportionally inside its printable rectangle, centered with a visible margin. Change only overall scale and position; nothing may touch or cross the boundary."
          : "FINAL CHECK: satisfy the written instructions and keep the design strongly related to the uploaded reference, with every required element fully inside the printable rectangle. Nothing may appear on sleeves, shoulders, collar, neckline, seams, cuffs, waistband, or outside that rectangle.",
        "Keep the garment centered and fully visible. Show garment only: no model, mannequin, hanger, props, badges, captions, borders, or extra garments. Output exactly one image.",
      ].filter(Boolean).join("\n")

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({ entity: "store", fields: ["metadata"] })
  const stored = data[0]?.metadata?.[VIBEYA_AI_METADATA_KEY]
  if (!isVibeyaAIConfig(stored) || !stored.encryptedApiKey) {
    return res.status(503).json({ error: "AI 服务尚未配置，请联系店铺管理员。" })
  }

  let apiKey: string
  try {
    apiKey = decryptAISecret(stored.encryptedApiKey)
  } catch {
    return res.status(503).json({ error: "AI 密钥无法读取，请管理员重新保存配置。" })
  }

  let activeProviderTaskId = typeof body?.providerTaskId === "string" ? body.providerTaskId : ""
  try {
    const baseUrl = validateAIBaseUrl(stored.baseUrl)
    if (!baseUrl) return res.status(503).json({ error: "GrsAI 服务地址无效，请管理员重新保存配置。" })
    const workerContext = req as MedusaRequest & {
      vibeyaSaveProviderTaskId?: (taskId: string) => Promise<unknown>
    }
    const successStates = ["succeeded", "success", "completed"]
    const failureStates = ["failed", "failure", "error", "cancelled", "canceled"]
    let taskId = activeProviderTaskId
    let result: GrsAIResponse = taskId ? { id: taskId, status: "processing" } : {}
    if (!taskId) {
      const response = await fetch(`${baseUrl}/v1/api/generate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: stored.model,
          prompt: safePrompt,
          ...((references.length || productReference || productPrintAreaReference || (preserveArtworkAfterGeneration && preserveBaseComposite))
            ? { images: [...references, ...(productReference ? [productReference] : []), ...(productPrintAreaReference ? [productPrintAreaReference] : []), ...(preserveArtworkAfterGeneration && preserveBaseComposite ? [preserveBaseComposite] : [])] }
            : {}),
          aspectRatio: modelUsesPixelSizes(stored.model)
            ? (["2048x2048", "2880x2880"].includes(stored.aspectRatio) ? stored.aspectRatio : "1024x1024")
            : "1:1",
          quality: stored.quality,
          replyType: "async",
        }),
        signal: AbortSignal.timeout(30000),
      })
      result = await response.json().catch(() => ({})) as GrsAIResponse
      if (!response.ok) {
        const message = response.status === 401
          ? "GrsAI 密钥无效，请管理员检查后台配置。"
          : response.status === 403
            ? "GrsAI 拒绝了请求，请检查账户权限或积分。"
            : response.status === 429
              ? "GrsAI 请求较多或积分不足，请稍后重试。"
              : "GrsAI 暂时无法生成图片，请管理员检查模型和图片尺寸配置。"
        return res.status(response.status === 429 ? 429 : 502).json({ error: message, providerFailed: true })
      }
      taskId = result.id || ""
      if (taskId) {
        activeProviderTaskId = taskId
        await workerContext.vibeyaSaveProviderTaskId?.(taskId)
      }
    }
    if (result.status && !successStates.includes(result.status.toLowerCase()) && !failureStates.includes(result.status.toLowerCase()) && !taskId) {
      return res.status(502).json({ error: "GrsAI 已接受生成请求，但没有返回任务编号，暂时无法取回图片。" })
    }
    if (result.status && failureStates.includes(result.status.toLowerCase())) {
      const providerMessage = typeof result.error === "string" ? result.error : result.error?.message
      return res.status(502).json({
        error: providerMessage || result.failure_reason || result.message || "The image provider reported that this task failed.",
        providerFailed: true,
      })
    }
    const hasImageResult = () => Boolean(result.results?.some((entry) => entry.url || entry.b64_json || entry.image))
    if (taskId && (!result.status || !successStates.includes(result.status.toLowerCase())) && !hasImageResult()) {
      const state = result.status?.toLowerCase() || "pending"
      if (failureStates.includes(state)) {
        const providerMessage = typeof result.error === "string" ? result.error : result.error?.message
        return res.status(502).json({
          error: providerMessage || result.failure_reason || result.message || "The image provider reported that this task failed.",
          providerFailed: true,
        })
      }
      // A new provider task gets one 10-second settling period. Resumed tasks
      // are polled immediately so the background scheduler can check each job
      // once per 10-second tick without sleeping inside the request.
      if (!isProviderResume) await new Promise((resolve) => setTimeout(resolve, 10000))
      const resultUrl = new URL(`${baseUrl}/v1/api/result`)
      resultUrl.searchParams.set("id", taskId)
      const pollResponse = await fetch(resultUrl, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(15000),
      })
      result = await pollResponse.json().catch(() => ({})) as GrsAIResponse
      if (!pollResponse.ok) {
        return res.status(202).json({ pending: true, providerTaskId: taskId })
      }
      const polledState = result.status?.toLowerCase() || "pending"
      if (failureStates.includes(polledState)) {
        const providerMessage = typeof result.error === "string" ? result.error : result.error?.message
        return res.status(502).json({
          error: providerMessage || result.failure_reason || result.message || "The image provider reported that this task failed.",
          providerFailed: true,
        })
      }
      if ((!result.status || !successStates.includes(polledState)) && !hasImageResult()) {
        return res.status(202).json({ pending: true, providerTaskId: taskId })
      }
    }

    const generated = result.results?.find((entry) => entry.url || entry.b64_json || entry.image)
    const finalizeImage = async (generatedImage: Buffer): Promise<string> => {
      const metadata = await sharp(generatedImage, { limitInputPixels: 40_000_000 }).metadata()
      if (!metadata.format || !["png", "jpeg", "webp", "gif"].includes(metadata.format)) {
        throw new Error("GrsAI returned data that is not a supported image.")
      }
      if (isWashedHoodie && !preserveArtworkAfterGeneration) {
        const mimeType = metadata.format === "jpeg" ? "image/jpeg" : `image/${metadata.format}`
        return `data:${mimeType};base64,${generatedImage.toString("base64")}`
      }
      const normalizedImage = await sharp(generatedImage, { limitInputPixels: 40_000_000 }).png().toBuffer()
      if (!preserveArtworkAfterGeneration) {
        // Keep the provider's complete product image intact. Re-compositing its print area
        // against fixed garment coordinates can crop text and other details at the edges.
        return `data:image/png;base64,${normalizedImage.toString("base64")}`
      }
      if (isTumbler) {
        // Preserve mode still returns the provider's multi-view product display. Returning
        // the raw uploaded canvas here would replace the cup mockup with flat artwork.
        return `data:image/png;base64,${normalizedImage.toString("base64")}`
      }
      const artworkImage = imageBufferFromDataUrl(uploadedArtworkReferences[0] as string)
      return composePreservedArtwork(normalizedImage, artworkImage, imageBufferFromDataUrl(preserveBaseComposite), printPlacement, prompt, colorKey, isWashedHoodie ? BLACK_HOODIE_PRINT_ZONES : TEE_PRINT_ZONES)
    }
    const encoded = generated?.b64_json || generated?.image
    const encodedMatch = typeof encoded === "string"
      ? encoded.match(/^(?:data:image\/(?:png|jpeg|webp|gif);base64,)?([A-Za-z0-9+/]+={0,2})$/)
      : null
    if (encodedMatch) {
      const finalImage = await finalizeImage(Buffer.from(encodedMatch[1], "base64"))
      return res.json({ image: finalImage, model: stored.model })
    }

    if (generated?.url) {
      const imageUrl = new URL(generated.url)
      const allowedImageHost = imageUrl.protocol === "https:" && (
        imageUrl.hostname === "aitohumanize.com" || imageUrl.hostname.endsWith(".aitohumanize.com") ||
        imageUrl.hostname === "grsai-resource.com" || imageUrl.hostname.endsWith(".grsai-resource.com") ||
        imageUrl.hostname === "grsaiapi.com" || imageUrl.hostname.endsWith(".grsaiapi.com") ||
        imageUrl.hostname === "grsai.com" || imageUrl.hostname.endsWith(".grsai.com") ||
        imageUrl.hostname.endsWith(".grsai.ai")
      )
      if (!allowedImageHost) return res.status(502).json({ error: "GrsAI 返回了无法识别的图片地址。" })
      const imageResponse = await fetch(imageUrl, { signal: AbortSignal.timeout(30000) })
      if (!imageResponse.ok) return res.status(502).json({ error: "无法读取 GrsAI 返回的图片，请稍后重试。" })
      const imageBytes = Buffer.from(await imageResponse.arrayBuffer())
      if (imageBytes.length > 12 * 1024 * 1024) return res.status(502).json({ error: "生成图片过大，请降低图片尺寸后重试。" })
      const finalImage = await finalizeImage(imageBytes)
      return res.json({ image: finalImage, model: stored.model })
    }

    return res.status(502).json({ error: result.message || "GrsAI 没有返回图片，请检查模型是否可用。" })
  } catch (error) {
    if (activeProviderTaskId) {
      return res.status(202).json({ pending: true, providerTaskId: activeProviderTaskId })
    }
    const message = error instanceof Error && error.name === "TimeoutError"
      ? "生成时间较长，请稍后重试。"
      : "连接 AI 服务失败，请检查后台配置。"
    return res.status(502).json({ error: message })
  }
}
