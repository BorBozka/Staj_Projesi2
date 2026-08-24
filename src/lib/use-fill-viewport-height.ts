import { useLayoutEffect, useRef, useState, type DependencyList } from "react"

// Measures how much real (visual) viewport space is left below the returned element and reports
// it as a CSS height for that element, so a page section can fill the rest of the screen without
// producing page-level scroll — while everything above the section (and every other page, which
// doesn't use this hook) keeps its normal, unconstrained flow.
//
// Two-pass because an ancestor may apply CSS `zoom` (the manager shell renders at zoom: 0.9):
// `getBoundingClientRect()` reports the post-zoom visual size, but the height we assign is a
// pre-zoom value the browser then scales, so a naive `innerHeight - top` assignment would
// under/overshoot by the zoom factor. Probing the element with a known height first measures
// that factor directly instead of assuming a fixed value that would silently drift if the shell's
// zoom level ever changes.
export function useFillViewportHeight<T extends HTMLElement = HTMLDivElement>(bottomGutterPx = 16, deps: DependencyList = []) {
  const ref = useRef<T>(null)
  const [height, setHeight] = useState<number>()

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return

    const measure = () => {
      const top = element.getBoundingClientRect().top
      const previousHeight = element.style.height
      element.style.height = "1000px"
      const zoomFactor = element.getBoundingClientRect().height / 1000 || 1
      element.style.height = previousHeight

      const availableVisualPx = Math.max(0, window.innerHeight - top - bottomGutterPx)
      setHeight(availableVisualPx / zoomFactor)
    }

    measure()
    window.addEventListener("resize", measure)
    // Belt-and-suspenders alongside the resize listener: `document.documentElement`'s box only
    // tracks the real viewport, never our own content (which lives in an overflow-hidden
    // descendant), so observing it can't create a resize feedback loop from the height we set.
    const observer = new ResizeObserver(measure)
    observer.observe(document.documentElement)
    return () => {
      window.removeEventListener("resize", measure)
      observer.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bottomGutterPx, ...deps])

  return { ref, height }
}
