import React, { useState } from 'react';
import { Button, Input, Card } from '@heroui/react';
import { useNavigate } from 'react-router-dom';

const Signup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    users.push({ name, email, password });
    localStorage.setItem('users', JSON.stringify(users));
    navigate('/');
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100">
      <Card className="w-full max-w-md p-10 shadow-2xl rounded-3xl border border-gray-200 bg-white/80 backdrop-blur-lg">
        <h2 className="text-4xl font-extrabold text-center text-gray-800 mb-2">Create Account</h2>
        <p className="text-center text-gray-500 mb-8">Sign up to get started</p>
        <form className="space-y-8" onSubmit={handleSignup}>
          <div className="relative">
            <Input
              label="Name"
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              isRequired
              isClearable
              fullWidth
              size="lg"
              radius="lg"
              variant="flat"
              labelPlacement="outside"
              description="Your full name."
            />
          </div>
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
          <Button type="submit" className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white text-lg font-bold shadow-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-200">Sign Up</Button>
        </form>
        <p className="text-center text-sm text-gray-600 mt-8">
          Already have an account? <a href="/" className="text-blue-600 font-medium hover:underline">Login</a>
        </p>
      </Card>
    </div>
  );
};

export default Signup;