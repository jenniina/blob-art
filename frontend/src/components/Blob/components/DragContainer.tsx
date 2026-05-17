import {
  useRef,
  useEffect,
  useState,
  CSSProperties,
  PointerEvent as PointerEventReact,
  KeyboardEvent as KeyboardEventReact,
  MouseEvent as MouseEventReact,
  TouchEvent as TouchEventReact,
  FormEvent,
  ChangeEvent,
  Dispatch as DispatchReact,
  SetStateAction,
  useContext,
  useCallback,
  useMemo,
} from 'react'
import { getRandomMinMax, hslToHex, sanitize } from '../../../utils'
import {
  Draggable,
  RefObject,
  focusedBlob,
  ColorPair,
  SavedBlobs,
  Modes,
} from '../types'
import { BlobContext } from './BlobProvider'
import { ReducerProps } from '../../../types'
import useWindowSize from '../../../hooks/useWindowSize'
import { useSelector } from 'react-redux'
import { useAppDispatch } from '../../../hooks/useAppDispatch'
import Accordion from '../../Accordion/Accordion'
import { notify } from '../../../reducers/notificationReducer'
import { initializeUser } from '../../../reducers/authReducer'
import { Link } from 'react-router-dom'
import blobService from '../services/blob'
import { useLanguageContext } from '../../../contexts/LanguageContext'
import { useConfirm } from '../../../contexts/ConfirmContext'
import { useIsClient, useWindow } from '../../../hooks/useSSR'
import ColorBlocks from './ColorBlocks'
import Sliders from './Sliders'
import DragLayers from './DragLayers'
import { getErrorMessage } from '../../../utils'
import Icon from '../../Icon/Icon'
import useLocalStorage from '../../../hooks/useStorage'
import { useTheme } from '../../../hooks/useTheme'
import BlobArtIcon from '../../Icon/BlobArtIcon'

// Should be in the same order as colorBlockPropsLeft
const colorPairsLeft: ColorPair[] = [
  { color1: 'indigo', color2: 'mediumorchid' }, //colorPurple
  { color1: 'darkmagenta', color2: 'orchid' }, //colorMagenta
  { color1: 'deeppink', color2: 'fuchsia' }, //colorFuchsia
  { color1: 'hotpink', color2: 'pink' }, //colorPink
  { color1: 'crimson', color2: 'indianred' }, //colorCrimson
  { color1: 'coral', color2: 'lightcoral' }, //colorCoral
  { color1: 'orangered', color2: 'orange' }, //colorOrange
  { color1: 'darkorange', color2: 'gold' }, //colorAmber
  { color1: 'gold', color2: 'yellow' }, //colorLemon
  { color1: 'khaki', color2: 'palegoldenrod' }, //colorStraw
  { color1: 'tan', color2: 'peachpuff' }, //colorBeige
  { color1: 'peru', color2: 'burlywood' }, //colorCaramel
  { color1: 'saddlebrown', color2: 'sienna' }, //colorBrown
]
// Should be in the same order as colorBlockPropsRight
const colorPairsRight: ColorPair[] = [
  { color1: 'darkgray', color2: 'silver' }, // colorSilver
  { color1: 'dimgray', color2: 'gray' }, // colorGray
  { color1: 'steelblue', color2: 'lightslategray' }, //colorSteel
  { color1: 'blue', color2: 'royalblue' }, //colorBlue
  { color1: 'royalblue', color2: 'dodgerblue' }, //colorDenim
  { color1: 'deepskyblue', color2: 'cyan' }, //colorCyan
  { color1: 'skyblue', color2: 'paleturquoise' }, //colorIce
  { color1: 'lightgreen', color2: 'aquamarine' }, //colorMint
  { color1: 'lime', color2: 'greenyellow' }, //colorLime
  { color1: 'seagreen', color2: 'limegreen' }, //colorLeaf
  { color1: 'darkgreen', color2: 'green' }, //colorForest
  { color1: 'darkolivegreen', color2: 'olive' }, //colorOlive
  { color1: 'olive', color2: 'darkkhaki' }, //colorLichen
]

const colorPairsCombined: ColorPair[] = [...colorPairsLeft, ...colorPairsRight]

const colorPairsCombo: ColorPair[][] = [colorPairsCombined]

const angle = '90deg'

const defaultLayerAmount = 3
const minCanvasWidth = 140
const minCanvasHeight = 460
const defaultSingleCanvasVariant = 2

export type CanvasSize = {
  width: number
  height: number
}

type CanvasBounds = {
  minWidth: number
  maxWidth: number
  minHeight: number
  maxHeight: number
}

let activeBlobContainerId: number | null = null

