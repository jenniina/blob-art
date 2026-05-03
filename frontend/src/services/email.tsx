import { ELanguages, IResponse } from '../types'
import api from './api'

export interface SelectData {
  language: ELanguages
  issues: string | undefined
  favoriteHero: string | undefined
  clarification: string | undefined
  email: string | undefined
}

export const sendEmail = async (data: SelectData): Promise<IResponse> => {
  const response = await api.post(`/send-email-select`, data)
  return response.data as IResponse
}
