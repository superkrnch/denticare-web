export function getXrayImageSrc(xray) {
  if (!xray) return ''
  return xray.fileUrl || xray.imageData || ''
}

export function getXrayDownloadName(xray) {
  const base = xray?.fileName || `${xray?.xrayType || 'xray'}-image`
  if (base.includes('.')) return base
  const ext = xray?.mimeType?.split('/')?.[1] || 'jpg'
  return `${base}.${ext}`
}
