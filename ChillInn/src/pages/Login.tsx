import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner"
import axios from "axios";
import { setToken, removeToken } from "../utils/auth";
import logo from "./../assets/logo.png";
import { Eye, EyeOff } from "lucide-react";

interface LoginResponse {
  message: string;
  token: string;
  user: {
    id: number;
    email: string;
    fullname: string;
    role: string;
    status: string;
  };
}

interface GoogleLoginResponse {
  message: string;
  token: string;
  user: {
    id: number;
    email: string;
    fullname: string;
    role: string;
    status: string;
    created_at: string;
  };
}

interface RegisterData {
  email: string;
  password: string;
  fullname: string;
  phone_number: string;
  role: string;
  special_requests?: string;
  access_level: string;
}

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [registerData, setRegisterData] = useState<RegisterData>({
    email: "",
    password: "",
    fullname: "",
    phone_number: "",
    role: "guest",
    special_requests: "",
    access_level: ""
  });
  const navigate = useNavigate();

  const checkEmailExists = async (email: string): Promise<boolean> => {
    try {
      const response = await axios.get("/api/users/getallusers", {
        headers: {
          "x-api-key": import.meta.env.VITE_API_KEY,
        },
      });
      return response.data.some((user: any) => user.email === email);
    } catch (error) {
      console.error("Error checking email:", error);
      return false;
    }
  };

  const validatePassword = (password: string) => {
    const minLength = password.length >= 8;
    const hasNumber = /\d/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    return { isValid: minLength && hasNumber && hasUpperCase, minLength, hasNumber, hasUpperCase };
  };

  const handleRegister = async () => {
    try {
      setIsLoading(true);

      const errors = [];
      if (!registerData.email) errors.push("Email is required");
      if (!registerData.password) {
        errors.push("Password is required");
      } else {
        const { isValid, minLength, hasNumber, hasUpperCase } = validatePassword(registerData.password);
        if (!isValid) {
          if (!minLength) errors.push("Password must be at least 8 characters long");
          if (!hasNumber) errors.push("Password must include at least one number");
          if (!hasUpperCase) errors.push("Password must include at least one uppercase letter");
        }
      }
      if (!registerData.fullname) errors.push("Full name is required");
      if (!registerData.phone_number) errors.push("Phone number is required");

      if (errors.length > 0) {
        errors.forEach(error => toast.error(error));
        return;
      }

      const emailExists = await checkEmailExists(registerData.email);
      if (emailExists) {
        toast.error(`Email ${registerData.email} is already registered`);
        return;
      }

      const response = await axios.post(
        '/api/users/add-user',
        registerData,
        {
          headers: {
            "x-api-key": import.meta.env.VITE_API_KEY,
          },
        }
      );

      toast.success("Registration successful! Please login.");
      setShowRegister(false);
      setEmail(registerData.email);
    } catch (error: any) {
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else if (error.message.includes("Network Error")) {
        toast.error("Unable to connect to server. Please check your internet connection.");
      } else {
        toast.error("Registration failed. Please try again later.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await axios.post<LoginResponse>(
        '/api/users/login',
        { email, password },
        {
          headers: {
            'x-api-key': import.meta.env.VITE_API_KEY,
          },
        }
      );

      setToken(response.data.token);
      toast.success("Login successful!");

      // Convert role to lowercase for consistent comparison
      const userRole = response.data.user.role.toLowerCase();
      if (userRole === 'admin') {
        navigate("/admin/dashboard");
      } else if (userRole === 'guest') {
        navigate("/user/dashboard");
      } else {
        toast.error("Invalid user role");
        removeToken();
      }
    } catch (error: any) {
      console.error('Login error:', error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Invalid credentials!");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async (response: any) => {
    try {
      const googleResponse = await axios.post<GoogleLoginResponse>(
        '/api/users/login-google',
        { token: response.credential },
        {
          headers: {
            'x-api-key': import.meta.env.VITE_API_KEY,
          },
        }
      );

      setToken(googleResponse.data.token);
      toast.success("Login successful!");

      // Convert role to lowercase for consistent comparison
      const userRole = googleResponse.data.user.role.toLowerCase();
      if (userRole === 'admin') {
        navigate("/admin/dashboard");
      } else if (userRole === 'guest') {
        navigate("/user/dashboard");
      } else {
        toast.error("Invalid user role");
        removeToken();
      }
    } catch (error: any) {
      console.error('Google login error:', error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Error logging in with Google");
    }
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    if (value.length <= 10) { // Limit to 10 digits
      setRegisterData({ ...registerData, phone_number: value ? `+63${value}` : '' });
    }
  };

  useEffect(() => {
    const initializeGoogleSignIn = () => {
      const google = (window as any).google;
      if (!google) {
        console.error('Google Sign-In SDK not loaded');
        return;
      }

      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!clientId) {
        console.error('Google Client ID not configured');
        return;
      }

      try {
        google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleLogin,
          auto_select: false,
          cancel_on_tap_outside: true,
          ux_mode: 'popup',
          context: 'signin',
          allowed_parent_origin: import.meta.env.VITE_APP_URL || window.location.origin
        });

        const buttonElement = document.getElementById("googleSignInDiv");
        if (buttonElement) {
          buttonElement.innerHTML = '';
          google.accounts.id.renderButton(
            buttonElement,
            { 
              type: 'standard',
              theme: 'outline',
              size: 'large',
              text: 'signin_with',
              shape: 'rectangular',
              width: buttonElement.offsetWidth
            }
          );
        }
      } catch (error) {
        console.error('Google Sign-In initialization error:', error);
      }
    };

    if (document.readyState === 'complete') {
      initializeGoogleSignIn();
    } else {
      window.addEventListener('load', initializeGoogleSignIn);
      return () => window.removeEventListener('load', initializeGoogleSignIn);
    }
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#F5F5F5] to-[#E8E8E8] w-full">
      <Card className="w-full max-w-md shadow-lg border-[#D4AF37]">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <img src={logo} alt="Hotel Logo" className=" h-36 w-auto" />
          </div>
          <CardDescription className="text-center text-[#666666]">
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#2C1810]">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border-[#D4AF37] focus:ring-[#2C1810]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#2C1810]">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pr-10 border-[#D4AF37] focus:ring-[#2C1810]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#666666] hover:text-[#2C1810]"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 mt-4">
            <Button 
              type="submit" 
              className="w-full bg-[#2C1810] hover:bg-[#3D2317] text-white"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full border-[#D4AF37] text-[#2C1810] hover:bg-[#F5F5F5]"
              onClick={() => setShowRegister(true)}
            >
              Create Account
            </Button>
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[#D4AF37]" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-[#666666]">Or continue with</span>
              </div>
            </div>
            <div id="googleSignInDiv" className="w-full"></div>
          </CardFooter>
        </form>
      </Card>

      <Dialog open={showRegister} onOpenChange={setShowRegister}>
        <DialogContent className="sm:max-w-md border-[#D4AF37]">
          <DialogHeader>
            <DialogTitle className="text-[#2C1810]">Create Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reg-email" className="text-[#2C1810]">Email</Label>
              <Input
                id="reg-email"
                type="email"
                placeholder="Enter your email"
                value={registerData.email}
                onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                required
                className="border-[#D4AF37] focus:ring-[#2C1810]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reg-password" className="text-[#2C1810]">Password</Label>
              <div className="relative">
                <Input
                  id="reg-password"
                  type={showRegisterPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={registerData.password}
                  onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                  required
                  className="w-full pr-10 border-[#D4AF37] focus:ring-[#2C1810]"
                />
                <button
                  type="button"
                  onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#666666] hover:text-[#2C1810]"
                >
                  {showRegisterPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <div className="text-xs text-[#666666] space-y-1 mt-1">
                <p>Password requirements:</p>
                <ul className="list-disc list-inside pl-2">
                  <li>Minimum 8 characters</li>
                  <li>At least one number</li>
                  <li>At least one uppercase letter</li>
                </ul>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullname" className="text-[#2C1810]">Full Name</Label>
              <Input
                id="fullname"
                placeholder="Enter your full name"
                value={registerData.fullname}
                onChange={(e) => setRegisterData({ ...registerData, fullname: e.target.value })}
                required
                className="border-[#D4AF37] focus:ring-[#2C1810]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-[#2C1810]">Phone Number</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#666666]">+63</span>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="9123456789"
                  value={registerData.phone_number.replace('+63', '')}
                  onChange={handlePhoneNumberChange}
                  required
                  className="border-[#D4AF37] focus:ring-[#2C1810] pl-12"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="special-requests" className="text-[#2C1810]">Special Requests (Optional)</Label>
              <Input
                id="special-requests"
                placeholder="Any special requests?"
                value={registerData.special_requests}
                onChange={(e) => setRegisterData({ ...registerData, special_requests: e.target.value })}
                className="border-[#D4AF37] focus:ring-[#2C1810]"
              />
            </div>
            <Button
              type="button"
              className="w-full bg-[#2C1810] hover:bg-[#3D2317] text-white"
              onClick={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? "Creating Account..." : "Create Account"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
};

export default Login;
