"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"

interface AuthContextType {
  isAuthenticated: boolean
  user: any | null
  login: (email: string, password: string) => Promise<boolean>
  register: (email: string, password: string) => Promise<boolean>
  fetchCurrentUser: () => Promise<any | null>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<any | null>(null)
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  // Check if user is already logged in on mount
  useEffect(() => {
    const token = localStorage.getItem("token")
    if (token) {
      setIsAuthenticated(true)
      fetchCurrentUser().finally(() => setLoading(false))
    } else {
      setIsAuthenticated(false)
      setUser(null)
      setLoading(false)
    }
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch("/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Login failed")
      localStorage.setItem("token", data.token)
      setIsAuthenticated(true)
      setUser(data.user)
      return true
    } catch (e) {
      setIsAuthenticated(false)
      setUser(null)
      return false
    }
  }

  const register = async (email: string, password: string) => {
    try {
      const res = await fetch("/api/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Registration failed")
      // Optionally auto-login after registration
      return true
    } catch (e) {
    return false
    }
  }

  const fetchCurrentUser = async () => {
    const token = localStorage.getItem("token")
    if (!token) {
      setUser(null)
      setIsAuthenticated(false)
      return null
    }
    try {
      const res = await fetch("/api/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) {
        setUser(null)
        setIsAuthenticated(false)
        return null
      }
      const data = await res.json()
      setUser(data)
      setIsAuthenticated(true)
      return data
    } catch (e) {
      setUser(null)
      setIsAuthenticated(false)
      return null
    }
  }

  const logout = () => {
    setIsAuthenticated(false)
    setUser(null)
    localStorage.removeItem("token")
    router.push("/admin/login")
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, register, fetchCurrentUser, logout, loading }}>
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-[#0a0a0c]">
          <div className="mb-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl font-bold">W</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">Wirestock Lightbox</h1>
            <p className="text-muted-foreground">Loading your experience...</p>
          </div>
          <div className="w-12 h-12 rounded-full border-4 border-white/10 border-t-blue-500 animate-spin mx-auto"></div>
        </div>
      ) : children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
