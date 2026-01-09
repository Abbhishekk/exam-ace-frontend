// Example usage of AdminProtectedRoute

import { AdminProtectedRoute } from '@/components/AdminProtectedRoute'
import AdminDashboard from '@/pages/admin/AdminDashboard'

// Method 1: Wrap individual components
const ProtectedAdminPage = () => {
  return (
    <AdminProtectedRoute>
      <AdminDashboard />
    </AdminProtectedRoute>
  )
}

// Method 2: Use in route definitions (recommended)
// In App.tsx:
/*
<Route 
  path="/admin" 
  element={
    <AdminProtectedRoute>
      <AdminDashboard />
    </AdminProtectedRoute>
  } 
/>
*/

// Method 3: Create a higher-order component
const withAdminProtection = (Component: React.ComponentType) => {
  return (props: any) => (
    <AdminProtectedRoute>
      <Component {...props} />
    </AdminProtectedRoute>
  )
}

// Usage with HOC
const ProtectedAdminDashboard = withAdminProtection(AdminDashboard)

export { ProtectedAdminPage, withAdminProtection, ProtectedAdminDashboard }