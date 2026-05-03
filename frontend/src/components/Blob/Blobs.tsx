import { createRef, FC, useState, useMemo } from 'react'
import { RefObject } from '../../types'
import DragContainer from './components/DragContainer'

const Blobs: FC = () => {
  const containerRef = useMemo(
    () => createRef<HTMLDivElement>() as RefObject<HTMLDivElement>,
    []
  )

  const [scroll, setScroll] = useState<boolean>(true)

  return (
    <DragContainer
      d={0}
      dragWrapOuter={containerRef}
      scroll={scroll}
      setScroll={setScroll}
    />
  )
}

export default Blobs
