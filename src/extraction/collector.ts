import type { ElementSnapshot, PageSnapshot, StructuredSnapshot } from './types'

/** This function is intentionally self-contained because Chrome serializes it into the active page. */
export function collectPageSnapshot(): PageSnapshot {
  const MAX_ELEMENTS = 600
  const MAX_TEXT = 500
  const MAX_CONTEXT = 900
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'PATH', 'META', 'LINK'])
  const records: ElementSnapshot[] = []
  const seen = new Set<string>()

  const normalize = (value: string | null | undefined) => String(value || '').replace(/\s+/g, ' ').trim()
  const isVisible = (element: Element) => {
    const html = element as HTMLElement
    const style = getComputedStyle(html)
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false
    if (html.hidden || html.getAttribute('aria-hidden') === 'true') return false
    const rect = html.getBoundingClientRect()
    return rect.width > 0 || rect.height > 0 || normalize(html.innerText || html.textContent).length > 0
  }
  const directText = (element: Element) => normalize(Array.from(element.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent)
    .join(' '))
  const meaningfulContext = (element: Element, ownText: string) => {
    let current = element.parentElement
    while (current && current !== document.body) {
      const text = normalize((current as HTMLElement).innerText || current.textContent)
      if (text.length >= ownText.length && text.length <= MAX_CONTEXT) return text
      current = current.parentElement
    }
    return ownText
  }
  const recordElement = (element: Element) => {
    if (records.length >= MAX_ELEMENTS || SKIP_TAGS.has(element.tagName) || !isVisible(element)) return
    const tag = element.tagName.toLowerCase()
    const semantic = ['a', 'address', 'button', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'label', 'p', 'span', 'time']
    let text = directText(element)
    if (!text && semantic.includes(tag) && element.children.length <= 3) text = normalize(element.textContent)
    if (!text || text.length > MAX_TEXT) return
    const role = element.getAttribute('role') || ''
    const ariaLabel = normalize(element.getAttribute('aria-label'))
    const itemProp = normalize(element.getAttribute('itemprop'))
    const href = tag === 'a' ? element.getAttribute('href') || '' : ''
    const context = meaningfulContext(element, text)
    const dedupe = `${tag}|${text}|${context.slice(0, 100)}`
    if (seen.has(dedupe)) return
    seen.add(dedupe)
    const rect = (element as HTMLElement).getBoundingClientRect()
    const headingLevel = /^h[1-6]$/.test(tag) ? Number(tag[1]) : role === 'heading' ? Number(element.getAttribute('aria-level') || 0) || null : null
    records.push({
      order: records.length,
      text,
      context,
      tag,
      role,
      ariaLabel,
      itemProp,
      href,
      headingLevel,
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    })
  }
  const visitRoot = (root: Document | ShadowRoot | Element) => {
    const children = root.nodeType === Node.DOCUMENT_NODE ? Array.from((root as Document).documentElement.children) : Array.from((root as ShadowRoot | Element).children)
    for (const element of children) {
      recordElement(element)
      const shadowRoot = (element as HTMLElement).shadowRoot
      if (shadowRoot) visitRoot(shadowRoot)
      visitRoot(element)
      if (records.length >= MAX_ELEMENTS) return
    }
  }

  visitRoot(document)

  const structured: StructuredSnapshot[] = []
  document.querySelectorAll('script[type="application/ld+json"]').forEach((node) => {
    try {
      const parsed = JSON.parse(node.textContent || '{}')
      const values = Array.isArray(parsed) ? parsed : parsed['@graph'] || [parsed]
      for (const value of values) {
        if (value && typeof value === 'object' && structured.length < 50) structured.push(value as StructuredSnapshot)
      }
    } catch { /* Ignore malformed third-party metadata. */ }
  })

  return {
    url: location.href,
    hostname: location.hostname.replace(/^www\./, ''),
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
    elements: records,
    structured,
  }
}
