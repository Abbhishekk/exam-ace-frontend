import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { GraduationCap } from 'lucide-react'

interface AdminProtectedRouteProps {
  children: React.ReactNode
}

type AuthState = 'loading' | 'authenticated' | 'unauthenticated'
type RoleState = 'loading' | 'admin' | 'student' | 'error'

export const AdminProtectedRoute = ({ children }: AdminProtectedRouteProps) => {
  const [authState, setAuthState] = useState<AuthState>('loading')
  const [roleState, setRoleState] = useState<RoleState>('loading')

  useEffect(() => {
    const checkAuthAndRole = async () => {
      try {
        // Check authentication
        const { data: { session }, error: authError } = await supabase.auth.getSession()
        
        if (authError || !session) {
          setAuthState('unauthenticated')
          return
        }

        setAuthState('authenticated')

        // Check user role
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .maybeSingle()

        if (roleError) {
          console.error('Role check error:', roleError)
          setRoleState('error')
          return
        }

        if (!roleData) {
          setRoleState('student') // Default to student if no role found
          return
        }

        setRoleState(roleData.role === 'admin' ? 'admin' : 'student')
      } catch (error) {
        console.error('Auth/Role check error:', error)
        setAuthState('unauthenticated')
        setRoleState('error')
      }
    }

    checkAuthAndRole()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setAuthState('unauthenticated')
        setRoleState('loading')
      } else if (event === 'SIGNED_IN') {
        checkAuthAndRole()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Show loading state while checking auth and role
  if (authState === 'loading' || (authState === 'authenticated' && roleState === 'loading')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 gradient-primary rounded-xl flex items-center justify-center mx-auto animate-pulse">
            <GraduationCap className="w-8 h-8 text-primary-foreground" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Verifying Access</h2>
            <p className="text-muted-foreground">Checking your permissions...</p>
          </div>
        </div>
      </div>
    )
  }

  // Redirect if not authenticated
  if (authState === 'unauthenticated') {
    return <Navigate to="/auth" replace />
  }

  // Redirect if not admin (only after role is confirmed)
  if (roleState === 'student') {
    return <Navigate to="/student" replace />
  }

  // Show error state if role check failed
  if (roleState === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 rounded-xl flex items-center justify-center mx-auto">
            <GraduationCap className="w-8 h-8 text-red-600" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-red-600">Access Error</h2>
            <p className="text-muted-foreground">Unable to verify your permissions. Please try again.</p>
          </div>
        </div>
      </div>
    )
  }

  // Render children only if user is confirmed admin
  return <>{children}</>
}