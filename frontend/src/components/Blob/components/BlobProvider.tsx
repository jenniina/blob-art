import {
  FC,
  ReactNode,
  createContext,
  Dispatch,
  useCallback,
  useMemo,
  useState,
} from 'react'
import blobReducer from '../reducers/blobReducer'
import { Draggable } from '../types'
import { ReducerProps } from '../types'

export interface Props {
  state: ReducerProps['blob']
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dispatch: Dispatch<any>
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
}

const initialState: Props['state'] = {
  draggables: [] as Draggable[][],
  backgroundColor: [] as string[][],
}

interface HistoryState {
  past: Props['state'][]
  present: Props['state']
  future: Props['state'][]
}

const HISTORY_LIMIT = 50

export const BlobContext = createContext<Props | undefined>(undefined)

export const BlobProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [history, setHistory] = useState<HistoryState>({
    past: [],
    present: initialState,
    future: [],
  })

  type BlobAction = Parameters<typeof blobReducer>[1]

  const dispatch = useCallback<Props['dispatch']>((action) => {
    if (!action) return

    setHistory((current) => {
      const nextPresent = blobReducer(
        current.present,
        action as BlobAction
      ) as Props['state']

      if (nextPresent === current.present) {
        return current
      }

      return {
        past: [...current.past, current.present].slice(-HISTORY_LIMIT),
        present: nextPresent,
        future: [],
      }
    })
  }, [])

  const undo = useCallback(() => {
    setHistory((current) => {
      if (current.past.length === 0) return current

      const previous = current.past[current.past.length - 1]

      return {
        past: current.past.slice(0, -1),
        present: previous,
        future: [current.present, ...current.future].slice(0, HISTORY_LIMIT),
      }
    })
  }, [])

  const redo = useCallback(() => {
    setHistory((current) => {
      if (current.future.length === 0) return current

      const [next, ...remainingFuture] = current.future

      return {
        past: [...current.past, current.present].slice(-HISTORY_LIMIT),
        present: next,
        future: remainingFuture,
      }
    })
  }, [])

  const value = useMemo(
    () => ({
      state: history.present,
      dispatch,
      undo,
      redo,
      canUndo: history.past.length > 0,
      canRedo: history.future.length > 0,
    }),
    [history, dispatch, undo, redo]
  )

  return <BlobContext.Provider value={value}>{children}</BlobContext.Provider>
}
