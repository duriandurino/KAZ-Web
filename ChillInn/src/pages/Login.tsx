import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input, Card, Form, Modal, Typography, message, Divider, Layout, Alert } from "antd";
import { EyeOutlined, EyeInvisibleOutlined } from "@ant-design/icons";
import axios from "axios";
import { setToken, removeToken } from "../utils/auth";
import logo from "./../assets/logo.png";
import PageTransition from "../components/PageTransition";

const { Title, Text, Paragraph } = Typography;
const { Content } = Layout;

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
  firstname?: string;
  lastname?: string;
  phone_number: string;
  role: string;
  special_requests?: string;
  access_level: string;
}

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerForm] = Form.useForm();
  const [loginForm] = Form.useForm();
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

  const handleRegister = async (values: RegisterData) => {
    try {
      setIsLoading(true);
      setRegisterError(null);

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(values.email)) {
        setRegisterError("Please enter a valid email address");
        return;
      }

      // Validate password
      const { isValid, minLength, hasNumber, hasUpperCase } = validatePassword(values.password);
      if (!isValid) {
        const errors = [];
        if (!minLength) errors.push("at least 8 characters");
        if (!hasNumber) errors.push("one number");
        if (!hasUpperCase) errors.push("one uppercase letter");
        setRegisterError(`Password must contain ${errors.join(", ")}`);
        return;
      }

      // Validate phone number
      const phoneNumber = values.phone_number.replace(/\D/g, '');
      if (phoneNumber.length !== 10) {
        setRegisterError("Please enter a valid 10-digit phone number");
        return;
      }

      // Check if email already exists
      const emailExists = await checkEmailExists(values.email);
      if (emailExists) {
        setRegisterError(`Email ${values.email} is already registered`);
        return;
      }

      // Format phone number and concatenate names for submission
      const formattedValues = {
        ...values,
        fullname: `${values.firstname} ${values.lastname}`.trim(),
        phone_number: `+63${phoneNumber}`
      };

      // Remove firstname and lastname as they're not needed by the API
      delete formattedValues.firstname;
      delete formattedValues.lastname;

      const response = await axios.post(
        '/api/users/add-user',
        formattedValues,
        {
          headers: {
            "x-api-key": import.meta.env.VITE_API_KEY,
          },
        }
      );

      if (response.data) {
        message.success({
          content: "Registration successful! Please login.",
          duration: 3,
        });
        setShowRegister(false);
        loginForm.setFieldsValue({ email: values.email });
        registerForm.resetFields();
        setRegisterError(null);
      }
    } catch (error: any) {
      if (error.response?.data?.message) {
        setRegisterError(error.response.data.message);
      } else if (error.message.includes("Network Error")) {
        setRegisterError("Unable to connect to server. Please check your internet connection.");
      } else {
        setRegisterError("Registration failed. Please try again later.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (values: any) => {
    try {
      setIsLoading(true);
      setLoginError(null);

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(values.email)) {
        setLoginError("Please enter a valid email address");
        return;
      }

      // Validate password is not empty
      if (!values.password || values.password.trim() === '') {
        setLoginError("Please enter your password");
        return;
      }

      const response = await axios.post<LoginResponse>(
        '/api/users/login',
        { email: values.email, password: values.password },
        {
          headers: {
            'x-api-key': import.meta.env.VITE_API_KEY,
          },
        }
      );

      if (response.data && response.data.token) {
        setToken(response.data.token);
        setLoginError(null);
        message.success({
          content: "Login successful!",
          duration: 2,
        });

        const userRole = response.data.user.role.toLowerCase();
        if (userRole === 'admin') {
          navigate("/admin/dashboard");
        } else if (userRole === 'guest') {
          navigate("/user/dashboard");
        } else {
          setLoginError("Invalid user role");
          removeToken();
        }
      } else {
        setLoginError("Invalid response from server");
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        setLoginError("Invalid email or password");
      } else if (error.response?.data?.message) {
        setLoginError(error.response.data.message);
      } else if (error.message.includes("Network Error")) {
        setLoginError("Unable to connect to server. Please check your internet connection.");
      } else {
        setLoginError("Login failed. Please try again later.");
      }
      console.error('Login error:', error.response?.data || error.message);
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
      message.success("Login successful!");

      const userRole = googleResponse.data.user.role.toLowerCase();
      if (userRole === 'admin') {
        navigate("/admin/dashboard");
      } else if (userRole === 'guest') {
        navigate("/user/dashboard");
      } else {
        message.error("Invalid user role");
        removeToken();
      }
    } catch (error: any) {
      console.error('Google login error:', error.response?.data || error.message);
      message.error(error.response?.data?.message || "Error logging in with Google");
    }
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers
    const numericValue = value.replace(/[^0-9]/g, '');
    if (numericValue.length <= 10) {
      registerForm.setFieldValue('phone_number', numericValue);
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
    <Layout className="min-h-screen relative">
      {/* Hotel background image */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ 
          backgroundImage: "url('https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80')",
          filter: "brightness(0.7) contrast(1.1)"
        }}
      >
        {/* Overlay to ensure text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#2C1810]/70 to-[#1a365d]/70"></div>
      </div>
      
      <PageTransition>
        <Content className="h-screen flex items-center justify-center p-6 relative z-10">
          <Card 
            className="w-full max-w-[400px] shadow-lg bg-white/95 backdrop-blur-sm" 
            style={{ borderColor: '#D4AF37' }}
          >
            <div className="flex justify-center mb-6">
              <img src={logo} alt="Hotel Logo" className="h-24 w-auto object-contain" />
            </div>
            <Paragraph className="text-center text-[#666666] mb-6">
              Sign in to your account to continue
            </Paragraph>
            
            <Form
              form={loginForm}
              layout="vertical"
              onFinish={handleLogin}
              className="space-y-4"
            >
              {loginError && (
                <Alert
                  message={loginError}
                  type="error"
                  showIcon
                  className="mb-4"
                />
              )}

              <Form.Item
                label={<Text className="text-[#2C1810] font-medium">Email</Text>}
                name="email"
                rules={[{ required: true, message: 'Please input your email!' }]}
              >
                <Input
                  placeholder="Enter your email"
                  size="large"
                  className="rounded"
                />
              </Form.Item>
              
              <Form.Item
                label={<Text className="text-[#2C1810] font-medium">Password</Text>}
                name="password"
                rules={[{ required: true, message: 'Please input your password!' }]}
              >
                <Input.Password
                  placeholder="Enter your password"
                  size="large"
                  className="rounded"
                  iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
                />
              </Form.Item>
              
              <Form.Item className="mb-4">
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  className="w-full rounded"
                  size="large"
                  loading={isLoading}
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </Form.Item>
              
              <Form.Item className="mb-4">
                <Button
                  type="default"
                  className="w-full rounded"
                  size="large"
                  onClick={() => {
                    setShowRegister(true);
                    setRegisterError(null);
                  }}
                >
                  Create Account
                </Button>
              </Form.Item>
              
              <Divider>
                <Text className="text-[#666666]">Or continue with</Text>
              </Divider>
              
              <div id="googleSignInDiv" className="w-full flex justify-center"></div>
            </Form>
          </Card>
        </Content>
      </PageTransition>

      <Modal
        title={<Title level={4} style={{ color: '#2C1810', marginBottom: '24px' }}>Create Account</Title>}
        open={showRegister}
        onCancel={() => {
          setShowRegister(false);
          setRegisterError(null);
          registerForm.resetFields();
        }}
        footer={null}
        width={400}
        centered
        className="rounded-lg"
      >
        <Form
          form={registerForm}
          layout="vertical"
          onFinish={handleRegister}
          initialValues={{
            role: "guest",
            access_level: "1"
          }}
          className="space-y-4"
        >
          {registerError && (
            <Alert
              message={registerError}
              type="error"
              showIcon
              className="mb-4"
            />
          )}

          <Form.Item
            label={<Text className="text-[#2C1810] font-medium">Email</Text>}
            name="email"
            rules={[{ required: true, message: 'Please input your email!' }]}
          >
            <Input
              placeholder="Enter your email"
              size="large"
            />
          </Form.Item>
          
          <Form.Item
            label={<Text className="text-[#2C1810] font-medium">Password</Text>}
            name="password"
            rules={[{ required: true, message: 'Please input your password!' }]}
          >
            <Input.Password
              placeholder="Enter your password"
              size="large"
              iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
            />
          </Form.Item>
          
          <div className="text-xs text-[#666666] space-y-1 mb-4 bg-[#F5F5F5] p-3 rounded">
            <p className="font-medium">Password requirements:</p>
            <ul className="list-disc list-inside pl-2 space-y-1">
              <li>Minimum 8 characters</li>
              <li>At least one number</li>
              <li>At least one uppercase letter</li>
            </ul>
          </div>
          
          <Form.Item
            label={<Text className="text-[#2C1810] font-medium">First Name</Text>}
            name="firstname"
            rules={[{ required: true, message: 'Please input your first name!' }]}
          >
            <Input
              placeholder="Enter your first name"
              size="large"
            />
          </Form.Item>
          
          <Form.Item
            label={<Text className="text-[#2C1810] font-medium">Last Name</Text>}
            name="lastname"
            rules={[{ required: true, message: 'Please input your last name!' }]}
          >
            <Input
              placeholder="Enter your last name"
              size="large"
            />
          </Form.Item>
          
          <Form.Item
            label={<Text className="text-[#2C1810] font-medium">Phone Number</Text>}
            name="phone_number"
            rules={[
              { required: true, message: 'Please input your phone number!' },
              { min: 10, message: 'Phone number must be 10 digits!' },
              { pattern: /^[0-9]+$/, message: 'Phone number can only contain numbers!' }
            ]}
          >
            <div className="relative flex items-center">
              <div className="absolute left-0 top-0 bottom-0 flex items-center justify-center bg-gray-100 text-gray-600 w-12 border-r rounded-l">
                +63
              </div>
              <Input
                type="text"
                placeholder="9123456789"
                onChange={handlePhoneNumberChange}
                className="pl-12"
                size="large"
                maxLength={10}
                onKeyPress={(e) => {
                  // Allow only number inputs
                  if (!/[0-9]/.test(e.key)) {
                    e.preventDefault();
                  }
                }}
                style={{ paddingLeft: '48px' }}
              />
            </div>
          </Form.Item>
          
          <Form.Item
            label={<Text className="text-[#2C1810] font-medium">Special Requests (Optional)</Text>}
            name="special_requests"
          >
            <Input
              placeholder="Any special requests?"
              size="large"
            />
          </Form.Item>
          
          <Form.Item name="role" hidden>
            <Input />
          </Form.Item>
          
          <Form.Item name="access_level" hidden>
            <Input />
          </Form.Item>
          
          <Form.Item className="mb-0">
            <Button
              type="primary"
              htmlType="submit"
              className="w-full"
              size="large"
              loading={isLoading}
            >
              {isLoading ? "Creating Account..." : "Create Account"}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default Login;
