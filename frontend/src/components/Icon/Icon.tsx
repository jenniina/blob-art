import { useEffect } from 'react'
import type { ComponentType, CSSProperties } from 'react'
import { iconLibraries } from './iconLibraries'

type IconLib = keyof typeof iconLibraries
type IconComponent = ComponentType<Record<string, unknown>>

interface BaseIconProps {
  className?: string
  style?: CSSProperties
  height?: string
  width?: string
  title?: string
  viewBox?: string
  'aria-hidden'?: boolean | 'true' | 'false'
  'aria-label'?: string
}

interface EmptyIconProps extends BaseIconProps {
  lib?: undefined
  name?: undefined
}

type IconProps =
  | {
      [L in IconLib]: BaseIconProps & {
        lib: L
        name: keyof (typeof iconLibraries)[L]
      }
    }[IconLib]
  | EmptyIconProps

const Icon = ({
  lib,
  name,
  className,
  style,
  height,
  width,
  title,
  viewBox,
  'aria-hidden': ariaHidden = 'true',
  'aria-label': ariaLabel,
}: IconProps) => {
  const library = lib ? iconLibraries[lib] : undefined
  // const IconComp = lib && name ? (library?.[name] ?? null) : null
  const IconComp =
    lib && name
      ? (((iconLibraries[lib] as Record<string, IconComponent>)[
          name as string
        ] ?? null) as IconComponent | null)
      : null

  const isMissing = !lib || !name || !library || !IconComp
  const missingTitle =
    title ?? `Missing icon: ${lib ?? '(no lib)'}/${name ?? '(no name)'}`

  useEffect(() => {
    if (!isMissing) return
    if (!import.meta.env.DEV) return
    console.warn('Missing icon', { lib, name })
  }, [isMissing, lib, name])

  if (isMissing && import.meta.env.DEV && typeof window !== 'undefined') {
    throw new Error(missingTitle)
  }

  if (isMissing) return null

  return (
    <IconComp
      className={className}
      style={style}
      height={height}
      width={width}
      {...(viewBox ? { viewBox } : {})}
      aria-hidden={ariaHidden}
      aria-label={ariaLabel}
      title={title}
    />
  )
}

export default Icon
