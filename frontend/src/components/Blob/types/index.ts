import { IUser } from '../../../types'

export interface Draggable {
  layer: number
  id: string
  number: number
  i: number
  x: string
  y: string
  z: string
  background: string
}

export interface SavedBlobs {
  _id?: string
  user: IUser['_id']
  d: number
  variant?: number
  draggables: Draggable[]
  backgroundColor: string[]
  versionName: string
  createdAt?: string
  updatedAt?: string
}

export interface RefObject<T> {
  readonly current: T | null
}

export interface ReducerProps {
  blob: {
    draggables: Draggable[][]
    backgroundColor: string[][]
  }
}

export interface focusedBlob {
  top: number
  left: number
  width: number
  height: number
}
export interface ColorPair {
  color1: string
  color2: string
}

export type Modes =
  | 'none'
  | 'delete'
  | 'clone'
  | 'scale-up'
  | 'scale-down'
  | 'layer-up'
  | 'layer-down'
  | 'change-color'
