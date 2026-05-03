import React, { FC } from 'react'
import { ColorPair, Modes, RefObject } from '../types'
import { useLanguageContext } from '../../../contexts/LanguageContext'
import { TranslationKey } from '../../../i18n/translations'
import Icon from '../../Icon/Icon'
import { CanvasSize } from './DragContainer'

interface ColorBlockProps {
  d: number
  colorsVisible: boolean
  colorBlockProps: RefObject<HTMLButtonElement>[][]
  colorPairs: ColorPair[][]
  map: Map<RefObject<HTMLButtonElement>, string>[]
  getRefName: (
    refNameMapping: Map<RefObject<HTMLButtonElement>, string>,
    ref: RefObject<HTMLButtonElement>
  ) => string | undefined
  setSelectedColor: (value: string) => void
  selectedColor: string
  mode: Modes
  setMode: React.Dispatch<React.SetStateAction<Modes>>
  effectiveCanvasSize: CanvasSize | null
}

const ColorBlocks: FC<ColorBlockProps> = ({
  d,
  colorsVisible,
  colorBlockProps,
  colorPairs,
  getRefName,
  map,
  setSelectedColor,
  selectedColor,
  mode,
  setMode,
  effectiveCanvasSize,
}) => {
  const { t } = useLanguageContext()

  const colorLength = colorBlockProps[d].length

  const handleClick = (color: string) => {
    if (selectedColor === color) {
      setSelectedColor('')
      setMode('none')
    } else {
      setSelectedColor(color)
      setMode('change-color')
    }
  }
  return (
    <>
      {colorBlockProps[d].map((colorBlock, index) => {
        const refName = getRefName(map[d], colorBlock)
        const colorNameKey = refName?.replace(/^color/, '') as
          | TranslationKey
          | undefined
        const { color1, color2 } = colorPairs[d][index]
        const color = `linear-gradient(45deg, ${color1}, ${color2})`
        const isActive = selectedColor === color && mode === 'change-color'
        const isLeftSide = index < colorLength / 2
        const slotIndex = index % (colorLength / 2)
        return (
          <button
            ref={colorBlock}
            key={`${colorPairs[d][index].color1}${index}-${d}`}
            onClick={() => handleClick(color)}
            className={`colorblock colorblock${index} ${refName?.toLowerCase()} tooltip-wrap ${
              !colorsVisible ? 'hidden' : ''
            } ${isActive ? 'active' : ''} ${isLeftSide ? 'left' : 'right'}`}
            id={`color${index}-${d}`}
            style={{
              top: `${colorLength / 2 + 1 + slotIndex * (colorLength / 2 + 3)}%`,
              right: `${!isLeftSide ? '0' : 'unset'}`,
              height:
                effectiveCanvasSize && effectiveCanvasSize.height > 600
                  ? '2.2rem'
                  : effectiveCanvasSize && effectiveCanvasSize.height > 500
                    ? '2rem'
                    : '1.85rem',
              width:
                effectiveCanvasSize && effectiveCanvasSize.width > 700
                  ? '2rem'
                  : '1.5rem',
              background: color,
              borderRadius: `${
                isLeftSide
                  ? '5rem 6.7rem 6.7rem 5rem / 0.7rem 8.7rem 8.7rem 0.7rem'
                  : '6.7rem 5rem 5rem 6.7rem / 8.7rem 0.7rem 0.7rem 8.7rem'
              }`,
              ['--full-amount' as string]: colorLength,
              ['--alert-distance' as string]:
                effectiveCanvasSize && effectiveCanvasSize.width > 700
                  ? '2.1rem'
                  : '1.55rem',
            }}
          >
            <i className="color-alert">
              {isLeftSide ? (
                <Icon lib="fa" name="FaArrowLeft" aria-hidden="true" />
              ) : (
                <Icon lib="fa" name="FaArrowRight" aria-hidden="true" />
              )}
              <span className="scr">{t('Active')}</span>
            </i>

            <span
              className={`tooltip`}
              style={{
                ['--max-width' as string]: effectiveCanvasSize
                  ? `min(${effectiveCanvasSize.width - 66}px, 300px)`
                  : '130px',
                left:
                  isLeftSide &&
                  effectiveCanvasSize &&
                  effectiveCanvasSize.width > 700
                    ? '2.1rem'
                    : isLeftSide
                      ? '1.7rem'
                      : 'unset',
                right:
                  !isLeftSide &&
                  effectiveCanvasSize &&
                  effectiveCanvasSize.width > 700
                    ? '2.1rem'
                    : !isLeftSide
                      ? '1.7rem'
                      : 'unset',
              }}
            >
              <strong style={{ display: 'block', color: 'inherit' }}>
                {colorNameKey ? t(colorNameKey) : ''}
              </strong>
              {t('ChangeColorInstructions')}
            </span>
          </button>
        )
      })}
    </>
  )
}

export default ColorBlocks
