import { configureStore } from '@reduxjs/toolkit'
import notificationReducer from './reducers/notificationReducer'

// Minimal server-side store to avoid importing all client reducers
// Include only reducers used on SSR to prevent runtime errors for components
// that rely on them (like Notification).
const store = configureStore({ reducer: { notification: notificationReducer } })

export default store

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
