import { useNavigate } from "react-router-dom";
import { removeToken } from "../utils/auth";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const Dashboard = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    removeToken();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 text-white p-4">
        <h2 className="text-lg font-bold mb-4">Admin Panel</h2>
        <ul>
          <li className="mb-2">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => navigate("/user-management")}
            >
              User Management
            </Button>
          </li>
        </ul>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 bg-gray-100">
        <Card>
          <CardHeader>
            <CardTitle>Admin Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Welcome to the admin dashboard.</p>
            <Button onClick={handleLogout} className="mt-4" variant="destructive">
              Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
