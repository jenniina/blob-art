import React, { FC } from 'react'
import { useLanguageContext } from '../../../contexts/LanguageContext'

interface SlidersProps {
  d: number
  sliderLightnessInput: React.RefObject<HTMLInputElement>
  setSliderLightVal: (val: string) => void
  sliderLightness: () => void
  sliderLightVal: string
  defaultLightness: string
  sliderLightnessReset: () => void
  sliderSaturationInput: React.RefObject<HTMLInputElement>
  setSliderSatVal: (val: string) => void
  sliderSaturation: () => void
  sliderSatVal: string
  defaultSaturation: string
  sliderSaturationReset: () => void
  sliderHueInput: React.RefObject<HTMLInputElement>
  setSliderHueVal: (val: string) => void
  sliderHue: () => void
  sliderHueVal: string
  defaultHue: string
  sliderHueReset: () => void
}

const Sliders: FC<SlidersProps> = ({
  d,
  sliderLightnessInput,
  setSliderLightVal,
  sliderLightness,
  sliderLightVal,
  defaultLightness,
  sliderLightnessReset,
  sliderSaturationInput,
  setSliderSatVal,
  sliderSaturation,
  sliderSatVal,
  defaultSaturation,
  sliderSaturationReset,
  sliderHueInput,
  setSliderHueVal,
  sliderHue,
  sliderHueVal,
  defaultHue,
  sliderHueReset,
}) => {
  const { t } = useLanguageContext()

  return (
    <>
      <div id={`drag-slider-wrap${d}`} className="drag-slider-wrap">
        <div className="drag-slider-single">
          <label htmlFor={`drag-slider-hue${d}`} id={`huedescription${d}`}>
            {t('AdjustBackgroundHue')}
          </label>
          <input
            ref={sliderHueInput}
            onChange={e => {
              setSliderHueVal(e.target.value)
              sliderHue()
            }}
            onMouseUp={e => {
              setSliderHueVal((e.target as HTMLInputElement).value)
              sliderHue()
            }}
            onPointerUp={e => {
              setSliderHueVal((e.target as HTMLInputElement).value)
              sliderHue()
            }}
            type="range"
            min={0}
            max={359}
            value={sliderHueVal}
            className="drag-slider drag-slider-hue"
            id={`drag-slider-hue${d}`}
          />
          <span>{sliderHueVal}</span>
          <button
            onClick={() => {
              setSliderHueVal(defaultHue)
              sliderHueReset()
            }}
          >
            {t('ResetHue')}
          </button>
        </div>
        <div className="drag-slider-single">
          <label
            htmlFor={`drag-slider-saturation${d}`}
            id={`saturationdescription${d}`}
          >
            {t('AdjustBackgroundSaturation')}
          </label>
          <input
            ref={sliderSaturationInput}
            onChange={e => {
              setSliderSatVal(e.target.value)
              sliderSaturation()
            }}
            onMouseUp={e => {
              setSliderSatVal((e.target as HTMLInputElement).value)
              sliderSaturation()
            }}
            onPointerUp={e => {
              setSliderSatVal((e.target as HTMLInputElement).value)
              sliderSaturation()
            }}
            type="range"
            min={0}
            max={100}
            value={sliderSatVal}
            className="drag-slider drag-slider-saturation"
            id={`drag-slider-saturation${d}`}
          />
          <span>{sliderSatVal}</span>

          <button
            onClick={() => {
              setSliderSatVal(defaultSaturation)
              sliderSaturationReset()
            }}
          >
            {t('ResetSaturation')}
          </button>
        </div>
        <div className="drag-slider-single">
          <label
            htmlFor={`drag-slider-lightness${d}`}
            id={`lightnessdescription${d}`}
          >
            {t('AdjustBackgroundLightness')}
          </label>
          <input
            ref={sliderLightnessInput}
            onChange={e => {
              setSliderLightVal(e.target.value)
              sliderLightness()
            }}
            onMouseUp={e => {
              setSliderLightVal((e.target as HTMLInputElement).value)
              sliderLightness()
            }}
            onPointerUp={e => {
              setSliderLightVal((e.target as HTMLInputElement).value)
              sliderLightness()
            }}
            type="range"
            min={0}
            max={100}
            value={sliderLightVal}
            className="drag-slider drag-slider-lightness"
            id={`drag-slider-lightness${d}`}
          />
          <span>{sliderLightVal}</span>

          <button
            onClick={() => {
              setSliderLightVal(defaultLightness)
              sliderLightnessReset()
            }}
          >
            {t('ResetLightness')}
          </button>
        </div>
      </div>
    </>
  )
}

export default Sliders
