import {
  RefObject,
  SetStateAction,
  Dispatch as DispatchReact,
  TouchEvent as TouchEventReact,
  MouseEvent as MouseEventReact,
  PointerEvent as PointerEventReact,
  createRef,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react'
import { Draggable, ColorPair, Modes } from '../types'
import { useOutsideClick } from '../../../hooks/useOutsideClick'
import { useLanguageContext } from '../../../contexts/LanguageContext'
import { useIsClient, useWindow } from '../../../hooks/useSSR'
import DragLayer from './DragLayer'

let reset = true
let tapCount = 0
let tapTimeout: ReturnType<typeof setTimeout> | null = null

const angle = '90deg'

interface DragState {
  isDragging: boolean
  targetId: string | null
  targetElement: HTMLElement | null
  pointerStartX: number
  pointerStartY: number
  originLeft: number
  originTop: number
  currentLeft: number
  currentTop: number
  initialScale: number
  frameId: number | null
}

interface DragLayerProps {
  layer_: number
  layerAmount: number
  hiddenLayers: Set<number>
  paused: boolean
  setActiveLayer: DispatchReact<SetStateAction<number>>
  changeBlobLayer: (draggable: Draggable, layer: number) => void
  highestZIndex: Record<number, number>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dispatch: DispatchReact<any>
  d: number
  variant: number
  items: Draggable[]
  getPosition: (target: HTMLElement) => void
  setSelectedvalue0: DispatchReact<SetStateAction<string | null>>
  colorPairs: ColorPair[][]
  removeBlob: (draggable: Draggable) => void
  mode: Modes
  colorIndex: number
  setColorIndex: DispatchReact<SetStateAction<number>>
  scroll: boolean
  clickOutsideRef: RefObject<HTMLDivElement>
  colorswitch: () => string
  addRandomDraggable: (x_pos: string, y_pos: string, layer: number) => void
  changeColor: (id: string) => void
  onEscapeKey: () => void
  setMarkerEnabled: DispatchReact<SetStateAction<boolean>>
}

const preventDefault = (e: Event) => {
  e.preventDefault()
  e.stopImmediatePropagation()
}

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false

  const tagName = target.tagName
  return (
    target.isContentEditable ||
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT'
  )
}

