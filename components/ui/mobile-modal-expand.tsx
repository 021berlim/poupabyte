'use client'

import {
 useCallback,
 useEffect,
 useRef,
 useState,
 type PointerEvent as ReactPointerEvent,
 type RefObject,
} from 'react'

import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'

const COLLAPSED_HEIGHT_EXPR = 'min(52dvh, 21.5rem)'
const EXPANDED_HEIGHT_EXPR = 'min(85dvh, calc(100dvh - 1.5rem))'
const TAP_THRESHOLD_PX = 8
const SNAP_THRESHOLD_RATIO = 0.2

function measureHeight(expression: string) {
 if (typeof document === 'undefined') return 0

 const probe = document.createElement('div')
 probe.style.cssText = `position:fixed;left:-9999px;top:0;height:${expression};visibility:hidden;pointer-events:none;`
 document.body.appendChild(probe)
 const height = probe.getBoundingClientRect().height
 document.body.removeChild(probe)
 return height
}

export function useMobileModalExpand(
 contentRef: RefObject<HTMLElement | null>,
 enabled: boolean,
) {
 const [expanded, setExpanded] = useState(false)
 const [isDragging, setIsDragging] = useState(false)
 const [isSnapping, setIsSnapping] = useState(false)
 const expandedRef = useRef(false)
 const dragRef = useRef({
  active: false,
  pointerId: -1,
  startY: 0,
  startHeight: 0,
  collapsedHeight: 0,
  expandedHeight: 0,
 })

 const applyHeight = useCallback(
  (height: number | null) => {
   const el = contentRef.current
   if (!el) return

   if (height === null) {
    el.style.removeProperty('--app-mobile-modal-height')
    return
   }

   el.style.setProperty('--app-mobile-modal-height', `${Math.round(height)}px`)
  },
  [contentRef],
 )

 const reset = useCallback(() => {
  expandedRef.current = false
  setExpanded(false)
  setIsDragging(false)
  setIsSnapping(false)
  applyHeight(null)

  const el = contentRef.current
  if (!el) return

  el.classList.remove('app-mobile-modal-expanded', 'app-mobile-modal-dragging', 'app-mobile-modal-snap')
 }, [applyHeight, contentRef])

 useEffect(() => {
  expandedRef.current = expanded
 }, [expanded])

 useEffect(() => {
  const el = contentRef.current
  if (!el || !enabled) return

  el.classList.toggle('app-mobile-modal-expanded', expanded && !isDragging)
  el.classList.toggle('app-mobile-modal-dragging', isDragging)
  el.classList.toggle('app-mobile-modal-snap', isSnapping)
 }, [contentRef, enabled, expanded, isDragging, isSnapping])

 useEffect(() => {
  const el = contentRef.current
  if (!el) return

  const observer = new MutationObserver(() => {
   if (el.getAttribute('data-state') === 'closed') reset()
  })

  observer.observe(el, { attributes: true, attributeFilter: ['data-state'] })
  return () => observer.disconnect()
 }, [contentRef, reset])

 const onPointerDown = useCallback(
  (event: ReactPointerEvent<HTMLDivElement>) => {
   if (!enabled || event.button !== 0) return

   const el = contentRef.current
   if (!el) return

   const collapsedHeight = measureHeight(COLLAPSED_HEIGHT_EXPR)
   const expandedHeight = measureHeight(EXPANDED_HEIGHT_EXPR)
   const startHeight = expandedRef.current ? expandedHeight : collapsedHeight

   dragRef.current = {
    active: true,
    pointerId: event.pointerId,
    startY: event.clientY,
    startHeight,
    collapsedHeight,
    expandedHeight,
   }

   setIsSnapping(false)
   setIsDragging(true)
   el.classList.remove('app-mobile-modal-expanded')
   applyHeight(startHeight)
   event.currentTarget.setPointerCapture(event.pointerId)
   event.preventDefault()
  },
  [contentRef, enabled],
 )

 const onPointerMove = useCallback(
  (event: ReactPointerEvent<HTMLDivElement>) => {
   const drag = dragRef.current
   if (!drag.active || event.pointerId !== drag.pointerId) return

   const deltaY = drag.startY - event.clientY
   const nextHeight = Math.min(
    drag.expandedHeight,
    Math.max(drag.collapsedHeight, drag.startHeight + deltaY),
   )

   applyHeight(nextHeight)
  },
  [applyHeight],
 )

 const finishDrag = useCallback(
  (event: ReactPointerEvent<HTMLDivElement>) => {
   const drag = dragRef.current
   if (!drag.active || event.pointerId !== drag.pointerId) return

   if (event.currentTarget.hasPointerCapture(event.pointerId)) {
    event.currentTarget.releasePointerCapture(event.pointerId)
   }

   const deltaY = drag.startY - event.clientY
   const range = drag.expandedHeight - drag.collapsedHeight
   const wasExpanded = expandedRef.current

   let nextExpanded = wasExpanded

   if (Math.abs(deltaY) <= TAP_THRESHOLD_PX) {
    nextExpanded = !wasExpanded
   } else if (range > 0) {
    if (deltaY >= range * SNAP_THRESHOLD_RATIO) nextExpanded = true
    else if (deltaY <= -range * SNAP_THRESHOLD_RATIO) nextExpanded = false
    else {
     const currentHeight = Math.min(
      drag.expandedHeight,
      Math.max(drag.collapsedHeight, drag.startHeight + deltaY),
     )
     const midpoint = drag.collapsedHeight + range / 2
     nextExpanded = currentHeight >= midpoint
    }
   }

   dragRef.current.active = false
   setIsDragging(false)
   applyHeight(null)
   setIsSnapping(true)
   setExpanded(nextExpanded)

   window.setTimeout(() => setIsSnapping(false), 220)
  },
  [applyHeight],
 )

 return {
  expanded,
  isDragging,
  reset,
  dragHandleProps: {
   onPointerDown,
   onPointerMove,
   onPointerUp: finishDrag,
   onPointerCancel: finishDrag,
  },
 }
}

export function MobileModalDragHandle({
 contentRef,
 className,
 enabled,
}: {
 contentRef: RefObject<HTMLElement | null>
 className?: string
 enabled?: boolean
}) {
 const isMobile = useIsMobile()
 const active = enabled ?? isMobile
 const { expanded, dragHandleProps } = useMobileModalExpand(contentRef, active)

 if (!active) return null

 return (
  <div
   role="separator"
   aria-orientation="horizontal"
   aria-label={expanded ? 'Arraste para recolher o painel' : 'Arraste para expandir o painel'}
   className={cn('app-mobile-modal-drag-handle', className)}
   {...dragHandleProps}
  >
   <span className="app-mobile-modal-drag-handle-bar" aria-hidden="true" />
  </div>
 )
}