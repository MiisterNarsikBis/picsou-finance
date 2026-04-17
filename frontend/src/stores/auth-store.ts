import { create } from 'zustand'

interface UserData {
  username: string
  role: 'ADMIN' | 'MEMBER'
  memberId: number
  displayName: string
}

interface AuthState {
  user: UserData | null
  isAuthenticated: boolean
  login: (data: UserData) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: JSON.parse(sessionStorage.getItem('picsou_user') || 'null'),
  isAuthenticated: !!sessionStorage.getItem('picsou_user'),
  login: (data) => {
    sessionStorage.setItem('picsou_user', JSON.stringify(data))
    set({ user: data, isAuthenticated: true })
  },
  logout: () => {
    sessionStorage.removeItem('picsou_user')
    set({ user: null, isAuthenticated: false })
  },
}))
