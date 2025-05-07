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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<any | null>(null)
  const router = useRouter()

  // Check if user is already logged in on mount
  useEffect(() => {
    const token = localStorage.getItem("token")
    if (token) {
      setIsAuthenticated(true)
      fetchCurrentUser()
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

  return <AuthContext.Provider value={{ isAuthenticated, user, login, register, fetchCurrentUser, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
