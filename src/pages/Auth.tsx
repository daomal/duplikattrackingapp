import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { registerUser, loginUser, createAdminUser } from '@/utils/supabaseUtils';
import { AlertCircle, Info } from 'lucide-react';

const Auth = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('login');
  const [showAdminCreation, setShowAdminCreation] = useState(false);

  useEffect(() => {
    // Redirect if user is already logged in
    if (user && profile) {
      console.log("User already logged in, redirecting based on role");
      if (profile.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard-supir');
      }
    }
  }, [user, profile, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Harap isi email dan password');
      return;
    }
    
    setIsLoading(true);
    console.log(`Attempting to login with email: ${email}`);
    
    try {
      const result = await loginUser(email, password);
      
      if (!result.success) {
        console.error('Login failed:', result.message);
        toast.error(result.message || 'Gagal login. Pastikan email dan password benar.');
      } else {
        toast.success('Login berhasil!');
        // Navigation will be handled by the useEffect when profile is loaded
      }
    } catch (error: any) {
      console.error('Login exception:', error);
      toast.error(error.message || 'Gagal login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !name) {
      toast.error('Harap isi semua field');
      return;
    }
    
    if (password.length < 6) {
      toast.error('Password minimal 6 karakter');
      return;
    }
    
    setIsLoading(true);
    console.log(`Attempting to register with email: ${email}`);
    
    try {
      const result = await registerUser(email, password, name);
      
      if (!result.success) {
        console.error('Registration failed:', result.message);
        toast.error(result.message);
      } else {
        toast.success(result.message);
        setActiveTab('login');
        // Clear form
        setEmail('');
        setPassword('');
        setName('');
      }
    } catch (error: any) {
      console.error('Signup exception:', error);
      toast.error(error.message || 'Gagal mendaftar');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !name) {
      toast.error('Harap isi semua field untuk membuat admin');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const result = await createAdminUser(email, password, name);
      
      if (!result.success) {
        toast.error(result.message);
      } else {
        toast.success('Admin berhasil dibuat! Silakan login.');
        setShowAdminCreation(false);
        setActiveTab('login');
        // Clear form
        setEmail('');
        setPassword('');
        setName('');
      }
    } catch (error: any) {
      toast.error(error.message || 'Gagal membuat admin');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 rounded-full border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-4">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">
              Sistem Monitoring Pengiriman
            </CardTitle>
            <CardDescription className="text-center">
              Masuk atau daftar untuk melanjutkan
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Development helper */}
            {process.env.NODE_ENV === 'development' && (
              <Alert className="mb-4">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p>Mode Development:</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowAdminCreation(!showAdminCreation)}
                      className="w-full"
                    >
                      {showAdminCreation ? 'Sembunyikan' : 'Tampilkan'} Pembuatan Admin
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Daftar</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Memproses...' : 'Login'}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="register">
                <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nama</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Nama lengkap"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="Password (minimal 6 karakter)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Memproses...' : 'Daftar'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {/* Admin creation form (development only) */}
            {showAdminCreation && process.env.NODE_ENV === 'development' && (
              <div className="mt-6 p-4 border rounded-lg bg-yellow-50">
                <h3 className="font-semibold mb-3 text-yellow-800">Buat Admin (Development)</h3>
                <form onSubmit={handleCreateAdmin} className="space-y-3">
                  <Input
                    type="text"
                    placeholder="Nama Admin"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                  <Input
                    type="email"
                    placeholder="Email Admin"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <Input
                    type="password"
                    placeholder="Password Admin"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <Button 
                    type="submit" 
                    className="w-full bg-yellow-600 hover:bg-yellow-700"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Membuat Admin...' : 'Buat Admin'}
                  </Button>
                </form>
              </div>
            )}
          </CardContent>
          <CardFooter className="text-center text-sm text-gray-500">
            <p className="w-full">
              Dengan login, Anda menyetujui syarat dan ketentuan yang berlaku.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Auth;