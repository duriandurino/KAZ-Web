import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import axios from "axios";
import { Plus, Pencil, Trash2, Image as ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface RoomType {
  room_type_id: number;
  name: string;
  price: number;
  capacity: number;
  description: string;
}

interface Room {
  room_id: number;
  room_number: string;
  room_type_id: number;
  status: string;
  preview_images: string[];
  room_type?: RoomType;
}

const RoomManagement = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingRoomType, setIsAddingRoomType] = useState(false);
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [newRoomType, setNewRoomType] = useState({
    name: "",
    price: "",
    capacity: "",
    description: "",
  });
  const [newRoom, setNewRoom] = useState({
    room_number: "",
    room_type_id: "",
    status: "Available",
    thumbnail: null as File | null,
    preview_images: [] as File[],
  });

  useEffect(() => {
    fetchRooms();
    fetchRoomTypes();
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await axios.get<Room[]>("/api/room/getallrooms", {
        headers: {
          "x-api-key": import.meta.env.VITE_API_KEY,
        },
      });
      setRooms(response.data);
    } catch (error) {
      toast.error("Error fetching rooms!");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoomTypes = async () => {
    try {
      const response = await axios.get<RoomType[]>("/api/room/getroomtypes", {
        headers: {
          "x-api-key": import.meta.env.VITE_API_KEY,
        },
      });
      setRoomTypes(response.data);
    } catch (error) {
      toast.error("Error fetching room types!");
    }
  };

  const handleAddRoomType = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(
        "/api/room/add-roomtype",
        {
          name: newRoomType.name,
          price: Number(newRoomType.price),
          capacity: Number(newRoomType.capacity),
          description: newRoomType.description,
        },
        {
          headers: {
            "x-api-key": import.meta.env.VITE_API_KEY,
          },
        }
      );
      toast.success("Room type added successfully!");
      setIsAddingRoomType(false);
      setNewRoomType({ name: "", price: "", capacity: "", description: "" });
      fetchRoomTypes();
    } catch (error) {
      toast.error("Error adding room type!");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'thumbnail' | 'preview') => {
    const files = e.target.files;
    if (files) {
      if (type === 'thumbnail') {
        setNewRoom({ ...newRoom, thumbnail: files[0] });
      } else {
        setNewRoom({ ...newRoom, preview_images: Array.from(files) });
      }
    }
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('room_number', newRoom.room_number);
      formData.append('room_type_id', newRoom.room_type_id);
      formData.append('status', newRoom.status);
      
      if (newRoom.thumbnail) {
        formData.append('thumbnail', newRoom.thumbnail);
      }
      
      newRoom.preview_images.forEach((file, index) => {
        formData.append(`preview_images`, file);
      });

      await axios.post(
        "/api/room/add-room",
        formData,
        {
          headers: {
            "x-api-key": import.meta.env.VITE_API_KEY,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      toast.success("Room added successfully!");
      setIsAddingRoom(false);
      setNewRoom({ room_number: "", room_type_id: "", status: "Available", thumbnail: null, preview_images: [] });
      fetchRooms();
    } catch (error) {
      toast.error("Error adding room!");
    }
  };

  const handleUpdateRoom = async (roomId: number, updates: Partial<Room>) => {
    try {
      await axios.put(
        `/api/room/updateroombyid/${roomId}`,
        updates,
        {
          headers: {
            "x-api-key": import.meta.env.VITE_API_KEY,
          },
        }
      );
      toast.success("Room updated successfully!");
      fetchRooms();
    } catch (error) {
      toast.error("Error updating room!");
    }
  };

  const handleUploadImage = async (roomId: number, file: File, type: 'thumbnail' | 'preview') => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('room_id', roomId.toString());

    try {
      const endpoint = type === 'thumbnail' 
        ? '/api/image/upload/thumbnail'
        : '/api/image/upload/room-preview';
      
      await axios.post(endpoint, formData, {
        headers: {
          "x-api-key": import.meta.env.VITE_API_KEY,
          "Content-Type": "multipart/form-data",
        },
      });
      toast.success(`${type === 'thumbnail' ? 'Thumbnail' : 'Preview'} uploaded successfully!`);
      fetchRooms();
    } catch (error) {
      toast.error(`Error uploading ${type}!`);
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
              onClick={() => navigate("/admin/user-management")}
            >
              User Management
            </Button>
          </li>
        </ul>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 bg-[#F5F5F5]">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-[#2C1810]">Room Management</h1>
          <div className="space-x-4">
            <Dialog open={isAddingRoomType} onOpenChange={setIsAddingRoomType}>
              <DialogTrigger asChild>
                <Button className="bg-[#2C1810] hover:bg-[#3D2317] text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Room Type
                </Button>
              </DialogTrigger>
              <DialogContent className="border-[#D4AF37]">
                <DialogHeader>
                  <DialogTitle className="text-[#2C1810]">Add New Room Type</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddRoomType} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-[#2C1810]">Name</Label>
                    <Input
                      id="name"
                      value={newRoomType.name}
                      onChange={(e) => setNewRoomType({ ...newRoomType, name: e.target.value })}
                      required
                      className="border-[#D4AF37] focus:ring-[#2C1810]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price" className="text-[#2C1810]">Price</Label>
                    <Input
                      id="price"
                      type="number"
                      value={newRoomType.price}
                      onChange={(e) => setNewRoomType({ ...newRoomType, price: e.target.value })}
                      required
                      className="border-[#D4AF37] focus:ring-[#2C1810]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="capacity" className="text-[#2C1810]">Capacity</Label>
                    <Input
                      id="capacity"
                      type="number"
                      value={newRoomType.capacity}
                      onChange={(e) => setNewRoomType({ ...newRoomType, capacity: e.target.value })}
                      required
                      className="border-[#D4AF37] focus:ring-[#2C1810]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-[#2C1810]">Description</Label>
                    <Textarea
                      id="description"
                      value={newRoomType.description}
                      onChange={(e) => setNewRoomType({ ...newRoomType, description: e.target.value })}
                      required
                      className="border-[#D4AF37] focus:ring-[#2C1810]"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-[#2C1810] hover:bg-[#3D2317] text-white">Add Room Type</Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isAddingRoom} onOpenChange={setIsAddingRoom}>
              <DialogTrigger asChild>
                <Button className="bg-[#2C1810] hover:bg-[#3D2317] text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Room
                </Button>
              </DialogTrigger>
              <DialogContent className="border-[#D4AF37]">
                <DialogHeader>
                  <DialogTitle className="text-[#2C1810]">Add New Room</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddRoom} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="room_number" className="text-[#2C1810]">Room Number</Label>
                    <Input
                      id="room_number"
                      value={newRoom.room_number}
                      onChange={(e) => setNewRoom({ ...newRoom, room_number: e.target.value })}
                      required
                      className="border-[#D4AF37] focus:ring-[#2C1810]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="room_type" className="text-[#2C1810]">Room Type</Label>
                    <Select
                      value={newRoom.room_type_id}
                      onValueChange={(value: string) => setNewRoom({ ...newRoom, room_type_id: value })}
                    >
                      <SelectTrigger className="border-[#D4AF37] focus:ring-[#2C1810]">
                        <SelectValue placeholder="Select room type" />
                      </SelectTrigger>
                      <SelectContent>
                        {roomTypes.map((type) => (
                          <SelectItem key={type.room_type_id} value={type.room_type_id.toString()}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-[#2C1810]">Status</Label>
                    <Select
                      value={newRoom.status}
                      onValueChange={(value: string) => setNewRoom({ ...newRoom, status: value })}
                    >
                      <SelectTrigger className="border-[#D4AF37] focus:ring-[#2C1810]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Available">Available</SelectItem>
                        <SelectItem value="Occupied">Occupied</SelectItem>
                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="thumbnail" className="text-[#2C1810]">Thumbnail Image</Label>
                    <Input
                      id="thumbnail"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'thumbnail')}
                      required
                      className="border-[#D4AF37] focus:ring-[#2C1810]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="preview_images" className="text-[#2C1810]">Preview Images</Label>
                    <Input
                      id="preview_images"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleImageUpload(e, 'preview')}
                      required
                      className="border-[#D4AF37] focus:ring-[#2C1810]"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-[#2C1810] hover:bg-[#3D2317] text-white">Add Room</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="border-[#D4AF37]">
          <CardContent className="p-6">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37]"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#F5F5F5]">
                    <TableHead className="text-[#2C1810]">Room Number</TableHead>
                    <TableHead className="text-[#2C1810]">Type</TableHead>
                    <TableHead className="text-[#2C1810]">Status</TableHead>
                    <TableHead className="text-[#2C1810]">Preview</TableHead>
                    <TableHead className="text-[#2C1810]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rooms.map((room) => (
                    <TableRow key={room.room_id} className="hover:bg-[#F5F5F5]">
                      <TableCell className="text-[#2C1810]">{room.room_number}</TableCell>
                      <TableCell className="text-[#2C1810]">{roomTypes.find(t => t.room_type_id === room.room_type_id)?.name}</TableCell>
                      <TableCell className="capitalize text-[#2C1810]">{room.status}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/*';
                              input.onchange = (e) => {
                                const file = (e.target as HTMLInputElement).files?.[0];
                                if (file) handleUploadImage(room.room_id, file, 'thumbnail');
                              };
                              input.click();
                            }}
                            className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#F5F5F5]"
                          >
                            <ImageIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/*';
                              input.onchange = (e) => {
                                const file = (e.target as HTMLInputElement).files?.[0];
                                if (file) handleUploadImage(room.room_id, file, 'preview');
                              };
                              input.click();
                            }}
                            className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#F5F5F5]"
                          >
                            <ImageIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            setSelectedRoom(room);
                            // TODO: Implement edit room functionality
                          }}
                          className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#F5F5F5]"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleUpdateRoom(room.room_id, {
                            status: room.status === 'Available' ? 'Maintenance' : 'Available'
                          })}
                          className="border-[#B22222] text-[#B22222] hover:bg-[#F5F5F5]"
                        >
                          <Trash2 className="h-4 w-4" />
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

export default RoomManagement; 