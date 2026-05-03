import { useCallback, useState } from 'react'

export default function useNoTransitionFlag() {
  const [noTransition, setNoTransition] = useState(false)

  const arm = useCallback(() => {
    setNoTransition(true)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setNoTransition(false)
      })
    })
  }, [])

  return { noTransition, arm }
}
