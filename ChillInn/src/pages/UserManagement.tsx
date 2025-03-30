import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner"
import axios from "axios";
import { Pencil, Trash2 } from "lucide-react";

interface User {
  user_id: number;
  fullname: string;
  email: string;
  role: string;
  status: string;
}

const UserManagement = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get<User[]>("/api/users/getallusers", {
        headers: {
          "x-api-key": import.meta.env.VITE_API_KEY,
        },
      });
      setUsers(response.data);
    } catch (error) {
      toast.error("Error retrieving users!");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser = (userId: number) => {
    toast.info("Edit functionality coming soon!");
  };

  const handleDeactivateUser = async (userId: number) => {
    try {
      await axios.delete("/api/users/deactivateuserbyid", {
        headers: {
          "x-api-key": import.meta.env.VITE_API_KEY,
        },
        data: { user_id: userId },
      });
      toast.success("User deactivated successfully!");
      fetchUsers(); // Refresh the user list
    } catch (error) {
      toast.error("Error deactivating user!");
    }
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
              className="w-full justify-start text-white hover:bg-[#3D2317]"
              onClick={() => navigate("/admin/dashboard")}
            >
              Back to Dashboard
            </Button>
          </li>
          <li className="mb-2">
            <Button
              variant="ghost"
              className="w-full justify-start text-white hover:bg-[#3D2317]"
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
            <CardTitle className="text-[#2C1810]">User Management</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37]"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F5F5F5]">
                    <TableHead className="text-[#2C1810]">ID</TableHead>
                    <TableHead className="text-[#2C1810]">Name</TableHead>
                    <TableHead className="text-[#2C1810]">Email</TableHead>
                    <TableHead className="text-[#2C1810]">Role</TableHead>
                    <TableHead className="text-[#2C1810]">Status</TableHead>
                    <TableHead className="text-[#2C1810]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.user_id} className="hover:bg-[#F5F5F5]">
                      <TableCell className="text-[#2C1810]">{user.user_id}</TableCell>
                      <TableCell className="text-[#2C1810]">{user.fullname}</TableCell>
                      <TableCell className="text-[#2C1810]">{user.email}</TableCell>
                      <TableCell className="capitalize text-[#2C1810]">{user.role}</TableCell>
                      <TableCell className="capitalize text-[#2C1810]">{user.status}</TableCell>
                      <TableCell className="space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEditUser(user.user_id)}
                          className="text-[#D4AF37] hover:text-[#2C1810] border-[#D4AF37] hover:bg-[#F5F5F5]"
                        >
                          <Pencil className="h-5 w-5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDeactivateUser(user.user_id)}
                          className="text-[#B22222] hover:text-[#8B0000] border-[#B22222] hover:bg-[#F5F5F5]"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      <Toaster />
    </div>
  );
};

export default UserManagement;