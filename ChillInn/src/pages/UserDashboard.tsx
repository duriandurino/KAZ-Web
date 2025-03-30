import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner"
import axios from "axios";

interface User {
  id: number;
  email: string;
  fullname: string;
  role: string;
  status: string;
}

const UserDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error("No authentication token found!");
        navigate("/");
        return;
      }

      const response = await axios.get("/api/users/userinfobyid", {
        headers: {
          "x-api-key": import.meta.env.VITE_API_KEY,
          "Authorization": `Bearer ${token}`
        },
      });

      // Check if user has the correct role
      const userRole = response.data.role.toLowerCase();
      if (userRole !== 'guest') {
        toast.error("Unauthorized access!");
        navigate("/");
        return;
      }

      setUser(response.data);
    } catch (error: any) {
      console.error('Profile fetch error:', error.response?.data || error.message);
      toast.error("Error fetching user profile!");
      navigate("/");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar */}
      <div className="w-64 bg-[#2C1810] text-white p-4">
        <h2 className="text-lg font-bold mb-4 text-[#D4AF37]">Hotel Portal</h2>
        <ul className="space-y-2">
          <li>
            <Button
              variant="ghost"
              className="w-full justify-start text-white hover:bg-[#3D2317]"
              onClick={() => navigate("/user/dashboard")}
            >
              Dashboard
            </Button>
          </li>
          <li>
            <Button
              variant="ghost"
              className="w-full justify-start text-white hover:bg-[#3D2317]"
              onClick={() => navigate("/user/bookings")}
            >
              My Bookings
            </Button>
          </li>
          <li>
            <Button
              variant="ghost"
              className="w-full justify-start text-white hover:bg-[#3D2317]"
              onClick={() => navigate("/user/profile")}
            >
              Profile
            </Button>
          </li>
          <li className="mt-4">
            <Button
              variant="destructive"
              className="w-full bg-[#2C1810] hover:bg-[#3D2317] text-white"
              onClick={handleLogout}
            >
              Logout
            </Button>
          </li>
        </ul>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 bg-[#F5F5F5]">
        <Card className="border-[#D4AF37]">
          <CardHeader>
            <CardTitle className="text-[#2C1810]">Welcome, {user?.fullname}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="border-[#D4AF37] hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-[#2C1810]">My Bookings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-[#666666]">View and manage your hotel bookings</p>
                </CardContent>
              </Card>
              <Card className="border-[#D4AF37] hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-[#2C1810]">Profile</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-[#666666]">Update your personal information</p>
                </CardContent>
              </Card>
              <Card className="border-[#D4AF37] hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-[#2C1810]">Preferences</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-[#666666]">Set your booking preferences</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
      <Toaster />
    </div>
  );
};

export default UserDashboard; 