const DragLayers = ({
  layer_,
  layerAmount,
  hiddenLayers,
  paused,
  setActiveLayer,
  changeBlobLayer,
  highestZIndex,
  dispatch,
  d,
  variant,
  items,
  getPosition,
  setSelectedvalue0,
  colorPairs,
  removeBlob,
  mode,
  colorIndex,
  setColorIndex,
  scroll,
  clickOutsideRef,
  colorswitch,
  addRandomDraggable,
  changeColor,
  onEscapeKey,
  setMarkerEnabled,
}: DragLayerProps) => {
  const isClient = useIsClient()
  const windowObj = useWindow()

  const { t } = useLanguageContext()

  const currentFocusedElementRef = useRef<HTMLElement | null>(null)
  const movementListenerRef = useRef<EventListener | null>(null)
  const mouseUpListenerRef = useRef<EventListener | null>(null)
  const touchEndListenerRef = useRef<EventListener | null>(null)
  const suppressBlurCommitRef = useRef(false)
  const dragStateRef = useRef<DragState>({
    isDragging: false,
    targetId: null,
    targetElement: null,
    pointerStartX: 0,
    pointerStartY: 0,
    originLeft: 0,
    originTop: 0,
    currentLeft: 0,
    currentTop: 0,
    initialScale: 10,
    frameId: null,
  })

  const sortedDraggables = useMemo(
    () => [...items].sort((a, b) => a.layer - b.layer),
    [items]
  )

  const groupedDraggables = useMemo(
    () =>
      sortedDraggables.reduce(
        (acc, draggable) => {
          if (!acc[draggable.layer]) {
            acc[draggable.layer] = []
          }
          acc[draggable.layer].push(draggable)
          return acc
        },
        {} as Record<number, Draggable[]>
      ),
    [sortedDraggables]
  )

  const layers = useMemo(
    () => Array.from({ length: layerAmount }, (_, i) => i),
    [layerAmount]
  )

  const layerRefs = useMemo(() => {
    return Array.from({ length: layerAmount }, (_, i) => i).reduce(
      (acc, layer) => {
        acc[layer] = createRef<HTMLUListElement>()
        return acc
      },
      {} as Record<number, RefObject<HTMLUListElement>>
    )
  }, [layerAmount])

  //Detect touch device
  const isTouchDevice = useMemo(() => {
    if (!isClient) return false
    try {
      document?.createEvent('TouchEvent')
      return true
    } catch {
      return false
    }
  }, [isClient])

  //const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0

  //Clone blob
  const makeBlob = useCallback(
    (draggable: Draggable) => {
      void dispatch({
        type: 'duplicateDraggable',
        payload: { d: d, draggable },
      })
    },
    [dispatch, d]
  )

  // Keyboard use
  const keyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isClient || !windowObj) return
      if (isEditableTarget(e.target)) return
      if (e.ctrlKey || e.metaKey || e.altKey) return

      const movePx = 4

      const target = currentFocusedElementRef.current
      if (!target) return

      const blobStyle = windowObj.getComputedStyle(target)

      const value =
        blobStyle.getPropertyValue('--i') ??
        target.style.getPropertyValue('--i') ??
        '10'
      let scale = parseFloat(value)
      scale = isNaN(scale) ? 10 : scale

      const attrLeft =
        parseFloat(blobStyle.getPropertyValue('left')) ??
        parseFloat(target.style.getPropertyValue('left')) ??
        0
      const attrTop =
        parseFloat(blobStyle.getPropertyValue('top')) ??
        parseFloat(target.style.getPropertyValue('top')) ??
        0

      const layer = target.style.getPropertyValue('--layer')

      const draggable: Draggable = {
        layer: parseInt(layer) ?? layer_,
        id: target.id,
        number: parseInt(target.id.replace('blob', '').split('-')[0], 10),
        i: scale,
        x: target.style.getPropertyValue('left').toString(),
        y: target.style.getPropertyValue('top').toString(),
        z: target.style.zIndex ?? '0',
        background:
          target.style.background ??
          'linear-gradient(90deg, cyan, greenyellow)',
      }

      const updatePosition = (left: number, top: number) => {
        void dispatch({
          type: 'partialUpdate',
          payload: {
            d: d,
            id: target.id,
            update: {
              x: `${left}px`,
              y: `${top}px`,
            },
          },
        })
      }

      const cooldown = () => {
        reset = true
      }

      const handleNumberPress = (l: number) => {
        e.preventDefault()
        if (reset) {
          reset = false
          changeBlobLayer(draggable, l)
          setTimeout(cooldown, 100)
        }
      }
      const key = e.key
      if (parseInt(key) >= 1 && parseInt(key) <= layerAmount) {
        handleNumberPress(parseInt(key) - 1)
      }

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          if (reset) {
            updatePosition(attrLeft - movePx, attrTop)
            setTimeout(cooldown, 100)
          }

          break
        case 'ArrowRight':
          e.preventDefault()
          if (reset) {
            updatePosition(attrLeft + movePx, attrTop)
            setTimeout(cooldown, 100)
          }
          break
        case 'ArrowUp':
          e.preventDefault()
          if (reset) {
            updatePosition(attrLeft, attrTop - movePx)
            setTimeout(cooldown, 100)
          }
          break
        case 'ArrowDown':
          e.preventDefault()
          if (reset) {
            updatePosition(attrLeft, attrTop + movePx)
            setTimeout(cooldown, 100)
          }
          break
        case 'Escape':
          e.preventDefault()
          onEscapeKey()
          break
        case 'Enter': //Cycle through pre-set colors
          e.preventDefault()
          e.stopPropagation()
          if (reset) {
            reset = false
            if (target.closest(`#drag-wrap${d}`)) {
              setColorIndex((prevColorIndex) => {
                const nextColorIndex =
                  (prevColorIndex + 1) % colorPairs[d].length
                return nextColorIndex // Return the new color index
              })
            }
            setTimeout(cooldown, 100)
          }
          break
        case 'R':
        case 'r':
        case ' ': //Cycle through random colors using colorswitch
          e.preventDefault()
          e.stopPropagation()
          if (reset) {
            reset = false
            if (target.closest(`#drag-wrap${d}`)) {
              const color1 = colorswitch()
              let color2 = colorswitch()

              if (color2 === color1) {
                color2 = colorswitch()
              }

              const newBackground = `linear-gradient(${angle}, ${color1}, ${color2})`
              void dispatch({
                type: 'partialUpdate',
                payload: {
                  d: d,
                  id: target.id,
                  update: { background: newBackground },
                },
              })
            }
            setTimeout(cooldown, 100)
          }
          break
        case 'Z': //Move blob to the bottom of the z-index pile
        case 'z':
          e.preventDefault()
          if (reset) {
            reset = false
            void dispatch({
              type: 'partialUpdate',
              payload: {
                d: d,
                id: target.id,
                update: {
                  z: '0',
                },
              },
            })
            setTimeout(cooldown, 100)
          }
          break
        case 'T': //Move blob to the top of the z-index pile
        case 't':
          //e.stopImmediatePropagation()
          e.preventDefault()
          if (reset) {
            reset = false
            void dispatch({
              type: 'partialUpdate',
              payload: {
                d: d,
                id: target.id,
                update: {
                  z: `${Math.max(1, highestZIndex[layer_] + 1)}`,
                },
              },
            })
            setTimeout(cooldown, 100)
          }
          break
        case 'S':
        case 's': //make blob smaller
          e.preventDefault()
          if (reset) {
            reset = false
            scale -= 0.4
            scale = Math.min(Math.max(7, scale), 36)
            void dispatch({
              type: 'partialUpdate',
              payload: {
                d: d,
                id: target.id,
                update: {
                  i: scale,
                },
              },
            })
            setTimeout(cooldown, 100)
          }
          break
        case 'B': //make blob larger
        case 'b':
        case 'L':
        case 'l':
          //e.stopImmediatePropagation()
          e.preventDefault()
          if (reset) {
            reset = false
            scale += 0.4
            scale = Math.min(Math.max(7, scale), 36)
            void dispatch({
              type: 'partialUpdate',
              payload: {
                d: d,
                id: target.id,
                update: {
                  i: scale,
                },
              },
            })
            setTimeout(cooldown, 100)
          }
          break
        case 'C': //make a new clone
        case 'c':
        case 'D':
        case 'd':
          e.preventDefault()
          //e.stopImmediatePropagation()
          if (reset) {
            reset = false
            makeBlob(draggable)
            setTimeout(cooldown, 100)
          }
          break
        case '+': // Make a random blob
          e.preventDefault()
          if (reset) {
            reset = false
            addRandomDraggable(draggable.x, draggable.y, draggable.layer)
            setTimeout(cooldown, 200)
          }
          break
        case 'M':
        case 'm': // change marker visibility
          e.preventDefault()
          if (reset) {
            reset = false
            setMarkerEnabled((prev) => !prev)
            setTimeout(cooldown, 100)
          }
          break
        case 'Delete': //remove blob
        case '-':
          //e.stopImmediatePropagation()
          e.preventDefault()
          if (reset) {
            reset = false
            removeBlob(draggable)
            setTimeout(cooldown, 100)
          }
          break
      }
    },
    [
      isClient,
      windowObj,
      d,
      layer_,
      layerAmount,
      dispatch,
      setColorIndex,
      changeBlobLayer,
      removeBlob,
      colorPairs,
      colorswitch,
      addRandomDraggable,
      makeBlob,
      highestZIndex,
      onEscapeKey,
      setMarkerEnabled,
    ]
  )

  const handleOutsideClick = useCallback(() => {
    reset = true
    const dragState = dragStateRef.current
    if (dragState.frameId !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(dragState.frameId)
      dragState.frameId = null
    }
    dragState.isDragging = false
    dragState.targetId = null
    dragState.targetElement = null
    document?.removeEventListener('keydown', keyDown)
    document?.removeEventListener('touchmove', preventDefault)
  }, [keyDown])

  const getEventPosition = useCallback(
    (
      e:
        | TouchEvent
        | MouseEvent
        | PointerEvent
        | TouchEventReact
        | MouseEventReact
        | PointerEventReact
    ) => {
      if (isTouchDevice && 'touches' in e && e.touches.length > 0) {
        return {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        }
      }

      return {
        x: 'clientX' in e ? e.clientX : 0,
        y: 'clientY' in e ? e.clientY : 0,
      }
    },
    [isTouchDevice]
  )

  const cancelDragFrame = useCallback(() => {
    const dragState = dragStateRef.current
    if (dragState.frameId !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(dragState.frameId)
      dragState.frameId = null
    }
  }, [])

  const commitDraggedPosition = useCallback(
    (target: HTMLElement | null) => {
      if (!target) return

      const dragState = dragStateRef.current
      if (dragState.targetId !== target.id) return

      if (Number.isFinite(dragState.currentLeft)) {
        target.style.left = `${dragState.currentLeft}px`
      }
      if (Number.isFinite(dragState.currentTop)) {
        target.style.top = `${dragState.currentTop}px`
      }

      cancelDragFrame()
      getPosition(target)
    },
    [cancelDragFrame, getPosition]
  )

  const removeDocumentDragListeners = useCallback(() => {
    if (!document) return

    if (movementListenerRef.current) {
      document.removeEventListener('mousemove', movementListenerRef.current)
      document.removeEventListener('touchmove', movementListenerRef.current)
    }

    if (mouseUpListenerRef.current) {
      document.removeEventListener('mouseup', mouseUpListenerRef.current)
    }

    if (touchEndListenerRef.current) {
      document.removeEventListener('touchend', touchEndListenerRef.current)
      document.removeEventListener('touchcancel', touchEndListenerRef.current)
    }
  }, [])

  useOutsideClick({
    ref: clickOutsideRef,
    onOutsideClick: handleOutsideClick,
  })

  useEffect(() => {
    if (
      isTouchDevice &&
      !currentFocusedElementRef.current &&
      scroll &&
      document
    ) {
      document.body.style.overflowY = 'auto'
      document.body.style.overflowX = 'hidden'
      document.removeEventListener('keydown', keyDown)
      document.removeEventListener('touchmove', preventDefault)
    }
  }, [scroll, isTouchDevice, keyDown])

  const start = useCallback(
    (
      e:
        | TouchEvent
        | MouseEvent
        | PointerEvent
        | TouchEventReact
        | MouseEventReact
        | PointerEventReact,
      target: HTMLElement
    ) => {
      e.stopPropagation()
      e.preventDefault()

      if (
        document?.activeElement instanceof HTMLElement &&
        document.activeElement !== target
      ) {
        document.activeElement.blur()
      }

      currentFocusedElementRef.current = target

      const { x, y } = getEventPosition(e)
      const computedStyle = windowObj?.getComputedStyle(target)
      const originLeft = Number.parseFloat(
        target.style.left ?? computedStyle?.left ?? '0'
      )
      const originTop = Number.parseFloat(
        target.style.top ?? computedStyle?.top ?? '0'
      )

      dragStateRef.current.isDragging = true
      dragStateRef.current.targetId = target.id
      dragStateRef.current.targetElement = target
      dragStateRef.current.pointerStartX = x
      dragStateRef.current.pointerStartY = y
      dragStateRef.current.originLeft = Number.isFinite(originLeft)
        ? originLeft
        : 0
      dragStateRef.current.originTop = Number.isFinite(originTop)
        ? originTop
        : 0
      dragStateRef.current.currentLeft = dragStateRef.current.originLeft
      dragStateRef.current.currentTop = dragStateRef.current.originTop

      target.classList.add('drag')
      const highestZIndexForLayer = highestZIndex[layer_]
      if (isTouchDevice) {
        const value = target?.style.getPropertyValue('--i') ?? '10'
        const initialScale = parseFloat(value)
        dragStateRef.current.initialScale = isNaN(initialScale)
          ? 10
          : initialScale
      }
      void dispatch({
        type: 'partialUpdate',
        payload: {
          d: d,
          id: target.id,
          update: {
            z: `${Math.max(1, highestZIndexForLayer + 1)}`,
          },
        },
      })

      document?.addEventListener('keydown', keyDown)
      if (movementListenerRef.current) {
        document?.addEventListener('mousemove', movementListenerRef.current)
      }
      if (mouseUpListenerRef.current) {
        document?.addEventListener('mouseup', mouseUpListenerRef.current)
      }
      const blobLayer = target.style.getPropertyValue('--layer')
      setActiveLayer(isNaN(parseInt(blobLayer)) ? 1 : parseInt(blobLayer))

      if (isTouchDevice) {
        if (movementListenerRef.current) {
          document?.addEventListener('touchmove', movementListenerRef.current, {
            passive: false,
          })
        }
        if (touchEndListenerRef.current) {
          document?.addEventListener('touchend', touchEndListenerRef.current)
          document?.addEventListener('touchcancel', touchEndListenerRef.current)
        }
        document?.addEventListener('touchmove', preventDefault, {
          passive: false,
        })
        if (document) document.body.style.overflow = 'hidden'
      }
    },
    [
      keyDown,
      isTouchDevice,
      dispatch,
      d,
      highestZIndex,
      layer_,
      setActiveLayer,
      getEventPosition,
      windowObj,
    ]
  )

  //Handle mousemove and touchmove
  const movement = useCallback(
    (
      e:
        | TouchEvent
        | MouseEvent
        | PointerEvent
        | TouchEventReact
        | MouseEventReact
        | PointerEventReact
    ) => {
      e.stopPropagation()
      if (isTouchDevice) {
        e.preventDefault()
        if (document) document.body.style.overflow = 'hidden'
      }
      const dragState = dragStateRef.current
      const target = dragState.targetElement

      if (dragState.isDragging && target) {
        const { x, y } = getEventPosition(e)
        dragState.currentLeft =
          dragState.originLeft + (x - dragState.pointerStartX)
        dragState.currentTop =
          dragState.originTop + (y - dragState.pointerStartY)

        if (dragState.frameId === null && typeof window !== 'undefined') {
          dragState.frameId = window.requestAnimationFrame(() => {
            dragState.frameId = null
            if (!dragState.targetElement) return

            dragState.targetElement.style.left = `${dragState.currentLeft}px`
            dragState.targetElement.style.top = `${dragState.currentTop}px`
          })
        }
      }
    },
    [getEventPosition, isTouchDevice]
  )

  //Handle mouse up and touch end, check for element overlap
  const stopMovementCheck = useCallback(
    (
      e:
        | TouchEvent
        | MouseEvent
        | PointerEvent
        | TouchEventReact
        | MouseEventReact
        | PointerEventReact,
      target: HTMLElement
    ) => {
      e.stopPropagation()
      e.preventDefault()
      const activeTarget = dragStateRef.current.targetElement
      if (!dragStateRef.current.isDragging || !activeTarget) return
      if (target !== activeTarget) return

      dragStateRef.current.isDragging = false
      tapCount++

      if (tapTimeout) clearTimeout(tapTimeout)
      tapTimeout = setTimeout(() => {
        if (tapCount === 2) {
          // Double-tap detected, shrink
          let scale = dragStateRef.current.initialScale - 0.8
          scale = Math.max(7, scale)
          void dispatch({
            type: 'partialUpdate',
            payload: {
              d: d,
              id: currentFocusedElementRef.current?.id,
              update: {
                i: scale,
              },
            },
          })
        } else if (tapCount === 3) {
          // Triple-tap detected, grow
          let scale = dragStateRef.current.initialScale + 0.8
          scale = Math.min(36, scale)
          void dispatch({
            type: 'partialUpdate',
            payload: {
              d: d,
              id: currentFocusedElementRef.current?.id,
              update: {
                i: scale,
              },
            },
          })
        }
        tapCount = 0
      }, 300)

      document?.removeEventListener('keydown', keyDown)
      removeDocumentDragListeners()

      if (isTouchDevice && scroll && document) {
        document.removeEventListener('touchmove', preventDefault)

        document.body.style.overflowY = 'auto'
        document.body.style.overflowX = 'hidden'
      } else if (isTouchDevice && !scroll && document) {
        document.body.style.overflow = 'hidden'
      }

      commitDraggedPosition(activeTarget)
      dragStateRef.current.targetId = null
      dragStateRef.current.targetElement = null
      activeTarget.classList.remove('drag')
      suppressBlurCommitRef.current = true
      activeTarget.blur()
      if (tapCount === 0) currentFocusedElementRef.current = null
      else currentFocusedElementRef.current = activeTarget
    },
    [
      isTouchDevice,
      scroll,
      dispatch,
      d,
      keyDown,
      commitDraggedPosition,
      removeDocumentDragListeners,
    ]
  )

  //Handle mouse leave
  const stopMoving = useCallback(
    (
      e: MouseEvent | MouseEventReact | PointerEvent | PointerEventReact,
      target: HTMLElement
    ) => {
      e.stopPropagation()
      const activeTarget = dragStateRef.current.targetElement
      if (!dragStateRef.current.isDragging || !activeTarget) return
      if (target !== activeTarget) return

      dragStateRef.current.isDragging = false
      currentFocusedElementRef.current = null
      removeDocumentDragListeners()
      if (isTouchDevice && scroll && document) {
        document?.removeEventListener('touchmove', preventDefault)
        document.body.style.overflowY = 'auto'
        document.body.style.overflowX = 'hidden'
      } else if (isTouchDevice && !scroll && document) {
        document.body.style.overflow = 'hidden'
      }

      commitDraggedPosition(activeTarget)
      dragStateRef.current.targetId = null
      dragStateRef.current.targetElement = null
      activeTarget.classList.remove('drag')
      document?.removeEventListener('keydown', keyDown)
      suppressBlurCommitRef.current = true
      activeTarget.blur()
    },
    [
      keyDown,
      isTouchDevice,
      scroll,
      commitDraggedPosition,
      removeDocumentDragListeners,
    ]
  )

  useEffect(() => {
    if (
      isTouchDevice &&
      !currentFocusedElementRef.current &&
      scroll &&
      document
    ) {
      document.removeEventListener('touchmove', preventDefault)
      document.body.style.overflowY = 'auto'
      document.body.style.overflowX = 'hidden'
    }
  }, [stopMovementCheck, stopMoving, scroll, isTouchDevice, getPosition])

  //on blob blur
  const blurred = useCallback(
    (draggable: HTMLElement) => {
      const wasDraggingCurrentBlob =
        dragStateRef.current.isDragging &&
        dragStateRef.current.targetId === draggable.id

      dragStateRef.current.isDragging = false
      draggable.classList.remove('drag')
      document?.removeEventListener('keydown', keyDown)
      removeDocumentDragListeners()
      if (suppressBlurCommitRef.current) {
        suppressBlurCommitRef.current = false
      } else if (wasDraggingCurrentBlob) {
        commitDraggedPosition(draggable)
      }
      if (dragStateRef.current.targetId === draggable.id) {
        dragStateRef.current.targetId = null
        dragStateRef.current.targetElement = null
      }
      draggable.draggable = false
      currentFocusedElementRef.current = null
    },
    [keyDown, commitDraggedPosition, removeDocumentDragListeners]
  )

  const handleDocumentMouseUp = useCallback(
    (e: MouseEvent) => {
      const target = currentFocusedElementRef.current
      if (!target) return
      stopMovementCheck(e, target)
    },
    [stopMovementCheck]
  )

  const handleDocumentTouchEnd = useCallback(
    (e: TouchEvent) => {
      const target = currentFocusedElementRef.current
      if (!target) return
      stopMovementCheck(e, target)
    },
    [stopMovementCheck]
  )

  useEffect(() => {
    movementListenerRef.current = movement as EventListener
    mouseUpListenerRef.current = handleDocumentMouseUp as EventListener
    touchEndListenerRef.current = handleDocumentTouchEnd as EventListener
  }, [movement, handleDocumentMouseUp, handleDocumentTouchEnd])

  useEffect(() => {
    return () => {
      cancelDragFrame()
      removeDocumentDragListeners()
    }
  }, [cancelDragFrame, removeDocumentDragListeners])

  //on focused blob
  const focused = useCallback(
    (draggable: HTMLElement) => {
      // getPosition(draggable)
      currentFocusedElementRef.current = draggable
      const layerStyle = draggable.style.getPropertyValue('--layer')
      setActiveLayer(parseInt(layerStyle) ?? 2)
      document?.addEventListener('keydown', keyDown)
    },
    [keyDown, setActiveLayer]
  )

  const zoom = useCallback(
    (e: WheelEvent, target: HTMLElement) => {
      //e.preventDefault();

      //scale += e.deltaY * -0.00001

      if (!isClient || !windowObj) return

      if (reset) {
        reset = false
        const blobStyle = windowObj.getComputedStyle(target)
        const value =
          blobStyle.getPropertyValue('--i') ??
          target.style.getPropertyValue('--i') ??
          '10'
        let scale = parseFloat(value)
        scale = isNaN(scale) ? 10 : scale
        if (e.deltaY < 0) scale *= 1.04
        else scale *= 0.96
        scale = Math.min(Math.max(7, scale), 36)
        void dispatch({
          type: 'partialUpdate',
          payload: {
            d: d,
            id: target.id,
            update: {
              i: scale,
            },
          },
        })
        const cooldown = () => {
          reset = true
        }
        setTimeout(cooldown, 100)
      }
    },
    [isClient, windowObj, dispatch, d]
  )

  //Mousewheel use
  const wheel = useCallback(
    (target: HTMLElement) => {
      const zoomHandler = (e: WheelEvent) => zoom(e, target)
      if (!scroll)
        target.addEventListener('wheel', zoomHandler, { passive: false })
      return () => {
        target.removeEventListener('wheel', zoomHandler)
      }
    },
    [scroll, zoom]
  )

  useEffect(() => {
    if (colorIndex < 0) {
      return
    }

    const target = currentFocusedElementRef.current
    if (target) {
      const { color1, color2 } = colorPairs[d][colorIndex]
      const newBackground = `linear-gradient(${angle}, ${color1}, ${color2})`

      void dispatch({
        type: 'partialUpdate',
        payload: {
          d: d,
          id: target.id,
          update: { background: newBackground },
        },
      })
    }
  }, [colorIndex, d, dispatch, colorPairs])

  if (!isClient) {
    return (
      <div className="flex center margin0auto textcenter">
        {t('Loading')}...
      </div>
    )
  }

  return (
    <>
      {layers.map((l) => (
        <DragLayer
          key={l}
          layer_={l}
          paused={paused}
          dragUlRef={layerRefs[l]}
          items={groupedDraggables[l] ?? []}
          className={hiddenLayers.has(l) ? 'hidden' : ''}
          d={d}
          variant={variant}
          setSelectedvalue0={setSelectedvalue0}
          start={start}
          movement={movement}
          stopMovementCheck={stopMovementCheck}
          stopMoving={stopMoving}
          wheel={wheel}
          focused={focused}
          blurred={blurred}
          removeBlob={removeBlob}
          mode={mode}
          changeBlobLayer={changeBlobLayer}
          layerAmount={layerAmount}
          changeColor={changeColor}
        />
      ))}
    </>
  )
}

export default DragLayers
