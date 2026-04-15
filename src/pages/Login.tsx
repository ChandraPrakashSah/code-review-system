import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import FormField from '../components/FormField';

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const hashedPassword = await hashPassword(password);
    const user = users.find((u: any) => u.email === email && u.password === hashedPassword);
    if (user) {
      navigate('/dashboard');
    } else {
      setError('Invalid email or password.');
    }
  };

  // Function to get the device fingerprint
  const getDeviceId = async () => {
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    return result.visitorId; // stable unique ID
  };

  useEffect(() => {
    const fetchDeviceId = async () => {
      const deviceId = await getDeviceId();
      console.log('Device ID:', deviceId);
    };
    fetchDeviceId();
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100">
      <div className="w-full max-w-md p-10 shadow-2xl rounded-3xl border border-gray-200 bg-white backdrop-blur-lg">
        <h2 className="text-4xl font-extrabold text-center text-gray-800 mb-2">Welcome Back</h2>
        <p className="text-center text-gray-500 mb-8">Sign in to your account</p>
        <form className="space-y-6" onSubmit={handleLogin}>
          <FormField
            id="email"
            label="Email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={setEmail}
            hint="We'll never share your email."
          />
          <FormField
            id="password"
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={setPassword}
            hint="Use at least 8 characters."
          />
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          <button type="submit" className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white text-lg font-bold shadow-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200">Login</button>
        </form>
        <p className="text-center text-sm text-gray-600 mt-8">
          Don't have an account? <Link to="/signup" className="text-purple-600 font-medium hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
