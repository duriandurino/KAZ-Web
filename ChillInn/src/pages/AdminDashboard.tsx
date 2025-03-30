import { useNavigate } from "react-router-dom";
import { removeToken } from "../utils/auth";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const AdminDashboard = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    removeToken();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar */}
      <div className="w-64 bg-[#2C1810] text-white p-4">
        <h2 className="text-lg font-bold mb-4 text-[#D4AF37]">Admin Panel</h2>
        <ul>
          <li className="mb-2">
            <Button
              variant="ghost"
              className="w-full justify-start hover:bg-[#3D2317] text-white"
              onClick={() => navigate("/admin/user-management")}
            >
              User Management
            </Button>
          </li>
          <li className="mb-2">
            <Button
              variant="ghost"
              className="w-full justify-start hover:bg-[#3D2317] text-white"
              onClick={() => navigate("/admin/room-management")}
            >
              Room Management
            </Button>
          </li>
        </ul>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 bg-[#F5F5F5]">
        <Card className="border-[#D4AF37]">
          <CardHeader>
            <CardTitle className="text-[#2C1810]">Admin Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[#2C1810]">Welcome to the admin dashboard.</p>
            <Button onClick={handleLogout} className="mt-4 bg-[#2C1810] hover:bg-[#3D2317] text-white">
              Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