const preventDefault = (e: Event) => {
  e.preventDefault()
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

const getDocumentClientWidth = () => {
  return globalThis.document?.documentElement?.clientWidth
}

export default function DragContainer({
  d,
  dragWrapOuter,
  scroll,
  setScroll,
}: {
  d: number
  dragWrapOuter: RefObject<HTMLDivElement>
  scroll: boolean
  setScroll: DispatchReact<SetStateAction<boolean>>
}) {
  const isClient = useIsClient()
  const windowObj = useWindow()
  const lightTheme = useTheme()

  const { t, language } = useLanguageContext()
  const confirm = useConfirm()

  const [artVariant, setArtVariant] = useState<number>(
    defaultSingleCanvasVariant
  )

  const defaultHue = '235'
  const defaultSaturation = '60'
  const defaultLightness = !lightTheme ? '20' : lightTheme ? '30' : '40'

  const { state, dispatch, undo, redo, canUndo, canRedo } =
    useContext(BlobContext)!
  const dispatch2 = useAppDispatch()
  const user = useSelector((state: ReducerProps) => state.auth?.user)

  const dragWrap = useRef(null) as RefObject<HTMLDivElement>
  const dragWrapShell = useRef(null) as RefObject<HTMLDivElement>
  const dragWrapOutest = useRef(null) as RefObject<HTMLDivElement>
  const dragContainerRef = useRef(null) as RefObject<HTMLDivElement>
  const lastFocusedBlobRef = useRef<HTMLElement | null>(null)
  const resizeStateRef = useRef<{
    startX: number
    startY: number
    startWidth: number
    startHeight: number
    startOffsetX: number
    startTop: number
    startLeft: number
    startRight: number
    horizontalDirection: 1 | -1
  } | null>(null)
  const resizeHandleLeft = useRef(null) as RefObject<HTMLButtonElement>
  const resizeHandleRight = useRef(null) as RefObject<HTMLButtonElement>

  const { windowHeight, windowWidth } = useWindowSize()

  const canvasViewportPadding = windowWidth < 500 ? 2 : 10

  const [selectedvalue0, setSelectedvalue0] = useState<string | null>(null)
  const [defaultCanvasSize, setDefaultCanvasSize] = useState<CanvasSize>({
    width: Math.max(
      minCanvasWidth,
      (windowWidth || 0) - canvasViewportPadding * 2
    ),
    height: Math.max(
      minCanvasHeight,
      (windowHeight || 0) - canvasViewportPadding * 15
    ),
  })
  const [canvasSize, setCanvasSize, removeCanvasSize] =
    useLocalStorage<CanvasSize | null>(`BlobCanvasSize${d.toString()}`, null)
  const [canvasOffsetX, setCanvasOffsetX, removeCanvasOffsetX] =
    useLocalStorage(`BlobCanvasOffset${d.toString()}`, 0)
  const hasCustomCanvasSize = canvasSize !== null

  const stopBlobs = useRef(null) as RefObject<HTMLButtonElement>
  const disableScrollButton = useRef(null) as RefObject<HTMLButtonElement>
  const resetBlobs = useRef(null) as RefObject<HTMLButtonElement>
  const resetCanvas = useRef(null) as RefObject<HTMLButtonElement>
  const [loading, setLoading] = useState(false)

  const exitApp = useRef(null) as RefObject<HTMLDivElement>

  const makeLarger0 = useRef(null) as RefObject<HTMLButtonElement>
  const makeSmaller0 = useRef(null) as RefObject<HTMLButtonElement>
  const makeMore0 = useRef(null) as RefObject<HTMLButtonElement>
  const deleteBlob0 = useRef(null) as RefObject<HTMLButtonElement>
  const layerIncrease = useRef(null) as RefObject<HTMLButtonElement>
  const layerDecrease = useRef(null) as RefObject<HTMLButtonElement>

  const makeRandom0 = useRef(null) as RefObject<HTMLButtonElement>

  const sliderLightnessInput = useRef(null) as RefObject<HTMLInputElement>
  const sliderSaturationInput = useRef(null) as RefObject<HTMLInputElement>
  const sliderHueInput = useRef(null) as RefObject<HTMLInputElement>

  const localStorageLayerAmount = useMemo(() => {
    return `BlobLayerAmount${d.toString()}`
  }, [d])
  const localStorageBackground = useMemo(() => {
    return `BackgroundColor${d.toString()}`
  }, [d])
  const localStorageDraggables = useMemo(() => {
    return `Draggables${d.toString()}`
  }, [d])
  const backgroundColor = state.backgroundColor

  const draggables = state.draggables

  const [activeLayer, setActiveLayer] = useState<number>(0)
  const [hiddenLayers, setHiddenLayers] = useState<Set<number>>(new Set())
  const [highestZIndex, setHighestZIndex] = useState<Record<number, number>>({}) // {0: 144, 1: 146, 2: 24}
  const [colorIndex, setColorIndex] = useState<number>(-1)
  const [focusedBlob, setFocusedBlob] = useState<focusedBlob | null>(null)
  const [usingKeyboard, setUsingKeyboard] = useState<boolean>(false)
  const [markerEnabled, setMarkerEnabled] = useState<boolean>(true)
  const [colorsVisible, setColorsVisible] = useState<boolean>(true)
  const [hasBeenMade, setHasBeenMade] = useState<boolean>(false)
  const [paused, setPaused] = useState<boolean>(false)
  const [prefersReducedMotion, setPrefersReducedMotion] =
    useState<boolean>(false)

  const draggablesD = draggables[d]

  const [name, setName] = useState<string>(t('BlobArt'))
  const [newName, setNewName] = useState(name)
  const [editName, setEditName] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [hasSavedFiles, setHasSavedFiles] = useState(false)
  const [serverError, setServerError] = useState(false)

  const [trackSaving, setTrackSaving] = useState(false)
  const [savedDraggables, setSavedDraggables] = useState<SavedBlobs[]>([])

  const [layerAmount, setLayerAmount] = useState<number>(0)

  const colorAmber = useRef(null) as RefObject<HTMLButtonElement>
  const colorOrange = useRef(null) as RefObject<HTMLButtonElement>
  const colorStraw = useRef(null) as RefObject<HTMLButtonElement>
  const colorLemon = useRef(null) as RefObject<HTMLButtonElement>
  const colorBrown = useRef(null) as RefObject<HTMLButtonElement>
  const colorBeige = useRef(null) as RefObject<HTMLButtonElement>
  const colorLime = useRef(null) as RefObject<HTMLButtonElement>
  const colorMint = useRef(null) as RefObject<HTMLButtonElement>
  const colorLeaf = useRef(null) as RefObject<HTMLButtonElement>
  const colorCaramel = useRef(null) as RefObject<HTMLButtonElement>
  const colorForest = useRef(null) as RefObject<HTMLButtonElement>
  const colorOlive = useRef(null) as RefObject<HTMLButtonElement>
  const colorLichen = useRef(null) as RefObject<HTMLButtonElement>
  const colorFuchsia = useRef(null) as RefObject<HTMLButtonElement>
  const colorPink = useRef(null) as RefObject<HTMLButtonElement>
  const colorCoral = useRef(null) as RefObject<HTMLButtonElement>
  const colorCrimson = useRef(null) as RefObject<HTMLButtonElement>
  const colorMagenta = useRef(null) as RefObject<HTMLButtonElement>
  const colorPurple = useRef(null) as RefObject<HTMLButtonElement>
  const colorBlue = useRef(null) as RefObject<HTMLButtonElement>
  const colorDenim = useRef(null) as RefObject<HTMLButtonElement>
  const colorCyan = useRef(null) as RefObject<HTMLButtonElement>
  const colorIce = useRef(null) as RefObject<HTMLButtonElement>
  const colorSteel = useRef(null) as RefObject<HTMLButtonElement>
  const colorGray = useRef(null) as RefObject<HTMLButtonElement>
  const colorSilver = useRef(null) as RefObject<HTMLButtonElement>

  const refNameMappingLeft = useMemo(() => {
    return new Map<RefObject<HTMLButtonElement>, string>([
      [colorPurple, 'colorPurple'],
      [colorMagenta, 'colorMagenta'],
      [colorFuchsia, 'colorFuchsia'],
      [colorPink, 'colorPink'],
      [colorCrimson, 'colorCrimson'],
      [colorCoral, 'colorCoral'],
      [colorOrange, 'colorOrange'],
      [colorAmber, 'colorAmber'],
      [colorLemon, 'colorLemon'],
      [colorStraw, 'colorStraw'],
      [colorBeige, 'colorBeige'],
      [colorCaramel, 'colorCaramel'],
      [colorBrown, 'colorBrown'],
    ])
  }, [
    colorPurple,
    colorMagenta,
    colorFuchsia,
    colorPink,
    colorCrimson,
    colorCoral,
    colorOrange,
    colorAmber,
    colorLemon,
    colorStraw,
    colorBeige,
    colorCaramel,
    colorBrown,
  ])

  const refNameMappingRight = useMemo(() => {
    return new Map<RefObject<HTMLButtonElement>, string>([
      [colorSilver, 'colorSilver'],
      [colorGray, 'colorGray'],
      [colorSteel, 'colorSteel'],
      [colorBlue, 'colorBlue'],
      [colorDenim, 'colorDenim'],
      [colorCyan, 'colorCyan'],
      [colorIce, 'colorIce'],
      [colorMint, 'colorMint'],
      [colorLime, 'colorLime'],
      [colorLeaf, 'colorLeaf'],
      [colorForest, 'colorForest'],
      [colorOlive, 'colorOlive'],
      [colorLichen, 'colorLichen'],
    ])
  }, [
    colorSilver,
    colorGray,
    colorSteel,
    colorBlue,
    colorDenim,
    colorCyan,
    colorIce,
    colorMint,
    colorLime,
    colorLeaf,
    colorForest,
    colorOlive,
    colorLichen,
  ])

  const refNameMappingCombo = useMemo(() => {
    return [
      new Map<RefObject<HTMLButtonElement>, string>([
        ...refNameMappingLeft.entries(),
        ...refNameMappingRight.entries(),
      ]),
    ]
  }, [refNameMappingLeft, refNameMappingRight])

  const getRefName = useCallback(
    (
      refNameMapping: Map<RefObject<HTMLButtonElement>, string>,
      ref: RefObject<HTMLButtonElement>
    ): string | undefined => {
      return refNameMapping.get(ref)
    },
    []
  )

  const colorBlockPropsLeft = useMemo(() => {
    return [
      colorPurple,
      colorMagenta,
      colorFuchsia,
      colorPink,
      colorCrimson,
      colorCoral,
      colorOrange,
      colorAmber,
      colorLemon,
      colorStraw,
      colorBeige,
      colorCaramel,
      colorBrown,
    ]
  }, [
    colorPurple,
    colorMagenta,
    colorFuchsia,
    colorPink,
    colorCrimson,
    colorCoral,
    colorOrange,
    colorAmber,
    colorLemon,
    colorStraw,
    colorBeige,
    colorCaramel,
    colorBrown,
  ])

  const colorBlockPropsRight = useMemo(() => {
    return [
      colorSilver,
      colorGray,
      colorSteel,
      colorBlue,
      colorDenim,
      colorCyan,
      colorIce,
      colorMint,
      colorLime,
      colorLeaf,
      colorForest,
      colorOlive,
      colorLichen,
    ]
  }, [
    colorSilver,
    colorGray,
    colorSteel,
    colorBlue,
    colorDenim,
    colorCyan,
    colorIce,
    colorMint,
    colorLime,
    colorLeaf,
    colorForest,
    colorOlive,
    colorLichen,
  ])

  const colorBlockPropsCombo = useMemo(() => {
    return [[...colorBlockPropsLeft, ...colorBlockPropsRight]]
  }, [colorBlockPropsLeft, colorBlockPropsRight])

  const [selectedColor, setSelectedColor] = useState<string>('')

  const setFocusedBlobState = useCallback((nextBlob: focusedBlob | null) => {
    setFocusedBlob((prevBlob) => {
      if (prevBlob === null && nextBlob === null) {
        return prevBlob
      }

      if (
        prevBlob !== null &&
        nextBlob !== null &&
        prevBlob.top === nextBlob.top &&
        prevBlob.left === nextBlob.left &&
        prevBlob.width === nextBlob.width &&
        prevBlob.height === nextBlob.height
      ) {
        return prevBlob
      }

      return nextBlob
    })
  }, [])

  const getFocusedBlobMetrics = useCallback(
    (target: HTMLElement | null): focusedBlob | null => {
      const activeBlob = target?.closest('.dragzone')

      if (
        !(activeBlob instanceof HTMLElement) ||
        !dragContainerRef.current?.contains(activeBlob) ||
        !dragWrapOuter.current
      ) {
        return null
      }

      const blobRect = activeBlob.getBoundingClientRect()
      const outerRect = dragWrapOuter.current.getBoundingClientRect()

      return {
        top: blobRect.top - outerRect.top + dragWrapOuter.current.scrollTop,
        left: blobRect.left - outerRect.left + dragWrapOuter.current.scrollLeft,
        width: blobRect.width,
        height: blobRect.height,
      }
    },
    [dragWrapOuter]
  )

  const syncFocusedBlobFromElement = useCallback(
    (target: HTMLElement | null) => {
      setFocusedBlobState(getFocusedBlobMetrics(target))
    },
    [getFocusedBlobMetrics, setFocusedBlobState]
  )

  const syncFocusedBlobFromActiveElement = useCallback(() => {
    if (!isClient) return

    const activeElement =
      document?.activeElement instanceof HTMLElement
        ? document.activeElement
        : null

    syncFocusedBlobFromElement(activeElement)
  }, [isClient, syncFocusedBlobFromElement])

  const changeColor = useCallback(
    (id: string) => {
      if (!selectedColor) {
        return
      }
      void dispatch({
        type: 'partialUpdate',
        payload: {
          d: d,
          id: id,
          update: {
            background: selectedColor,
          },
        },
      })
    },
    [d, dispatch, selectedColor]
  )

  const changeBlobLayer = useCallback(
    (draggable: Draggable, layer: number) => {
      const z = highestZIndex[layer] + 1
      void dispatch({
        type: 'partialUpdate',
        payload: { d, id: draggable.id, update: { layer, z } },
      })
      setActiveLayer(layer)
    },
    [d, dispatch, highestZIndex]
  )

  const toggleLayerVisibility = useCallback((layer: number) => {
    setHiddenLayers((prevHiddenLayers) => {
      const newHiddenLayers = new Set(prevHiddenLayers)
      if (newHiddenLayers.has(layer)) {
        newHiddenLayers.delete(layer)
      } else {
        newHiddenLayers.add(layer)
        setActiveLayer(layer !== 0 ? layer - 1 : layer)
        if (document !== null) (document.activeElement as HTMLElement)?.blur()
      }
      return newHiddenLayers
    })
  }, [])

  //Check for keyboard use for the focusedBlob marker
  useEffect(() => {
    const keyupListener = () => setUsingKeyboard(true)
    const mousedownListener = () => {
      setUsingKeyboard(false)
    }
    const handleMouseUp = () => {
      setFocusedBlob(null) // To prevent Marker from showing up after keyboard use and mouseup
    }
    if (!isClient || !windowObj) return
    windowObj.addEventListener('keyup', keyupListener)
    windowObj.addEventListener('mousedown', mousedownListener)
    windowObj.addEventListener('mouseup', handleMouseUp)

    return () => {
      if (!isClient || !windowObj) return
      windowObj.removeEventListener('keyup', keyupListener)
      windowObj.removeEventListener('mousedown', mousedownListener)
      windowObj.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isClient, windowObj])

  const loadDraggables = useCallback(() => {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (typeof window === 'undefined') {
          resolve(null)
          return
        }
        const draggablesJSON = localStorage.getItem(localStorageDraggables)
        if (
          draggablesJSON == null ||
          draggablesJSON == undefined ||
          draggablesJSON === 'undefined'
        ) {
          resolve(null)
        } else {
          const draggables: Draggable[] = JSON.parse(
            draggablesJSON
          ) as unknown as Draggable[]
          // Ensure each draggable has a layer property
          resolve(
            draggables.map((draggable) => ({
              ...draggable,
              layer: draggable.layer ?? 0,
            }))
          )
        }
      }, 300)
    })
  }, [localStorageDraggables]) as () => Promise<Draggable[] | null>

  function loadLayerAmount(): Promise<number | null> {
    // First check the local storage value, then check if draggables[d] has blobs, finally return the default value if both are null
    return new Promise((resolve) => {
      setTimeout(() => {
        if (typeof window === 'undefined') {
          resolve(null)
          return
        }
        const layerAmount = localStorage.getItem(localStorageLayerAmount)
        if (layerAmount != null) {
          resolve(parseInt(layerAmount))
        } else if (draggables[d]?.length > 0) {
          resolve(Math.max(...draggables[d].map((d) => d.layer)) + 1)
        } else {
          resolve(defaultLayerAmount)
        }
      }, 100)
    })
  }

  // if (draggables[d]?.length > 0) {
  //   return Math.max(...draggables[d].map((d) => d.layer)) + 1
  // } else {
  //   const layerAmount = localStorage.getItem(localStorageLayerAmount)
  //   if (layerAmount == null) return defaultLayerAmount
  //   else return parseInt(layerAmount)
  // }

  function loadBackground(): Promise<string[] | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (typeof window === 'undefined') {
          resolve(null)
          return
        }
        const backgroundColorJSON = localStorage.getItem(localStorageBackground)
        if (
          backgroundColorJSON == null ||
          backgroundColorJSON == undefined ||
          backgroundColorJSON === 'undefined'
        ) {
          resolve(null)
        } else {
          resolve(JSON.parse(backgroundColorJSON) as string[])
        }
      }, 300)
    })
  }

  const saveLayerAmount = useCallback(
    (amount: number = layerAmount) => {
      if (typeof window === 'undefined') return
      localStorage.setItem(localStorageLayerAmount, JSON.stringify(amount))
    },
    [layerAmount, localStorageLayerAmount]
  )

  const saveBackground = useCallback(
    (bg: string[] = backgroundColor[d]) => {
      if (typeof window === 'undefined') return
      localStorage.setItem(localStorageBackground, JSON.stringify(bg))
    },
    [backgroundColor, d, localStorageBackground]
  )

  const saveDraggables = useCallback(
    (blob: Draggable[] = draggables[d]) => {
      if (typeof window === 'undefined') return
      localStorage.setItem(localStorageDraggables, JSON.stringify(blob))
    },
    [d, draggables, localStorageDraggables]
  )

  const getMeasuredDefaultCanvasSize = useCallback((): CanvasSize => {
    const fallbackWidth = Math.max(
      minCanvasWidth,
      dragContainerRef.current?.clientWidth ??
        dragWrapOutest.current?.offsetWidth ??
        windowWidth ??
        minCanvasWidth
    )
    const fallbackHeight = Math.max(
      minCanvasHeight,
      (windowHeight || windowObj?.innerHeight || minCanvasHeight) - 112
    )

    return {
      width: Math.max(
        minCanvasWidth,
        dragContainerRef.current?.offsetWidth ?? fallbackWidth
      ),
      height: Math.max(
        minCanvasHeight,
        dragWrapOuter.current?.offsetHeight ?? fallbackHeight
      ),
    }
  }, [
    dragContainerRef,
    dragWrapOutest,
    dragWrapOuter,
    windowHeight,
    windowObj,
    windowWidth,
  ])

  useEffect(() => {
    if (hasCustomCanvasSize) return

    const measuredSize = getMeasuredDefaultCanvasSize()

    setDefaultCanvasSize((prev) => {
      if (
        prev &&
        prev.width === measuredSize.width &&
        prev.height === measuredSize.height
      ) {
        return prev
      }

      return measuredSize
    })
  }, [
    getMeasuredDefaultCanvasSize,
    hasCustomCanvasSize,
    windowHeight,
    windowWidth,
  ])

  const getCanvasOffsetBounds = useCallback(() => {
    const anchorLeft = dragWrapOutest.current?.getBoundingClientRect().left ?? 0
    const viewportWidth =
      getDocumentClientWidth() ||
      windowWidth ||
      windowObj?.innerWidth ||
      minCanvasWidth

    return {
      minOffsetX: Math.min(0, -anchorLeft),
      maxOffsetX: Math.max(
        0,
        viewportWidth - anchorLeft - minCanvasWidth - canvasViewportPadding
      ),
    }
  }, [dragWrapOutest, windowObj, windowWidth])

  const clampCanvasOffsetX = useCallback(
    (offsetX: number) => {
      const { minOffsetX, maxOffsetX } = getCanvasOffsetBounds()

      return Math.min(maxOffsetX, Math.max(minOffsetX, Math.round(offsetX)))
    },
    [getCanvasOffsetBounds]
  )

  const getViewportHeightLimit = useCallback(
    (top: number) => {
      const viewportHeight =
        windowHeight || windowObj?.innerHeight || minCanvasHeight
      const maxHeight = Math.max(
        viewportHeight - Math.max(top, 0) - canvasViewportPadding,
        120
      )
      const maxHeightPlus = maxHeight * 2

      return {
        minHeight: Math.min(minCanvasHeight, maxHeight),
        maxHeight: maxHeightPlus,
      }
    },
    [windowHeight, windowObj]
  )

  const applyCanvasResize = useCallback(
    ({
      horizontalDirection,
      width,
      height,
      offsetX,
      left,
      right,
      top,
      baseWidth,
    }: {
      horizontalDirection: 1 | -1
      width: number
      height: number
      offsetX: number
      left: number
      right: number
      top: number
      baseWidth: number
    }) => {
      const viewportWidth =
        getDocumentClientWidth() ||
        windowWidth ||
        windowObj?.innerWidth ||
        minCanvasWidth
      const rightResizeMaxWidth = Math.max(
        viewportWidth - Math.max(left, 0) - canvasViewportPadding,
        minCanvasWidth
      )
      const leftResizeMaxWidth = Math.max(
        right - canvasViewportPadding,
        minCanvasWidth
      )
      const widthMax =
        horizontalDirection === -1 ? leftResizeMaxWidth : rightResizeMaxWidth
      const widthMin = Math.min(minCanvasWidth, widthMax)
      let nextWidth = Math.min(widthMax, Math.max(widthMin, Math.round(width)))
      let nextOffsetX = offsetX

      if (horizontalDirection === -1) {
        nextOffsetX = clampCanvasOffsetX(offsetX + baseWidth - nextWidth)
        nextWidth = Math.min(
          widthMax,
          Math.max(widthMin, Math.round(offsetX + baseWidth - nextOffsetX))
        )
      }

      const { minHeight, maxHeight } = getViewportHeightLimit(top)
      const nextHeight = Math.min(
        maxHeight,
        Math.max(minHeight, Math.round(height))
      )

      return {
        size: {
          width: nextWidth,
          height: nextHeight,
        },
        offsetX: nextOffsetX,
      }
    },
    [clampCanvasOffsetX, getViewportHeightLimit, windowObj, windowWidth]
  )

  const getCanvasBounds = useCallback((): CanvasBounds => {
    const viewportWidth = windowWidth || windowObj?.innerWidth || minCanvasWidth
    const viewportHeight =
      windowHeight || windowObj?.innerHeight || minCanvasHeight
    const canvasRect =
      dragWrapOuter.current?.getBoundingClientRect() ??
      dragWrap.current?.getBoundingClientRect()
    const availableWidth = canvasRect
      ? viewportWidth - Math.max(canvasRect.left, 0) - canvasViewportPadding
      : viewportWidth - canvasViewportPadding * 2
    const maxWidth = Math.max(availableWidth, minCanvasWidth)
    const viewPortHeightPlus = viewportHeight * 2
    const maxHeight = Math.max(viewPortHeightPlus, minCanvasHeight)

    return {
      minWidth: Math.min(minCanvasWidth, maxWidth),
      maxWidth,
      minHeight: Math.min(minCanvasHeight, maxHeight),
      maxHeight,
    }
  }, [dragWrapOuter, dragWrap, windowHeight, windowObj, windowWidth])

  const clampCanvasSize = useCallback(
    (size: CanvasSize): CanvasSize => {
      const bounds = getCanvasBounds()

      return {
        width: Math.min(
          bounds.maxWidth,
          Math.max(bounds.minWidth, Math.round(size.width))
        ),
        height: Math.min(
          bounds.maxHeight,
          Math.max(bounds.minHeight, Math.round(size.height))
        ),
      }
    },
    [getCanvasBounds]
  )

  const getCurrentCanvasSize = useCallback((): CanvasSize => {
    if (canvasSize) {
      return clampCanvasSize(canvasSize)
    }

    const bounds = getCanvasBounds()

    if (dragWrapOuter.current) {
      return clampCanvasSize({
        width: Math.max(bounds.minWidth, dragWrapOuter.current.offsetWidth),
        height: Math.max(bounds.minHeight, dragWrapOuter.current.offsetHeight),
      })
    }

    if (dragWrap.current) {
      return clampCanvasSize({
        width: Math.max(bounds.minWidth, dragWrap.current.offsetWidth),
        height: Math.max(bounds.minHeight, dragWrap.current.offsetHeight),
      })
    }

    return clampCanvasSize({
      width: defaultCanvasSize.width,
      height: defaultCanvasSize.height,
    })
  }, [
    canvasSize,
    clampCanvasSize,
    defaultCanvasSize.height,
    defaultCanvasSize.width,
    dragWrapOuter,
    dragWrap,
    getCanvasBounds,
  ])

  const effectiveCanvasSize = canvasSize ?? defaultCanvasSize

  const sortSavedBlobsByNewest = useCallback((blobs: SavedBlobs[]) => {
    const getObjectIdTime = (id?: string) => {
      if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) return null

      const seconds = Number.parseInt(id.slice(0, 8), 16)
      return Number.isNaN(seconds) ? null : seconds * 1000
    }

    const isBackfilledLegacyTimestamp = ({
      objectIdTime,
      createdTime,
      updatedTime,
    }: {
      objectIdTime: number | null
      createdTime: number | null
      updatedTime: number | null
    }) => {
      if (
        objectIdTime === null ||
        createdTime === null ||
        updatedTime === null
      ) {
        return false
      }

      const oneDay = 24 * 60 * 60 * 1000
      const oneMinute = 60 * 1000

      return (
        createdTime - objectIdTime > oneDay &&
        updatedTime - objectIdTime > oneDay &&
        Math.abs(updatedTime - createdTime) <= oneMinute
      )
    }

    const getSavedBlobTime = (blob: SavedBlobs) => {
      const updatedTime = blob.updatedAt
        ? new Date(blob.updatedAt).getTime()
        : null
      const createdTime = blob.createdAt
        ? new Date(blob.createdAt).getTime()
        : null
      const objectIdTime = getObjectIdTime(blob._id)

      const validUpdatedTime =
        updatedTime !== null && !Number.isNaN(updatedTime) ? updatedTime : null
      const validCreatedTime =
        createdTime !== null && !Number.isNaN(createdTime) ? createdTime : null

      if (
        isBackfilledLegacyTimestamp({
          objectIdTime,
          createdTime: validCreatedTime,
          updatedTime: validUpdatedTime,
        })
      ) {
        return objectIdTime
      }

      if (validUpdatedTime !== null) {
        return validUpdatedTime
      }

      if (validCreatedTime === null) {
        return null
      }

      // Some legacy blobs were backfilled with a fresh createdAt long after
      // the document was actually created. Prefer the ObjectId timestamp when
      // createdAt looks like that kind of backfill.
      if (
        objectIdTime !== null &&
        validUpdatedTime === null &&
        Math.abs(validCreatedTime - objectIdTime) > 24 * 60 * 60 * 1000
      ) {
        return objectIdTime
      }

      return validCreatedTime
    }

    return [...blobs].sort((a, b) => {
      const dateA = getSavedBlobTime(a)
      const dateB = getSavedBlobTime(b)

      if (dateA === null && dateB === null) return 0
      if (dateA === null) return 1
      if (dateB === null) return -1

      return dateB - dateA
    })
  }, [])

  const orderedSavedDraggables = useMemo(() => {
    return sortSavedBlobsByNewest(savedDraggables)
  }, [savedDraggables, sortSavedBlobsByNewest])

  const getBlobsFromServer = useCallback(async () => {
    setIsLoading(true)
    setServerError(false)
    try {
      if (user?._id) {
        await blobService
          .getAllBlobsByUser(user?._id, d, language)
          .then((response: SavedBlobs[]) => {
            if (response) {
              //   //filter out the draggables part
              //   console.log(
              //     response
              //       .map((blob) => ({
              //         ...blob,
              //         draggables: blob.draggables
              //           ? '[Draggables filtered out]'
              //           : 'No Draggables',
              //       }))
              //       .map((blob) => JSON.stringify(blob))
              //       .join('\n')
              //   )
              const sortedDraggables = sortSavedBlobsByNewest(response)
              setSavedDraggables(sortedDraggables)
              setHasSavedFiles(sortedDraggables.length > 0)
              setIsLoading(false)
            }
          })
          .catch((err: unknown) => {
            const message = getErrorMessage(err, t('Error'))
            void dispatch2(notify(message, true, 8))
            setServerError(true)
            setIsLoading(false)
          })
      }
    } catch (err: unknown) {
      const message = getErrorMessage(err, t('Error'))
      void dispatch2(notify(message, true, 8))
      setServerError(true)
      setIsLoading(false)
    }
  }, [d, dispatch2, language, sortSavedBlobsByNewest, t, user?._id])

  const checkDuplicateVersionName = (versionName: string): boolean => {
    return savedDraggables.some((blob) => blob.versionName === versionName)
  }

  const regex = /^[\w\s\u00C0-\u024F\u1E00-\u1EFF-]*$/u

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (regex.test(value)) {
      setName(value)
    } else {
      void dispatch2(notify(t('SpecialCharactersNotAllowed'), true, 8))
    }
  }

  const handleNewNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (regex.test(value)) {
      setNewName(value)
    } else {
      void dispatch2(notify(t('SpecialCharactersNotAllowed'), true, 8))
    }
  }

  const saveBlobsToServer = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const versionName = name.trim()

      if (versionName === '') {
        void dispatch2(notify(t('NameYourArtwork'), true, 8))
        return
      }

      if (versionName.length > 30) {
        void dispatch2(
          notify(
            `${t('NameTooLong')}. ${t('AMaxOf30CharactersPlease')}`,
            true,
            8
          )
        )
        return
      }

      if (!user?._id) {
        void dispatch2(notify(t('LoginToSaveBlobs'), true, 8))
        return
      }

      const isDuplicate = checkDuplicateVersionName(versionName)
      if (isDuplicate) {
        const shouldOverwrite = await confirm({
          message: t('AVersionAlreadyExistsOverwrite'),
        })
        if (!shouldOverwrite) return
      }

      await blobService.saveBlobsByUser(
        user._id,
        d,
        artVariant,
        draggables[d],
        versionName,
        backgroundColor[d],
        language
      )

      resetSavedArtworkPage(d)
      setTrackSaving((prev) => !prev)
      void dispatch2(notify(t('SavingSuccessful'), false, 8))
    } catch (err: unknown) {
      const message = getErrorMessage(err, t('Error'))
      void dispatch2(notify(message, true, 8))
    } finally {
      setLoading(false)
    }
  }

  const editBlobsByUser = async (
    versionName: string,
    newVersionName: string
  ) => {
    const newVersion = newVersionName.trim()
    if (newVersionName.trim() === '') {
      void dispatch2(notify(t('NameYourArtwork'), true, 8))
      return
    } else if (newVersionName.trim().length > 30) {
      void dispatch2(
        notify(`${t('NameTooLong')}. ${t('AMaxOf30CharactersPlease')}`, true, 8)
      )
      return
    } else {
      try {
        if (user?._id) {
          await blobService
            .editBlobsByUser(
              user?._id,
              d,
              artVariant,
              draggables[d],
              versionName,
              backgroundColor[d],
              language,
              newVersion
            )
            .then(() => {
              resetSavedArtworkPage(d)
              setTrackSaving((prev) => !prev)
              void dispatch2(notify(t('SavingSuccessful'), false, 8))
            })
            .catch((err: unknown) => {
              const message = getErrorMessage(err, t('Error'))
              void dispatch2(notify(message, true, 8))
            })
        } else {
          void dispatch2(notify(t('LoginToSaveBlobs'), true, 8))
        }
      } catch (err: unknown) {
        const message = getErrorMessage(err, t('Error'))
        void dispatch2(notify(message, true, 8))
      }
    }
  }

  const loadBlobsFromServer = async (d: number, versionName: string) => {
    const newVersion = versionName.trim()
    if (user?._id) {
      if (await confirm({ message: t('NoteThatUnsavedChangesWillBeLost') })) {
        await blobService
          .getBlobsVersionByUser(user?._id, d, newVersion, language)
          .then((response: SavedBlobs) => {
            const nextVariant =
              response.variant ?? response.d ?? defaultSingleCanvasVariant
            const highestLayerInDraggables = Math.max(
              ...response.draggables.map(
                (draggable: Draggable) => draggable.layer
              )
            )
            setArtVariant(nextVariant)
            setLayerAmount(highestLayerInDraggables + 1)
            setTimeout(() => {
              saveLayerAmount(highestLayerInDraggables + 1)
            }, 300)
            void dispatch({
              type: 'setDraggablesAtD',
              payload: { d, draggables: response.draggables },
            })
            void dispatch({
              type: 'setBackgroundColor',
              payload: { d, backgroundColor: response.backgroundColor },
            })
            saveBackground(response.backgroundColor)
            setSliderHueVal(response.backgroundColor[0])
            setSliderSatVal(response.backgroundColor[1])
            setSliderLightVal(response.backgroundColor[2])
            setDragWrapOuterHue({
              [`--hue${d}`]: `${response.backgroundColor[0]}`,
            })
            setDragWrapOuterSaturation({
              [`--saturation${d}`]: `${response.backgroundColor[1]}`,
            })
            setDragWrapOuterLightness({
              [`--lightness${d}`]: `${response.backgroundColor[2]}`,
            })
          })
          .then(() => {
            setName(newVersion)
            scrollToArt()

            setTimeout(() => {
              widthResize()
            }, 300)
          })
          .catch((err: unknown) => {
            const message = getErrorMessage(err, t('Error'))
            void dispatch2(notify(message, true, 8))
          })
      }
    }
  }

  const deleteBlobsVersionFromServer = async (
    d: number,
    versionName: string
  ) => {
    if (user?._id) {
      if (
        await confirm({ message: t('AreYouSureYouWantToDeleteThisVersion') })
      ) {
        await blobService
          .deleteBlobsVersionByUser(user._id, d, versionName, language)
          .then(() => {
            void dispatch2(notify(t('DeletedArt'), false, 8))
            resetSavedArtworkPage(d)
            setTrackSaving((prev) => !prev)
          })
          .catch((err: unknown) => {
            const message = getErrorMessage(err, t('Error'))
            void dispatch2(notify(message, true, 8))
          })
      }
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      await dispatch2(initializeUser())
    }
    void fetchData()
  }, [dispatch2])

  useEffect(() => {
    if (user) {
      void getBlobsFromServer()
    }
  }, [user, trackSaving, getBlobsFromServer])

  function getHighestZIndex(draggables: Draggable[]): Record<number, number> {
    return draggables.reduce(
      (acc, draggable) => {
        const zIndex = parseInt(draggable.z, 10)
        const layer = draggable.layer
        if (!acc[layer] || zIndex > acc[layer]) {
          acc[layer] = zIndex
        }
        return acc
      },
      {} as Record<number, number>
    )
  }

  useEffect(
    () => {
      const load = async () => {
        const loadedDraggables = await loadDraggables()
        const loadedBackgroundColor = await loadBackground()
        const delay = void setTimeout(() => {
          void (async () => {
            const loadedLayerAmount = await loadLayerAmount()
            if (loadedBackgroundColor?.length === 3) {
              void dispatch({
                type: 'setBackgroundColor',
                payload: { d, backgroundColor: loadedBackgroundColor },
              })
              saveBackground(loadedBackgroundColor)

              setSliderHueVal(loadedBackgroundColor[0])
              setSliderSatVal(loadedBackgroundColor[1])
              setSliderLightVal(loadedBackgroundColor[2])

              dragWrapOuter.current?.style.setProperty(
                `--hue${d}`,
                `${loadedBackgroundColor[0]}`
              )
              dragWrapOuter.current?.style.setProperty(
                `--saturation${d}`,
                `${loadedBackgroundColor[1]}`
              )
              dragWrapOuter.current?.style.setProperty(
                `--lightness${d}`,
                `${loadedBackgroundColor[2]}`
              )
            } else {
              void dispatch({
                type: 'setBackgroundColor',
                payload: {
                  d,
                  backgroundColor: [
                    defaultHue,
                    defaultSaturation,
                    defaultLightness,
                  ],
                },
              })
              saveBackground([defaultHue, defaultSaturation, defaultLightness])
            }
            if (loadedLayerAmount) {
              setLayerAmount(loadedLayerAmount)
            } else if (loadedDraggables && loadedDraggables.length > 0) {
              setLayerAmount(
                Math.max(...loadedDraggables.map((d) => d.layer)) + 1
              )
            }
            if (loadedDraggables && loadedDraggables.length > 0) {
              if (loadedDraggables && loadedDraggables.length > 0) {
                makeFromStorage(loadedDraggables)
              }
              setHasBeenMade(true)
            } else if (
              (loadedDraggables === null || loadedDraggables === undefined) &&
              !hasBeenMade
            ) {
              makeAnew(amountOfBlobs, d)
              setHasBeenMade(true)
            }
          })()
        }, 300) // 300ms delay
        return () => clearTimeout(delay)
      }
      void load()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      d,
      hasBeenMade,
      dispatch,
      dragWrapOuter,
      defaultHue,
      defaultLightness,
      defaultSaturation,
    ]
  )

  useEffect(() => {
    if (draggablesD !== undefined && draggablesD?.length > 0) {
      saveDraggables()
      const highestZ = getHighestZIndex(draggablesD)
      setHighestZIndex(highestZ)
    }
  }, [draggablesD, saveDraggables])

  function makeFromStorage(blobs: Draggable[]) {
    if (!hasBeenMade && blobs && blobs?.length > 0) {
      for (let i = 0; i < blobs?.length; i++) {
        if (blobs[i] !== null && blobs[i] !== undefined) {
          const newDraggable = {
            layer: blobs[i].layer,
            id: `${blobs[i].id}`,
            number: blobs[i].number,
            i: blobs[i].i,
            x: `${blobs[i].x}`,
            y: `${blobs[i].y}`,
            z: `${blobs[i].z}`,
            background: `${
              blobs[i].background ?? 'linear-gradient(90deg, cyan, greenyellow)'
            }`,
          }
          void dispatch({
            type: 'addDraggable',
            payload: { d, draggable: newDraggable },
          })
        }
      }
    }
    setHasBeenMade(true)
  }

  const handleMoveLeft = () => {
    void dispatch({ type: 'moveDraggablesLeft', payload: { d } })
  }
  const handleMoveRight = () => {
    void dispatch({ type: 'moveDraggablesRight', payload: { d } })
  }
  const handleMoveUp = () => {
    void dispatch({ type: 'moveDraggablesUp', payload: { d } })
  }
  const handleMoveDown = () => {
    void dispatch({ type: 'moveDraggablesDown', payload: { d } })
  }

  function stopSway(
    e:
      | MouseEventReact<HTMLButtonElement, MouseEvent>
      | PointerEventReact<HTMLButtonElement>
  ) {
    e.preventDefault()
    setPaused((prev) => !prev)
  }

  useEffect(() => {
    if (prefersReducedMotion && dragWrap.current) {
      dragWrap.current.classList.add('paused')
      setPaused(true)
    }
  }, [prefersReducedMotion])

  useEffect(() => {
    if (!isClient || !windowObj) return
    const mediaQuery = windowObj.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const listener = () => setPrefersReducedMotion(mediaQuery.matches)
    mediaQuery.addEventListener('change', listener)

    return () => {
      mediaQuery.removeEventListener('change', listener)
    }
  }, [isClient, windowObj])

  const amountOfBlobs = windowWidth > 700 ? 10 : 6 // Initial amount of blobs

  const resetDocumentScroll = useCallback(() => {
    if (document !== null) {
      document.body.style.overflowY = 'auto'
      document.body.style.overflowX = 'hidden'
    }
  }, [])

  const focusLastBlob = useCallback(() => {
    const container = dragContainerRef.current
    const currentBlob = lastFocusedBlobRef.current

    if (
      currentBlob &&
      currentBlob.isConnected &&
      container?.contains(currentBlob)
    ) {
      currentBlob.focus()
      return true
    }

    const blobs = container?.querySelectorAll<HTMLElement>('.dragzone')
    const fallbackBlob = blobs?.item(blobs.length - 1) ?? null
    if (!fallbackBlob) {
      return false
    }

    lastFocusedBlobRef.current = fallbackBlob
    fallbackBlob.focus()
    return true
  }, [])

  const exitAppBlur = useCallback(() => {
    if (exitApp.current) {
      exitApp.current.removeAttribute('tabindex')
      exitApp.current.removeEventListener('blur', exitAppBlur)
      exitApp.current.textContent = ''
    }
  }, [exitApp])

  const focusExitApp = useCallback(() => {
    if (!exitApp.current) {
      return
    }

    exitApp.current.setAttribute('tabindex', '0')
    exitApp.current.addEventListener('blur', exitAppBlur)
    exitApp.current.textContent = t('ThankYouForPlaying')
    dragWrap.current?.blur()
    exitApp.current.focus()
  }, [dragWrap, exitApp, exitAppBlur, t])

  // Change every blob's layer by plus or minus one, unless any blob is already on the highest or lowest layer
  const changeEveryLayer = (amount: number) => {
    const isAnyOnLowestLayer = draggables[d].some(
      (draggable) => draggable.layer === 0 && amount < 0
    )
    const isAnyOnHighestLayer = draggables[d].some(
      (draggable) => draggable.layer === layerAmount - 1 && amount > 0
    )

    if (isAnyOnLowestLayer) {
      void dispatch2(
        notify(t('CannotLowerEveryBlobFurtherSomeBlobsAlreadyLowest'), true, 8)
      )
      return
    }

    if (isAnyOnHighestLayer) {
      void dispatch2(notify(t('CannotRaiseEveryBlobFurther'), true, 8))
      return
    }

    const newDraggables = draggables[d].map((draggable) => {
      const layer = draggable.layer + amount
      if (layer >= 0 && layer < layerAmount) {
        return { ...draggable, layer }
      } else {
        return draggable
      }
    })

    void dispatch({
      type: 'setDraggablesAtD',
      payload: { d, draggables: newDraggables },
    })
  }

  async function resetBlobsFunction(
    e: MouseEventReact | TouchEventReact | PointerEventReact
  ) {
    e.preventDefault()
    if (await confirm({ message: `${t('ResetBlobs')}?` })) {
      if (!isClient || !windowObj) return

      windowObj.localStorage.removeItem(localStorageDraggables)

      void dispatch({ type: 'resetDraggables', payload: { d } })
      void dispatch({
        type: 'setDraggablesAtD',
        payload: { d, draggables: [] },
      })
      makeAnew(amountOfBlobs, d)
      setTimeout(() => {
        widthResize()
        saveLayerAmount(defaultLayerAmount)
      }, 300)
    }
  }

  async function resetCanvasFunction(
    e: MouseEventReact | TouchEventReact | PointerEventReact
  ) {
    e.preventDefault()
    if (await confirm({ message: `${t('ResetCanvas')}?` })) {
      if (!isClient || !windowObj) return
      windowObj.localStorage.removeItem(localStorageBackground)
      removeCanvasSize()
      removeCanvasOffsetX()
      setCanvasSize(null)
      setCanvasOffsetX(0)
      setArtVariant(defaultSingleCanvasVariant)
    }
  }

  const makeAnew = (amount: number, d: number) => {
    setActiveLayer(0)
    for (let i = 0; i < amount; i++) {
      const colorswitch = () => {
        const colorArray = colorPairsCombo[d]
        const randomIndex = Math.floor(Math.random() * colorArray.length)
        return [colorArray[randomIndex].color1, colorArray[randomIndex].color2]
      }
      const [colorFirst, colorSecond] = colorswitch()

      const wide =
        (effectiveCanvasSize?.width ?? windowWidth) >
        (effectiveCanvasSize?.height ?? windowHeight)

      const newDraggable: Draggable = {
        layer: 0,
        id: `blob${i + 1}-${d}`,
        number: i + 1,
        i:
          windowWidth > 400
            ? Math.round(getRandomMinMax(7, 20))
            : Math.round(getRandomMinMax(7, 10)),
        x: wide
          ? `${((effectiveCanvasSize?.width ?? windowWidth) / 100) * Math.round(getRandomMinMax(2, 70))}px`
          : `${((effectiveCanvasSize?.width ?? windowWidth) / 100) * Math.round(getRandomMinMax(2, 50))}px`,
        y: `${((effectiveCanvasSize?.height ?? windowHeight) / 100) * Math.round(getRandomMinMax(2, 70))}px`,
        z: `1`,
        background: `linear-gradient(${angle ?? '90deg'}, ${
          colorFirst ?? 'cyan'
        },${colorSecond ?? 'greenyellow'})`,
      }
      void dispatch({
        type: 'addDraggable',
        payload: { d, draggable: newDraggable },
      })
    }

    setLayerAmount(defaultLayerAmount)
  }

  const colorswitch = () => {
    const colors = [
      'aliceblue',
      'antiquewhite',
      'aqua',
      'aquamarine',
      'azure',
      'beige',
      'bisque',
      'blanchedalmond',
      'blue',
      'brown',
      'burlywood',
      'cadetblue',
      'chartreuse',
      'chocolate',
      'cornflowerblue',
      'cornsilk',
      'cyan',
      'darkcyan',
      'darkgoldenrod',
      'darkgray',
      'darkkhaki',
      'darkmagenta',
      'darkorchid',
      'darkseagreen',
      'darkslateblue',
      'darkturquoise',
      'darkviolet',
      'deepskyblue',
      'deeppink',
      'dimgray',
      'dodgerblue',
      'darkorange',
      'fuchsia',
      'gainsboro',
      'gold',
      'goldenrod',
      'gray',
      'green',
      'greenyellow',
      'honeydew',
      'hotpink',
      'indianred',
      'indigo',
      'ivory',
      'lavender',
      'lavenderblush',
      'lawngreen',
      'lemonchiffon',
      'lightblue',
      'lightcyan',
      'lightgray',
      'lightgreen',
      'lightpink',
      'lightseagreen',
      'lightskyblue',
      'lightslategray',
      'lightsteelblue',
      'limegreen',
      'linen',
      'magenta',
      'mediumaquamarine',
      'mediumblue',
      'mediumorchid',
      'mediumpurple',
      'mediumseagreen',
      'mediumslateblue',
      'mediumspringgreen',
      'mediumvioletred',
      'mintcream',
      'mistyrose',
      'moccasin',
      'navajowhite',
      'oldlace',
      'olive',
      'olivegreen',
      'olivedrab',
      'orange',
      'orangered',
      'palegreen',
      'paleturquoise',
      'palevioletred',
      'papayawhip',
      'peachpuff',
      'peru',
      'pink',
      'plum',
      'powderblue',
      'rebeccapurple',
      'red',
      'rosybrown',
      'royalblue',
      'saddlebrown',
      'sandybrown',
      'seagreen',
      'seashell',
      'sienna',
      'silver',
      'skyblue',
      'slateblue',
      'slategray',
      'snow',
      'springgreen',
      'steelblue',
      'tan',
      'teal',
      'thistle',
      'tomato',
      'turquoise',
      'violet',
      'wheat',
      'white',
      'whitesmoke',
      'yellow',
      'yellowgreen',
    ]
    const randomIndex = Math.floor(Math.random() * colors.length)
    return colors[randomIndex]
  }

  useEffect(() => {
    return
  }, [state.draggables])

  const getRandomBlobSpawnPosition = useCallback(() => {
    const fallbackX = `${((effectiveCanvasSize?.width ?? windowWidth) / 100) * Math.round(getRandomMinMax(25, 55))}px`
    const fallbackY = `${((effectiveCanvasSize?.height ?? windowHeight) / 100) * Math.round(getRandomMinMax(80, 90))}px`

    if (!makeRandom0.current || !dragWrap.current || !dragWrapOuter.current) {
      return { x: fallbackX, y: fallbackY }
    }

    const viewportHeight = dragWrap.current.clientHeight
    const scrollTop = dragWrapOuter.current.scrollTop
    const canvasHeight = dragWrapOuter.current.offsetHeight
    const scrollLeft = dragWrapOuter.current.scrollLeft
    const canvasWidth = dragWrapOuter.current.offsetWidth

    const spawnY = Math.max(
      0,
      Math.round(
        scrollTop +
          viewportHeight -
          getRandomMinMax(canvasHeight * 0.15, canvasHeight * 0.25)
      )
    )

    const spawnX = Math.max(
      0,
      Math.min(
        canvasWidth,
        Math.round(
          scrollLeft +
            Math.round(getRandomMinMax(canvasWidth * 0.15, canvasWidth * 0.75))
        )
      )
    )

    return {
      x: `${spawnX}px`,
      y: `${spawnY}px`,
    }
  }, [
    effectiveCanvasSize?.height,
    effectiveCanvasSize?.width,
    makeRandom0,
    dragWrap,
    dragWrapOuter,
    windowHeight,
    windowWidth,
  ])

  const addRandomDraggable = (
    x_pos = getRandomBlobSpawnPosition().x,
    y_pos = getRandomBlobSpawnPosition().y,
    layer: number = activeLayer
  ) => {
    if (
      //makeRandom0 is focused:
      document !== null &&
      document.activeElement instanceof HTMLElement &&
      document.activeElement.id === `make-random${d}`
    )
      document.activeElement.blur() // Unfocus the button after clicking, as the tooltip will otherwise stay visible and be in the way

    if (hiddenLayers.has(activeLayer)) {
      void dispatch2(notify(t('LayerHidden'), true, 8))
      return
    }

    // Fully random:
    const colorFirst = colorswitch()
    const colorSecond = colorswitch()

    const maxId = Math.max(
      ...state.draggables[d].map((draggable: Draggable) =>
        parseInt(draggable.id.split('-')[0].replace('blob', ''), 10)
      )
    )

    const highestZ = !isNaN(highestZIndex[layer]) ? highestZIndex[layer] + 1 : 1

    const newDraggable: Draggable = {
      layer,
      id: `blob${maxId + 1}-${d}`,
      number: maxId + 1,
      i: Math.ceil(getRandomMinMax(6.5, 10)),
      x: x_pos,
      y: y_pos,
      z: `${highestZ}`,
      background: `linear-gradient(${angle ?? '90deg'}, ${
        colorFirst ?? 'cyan'
      },${colorSecond ?? 'greenyellow'})`,
    }
    void dispatch({
      type: 'duplicateDraggable',
      payload: { d, draggable: newDraggable },
    })
  }

  const getPosition = useCallback(
    (draggable: HTMLElement) => {
      if (!isClient || !windowObj) return

      const blobStyle = windowObj.getComputedStyle(draggable)

      const readCssValue = (
        propertyName: string,
        inlineFallback: string,
        stateFallback = ''
      ) => {
        const computedValue = blobStyle.getPropertyValue(propertyName).trim()
        if (computedValue !== '') return computedValue

        const inlineValue = draggable.style
          .getPropertyValue(inlineFallback)
          .trim()
        if (inlineValue !== '') return inlineValue

        return stateFallback
      }

      const existingDraggable = state.draggables[d]?.find(
        (item) => item.id === draggable.id
      )

      const blobX = readCssValue('left', 'left', existingDraggable?.x ?? '0px')
      const blobY = readCssValue('top', 'top', existingDraggable?.y ?? '0px')

      void dispatch({
        type: 'partialUpdate',
        payload: {
          d,
          id: draggable.id,
          update: {
            x: blobX,
            y: blobY,
          },
        },
      })
    },
    [d, dispatch, isClient, state.draggables, windowObj]
  )

  useEffect(() => {
    const container = dragContainerRef.current
    if (!isClient || !container) return

    const markActive = () => {
      activeBlobContainerId = d
    }

    container.addEventListener('pointerdown', markActive)
    container.addEventListener('focusin', markActive)
    container.addEventListener('mousedown', markActive)
    container.addEventListener('touchstart', markActive, { passive: true })

    return () => {
      container.removeEventListener('pointerdown', markActive)
      container.removeEventListener('focusin', markActive)
      container.removeEventListener('mousedown', markActive)
      container.removeEventListener('touchstart', markActive)

      if (activeBlobContainerId === d) {
        activeBlobContainerId = null
      }
    }
  }, [d, isClient])

  useEffect(() => {
    const container = dragContainerRef.current
    if (!isClient || !container) return

    const trackFocusedBlob = (e: FocusEvent) => {
      const target = e.target
      if (!(target instanceof HTMLElement)) return

      const blob = target.closest('.dragzone')
      if (blob instanceof HTMLElement && container.contains(blob)) {
        lastFocusedBlobRef.current = blob
      }
    }

    container.addEventListener('focusin', trackFocusedBlob)

    return () => {
      container.removeEventListener('focusin', trackFocusedBlob)
    }
  }, [isClient])

  useEffect(() => {
    if (!isClient || !document) return

    const handleUndoRedo = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return
      if (e.altKey || !(e.ctrlKey || e.metaKey)) return
      if (isEditableTarget(e.target)) return

      if (activeBlobContainerId !== d) return

      const key = e.key.toLowerCase()

      if (key === 'z' && e.shiftKey) {
        if (!canRedo) return
        e.preventDefault()
        redo()
        return
      }

      if (key === 'y') {
        if (!canRedo) return
        e.preventDefault()
        redo()
        return
      }

      if (key === 'z') {
        if (!canUndo) return
        e.preventDefault()
        undo()
      }
    }

    document.addEventListener('keydown', handleUndoRedo)

    return () => {
      document.removeEventListener('keydown', handleUndoRedo)
    }
  }, [canRedo, canUndo, isClient, redo, undo])

  useEffect(() => {
    const dragWrapCurrent = dragWrapOuter.current

    if (!scroll && document !== null) {
      document.addEventListener('touchmove', preventDefault, {
        passive: false,
      })
      if (document !== null) document.body.style.overflow = 'hidden'
      dragWrapCurrent?.addEventListener('touchmove', preventDefault, {
        passive: false,
      })
      if (dragWrapCurrent) dragWrapCurrent.style.overflow = 'hidden'
    } else if (scroll && document !== null) {
      document.body.style.overflowY = 'auto'
      document.body.style.overflowX = 'hidden'
      document.removeEventListener('touchmove', preventDefault)
      if (dragWrapCurrent) dragWrapCurrent.style.overflow = 'auto'
      dragWrapCurrent?.removeEventListener('touchmove', preventDefault)
    }
    return () => {
      document?.removeEventListener('touchmove', preventDefault)
      dragWrapCurrent?.removeEventListener('touchmove', preventDefault)
    }
  }, [scroll, dragWrapOuter])

  function disableScroll() {
    setScroll(!scroll)
  }

  // SLIDERS

  const [sliderHueVal, setSliderHueVal] = useState(defaultHue)
  const [sliderSatVal, setSliderSatVal] = useState(defaultSaturation)

  const [sliderLightVal, setSliderLightVal] = useState(defaultLightness)

  const backgroundColorStyle = {
    backgroundColor: `hsl(var(--hue${d}), calc(var(--saturation${d}) * 1%), calc(var(--lightness${d}) * 1%))`,
  }
  const [dragWrapOuterHue, setDragWrapOuterHue] = useState<CSSProperties>(
    sliderHueInput.current
      ? {
          [`--hue${d}`]: `${sliderHueInput.current.value}`,
        }
      : {
          [`--hue${d}`]: `${sliderHueVal}`,
        }
  )
  const [dragWrapOuterSaturation, setDragWrapOuterSaturation] =
    useState<CSSProperties>(
      sliderSaturationInput.current
        ? {
            [`--saturation${d}`]: `${sliderSaturationInput.current.value}`,
          }
        : {
            [`--saturation${d}`]: `${sliderSatVal}`,
          }
    )
  const [dragWrapOuterLightness, setDragWrapOuterLightness] =
    useState<CSSProperties>(
      sliderLightnessInput.current
        ? {
            [`--lightness${d}`]: `${sliderLightnessInput.current.value}`,
          }
        : {
            [`--lightness${d}`]: `${sliderLightVal}`,
          }
    )

  function sliderHue() {
    if (dragWrapOuter.current) {
      setDragWrapOuterHue({ [`--hue${d}`]: `${sliderHueVal}` })
      const updatedBackgroundColor: string[][] = JSON.parse(
        JSON.stringify(backgroundColor)
      ) as unknown as string[][]
      updatedBackgroundColor[d][0] = sliderHueVal
      void dispatch({
        type: 'setBackgroundColor',
        payload: { d, backgroundColor: updatedBackgroundColor[d] },
      })
      saveBackground(updatedBackgroundColor[d])
    }
  }

  function sliderSaturation() {
    if (dragWrapOuter.current) {
      setDragWrapOuterSaturation({
        [`--saturation${d}`]: `${sliderSatVal}`,
      })
      const updatedBackgroundColor: string[][] = JSON.parse(
        JSON.stringify(backgroundColor)
      ) as unknown as string[][]
      updatedBackgroundColor[d][1] = sliderSatVal
      void dispatch({
        type: 'setBackgroundColor',
        payload: { d, backgroundColor: updatedBackgroundColor[d] },
      })
      saveBackground(updatedBackgroundColor[d])
    }
  }

  function sliderLightness() {
    if (dragWrapOuter.current) {
      setDragWrapOuterLightness({
        [`--lightness${d}`]: `${sliderLightVal}`,
      })

      const updatedBackgroundColor: string[][] = JSON.parse(
        JSON.stringify(backgroundColor)
      ) as unknown as string[][]
      updatedBackgroundColor[d][2] = sliderLightVal
      void dispatch({
        type: 'setBackgroundColor',
        payload: { d, backgroundColor: updatedBackgroundColor[d] },
      })
      saveBackground(updatedBackgroundColor[d])
    }
  }

  //To force the sliders to update
  useEffect(() => {
    if (sliderLightnessInput.current)
      setSliderLightVal(sliderLightnessInput.current.value)
  }, [sliderLightnessInput?.current?.value])

  useEffect(() => {
    if (sliderSaturationInput.current)
      setSliderSatVal(sliderSaturationInput.current.value)
  }, [sliderSaturationInput?.current?.value])

  useEffect(() => {
    if (sliderHueInput.current) setSliderHueVal(sliderHueInput.current.value)
  }, [sliderHueInput?.current?.value])

  function sliderLightnessReset() {
    setDragWrapOuterLightness({
      [`--lightness${d}`]: `${defaultLightness}`,
    })
    if (sliderLightnessInput.current)
      sliderLightnessInput.current.value = defaultLightness
    setSliderLightVal(defaultLightness)
    const updatedBackgroundColor: string[][] = JSON.parse(
      JSON.stringify(backgroundColor)
    ) as unknown as string[][]
    updatedBackgroundColor[d][2] = defaultLightness
    saveBackground(updatedBackgroundColor[d])
    void dispatch({
      type: 'setBackgroundColor',
      payload: { d, backgroundColor: updatedBackgroundColor[d] },
    })
  }

  function sliderSaturationReset() {
    setDragWrapOuterSaturation({
      [`--saturation${d}`]: `${defaultSaturation}`,
    })
    if (sliderSaturationInput.current)
      sliderSaturationInput.current.value = defaultSaturation
    setSliderSatVal(defaultSaturation)
    const updatedBackgroundColor: string[][] = JSON.parse(
      JSON.stringify(backgroundColor)
    ) as unknown as string[][]
    updatedBackgroundColor[d][1] = defaultSaturation
    saveBackground(updatedBackgroundColor[d])
    void dispatch({
      type: 'setBackgroundColor',
      payload: { d, backgroundColor: updatedBackgroundColor[d] },
    })
  }

  function sliderHueReset() {
    setDragWrapOuterHue({ [`--hue${d}`]: `${defaultHue}` })
    if (sliderHueInput.current) sliderHueInput.current.value = defaultHue
    setSliderHueVal(defaultHue)
    const updatedBackgroundColor: string[][] = JSON.parse(
      JSON.stringify(backgroundColor)
    ) as unknown as string[][]
    updatedBackgroundColor[d][0] = defaultHue
    saveBackground(updatedBackgroundColor[d])
    void dispatch({
      type: 'setBackgroundColor',
      payload: { d, backgroundColor: updatedBackgroundColor[d] },
    })
  }

  //END SLIDERS

  function place(
    element: HTMLElement,
    x_pos: number,
    y_pos: number,
    metrics: {
      leftOffset: number
      canvasWidth: number
      canvasHeight: number
    }
  ) {
    element.style.left =
      metrics.leftOffset + (metrics.canvasWidth / 100) * x_pos + 'px'
    element.style.right = 'unset'
    element.style.top = (metrics.canvasHeight / 100) * y_pos + 'px'
  }

  const widthResize = useCallback(
    () => {
      if (
        !dragWrap.current ||
        !dragWrapOuter.current ||
        !dragWrapOutest.current
      ) {
        return
      }

      const canvasWidth = dragWrapOuter.current.offsetWidth
      const canvasHeight = dragWrapOuter.current.offsetHeight
      if (!canvasWidth || !canvasHeight) return

      const outestRect = dragWrapOutest.current.getBoundingClientRect()
      const outerRect = dragWrapOuter.current.getBoundingClientRect()
      const placementMetrics = {
        leftOffset: outerRect.left - outestRect.left,
        canvasWidth: dragWrap.current.offsetWidth,
        canvasHeight: dragWrap.current.offsetHeight,
      }
      const placements: Array<{
        element: HTMLElement
        x: number
        y: number
      }> = []

      const y_pos = [
        0.6, 8.2, 15.8, 23.4, 31, 38.6, 46.2, 53.8, 61.4, 69, 76.6, 84.2, 91.8,
      ] // color block y positions
      // const x_pos = [12, 36, 64, 88] // top item x positions
      const x_pos = [0, 25, 50, 75, 100] // bottom and top item x positions
      const top_pos = 0
      const bottom_pos = 99
      const adjustment = 10
      // Measure first, then write positions in one pass to avoid layout thrash.

      if (makeSmaller0.current) {
        placements.push({
          element: makeSmaller0.current,
          x: x_pos[0] - (adjustment / canvasWidth) * 100,
          y:
            top_pos -
            ((makeSmaller0.current.offsetHeight + adjustment) / canvasHeight) *
              100,
        })
      }
      if (makeLarger0.current) {
        placements.push({
          element: makeLarger0.current,
          x:
            x_pos[1] -
            (makeLarger0.current.offsetWidth / 3 / canvasWidth) * 100,
          y:
            top_pos -
            ((makeLarger0.current.offsetHeight + adjustment) / canvasHeight) *
              100,
        })
      }
      if (disableScrollButton.current) {
        placements.push({
          element: disableScrollButton.current,
          x:
            x_pos[2] -
            (disableScrollButton.current.offsetWidth / 2 / canvasWidth) * 100,
          y:
            top_pos -
            ((disableScrollButton.current.offsetHeight + adjustment) /
              canvasHeight) *
              100,
        })
      }
      if (layerDecrease.current) {
        placements.push({
          element: layerDecrease.current,
          x:
            x_pos[3] -
            (adjustment / 2 / canvasWidth) * 100 -
            (layerDecrease.current.offsetWidth / 2 / canvasWidth) * 100,
          y:
            top_pos -
            ((layerDecrease.current.offsetHeight + adjustment) / canvasHeight) *
              100,
        })
      }
      if (layerIncrease.current) {
        placements.push({
          element: layerIncrease.current,
          x:
            x_pos[4] +
            (adjustment / canvasWidth) * 100 -
            (layerIncrease.current.offsetWidth / canvasWidth) * 100,
          y:
            top_pos -
            ((layerIncrease.current.offsetHeight + adjustment) / canvasHeight) *
              100,
        })
      }
      if (deleteBlob0.current) {
        placements.push({
          element: deleteBlob0.current,
          x:
            x_pos[1] -
            (deleteBlob0.current.offsetWidth / 2 / canvasWidth) * 100,
          y: bottom_pos + ((adjustment * 2) / canvasHeight) * 100,
        })
      }
      if (makeRandom0.current) {
        placements.push({
          element: makeRandom0.current,
          x:
            x_pos[2] -
            (makeRandom0.current.offsetWidth / 2 / canvasWidth) * 100,
          y: bottom_pos + ((adjustment * 2) / canvasHeight) * 100,
        })
      }
      if (makeMore0.current) {
        placements.push({
          element: makeMore0.current,
          x: x_pos[3] - (makeMore0.current.offsetWidth / 2 / canvasWidth) * 100,
          y: bottom_pos + ((adjustment * 2) / canvasHeight) * 100,
        })
      }
      if (resizeHandleLeft.current) {
        placements.push({
          element: resizeHandleLeft.current,
          x: x_pos[0] - (adjustment / canvasWidth) * 100,
          y: 100 + ((adjustment * 1.7) / canvasHeight) * 100,
        })
      }
      if (resizeHandleRight.current) {
        placements.push({
          element: resizeHandleRight.current,
          x:
            x_pos[4] -
            (resizeHandleRight.current.offsetWidth / canvasWidth) * 100 +
            (adjustment / canvasWidth) * 100,
          y: 100 + ((adjustment * 1.7) / canvasHeight) * 100,
        })
      }

      colorBlockPropsCombo.forEach((colorBlockArray) => {
        colorBlockArray.forEach((colorBlock, index) => {
          if (colorBlock.current) {
            const x =
              index < colorBlockArray.length / 2
                ? 0
                : 100 - (colorBlock.current.offsetWidth / canvasWidth) * 100
            const y = y_pos[index % (colorBlockArray.length / 2)]
            placements.push({ element: colorBlock.current, x, y })
          }
        })
      })

      placements.forEach(({ element, x, y }) => {
        place(element, x, y, placementMetrics)
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      windowWidth,
      windowHeight,
      dragWrap,
      colorBlockPropsCombo,
      makeLarger0,
      makeSmaller0,
      layerDecrease,
      layerIncrease,
      makeRandom0,
      makeMore0,
      deleteBlob0,
      canvasOffsetX,
      canvasSize,
      effectiveCanvasSize.height,
      effectiveCanvasSize.width,
    ]
  )

  useEffect(() => {
    widthResize()
  }, [widthResize])

  const handleCanvasResize = useCallback(
    (e: PointerEvent) => {
      const resizeState = resizeStateRef.current
      if (!resizeState) return

      const nextCanvas = applyCanvasResize({
        horizontalDirection: resizeState.horizontalDirection,
        width:
          resizeState.startWidth +
          (e.clientX - resizeState.startX) * resizeState.horizontalDirection,
        height: resizeState.startHeight + (e.clientY - resizeState.startY),
        offsetX: resizeState.startOffsetX,
        left: resizeState.startLeft,
        right: resizeState.startRight,
        top: resizeState.startTop,
        baseWidth: resizeState.startWidth,
      })

      setCanvasSize(nextCanvas.size)
      setCanvasOffsetX(nextCanvas.offsetX)
    },
    [applyCanvasResize]
  )

  const handleCanvasResizeKeyDown = useCallback(
    (horizontalDirection: 1 | -1) =>
      (e: KeyboardEventReact<HTMLButtonElement>) => {
        let widthDelta = 0
        let heightDelta = 0
        const step = e.shiftKey ? 60 : 20
        const currentSize = getCurrentCanvasSize()

        switch (e.key) {
          case 'ArrowLeft':
            widthDelta = horizontalDirection === -1 ? step : -step
            break
          case 'ArrowRight':
            widthDelta = horizontalDirection === -1 ? -step : step
            break
          case 'ArrowUp':
            heightDelta = -step
            break
          case 'ArrowDown':
            heightDelta = step
            break
          default:
            return
        }

        e.preventDefault()
        e.stopPropagation()

        const currentRect =
          dragWrapOuter.current?.getBoundingClientRect() ??
          dragWrap.current?.getBoundingClientRect()
        const currentTop = currentRect?.top ?? 0
        const outestLeft =
          dragWrapOutest.current?.getBoundingClientRect().left ?? 0
        const currentLeft = outestLeft + canvasOffsetX
        const currentRight = currentLeft + currentSize.width

        if (widthDelta !== 0) {
          const viewportWidth =
            getDocumentClientWidth() ||
            windowWidth ||
            windowObj?.innerWidth ||
            minCanvasWidth
          const widthMax =
            horizontalDirection === -1
              ? Math.max(currentRight - canvasViewportPadding, minCanvasWidth)
              : Math.max(
                  viewportWidth -
                    Math.max(currentLeft, 0) -
                    canvasViewportPadding,
                  minCanvasWidth
                )
          const nextWidth = Math.min(
            widthMax,
            Math.max(minCanvasWidth, Math.round(currentSize.width + widthDelta))
          )

          setCanvasSize({
            width: nextWidth,
            height: currentSize.height,
          })

          if (horizontalDirection === -1) {
            setCanvasOffsetX(
              clampCanvasOffsetX(canvasOffsetX + currentSize.width - nextWidth)
            )
          }

          return
        }

        const { minHeight, maxHeight } = getViewportHeightLimit(currentTop)
        const nextHeight = Math.min(
          maxHeight,
          Math.max(minHeight, Math.round(currentSize.height + heightDelta))
        )

        setCanvasSize({
          width: currentSize.width,
          height: nextHeight,
        })
      },
    [
      applyCanvasResize,
      canvasOffsetX,
      dragWrapOutest,
      dragWrap,
      getCurrentCanvasSize,
      getViewportHeightLimit,
    ]
  )

  const stopCanvasResize = useCallback(() => {
    if (!isClient || !windowObj) return

    resizeStateRef.current = null
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
    windowObj.removeEventListener('pointermove', handleCanvasResize)
    windowObj.removeEventListener('pointerup', stopCanvasResize)
    windowObj.removeEventListener('pointercancel', stopCanvasResize)
  }, [handleCanvasResize, isClient, windowObj])

  const startCanvasResize = useCallback(
    (horizontalDirection: 1 | -1, cursor: 'nwse-resize' | 'nesw-resize') =>
      (e: PointerEventReact<HTMLButtonElement>) => {
        if (!isClient || !windowObj || !dragWrap.current) return

        e.currentTarget.focus()
        e.preventDefault()
        e.stopPropagation()

        const currentSize = getCurrentCanvasSize()
        const currentRect = dragWrap.current.getBoundingClientRect()

        resizeStateRef.current = {
          startX: e.clientX,
          startY: e.clientY,
          startWidth: currentSize.width,
          startHeight: currentSize.height,
          startOffsetX: canvasOffsetX,
          startTop: currentRect.top,
          startLeft: currentRect.left,
          startRight: currentRect.right,
          horizontalDirection,
        }

        setCanvasSize(currentSize)

        document.body.style.userSelect = 'none'
        document.body.style.cursor = cursor
        windowObj.addEventListener('pointermove', handleCanvasResize)
        windowObj.addEventListener('pointerup', stopCanvasResize)
        windowObj.addEventListener('pointercancel', stopCanvasResize)
      },
    [
      getCurrentCanvasSize,
      handleCanvasResize,
      canvasOffsetX,
      isClient,
      stopCanvasResize,
      windowObj,
    ]
  )

  useEffect(() => {
    return () => {
      if (!isClient || !windowObj) return
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      windowObj.removeEventListener('pointermove', handleCanvasResize)
      windowObj.removeEventListener('pointerup', stopCanvasResize)
      windowObj.removeEventListener('pointercancel', stopCanvasResize)
    }
  }, [handleCanvasResize, isClient, stopCanvasResize, windowObj])

  useEffect(() => {
    if (!isClient || !dragContainerRef.current) return

    const scheduleFocusedBlobSync = () => {
      if (windowObj) {
        windowObj.requestAnimationFrame(() => {
          syncFocusedBlobFromActiveElement()
        })
        return
      }

      syncFocusedBlobFromActiveElement()
    }

    const container = dragContainerRef.current

    container.addEventListener('focusin', scheduleFocusedBlobSync)
    container.addEventListener('focusout', scheduleFocusedBlobSync)

    return () => {
      container.removeEventListener('focusin', scheduleFocusedBlobSync)
      container.removeEventListener('focusout', scheduleFocusedBlobSync)
    }
  }, [isClient, syncFocusedBlobFromActiveElement, windowObj])

  useEffect(() => {
    if (!markerEnabled || !usingKeyboard) return

    syncFocusedBlobFromActiveElement()
  }, [
    markerEnabled,
    usingKeyboard,
    syncFocusedBlobFromActiveElement,
    windowWidth,
    windowHeight,
    canvasOffsetX,
    effectiveCanvasSize.width,
    effectiveCanvasSize.height,
  ])

  useEffect(() => {
    if (!markerEnabled || !usingKeyboard) return

    if (windowObj) {
      windowObj.requestAnimationFrame(() => {
        syncFocusedBlobFromActiveElement()
      })
      return
    }

    syncFocusedBlobFromActiveElement()
  }, [
    draggablesD,
    activeLayer,
    markerEnabled,
    usingKeyboard,
    syncFocusedBlobFromActiveElement,
    windowObj,
  ])

  useEffect(() => {
    if (!markerEnabled || !usingKeyboard || !dragWrapOuter.current) return

    const handleScroll = () => {
      syncFocusedBlobFromActiveElement()
    }

    const dragWrapOuterCurrent = dragWrapOuter.current
    dragWrapOuterCurrent.addEventListener('scroll', handleScroll)

    return () => {
      dragWrapOuterCurrent.removeEventListener('scroll', handleScroll)
    }
  }, [
    dragWrapOuter,
    markerEnabled,
    usingKeyboard,
    syncFocusedBlobFromActiveElement,
  ])

  const scrollToArt = () => {
    const scrollTarget =
      document !== null ? document.getElementById(`button-container${d}`) : null
    if (scrollTarget) {
      scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // useEffect(() => {
  //   const layerButton = document.getElementById(`layer-button-${d}-${activeLayer}`)
  //   if (layerButton) layerButton.focus()
  // }, [activeLayer])

  // const imgStyle: CSSProperties = {
  //   width: '100%',
  //   height: 'auto',
  //   margin: '0 auto',
  // }

  const takeScreenshot = async () => {
    if (!dragWrap.current || typeof window === 'undefined') return
    setLoading(true)
    try {
      // Dynamic import to avoid SSR issues
      const domtoimage = (await import('dom-to-image-more')) as unknown as {
        default: {
          toPng: (
            node: HTMLElement,
            options: DomToImageOptions
          ) => Promise<string>
        }
      }

      const getBackgroundColor = hslToHex(
        Number(backgroundColor[d][0]),
        Number(backgroundColor[d][1]),
        Number(backgroundColor[d][2])
      )

      interface DomToImageOptions {
        scale: number
        useCORS: boolean
        allowTaint: boolean
        bgcolor: string
        width: number
        height: number
        onclone: (clonedNode: HTMLElement) => void
      }

      const svgFilter = artVariant === 0 ? 0 : 1

      const dataUrl = (await domtoimage.default.toPng(dragWrap.current, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        bgcolor: getBackgroundColor,
        width: dragWrap.current.offsetWidth,
        height: dragWrap.current.offsetHeight,
        onclone: (clonedNode: HTMLElement) => {
          const originalSvg: SVGSVGElement | null =
            document !== null
              ? document.querySelector(`svg#svgfilter${svgFilter}`)
              : null
          if (originalSvg) {
            const clonedSvg: SVGSVGElement = originalSvg.cloneNode(
              true
            ) as SVGSVGElement
            clonedNode.appendChild(clonedSvg)
          }
        },
      } as DomToImageOptions)) as unknown as string

      if (dataUrl) {
        const link = document?.createElement('a')
        if (link) {
          link.href = dataUrl
          link.download = 'blobs.png'
          document?.body.appendChild(link)
          link.click()
          document?.body.removeChild(link)

          void dispatch2(notify(t('ArtSaved'), false, 8))
        }
      } else {
        void dispatch2(notify(t('Error'), true, 8))
      }
    } catch (err) {
      console.error('Screenshot Error:', err)
      void dispatch2(notify(t('Error'), true, 8))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (loading) void dispatch2(notify(`${t('Loading')}...`, false, 20))
  }, [loading, dispatch2, t])

  const [itemsPerPage, setItemsPerPage] = useState(3)

  const [currentPage, setCurrentPage] = useState<Record<number, number>>({
    [d]: 1,
  })

  // Function to handle page change
  const handlePageChange = (dKey: number, newPage: number) => {
    setCurrentPage((prev) => ({ ...prev, [dKey]: newPage }))
  }

  const resetSavedArtworkPage = useCallback((dKey: number) => {
    setCurrentPage((prev) => ({ ...prev, [dKey]: 1 }))
  }, [])

  // //save layer amount to local storage
  // useEffect(() => {
  //   saveLayerAmount()
  // }, [layerAmount])

  const deleteHiddenLayers = async () => {
    // Check if there are any hidden layers
    if (hiddenLayers.size === 0) {
      void dispatch2(
        notify('Please hide the layers you want to delete.', true, 8)
      )
      return
    }

    // Check if any hidden layers are not empty
    const nonEmptyHiddenLayers = Array.from(hiddenLayers).filter((layer) =>
      draggables[d].some((draggable) => draggable.layer === layer)
    )

    if (nonEmptyHiddenLayers.length > 0) {
      const confirmDelete = await confirm({
        message: `${t('LayerNotEmpty')}. ${t('AreYouSureYouWantToProceed')}`,
      })
      if (!confirmDelete) {
        return
      }
    }

    // Remove hidden layers
    const newDraggables = draggables[d].filter(
      (draggable) => !hiddenLayers.has(draggable.layer)
    )

    const newLayerAmount = layerAmount - hiddenLayers.size

    if (newLayerAmount < 1) {
      void dispatch2(notify(t('MustHaveAtLeastOneLayer'), true, 8))
      return
    }

    // Adjust layers of remaining draggables
    const updatedDraggables = newDraggables.map((draggable) => {
      const layer = draggable.layer
      let newLayer = layer
      hiddenLayers.forEach((hiddenLayer) => {
        if (layer > hiddenLayer) {
          newLayer -= 1
        }
      })
      return { ...draggable, layer: newLayer }
    })

    void dispatch({
      type: 'setDraggablesAtD',
      payload: { d, draggables: updatedDraggables },
    })

    setLayerAmount(newLayerAmount)
    saveLayerAmount(newLayerAmount)
    setHiddenLayers(new Set()) // Reset hidden layers
    setTimeout(() => {
      widthResize()
    }, 300)
  }

  const addToLayerAmount = (byAmount: number) => {
    const newLayerAmount = layerAmount + byAmount

    if (newLayerAmount > 9) {
      void dispatch2(notify(t('MaximumLayerAmountReached'), true, 8))
      return
    }

    // Adjust layers of remaining draggables
    const updatedDraggables = draggables[d].map((draggable) => {
      const layer =
        draggable.layer > activeLayer
          ? draggable.layer + byAmount
          : draggable.layer
      return { ...draggable, layer }
    })

    void dispatch({
      type: 'setDraggablesAtD',
      payload: { d, draggables: updatedDraggables },
    })

    setLayerAmount(newLayerAmount)
    saveLayerAmount(newLayerAmount)
    setHiddenLayers(new Set()) // Reset hidden layers
    setTimeout(() => {
      widthResize()
    }, 300)
  }

  const [deleteId, setDeleteId] = useState<string>('')
  const [mode, setMode] = useState<Modes>('none')

  const toggleMode = (selectedMode: Modes) => {
    setMode((prevMode) => {
      const newMode = prevMode === selectedMode ? 'none' : selectedMode
      if (newMode !== selectedMode) {
        setDeleteId('')
      }
      return newMode
    })
  }

  const handleEscapeKey = useCallback(() => {
    if (!scroll) {
      setScroll(true)
      resetDocumentScroll()
      disableScrollButton.current?.focus()
      return
    }

    const activeElement =
      document?.activeElement instanceof HTMLElement
        ? document.activeElement
        : null

    const isColorBlock =
      activeElement?.classList.contains('colorblock') ?? false
    const isToolButton = [
      resizeHandleLeft,
      resizeHandleRight,
      makeLarger0,
      makeSmaller0,
      makeMore0,
      makeRandom0,
      deleteBlob0,
      layerIncrease,
      layerDecrease,
    ].some((ref) => ref.current === activeElement)

    if (activeElement && (isColorBlock || isToolButton)) {
      if (isColorBlock || selectedColor) {
        setSelectedColor('')
      }

      if (mode !== 'none') {
        setMode('none')
        setDeleteId('')
      }

      activeElement.blur()
      windowObj?.requestAnimationFrame(() => {
        focusLastBlob()
      })
      return
    }

    focusExitApp()
  }, [
    scroll,
    setScroll,
    resetDocumentScroll,
    selectedColor,
    mode,
    windowObj,
    focusLastBlob,
    focusExitApp,
  ])

  useEffect(() => {
    if (!isClient || !document) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.key !== 'Escape') return
      if (isEditableTarget(e.target)) return
      if (activeBlobContainerId !== d) return

      e.preventDefault()
      handleEscapeKey()
    }

    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [d, handleEscapeKey, isClient])

  //Remove blob
  function removeBlob(draggable: Draggable) {
    setDeleteId(draggable.id)
    setSelectedvalue0(`${t('SelectedBlobNone')}`)
  }

  useEffect(() => {
    if (deleteId) {
      void dispatch({
        type: 'removeDraggable',
        payload: { d: d, id: deleteId },
      })
      setDeleteId('')
    }
  }, [deleteId, d, dispatch])

  const pagination = (
    dKey: string,
    current: number,
    totalPages: number,
    position: 'start' | 'end'
  ) => {
    const itemsPerPageId = `items-per-page${d}-${dKey}-${position}`
    return hasSavedFiles ? (
      <div className="pagination-controls">
        {current !== 1 ? (
          <>
            <button
              onClick={() => handlePageChange(Number(dKey), 1)}
              disabled={current === 1}
              className="btn-small pagination-btn"
            >
              &laquo;&nbsp;<span className="scr">{t('BackToStart')}</span>
            </button>
            <button
              onClick={() =>
                handlePageChange(Number(dKey), Math.max(current - 1, 1))
              }
              disabled={current === 1}
              className="btn-small pagination-btn"
            >
              &nbsp;&lsaquo;&nbsp;<span className="scr">{t('Previous')}</span>
            </button>
          </>
        ) : (
          <></>
        )}
        <span>
          {t('Page')} {current} / {totalPages}
        </span>
        {current !== totalPages ? (
          <>
            <button
              onClick={() =>
                handlePageChange(
                  Number(dKey),
                  Math.min(current + 1, totalPages)
                )
              }
              disabled={current === totalPages}
              className="btn-small pagination-btn"
            >
              <span className="scr">{t('Next')}</span>&nbsp;&rsaquo;&nbsp;
            </button>

            <button
              onClick={() => handlePageChange(Number(dKey), totalPages)}
              disabled={current === totalPages}
              className="btn-small pagination-btn"
            >
              <span className="scr">{t('ToLastPage')}</span>&nbsp;&raquo;
            </button>
          </>
        ) : (
          <></>
        )}
        <div className="input-wrap items-per-page">
          <label htmlFor={itemsPerPageId}>
            <input
              id={itemsPerPageId}
              className=""
              type="number"
              value={itemsPerPage}
              placeholder={itemsPerPage.toString()}
              min={1}
              max={100}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
            />
            <span>{t('PerPage')}</span>
          </label>
        </div>
      </div>
    ) : (
      <></>
    )
  }

  // // scroll to #drag-container:
  // const goToArt1 = (number: number) => {
  //   const dragContainer = document?.getElementById(`drag-container${number}`)
  //   if (dragContainer) {
  //     dragContainer.scrollIntoView({ behavior: 'smooth', block: 'start' })
  //   }
  // }

  const canvasBounds = getCanvasBounds()

  return (
    <>
      <section>
        <h2 className="scr">{t('Canvas')}</h2>
        <div>
          <div
            ref={dragContainerRef}
            id={`drag-container${d}`}
            className={`drag-container drag-container${d}`}
            style={{
              maxWidth: 'calc(100vw - var(--scrollbar_width, 15px))',
            }}
          >
            <div
              id={`button-container${d}`}
              className={'button-container'}
              style={{
                overflow: 'visible',
              }}
            >
              <div className="flex column gap-half">
                {paused ? (
                  <>
                    <button
                      ref={stopBlobs}
                      id={`stop-blobs${d}`}
                      className="stop-blobs tooltip-wrap"
                      onClick={(e) => {
                        stopSway(e)
                      }}
                      aria-labelledby={`stop-blobs${d}-span`}
                    >
                      <Icon
                        lib="io5"
                        name="IoPlayCircleOutline"
                        aria-hidden="true"
                      />
                      <span
                        id={`stop-blobs${d}-span`}
                        className="tooltip above narrow2"
                      >
                        {t(
                          'AfterEnablingThereIsASlightDelayBeforeAllTheBlobsAreMovingAgain'
                        )}
                      </span>
                    </button>
                    <i className="label">{t('StartSway')}</i>{' '}
                  </>
                ) : (
                  <>
                    <button
                      ref={stopBlobs}
                      id={`stop-blobs${d}`}
                      className="stop-blobs tooltip-wrap"
                      onClick={(e) => {
                        stopSway(e)
                      }}
                      aria-labelledby={`stop-blobs${d}-span`}
                    >
                      <Icon
                        lib="io5"
                        name="IoStopCircleOutline"
                        aria-hidden="true"
                      />
                      <span
                        id={`stop-blobs${d}-span`}
                        className="tooltip above narrow2"
                      >
                        {t(
                          'AfterEnablingThereIsASlightDelayBeforeAllTheBlobsAreMovingAgain'
                        )}
                      </span>
                    </button>
                    <i className="label">{t('StopSway')}</i>{' '}
                  </>
                )}
              </div>

              <div className="flex column gap-half">
                <button
                  ref={resetBlobs}
                  id={`reset-blobs${d}`}
                  aria-labelledby={`reset-blobs${d}-span`}
                  className="reset-blobs tooltip-wrap"
                  onClick={(e) => {
                    void resetBlobsFunction(e)
                  }}
                >
                  <Icon
                    lib="tb"
                    name="TbBlobFilled"
                    aria-hidden="true"
                    viewBox="-2 -2 28 28"
                  />
                  <span
                    id={`reset-blobs${d}-span`}
                    className="tooltip above narrow2"
                  >
                    {t('GetANewSetOfBlobs')}
                  </span>
                </button>
                <i className="label">{t('ResetBlobs')}</i>
              </div>
              <div className="flex column gap-half">
                <button
                  ref={resetCanvas}
                  id={`reset-canvas${d}`}
                  aria-labelledby={`reset-canvas${d}-span`}
                  className="reset-canvas tooltip-wrap"
                  onClick={(e) => {
                    void resetCanvasFunction(e)
                  }}
                >
                  <span
                    id={`reset-canvas${d}-span`}
                    className="tooltip above narrow2"
                  >
                    {t('ResetCanvas')}
                  </span>
                  <Icon lib="pi" name="PiCornersOut" aria-hidden="true" />
                </button>
                <i className="label">{t('ResetCanvas')}</i>
              </div>

              <div className="flex column gap-half">
                <button
                  id={`toggle-colors${d}`}
                  aria-labelledby={`toggle-colors${d}-span`}
                  className={`toggle-colors ${!colorsVisible ? 'active' : ''}`}
                  onClick={() => {
                    setColorsVisible(!colorsVisible)
                    if (!colorsVisible) {
                      setTimeout(() => {
                        widthResize()
                      }, 200)
                    }
                  }}
                >
                  {colorsVisible ? (
                    <Icon
                      lib="md"
                      name="MdInvertColorsOff"
                      aria-hidden="true"
                    />
                  ) : (
                    <Icon lib="md" name="MdInvertColors" aria-hidden="true" />
                  )}
                </button>
                {colorsVisible ? (
                  <i id={`toggle-colors${d}-span`} className="label">
                    {t('HideColors')}
                  </i>
                ) : (
                  <i id={`toggle-colors${d}-span`} className="label">
                    {t('ShowColors')}
                  </i>
                )}
              </div>
              <div className="flex column gap-half">
                <button
                  type="button"
                  id={`take-screenshot${d}`}
                  aria-labelledby={`take-screenshot${d}-span`}
                  disabled={loading}
                  onClick={() => void takeScreenshot()}
                  className="screenshot tooltip-wrap"
                >
                  <Icon lib="im" name="ImCamera" aria-hidden="true" />

                  <span
                    id={`take-screenshot${d}-span`}
                    className="tooltip left above"
                  >
                    {loading ? t('Loading') : t('ClickHereToTakeAScreenshot')}
                  </span>
                </button>
                <i className="label">{t('Screenshot')} </i>
              </div>
            </div>

            <div className={'label-container'}>
              <span id={`blobdescription${d}`} className={'scr'}>
                {t('TryDraggingTheBlobs')}
              </span>
              <span>
                [{t('Layer')}: {activeLayer + 1}]
              </span>
              <span id={`selectedvalue${d}`} className="selectedvalue">
                {selectedvalue0 ?? t('SelectedBlobNone')}
              </span>
            </div>

            <div
              ref={dragWrapOutest}
              className={`drag-wrap-outest drag-wrap-outest${d} ${
                hasCustomCanvasSize ? 'is-resized' : ''
              }`}
              style={{
                ['--max-width' as string]: effectiveCanvasSize
                  ? `min(${effectiveCanvasSize.width - 66}px, 300px)`
                  : '130px',
                overflow: 'visible',
                width: `${effectiveCanvasSize.width}px`,
                minWidth: `${effectiveCanvasSize.width}px`,
              }}
            >
              <button
                ref={resizeHandleLeft}
                type="button"
                className={`resize-handle resize-handle-left gray tooltip-wrap`}
                aria-label={t('ResizeCanvas')}
                aria-describedby={`drag-wrap-resize-help-left${d}`}
                aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Shift+ArrowLeft Shift+ArrowRight Shift+ArrowUp Shift+ArrowDown"
                onPointerDown={startCanvasResize(-1, 'nesw-resize')}
                onKeyDown={handleCanvasResizeKeyDown(-1)}
              >
                <Icon lib="hi2" name="HiArrowsPointingOut" aria-hidden="true" />
                <span
                  className="tooltip right above narrow2"
                  aria-hidden="true"
                >
                  {t('ResizeCanvas')} ({t('Draggable')})
                </span>
                <span className="scr" id={`drag-wrap-resize-help-left${d}`}>
                  {t('ResizeCanvasInstructions')}
                </span>
              </button>
              <button
                ref={resizeHandleRight}
                type="button"
                className={`resize-handle resize-handle-right gray tooltip-wrap`}
                aria-label={t('ResizeCanvas')}
                aria-describedby={`drag-wrap-resize-help${d}`}
                aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Shift+ArrowLeft Shift+ArrowRight Shift+ArrowUp Shift+ArrowDown"
                onPointerDown={startCanvasResize(1, 'nwse-resize')}
                onKeyDown={handleCanvasResizeKeyDown(1)}
              >
                <Icon lib="hi2" name="HiArrowsPointingOut" aria-hidden="true" />
                <span className="tooltip left above narrow2" aria-hidden="true">
                  {t('ResizeCanvas')} ({t('Draggable')})
                </span>
                <span className="scr" id={`drag-wrap-resize-help${d}`}>
                  {t('ResizeCanvasInstructions')}
                </span>
              </button>

              <button
                ref={makeSmaller0}
                className={`make-smaller tooltip-wrap gray`}
                id={`make-smaller${d}`}
                aria-labelledby={`make-smaller${d}-span`}
                onClick={() => {
                  toggleMode('scale-down')
                }}
              >
                <Icon lib="im" name="ImShrink2" aria-hidden="true" />
                {mode === 'scale-down' && (
                  <span className="scale-down-alert">
                    {t('SizeDecreaseModeOn')}
                  </span>
                )}
                <span
                  id={`make-smaller${d}-span`}
                  className="tooltip right below"
                >{`${t('ShrinkInstructions')}. ${t('Alternatively')}: ${t(
                  'ResizebyScrollInstructions'
                )}`}</span>
              </button>

              <button
                ref={makeLarger0}
                className={`make-larger tooltip-wrap gray`}
                id={`make-larger${d}`}
                aria-labelledby={`make-larger${d}-span`}
                onClick={() => {
                  toggleMode('scale-up')
                }}
              >
                <Icon lib="im" name="ImEnlarge2" aria-hidden="true" />
                {mode === 'scale-up' && (
                  <span className="scale-up-alert">
                    {t('SizeIncreaseModeOn')}
                  </span>
                )}
                <span
                  id={`make-larger${d}-span`}
                  className="tooltip below"
                >{`${t('EnlargeInstructions')}. ${t('Alternatively')}: ${t(
                  'ResizebyScrollInstructions'
                )}`}</span>
              </button>

              <button
                ref={disableScrollButton}
                id={`disable-scroll${d}`}
                aria-labelledby={`disable-scroll${d}-span`}
                className={`disable-scroll gray tooltip-wrap ${
                  !scroll ? 'active' : ''
                }`}
                onClick={() => {
                  disableScroll()
                }}
              >
                <Icon lib="pi" name="PiMouseScroll" aria-hidden="true" />
                <span id={`disable-scroll${d}-span`} className="tooltip below">
                  {scroll
                    ? t('DisableScrollInOrderToUseTheMouseWheelToResizeABlob')
                    : t('PressHereOrEscapeToRestoreScrolling')}
                </span>
              </button>

              <button
                ref={layerDecrease}
                id={`layer-decrease${d}`}
                aria-labelledby={`layer-decrease${d}-span`}
                className={`layer-adjust layer-decrease tooltip-wrap gray`}
                onClick={() => toggleMode('layer-down')}
              >
                {mode === 'layer-down' && (
                  <span className="layer-down-alert">
                    {t('LayerDecreaseModeOn')}
                  </span>
                )}
                <span
                  id={`layer-decrease${d}-span`}
                  className="tooltip below"
                >{`${t('DecreaseBlobLayerBy1Instructions')} ${t(
                  'KeyboardUsePressTheCorrespondingLayerNumber'
                )}`}</span>
                <Icon lib="bi" name="BiChevronDown" aria-hidden="true" />
              </button>
              <button
                ref={layerIncrease}
                id={`layer-increase${d}`}
                aria-labelledby={`layer-increase${d}-span`}
                className={`layer-adjust layer-increase tooltip-wrap gray`}
                onClick={() => toggleMode('layer-up')}
              >
                {mode === 'layer-up' && (
                  <span className="layer-up-alert">
                    {t('LayerIncreaseModeOn')}
                  </span>
                )}
                <span
                  id={`layer-increase${d}-span`}
                  className="tooltip below left"
                >{`${t('IncreaseBlobLayerBy1Instructions')} ${t(
                  'KeyboardUsePressTheCorrespondingLayerNumber'
                )}`}</span>
                <Icon lib="bi" name="BiChevronUp" aria-hidden="true" />
              </button>

              <button
                ref={deleteBlob0}
                className={`delete-blob tooltip-wrap gray`}
                id={`delete-blob${d}`}
                aria-labelledby={`delete-blob${d}-span`}
                onClick={() => toggleMode('delete')}
              >
                <Icon lib="fa" name="FaTimes" aria-hidden="true" />
                {mode === 'delete' && (
                  <span className="delete-alert">{t('DeleteModeOn')}</span>
                )}
                <span
                  id={`delete-blob${d}-span`}
                  className="tooltip right above"
                >
                  {t('RemovalInstructions')}
                </span>
              </button>

              <button
                ref={makeRandom0}
                className={`make-random tooltip-wrap gray`}
                id={`make-random${d}`}
                aria-labelledby={`make-random${d}-span`}
                onClick={() => addRandomDraggable()}
              >
                <Icon lib="fa" name="FaPlus" aria-hidden="true" />
                <span id={`make-random${d}-span`} className="tooltip above">
                  {`${t('ClickMeToMakeARandomBlob')}. ${t(
                    'MoreColorsAvailable'
                  )}! ${t('KeyboardUse')}: ${t('PressSpaceOrRWithABlobInFocusToCycleThroughRandomColors')}`}
                </span>
              </button>

              <button
                ref={makeMore0}
                className={`make-more tooltip-wrap gray`}
                id={`make-more${d}`}
                aria-labelledby={`make-more${d}-span`}
                onClick={() => {
                  toggleMode('clone')
                }}
              >
                <Icon lib="fa" name="FaRegClone" aria-hidden="true" />
                {mode === 'clone' && (
                  <span className="clone-alert">{t('CloneModeOn')}</span>
                )}
                <span id={`make-more${d}-span`} className="tooltip left above">
                  {t('CloneInstructions')}
                </span>
              </button>

              <ColorBlocks
                d={d}
                getRefName={getRefName}
                map={refNameMappingCombo}
                colorBlockProps={colorBlockPropsCombo}
                colorPairs={colorPairsCombo}
                colorsVisible={colorsVisible}
                setSelectedColor={setSelectedColor}
                selectedColor={selectedColor}
                mode={mode}
                setMode={setMode}
                effectiveCanvasSize={effectiveCanvasSize}
              />

              <div
                ref={dragWrapOuter}
                id={`drag-wrap-outer${d}`}
                className={`drag-wrap-outer ${
                  hasCustomCanvasSize ? 'is-resized' : ''
                }`}
                style={{
                  ...dragWrapOuterLightness,
                  ...dragWrapOuterSaturation,
                  ...dragWrapOuterHue,
                  ...backgroundColorStyle,
                  overflow: 'visible',

                  margin: hasCustomCanvasSize
                    ? `0 0 0 ${canvasOffsetX}px`
                    : '0',
                  height: `${effectiveCanvasSize.height}px`,
                  minHeight: `${canvasBounds.minHeight}px`,
                  maxHeight: hasCustomCanvasSize
                    ? `${canvasBounds.maxHeight}px`
                    : undefined,
                  width: `${effectiveCanvasSize.width}px`,
                  minWidth: `${canvasBounds.minWidth}px`,
                  maxWidth: `${canvasBounds.maxWidth}px`,
                }}
              >
                {markerEnabled && usingKeyboard && focusedBlob && (
                  <div
                    style={{
                      position: 'absolute',
                      top: `${focusedBlob.top + focusedBlob.width * -0.05}px`,
                      left: `${focusedBlob.left + focusedBlob.width * -0.05}px`,
                      width: `${focusedBlob.width * 1.1}px`,
                      height: `${focusedBlob.height * 1.1}px`,
                      outline: '3px dashed black',
                      outlineOffset: '2px',
                      border: '3px dashed white',
                      borderRadius: '50%',
                      zIndex: 999,
                    }}
                  />
                )}

                <div
                  ref={dragWrapShell}
                  className={`drag-wrap-shell ${
                    hasCustomCanvasSize ? 'is-resized' : ''
                  }`}
                  style={{
                    overflow: 'visible',
                    width: '100%',
                    height: '100%',
                  }}
                >
                  <div
                    ref={dragWrap}
                    id={`drag-wrap${d}`}
                    className="drag-wrap"
                    style={{
                      width: '100%',
                      height: '100%',
                      backgroundColor: 'transparent',
                      margin: '0',
                      padding: '0',
                      overflow: 'visible',
                      borderRadius: '0',
                      position: 'relative',
                    }}
                  >
                    <DragLayers
                      layerAmount={layerAmount}
                      layer_={activeLayer}
                      hiddenLayers={hiddenLayers}
                      paused={paused}
                      changeBlobLayer={changeBlobLayer}
                      setActiveLayer={setActiveLayer}
                      highestZIndex={highestZIndex}
                      dispatch={dispatch}
                      d={d}
                      variant={artVariant}
                      items={draggables[d] ?? []}
                      getPosition={getPosition}
                      removeBlob={removeBlob}
                      dragWrap={dragWrap}
                      setSelectedvalue0={setSelectedvalue0}
                      colorIndex={colorIndex}
                      setColorIndex={setColorIndex}
                      colorPairs={colorPairsCombo}
                      colorswitch={colorswitch}
                      scroll={scroll}
                      clickOutsideRef={dragWrap}
                      addRandomDraggable={addRandomDraggable}
                      mode={mode}
                      changeColor={changeColor}
                      onEscapeKey={handleEscapeKey}
                      setMarkerEnabled={setMarkerEnabled}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="layer-mover-control-wrap">
              <div className="history-btn-wrap">
                <button
                  id={`undo-${d}`}
                  aria-labelledby={`undo-${d}-span`}
                  className="history-button tooltip-wrap narrow2"
                  disabled={!canUndo}
                  onClick={() => {
                    activeBlobContainerId = d
                    undo()
                  }}
                >
                  <span id={`undo-${d}-span`}>
                    <span className="scr">{t('Undo')}</span>
                    <Icon lib="bi" name="BiUndo" aria-hidden="true" />
                    <span className="tooltip above">{`${t('Undo')} (Ctrl+Z)`}</span>
                  </span>
                </button>
                <button
                  id={`redo-${d}`}
                  aria-labelledby={`redo-${d}-span`}
                  className="history-button tooltip-wrap narrow2"
                  disabled={!canRedo}
                  onClick={() => {
                    activeBlobContainerId = d
                    redo()
                  }}
                >
                  <span id={`redo-${d}-span`}>
                    <span className="scr">{t('Redo')}</span>
                    <Icon lib="bi" name="BiRedo" aria-hidden="true" />
                    <span className="tooltip above">{`${t('Redo')} (Ctrl+Shift+Z / Ctrl+Y)`}</span>
                  </span>
                </button>
              </div>

              <div className="layer-btn-wrap layers">
                {Array.from({ length: layerAmount }, (_, i) => i).map(
                  (layer, index) => (
                    <button
                      key={`${layer}*${index}`}
                      id={`layer-button-${d}-${layer}`}
                      aria-labelledby={`layer-button-${d}-${layer}-span`}
                      onClick={() => {
                        if (activeLayer === layer) {
                          toggleLayerVisibility(layer)
                        } else {
                          setActiveLayer(layer)
                        }
                      }}
                      className={`layer-button tooltip-wrap narrow2 ${
                        activeLayer === layer ? 'active' : ''
                      } ${hiddenLayers.has(layer) ? 'dim' : ''}`}
                    >
                      <span id={`layer-button-${d}-${layer}-span`}>
                        <span className="scr">{t('Layer')}</span> {layer + 1}{' '}
                        <span className="tooltip above">
                          {activeLayer === layer
                            ? t('ToggleLayerByClickingMe')
                            : t('ChangeLayerByClickingMe')}
                        </span>
                      </span>
                    </button>
                  )
                )}
              </div>

              <div className="layer-btn-wrap layer-tools layer-tools1">
                <button
                  id={`decrease-layer-amount${d}`}
                  aria-labelledby={`decrease-layer-amount${d}-span`}
                  className="layer-tool layer-amount decrease-layer-amount tooltip-wrap narrow2 danger"
                  onClick={() => void deleteHiddenLayers()}
                >
                  <span
                    id={`decrease-layer-amount${d}-span`}
                    className="tooltip above"
                  >
                    {t('DeleteHiddenLayers')}
                  </span>
                  &times;
                </button>

                <button
                  id={`increase-layer-amount${d}`}
                  disabled={layerAmount >= 9}
                  aria-labelledby={`increase-layer-amount${d}-span`}
                  className="layer-tool layer-amount increase-layer-amount tooltip-wrap narrow2"
                  onClick={() => addToLayerAmount(1)}
                >
                  <span
                    id={`increase-layer-amount${d}-span`}
                    className="tooltip above"
                  >
                    {t('GetMoreLayers')}
                  </span>
                  <Icon lib="bi" name="BiPlus" aria-hidden="true" />
                </button>
              </div>

              <div className="layer-btn-wrap layer-tools layer-tools2">
                <button
                  id={`every-layer-minus${d}`}
                  aria-labelledby={`every-layer-minus${d}-span`}
                  className="layer-tool every-layer tooltip-wrap narrow2"
                  onClick={() => changeEveryLayer(-1)}
                >
                  <span
                    id={`every-layer-minus${d}-span`}
                    className="tooltip above"
                  >
                    {t('ClickHereToMoveDownLayer')}
                  </span>
                  <Icon lib="bi" name="BiChevronDown" aria-hidden="true" />
                </button>
                <button
                  id={`every-layer-plus${d}`}
                  aria-labelledby={`every-layer-plus${d}-span`}
                  className="layer-tool every-layer tooltip-wrap narrow2"
                  onClick={() => changeEveryLayer(1)}
                >
                  <span
                    id={`every-layer-plus${d}-span`}
                    className="tooltip above"
                  >
                    {t('ClickHereToMoveUpLayer')}
                  </span>
                  <Icon lib="bi" name="BiChevronUp" aria-hidden="true" />
                </button>
              </div>

              <div className={`movers-wrap movers-wrap1`}>
                <button
                  id={`moveleft${d}`}
                  aria-labelledby={`moveleft${d}-span`}
                  className="moveleft mover tooltip-wrap narrow2"
                  onClick={handleMoveRight}
                >
                  <Icon lib="bi" name="BiChevronsLeft" aria-hidden="true" />
                  <span id={`moveleft${d}-span`} className="tooltip above">
                    {t('MoveViewLeft')}
                  </span>
                </button>
                <button
                  id={`moveright${d}`}
                  aria-labelledby={`moveright${d}-span`}
                  className={`moveright mover tooltip-wrap narrow2`}
                  onClick={handleMoveLeft}
                >
                  <Icon lib="bi" name="BiChevronsRight" aria-hidden="true" />
                  <span id={`moveright${d}-span`} className="tooltip above">
                    {t('MoveViewRight')}
                  </span>
                </button>
              </div>

              <div className={`movers-wrap movers-wrap2`}>
                <button
                  id={`moveup${d}`}
                  aria-labelledby={`moveup${d}-span`}
                  className={`moveup mover tooltip-wrap narrow2`}
                  onClick={handleMoveDown}
                >
                  <Icon lib="bi" name="BiChevronsUp" aria-hidden="true" />
                  <span id={`moveup${d}-span`} className="tooltip above">
                    {t('MoveViewUp')}
                  </span>
                </button>
                <button
                  id={`movedown${d}`}
                  aria-labelledby={`movedown${d}-span`}
                  className={`movedown mover tooltip-wrap narrow2`}
                  onClick={handleMoveUp}
                >
                  <Icon lib="bi" name="BiChevronsDown" aria-hidden="true" />
                  <span id={`movedown${d}-span`} className="tooltip above">
                    {t('MoveViewDown')}
                  </span>
                </button>
              </div>
            </div>
            <Sliders
              d={d}
              defaultHue={defaultHue}
              defaultSaturation={defaultSaturation}
              defaultLightness={defaultLightness}
              setSliderHueVal={setSliderHueVal}
              setSliderSatVal={setSliderSatVal}
              setSliderLightVal={setSliderLightVal}
              sliderLightness={sliderLightness}
              sliderSaturation={sliderSaturation}
              sliderHue={sliderHue}
              sliderLightnessReset={sliderLightnessReset}
              sliderSaturationReset={sliderSaturationReset}
              sliderHueReset={sliderHueReset}
              sliderLightVal={sliderLightVal}
              sliderSatVal={sliderSatVal}
              sliderHueVal={sliderHueVal}
              sliderLightnessInput={sliderLightnessInput}
              sliderSaturationInput={sliderSaturationInput}
              sliderHueInput={sliderHueInput}
            />
            <div ref={exitApp} id={`exitblob${d}`} className="exitblob"></div>

            {user ? (
              <div className="blob-handling">
                <div className="full wide flex column center gap">
                  <form onSubmit={(e) => void saveBlobsToServer(e)}>
                    <div className="input-wrap">
                      <label htmlFor={`blobname${d}`}>
                        <input
                          id={`blobname${d}`}
                          type="text"
                          value={name}
                          onChange={handleNameChange}
                          placeholder={t('NameYourArtwork')}
                          maxLength={30}
                        />
                        <span>{t('NameYourArtwork')}:</span>
                      </label>
                    </div>
                    <button
                      disabled={
                        (user && user.name === 'temp') || loading ? true : false
                      }
                      type="submit"
                    >
                      {user && user.name === 'temp'
                        ? t('TempUserCannotSave')
                        : t('Save')}
                    </button>
                  </form>
                </div>

                <h3>{t('Art')}</h3>
                {isLoading ? (
                  <p>{t('LoadingSavedArtwork')}</p>
                ) : serverError ? (
                  <p>{t('ErrorConnectingToTheServer')}</p>
                ) : !hasSavedFiles ? (
                  <p>{t('NoSavedArtworkYet')}</p>
                ) : (
                  (() => {
                    const dKey = String(d)
                    const totalPages = Math.ceil(
                      orderedSavedDraggables.length / itemsPerPage
                    )
                    const current = currentPage[d] ?? 1
                    const startIdx = (current - 1) * itemsPerPage
                    const endIdx = startIdx + itemsPerPage
                    const currentVersions = orderedSavedDraggables.slice(
                      startIdx,
                      endIdx
                    )

                    return (
                      <div className="flex center margin0auto" key={dKey}>
                        {pagination(dKey, current, totalPages, 'start')}
                        <ul className="blob-versions-wrap">
                          {currentVersions.map((savedBlob, index) => {
                            const { d: savedBlobD, versionName } = savedBlob

                            return (
                              <li
                                key={`${versionName}+${index}`}
                                className="blob-version-item"
                              >
                                <span>{versionName}</span>
                                <div className="button-wrap">
                                  <button
                                    onClick={() =>
                                      void loadBlobsFromServer(
                                        savedBlobD,
                                        versionName
                                      )
                                    }
                                  >
                                    {t('Load')}{' '}
                                    <span className="scr">{versionName}</span>
                                  </button>
                                  <button
                                    disabled={
                                      user && user.name === 'temp'
                                        ? true
                                        : false
                                    }
                                    onClick={() =>
                                      void deleteBlobsVersionFromServer(
                                        savedBlobD,
                                        versionName
                                      )
                                    }
                                  >
                                    {t('Delete')}{' '}
                                    <span className="scr">{versionName}</span>
                                  </button>
                                  <Accordion
                                    id={`accordion-blobnewname-${sanitize(
                                      versionName
                                    )}`}
                                    className="blobnewname"
                                    wrapperClass="blobnewname-wrap"
                                    text={t('Rename')}
                                    hideBrackets={true}
                                    setIsFormOpen={(open) => {
                                      setEditName(open ? versionName : '')
                                    }}
                                    onClick={() => {
                                      setNewName(versionName)
                                      setEditName(versionName)
                                    }}
                                    isOpen={editName === versionName}
                                  >
                                    <>
                                      <div className="input-wrap">
                                        <label
                                          htmlFor={`blobnewname-${sanitize(
                                            versionName
                                          )}`}
                                        >
                                          <input
                                            id={`blobnewname-${sanitize(
                                              versionName
                                            )}`}
                                            type="text"
                                            value={newName}
                                            onChange={handleNewNameChange}
                                            placeholder={t('RenameYourArtwork')}
                                            maxLength={30}
                                          />
                                          <span>{t('Rename')}:</span>{' '}
                                          <span className="scr">
                                            {versionName}
                                          </span>
                                        </label>
                                      </div>
                                      <button
                                        disabled={
                                          user && user.name === 'temp'
                                            ? true
                                            : false
                                        }
                                        onClick={() => {
                                          if (versionName !== newName) {
                                            void editBlobsByUser(
                                              versionName,
                                              newName
                                            )
                                          } else
                                            void dispatch2(
                                              notify(
                                                `${t('Error')}: ${t(
                                                  'RenameYourArtwork'
                                                )}`,
                                                true,
                                                5
                                              )
                                            )
                                        }}
                                      >
                                        {t('Edit')}{' '}
                                        <span className="scr">
                                          {versionName}: {t('NewName')}{' '}
                                          {newName}
                                        </span>
                                      </button>
                                    </>
                                  </Accordion>
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                        {pagination(dKey, current, totalPages, 'end')}
                      </div>
                    )
                  })()
                )}
              </div>
            ) : (
              <div className="mt2 wide flex column center gap2">
                <div className="login-to-save wide flex column center gap-half">
                  <Icon lib="fa" name="FaSave" aria-hidden="true" />
                  {t('InOrderToSaveTheBlobs')}
                </div>
                <div className="flex gap">
                  <Link to="?login=true" className="link svg-wrap">
                    <span>{t('Login')}</span>
                  </Link>
                  {t('Or')}
                  <Link to="?register=true" className="link svg-wrap">
                    <span>{t('Register')}</span>
                  </Link>
                </div>
              </div>
            )}
            <svg className="filter" id={`svgfilter0`}>
              <defs>
                <filter id="svgGaussian0">
                  <feGaussianBlur
                    in="SourceGraphic"
                    stdDeviation="7"
                  ></feGaussianBlur>
                </filter>
                <filter id="svgMatrix0">
                  <feColorMatrix
                    values="
                      1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 50 -18
                      "
                  ></feColorMatrix>{' '}
                </filter>
              </defs>
            </svg>
            <svg className="filter" id="svgfilter1">
              <defs>
                {' '}
                <filter id="svgGaussian1">
                  <feGaussianBlur
                    in="SourceGraphic"
                    stdDeviation="8"
                  ></feGaussianBlur>
                </filter>
                <filter id="svgMatrix1">
                  <feColorMatrix
                    values="
                      1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 46 -28
                      "
                  ></feColorMatrix>
                </filter>
              </defs>
            </svg>
          </div>
        </div>
      </section>
    </>
  )
}
