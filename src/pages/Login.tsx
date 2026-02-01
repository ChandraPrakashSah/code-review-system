import React, { useState } from 'react';
import { Button, Input, Card } from '@heroui/react';
import { useNavigate } from 'react-router-dom';

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
      alert('Invalid credentials');
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100">
      <Card className="w-full max-w-md p-10 shadow-2xl rounded-3xl border border-gray-200 bg-white/80 backdrop-blur-lg">
        <h2 className="text-4xl font-extrabold text-center text-gray-800 mb-2">Welcome Back</h2>
        <p className="text-center text-gray-500 mb-8">Sign in to your account</p>
        <form className="space-y-8" onSubmit={handleLogin}>
          <div className="relative">
            <Input
              label="Email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              isRequired
              isClearable
              fullWidth
              size="lg"
              radius="lg"
              variant="flat"
              labelPlacement="outside"
              description="We'll never share your email."
            />
          </div>
          <div className="relative">
            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              isRequired
              isClearable
              fullWidth
              size="lg"
              radius="lg"
              variant="flat"
              labelPlacement="outside"
              description="Use at least 8 characters."
            />
          </div>
          <Button type="submit" className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white text-lg font-bold shadow-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200">Login</Button>
        </form>
        <p className="text-center text-sm text-gray-600 mt-8">
          Don't have an account? <a href="/signup" className="text-purple-600 font-medium hover:underline">Sign up</a>
        </p>
      </Card>
    </div>
  );
};

export default Login;