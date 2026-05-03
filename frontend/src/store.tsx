import { configureStore } from '@reduxjs/toolkit'
import userReducer from './reducers/usersReducer'
import authReducer from './reducers/authReducer'
import notificationReducer from './reducers/notificationReducer'

const store = configureStore({
  reducer: {
    users: userReducer,
    auth: authReducer,
    notification: notificationReducer,
  },
})

export default store

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
