import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find((u: any) => u.email === email && u.password === password);
    if (user) {
      navigate('/dashboard');
    } else {
      console.error('Invalid credentials');
      console.log('Login failed for email:', email);
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
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 text-base focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition"
            />
            <span className="text-xs text-gray-400">We'll never share your email.</span>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 text-base focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition"
            />
            <span className="text-xs text-gray-400">Use at least 8 characters.</span>
          </div>
          <button type="submit" className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white text-lg font-bold shadow-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200">Login</button>
        </form>
        <p className="text-center text-sm text-gray-600 mt-8">
          Don't have an account? <a href="/signup" className="text-purple-600 font-medium hover:underline">Sign up</a>
        </p>
      </div>
    </div>
  );
};

export default Login;