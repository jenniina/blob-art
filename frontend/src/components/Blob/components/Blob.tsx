import {
  RefObject,
  MouseEvent,
  TouchEvent,
  CSSProperties,
  SetStateAction,
  Dispatch,
  useContext,
} from 'react'
import { Draggable, Modes } from '../types'
import { clampValue } from '../../../utils'
import { useAppDispatch } from '../../../hooks/useAppDispatch'
import { BlobContext } from './BlobProvider'
import { notify } from '../../../reducers/notificationReducer'
import { useLanguageContext } from '../../../contexts/LanguageContext'

interface BlobProps {
  d: number
  variant: number
  layer: number
  item: Draggable
  index: number
  paused: boolean
  start: (
    e: TouchEvent | MouseEvent | PointerEvent,
    target: HTMLElement
  ) => void
  movement: (
    e: TouchEvent | MouseEvent | PointerEvent,
    target: HTMLElement
  ) => void
  stopMovementCheck: (
    e: TouchEvent | MouseEvent | PointerEvent,
    target: HTMLElement
  ) => void
  stopMoving: (e: MouseEvent | PointerEvent, target: HTMLElement) => void
  wheel: (target: HTMLElement) => void
  focused: (e: HTMLElement) => void
  blurred: (e: HTMLElement) => void
  setSelectedvalue0: Dispatch<SetStateAction<string | null>>
  dragUlRef: RefObject<HTMLUListElement>
  removeBlob: (draggable: Draggable) => void
  mode: Modes
  changeBlobLayer: (draggable: Draggable, layer: number) => void
  layerAmount: number
  changeColor: (id: string) => void
}

