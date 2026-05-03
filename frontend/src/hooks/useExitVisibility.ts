import { useCallback, useMemo, useState } from 'react'

export default function useExitVisibility(initial = false) {
  const [open, setOpen] = useState(initial)
  const [hidden, setHidden] = useState(!initial)

  const show = useCallback(() => {
    setHidden(false)
    setOpen(true)
  }, [])

  const hide = useCallback(() => {
    setOpen(false)
  }, [])

  const onTransitionEnd = useCallback<
    React.TransitionEventHandler<HTMLElement>
  >(
    (e) => {
      if (e.target !== e.currentTarget) return
      if (!open) setHidden(true)
    },
    [open]
  )

  return useMemo(
    () => ({ open, hidden, show, hide, onTransitionEnd }),
    [open, hidden, show, hide, onTransitionEnd]
  )
}
