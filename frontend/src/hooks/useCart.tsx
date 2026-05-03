import useLocalStorage from './useStorage'
import { ICartItem } from '../types/store'

const localStorageCartKey = 'JCart'

const useCart = () => {
  const [cart, setCart, removeCart] = useLocalStorage<ICartItem[]>(
    localStorageCartKey,
    []
  )

  const addToCart = (item: ICartItem | undefined) => {
    if (!item) return

    const existingItem = cart.find((currentItem) => currentItem.id === item.id)
    if (existingItem) {
      existingItem.quantity += 1
      setCart([...cart])
      return
    }

    setCart([...cart, item])
  }

  const removeFromCart = (itemId: string) => {
    const existingItem = cart.find((item) => item.id === itemId)
    if (existingItem && existingItem.quantity > 1) {
      existingItem.quantity -= 1
      setCart([...cart])
      return
    }

    setCart(cart.filter((item) => item.id !== itemId))
  }

  const editDetails = (itemId: string, details: string) => {
    setCart(
      cart.map((item) => (item.id === itemId ? { ...item, details } : item))
    )
  }

  const clearCart = () => {
    removeCart()
    setCart([])
  }

  return {
    cart,
    addToCart,
    removeFromCart,
    editDetails,
    clearCart,
  }
}

export default useCart
