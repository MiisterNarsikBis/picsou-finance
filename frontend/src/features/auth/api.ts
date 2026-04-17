import { api } from '@/lib/api-client'

export const authApi = {
  login: (username: string, password: string) =>
    api.post<{ username: string; role: string; memberId: number; displayName: string }>('/auth/login', { username, password }).then(r => r.data),
  logout: () => api.post('/auth/logout'),
  refresh: () =>
    api.post<{ username: string; role: string; memberId: number; displayName: string }>('/auth/refresh').then(r => r.data),
  activate: (token: string, password: string, acknowledgedWarning: boolean) =>
    api.post(`/auth/activate/${token}`, { password, acknowledgedWarning }),
}
