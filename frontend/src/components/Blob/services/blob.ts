import { Draggable, SavedBlobs } from '../types'
import { ELanguages, IResponse } from '../../../types'
import api from '../../../services/api'

const baseUrl = `/blobs`

// router.get('/api/blobs/:user/:language', getAllBlobsByUser)
// router.get('/api/blobs/:user/:versionName/:language', getBlobsVersionByUser)
// router.post('/api/blobs/:user/:versionName/:language', saveBlobsByUser)
// router.delete('/api/blobs/:user/:versionName/:language',

const getAllBlobsByUser = async (
  user: string,
  d: number,
  language: ELanguages
): Promise<SavedBlobs[]> => {
  const response = await api.get(`${baseUrl}/${user}/${d}`, {
    params: { language },
  })
  return response.data as SavedBlobs[]
}

const getBlobsVersionByUser = async (
  user: string,
  d: number,
  versionName: string,
  language: ELanguages
): Promise<SavedBlobs> => {
  const response = await api.get(
    `${baseUrl}/${user}/${d}/${versionName}/${language}`
  )
  return response.data as SavedBlobs
}

const saveBlobsByUser = async (
  user: string,
  d: number,
  variant: number,
  draggables: Draggable[],
  versionName: string,
  backgroundColor: string[],
  language: ELanguages
): Promise<IResponse> => {
  const response = await api.post(
    `${baseUrl}/${user}/${d}/${versionName}/${language}`,
    {
      variant,
      draggables,
      backgroundColor,
    }
  )
  return response.data as IResponse
}

const editBlobsByUser = async (
  user: string,
  d: number,
  variant: number,
  draggables: Draggable[],
  versionName: string,
  backgroundColor: string[],
  language: ELanguages,
  newVersionName: string
): Promise<IResponse> => {
  const response = await api.put(
    `${baseUrl}/${user}/${d}/${versionName}/${language}`,
    {
      d,
      variant,
      versionName,
      draggables,
      backgroundColor,
      newVersionName,
    }
  )
  return response.data as IResponse
}

const deleteBlobsVersionByUser = async (
  user: string,
  d: number,
  versionName: string,
  language: ELanguages
): Promise<IResponse> => {
  const response = await api.delete(
    `${baseUrl}/${user}/${d}/${versionName}/${language}`
  )
  return response.data as IResponse
}

export default {
  getAllBlobsByUser,
  getBlobsVersionByUser,
  saveBlobsByUser,
  editBlobsByUser,
  deleteBlobsVersionByUser,
}
