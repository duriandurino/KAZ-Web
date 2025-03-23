import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import axios from "axios";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner"

// Define the type for a user object
interface User {
  user_id: number;
  name: string;
  email: string;
}

const UserManagement = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]); // Explicitly type the users state

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
      toast("Error retrieving users!");
    }
  };

  const handleDeleteUser = async (user_id: number) => { // Explicitly type user_id
    try {
      await axios.delete("/api/users/deleteuserbyid", {
        headers: {
          "x-api-key": import.meta.env.VITE_API_KEY,
        },
        data: { user_id },
      });
      toast("User deleted successfully!");
      fetchUsers(); // Refresh the user list
    } catch (error) {
      toast("Error deleting user!");
    }
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
              onClick={() => navigate("/dashboard")}
            >
              Back to Dashboard
            </Button>
          </li>
        </ul>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 bg-gray-100">
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell>{user.user_id}</TableCell>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        onClick={() => handleDeleteUser(user.user_id)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <Toaster/>
    </div>
  );
};

export default UserManagement;