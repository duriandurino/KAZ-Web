import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { getToken, removeToken } from "../utils/auth";

interface ProtectedRouteProps {
  allowedRoles: string[];
}

interface UserProfile {
  user_id: number;
  email: string;
  fullname: string;
  role: string;
  status: string;
}

const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = getToken();
        if (!token) {
          console.log("No token found");
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        const response = await axios.get<UserProfile>("/api/users/userinfobyid", {
          headers: {
            "x-api-key": import.meta.env.VITE_API_KEY,
            "Authorization": `Bearer ${token}`
          },
        });

        console.log("User role:", response.data.role);
        console.log("Allowed roles:", allowedRoles);

        if (response.data && response.data.role) {
          setUserRole(response.data.role);
          if (allowedRoles.includes(response.data.role.toLowerCase())) {
            setIsAuthenticated(true);
          } else {
            console.log("Role not allowed");
            setIsAuthenticated(false);
            removeToken();
          }
        } else {
          console.log("No role in response");
          setIsAuthenticated(false);
          removeToken();
        }
      } catch (error: any) {
        console.error('Authentication error:', error.response?.data || error.message);
        setIsAuthenticated(false);
        removeToken();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [allowedRoles]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37]"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (userRole && !allowedRoles.includes(userRole)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
