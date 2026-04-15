import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import FormField from '../components/FormField';
import { hashPassword } from '../utils/crypto';
import type { StoredUser } from '../types';

const Signup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    const users: StoredUser[] = JSON.parse(localStorage.getItem('users') || '[]');
    if (users.some((u: StoredUser) => u.email === email)) {
      setError('An account with that email already exists.');
      return;
    }
    const hashedPassword = await hashPassword(password);
    users.push({ name, email, password: hashedPassword });
    localStorage.setItem('users', JSON.stringify(users));
    navigate('/');
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100">
      <div className="w-full max-w-md p-10 shadow-2xl rounded-3xl border border-gray-200 bg-white backdrop-blur-lg">
        <h2 className="text-4xl font-extrabold text-center text-gray-800 mb-2">Create Account</h2>
        <p className="text-center text-gray-500 mb-8">Sign up to get started</p>
        <form className="space-y-6" onSubmit={handleSignup}>
          <FormField
            id="name"
            label="Name"
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={setName}
            hint="Your full name."
          />
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
          <button type="submit" className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white text-lg font-bold shadow-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-200">Sign Up</button>
        </form>
        <p className="text-center text-sm text-gray-600 mt-8">
          Already have an account? <Link to="/" className="text-blue-600 font-medium hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
