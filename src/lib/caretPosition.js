const COPIED_STYLES = [
  'direction', 'boxSizing', 'width', 'height', 'overflowX', 'overflowY',
  'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderStyle',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize', 'lineHeight', 'fontFamily',
  'textAlign', 'textTransform', 'textIndent', 'letterSpacing', 'wordSpacing', 'tabSize',
]

/**
 * Pixel position of `position` inside an input or textarea, relative to the element's
 * border box. Uses an off-screen mirror element with the same text metrics.
 */
export function getCaretCoordinates(element, position) {
  const mirror = document.createElement('div')
  const computed = window.getComputedStyle(element)
  const isInput = element.nodeName === 'INPUT'

  for (const prop of COPIED_STYLES) mirror.style[prop] = computed[prop]
  mirror.style.position = 'absolute'
  mirror.style.visibility = 'hidden'
  mirror.style.top = '0'
  mirror.style.left = '-9999px'
  mirror.style.overflow = 'hidden'
  mirror.style.whiteSpace = isInput ? 'pre' : 'pre-wrap'
  mirror.style.overflowWrap = isInput ? 'normal' : 'break-word'

  mirror.textContent = element.value.slice(0, position)
  const marker = document.createElement('span')
  marker.textContent = element.value.slice(position) || '.'
  mirror.appendChild(marker)
  document.body.appendChild(mirror)

  const lineHeight = Number.parseFloat(computed.lineHeight) || Number.parseFloat(computed.fontSize) * 1.4 || 20
  const coords = {
    top: marker.offsetTop + (Number.parseFloat(computed.borderTopWidth) || 0) - element.scrollTop,
    left: marker.offsetLeft + (Number.parseFloat(computed.borderLeftWidth) || 0) - element.scrollLeft,
    height: lineHeight,
  }
  mirror.remove()
  return coords
}