const Blob = ({
  d,
  variant,
  layer,
  item,
  index,
  paused,
  start,
  movement,
  stopMovementCheck,
  stopMoving,
  wheel,
  focused,
  blurred,
  setSelectedvalue0,
  dragUlRef,
  removeBlob,
  mode,
  changeBlobLayer,
  layerAmount,
  changeColor,
}: BlobProps) => {
  const { t } = useLanguageContext()
  const selectedBlobLabel = `${t('SelectedBlob')}: ${t('Blob')} ${item.number}`

  const blur = variant === 0 ? 33 : clampValue(22, item.i * 2.6, 50)
  const { dispatch } = useContext(BlobContext)!
  const dispatch2 = useAppDispatch()

  const blobStyle: CSSProperties = {
    background: `${item.background}`,
    display: `block`,
    left: `${item.x}`,
    top: `${item.y}`,
    zIndex: `${item.z}`,
    ['--i' as string]: isNaN(Number(item.i)) ? '10' : `${item.i}`, // default value for i
    ['--layer' as string]: `${layer}`,
    WebkitFilter: `blur(${blur}px)`,
    filter: `blur(${blur}px)`,
  }

  const innerSize =
    variant === 0
      ? [
          '5.9px', //<8
          '8.2px', //<10
          '9.9px', //<20
          '10.8px', //<24
          '10.7px', //<28
          '10.5px', //<32
          '10px',
        ]
      : [
          '5.1px', //<8
          '5.4px', //<10
          '6.5px', //<20
          '7px', //<24
          '7.8px', //<28
          '8.4px', //<32
          '8.6px',
        ] // breakpoints for hitbox size due to varying levels of blur between the containers and blob sizes

  const handleClick = () => {
    if (mode === 'change-color') {
      changeColor(item.id)
    } else if (mode === 'delete') {
      removeBlob(item)
    } else if (mode === 'clone') {
      void dispatch({
        type: 'duplicateDraggable',
        payload: { d, draggable: item },
      })
    } else if (mode === 'layer-up') {
      let layer = item.layer
      if (layer < layerAmount - 1) {
        layer += 1
        changeBlobLayer(item, layer)
      } else {
        void dispatch2(notify(t('CannotRaiseBlobFurther'), true, 4))
      }
    } else if (mode === 'layer-down') {
      let layer = item.layer
      if (layer > 0) {
        layer -= 1
        changeBlobLayer(item, layer)
      } else {
        void dispatch2(notify(t('CannotLowerBlobFurther'), true, 4))
      }
    } else if (mode === 'scale-down') {
      void dispatch({
        type: 'resizeDraggable',
        payload: {
          d,
          id: item.id,
          delta: -0.4,
        },
      })
    } else if (mode === 'scale-up') {
      void dispatch({
        type: 'resizeDraggable',
        payload: {
          d,
          id: item.id,
          delta: 0.4,
        },
      })
    }
  }

  return (
    <li
      onFocus={(e) => {
        const blob = e.currentTarget

        dragUlRef?.current?.setAttribute('aria-activedescendant', `${blob.id}`)

        setSelectedvalue0(selectedBlobLabel)
        focused(blob)
      }}
      onBlur={(e) => {
        if (
          e.relatedTarget instanceof Node &&
          e.currentTarget.contains(e.relatedTarget)
        ) {
          return
        }

        blurred(e.currentTarget)
        dragUlRef?.current?.removeAttribute('aria-activedescendant')

        setSelectedvalue0(`${t('SelectedBlobNone')}`)
      }}
      key={index}
      className={`dragzone ${paused ? '' : 'animation'} ${mode}`.trim()}
      id={item.id}
      role={'option'}
      aria-selected={false}
      tabIndex={0}
      style={blobStyle}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick()
        }
      }}
    >
      <button
        type="button"
        className="draggable-overlay"
        tabIndex={-1}
        aria-hidden="true"
        style={
          Number(item.i) < 8
            ? {
                width: `calc(var(--i) * ${innerSize[0]})`,
                height: `calc(var(--i) * ${innerSize[0]})`,
              }
            : Number(item.i) < 10
              ? {
                  width: `calc(var(--i) * ${innerSize[1]})`,
                  height: `calc(var(--i) * ${innerSize[1]})`,
                }
              : Number(item.i) < 20
                ? {
                    width: `calc(var(--i) * ${innerSize[2]})`,
                    height: `calc(var(--i) * ${innerSize[2]})`,
                  }
                : Number(item.i) < 24
                  ? {
                      width: `calc(var(--i) * ${innerSize[3]})`,
                      height: `calc(var(--i) * ${innerSize[3]})`,
                    }
                  : Number(item.i) < 28
                    ? {
                        width: `calc(var(--i) * ${innerSize[4]})`,
                        height: `calc(var(--i) * ${innerSize[4]})`,
                      }
                    : Number(item.i) < 32
                      ? {
                          width: `calc(var(--i) * ${innerSize[5]})`,
                          height: `calc(var(--i) * ${innerSize[5]})`,
                        }
                      : isNaN(Number(item.i)) ||
                          item.i === null ||
                          item.i === undefined
                        ? {
                            width: `7 * ${innerSize[6]})`,
                            height: `7 * ${innerSize[6]})`,
                          }
                        : {
                            width: `calc(var(--i) * ${innerSize[6]})`,
                            height: `calc(var(--i) * ${innerSize[6]})`,
                          }
        }
        onMouseDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
          const liElement = e.currentTarget.parentElement!
          liElement.draggable = true
          liElement.focus({ preventScroll: true })

          setSelectedvalue0(selectedBlobLabel)

          dragUlRef?.current?.setAttribute(
            'aria-activedescendant',
            `${liElement.id}`
          )

          start(e, liElement)
        }}
        onMouseMove={(e) => {
          if (e.buttons === 1) {
            e.stopPropagation()
            const liElement = e.currentTarget.parentElement!
            liElement.draggable = true
            movement(e, liElement)
          }
        }}
        onMouseLeave={(e) => {
          e.stopPropagation()
          const liElement = e.currentTarget.parentElement!
          if (e.buttons !== 1) {
            liElement.draggable = false
            dragUlRef?.current?.removeAttribute('aria-activedescendant')
            stopMoving(e, liElement)
          }
        }}
        onMouseUp={(e) => {
          const liElement = e.currentTarget.parentElement!
          liElement.draggable = false
          stopMovementCheck(e, liElement)
          dragUlRef?.current?.removeAttribute('aria-activedescendant')
        }}
        onTouchStart={(e) => {
          e.preventDefault()
          e.stopPropagation()
          const liElement = e.currentTarget.parentElement!
          liElement.draggable = true
          liElement.focus({ preventScroll: true })
          dragUlRef?.current?.setAttribute(
            'aria-activedescendant',
            `${liElement.id}`
          )
          start(e, liElement)

          setSelectedvalue0(selectedBlobLabel)
        }}
        onTouchMove={(e) => {
          e.preventDefault()
          e.stopPropagation()
          const liElement = e.currentTarget.parentElement!
          liElement.draggable = true
          movement(e, liElement)
        }}
        onTouchEnd={(e) => {
          const liElement = e.currentTarget.parentElement!
          liElement.draggable = false
          dragUlRef?.current?.removeAttribute('aria-activedescendant')
          stopMovementCheck(e, liElement)
        }}
        onWheel={(e) => {
          const liElement = e.currentTarget.parentElement!
          wheel(liElement)
        }}
      ></button>
      <span className="scr">
        {t('Blob')} {item.number}
      </span>
    </li>
  )
}

export default Blob
