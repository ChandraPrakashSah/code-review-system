import React, { useState } from 'react';
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
      <div className="w-full max-w-md p-10 shadow-2xl rounded-3xl border border-gray-200 bg-white backdrop-blur-lg">
        <h2 className="text-4xl font-extrabold text-center text-gray-800 mb-2">Create Account</h2>
        <p className="text-center text-gray-500 mb-8">Sign up to get started</p>
        <form className="space-y-6" onSubmit={handleSignup}>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700" htmlFor="name">Name</label>
            <input
              id="name"
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 text-base focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition"
            />
            <span className="text-xs text-gray-400">Your full name.</span>
          </div>
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
          <button type="submit" className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white text-lg font-bold shadow-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-200">Sign Up</button>
        </form>
        <p className="text-center text-sm text-gray-600 mt-8">
          Already have an account? <a href="/" className="text-blue-600 font-medium hover:underline">Login</a>
        </p>
      </div>
    </div>
  );
};

export default Signup;