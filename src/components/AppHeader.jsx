// src/components/AppHeader.jsx
"use client";

import React, { useState } from 'react';
import { Menu, LogOut, UserCircle, X, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Login Modal Component
const LoginModal = ({ isOpen, onClose, onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const SHEET_URL = "https://script.google.com/macros/s/AKfycbx3_COAFa1T6tCTjJT8Ip0ep7Qy83wA7ZpJteErgfzZ-gQG0Zf8Yxw6iTspQ5oGy6Q/exec";

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Fetch data from Google Sheets
      const response = await fetch(`${SHEET_URL}?sheet=Login`);

      if (!response.ok) {
        throw new Error('Failed to fetch login data');
      }

      const data = await response.json();

      // Find matching user credentials
      const user = data.find(row =>
        row['User Name'] === username && row['Password'] === password
      );

      if (user) {
        // Successful login
        onLogin({ username: user['User Name'] });
        onClose();
        setUsername('');
        setPassword('');
      } else {
        setError('Invalid username or password');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setUsername('');
    setPassword('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Login</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </Button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </Button>
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm mt-2 p-2 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors"
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default function AppHeader({ toggleDesktopSidebar, isSidebarOpen, setIsMobileSidebarOpen }) {
  const { user, logout, login } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleLogout = () => {
    logout();
    setShowLoginModal(true);
  };

  const handleLogin = (userData) => {
    login(userData);
    setShowLoginModal(false);
  };

  return (
    <>
      <header className="bg-white shadow-sm p-3 sm:p-4 flex items-center justify-between sticky top-0 z-40 h-16 flex-shrink-0 border-b border-gray-200">
        {/* Left side: Sidebar Toggle (Desktop & Mobile) */}
        <div className="flex items-center">
          {/* Desktop Sidebar Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDesktopSidebar}
            aria-label={isSidebarOpen ? "Close desktop sidebar" : "Open desktop sidebar"}
            className="text-gray-600 hover:bg-blue-50 hover:text-blue-700 rounded-lg hidden md:inline-flex"
          >
            <Menu size={24} />
          </Button>

          {/* Mobile Sidebar Trigger (Hamburger Icon) */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileSidebarOpen(true)}
            aria-label="Open mobile sidebar"
            className="text-gray-600 hover:bg-blue-50 hover:text-blue-700 rounded-lg md:hidden mr-4"
          >
            <Menu size={24} />
          </Button>

          <h1 className="text-xl font-bold text-gray-800 ml-0 md:ml-4">Purchase Management</h1>
        </div>

        {/* Right side: User Info with Logout Icon */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <UserCircle size={24} className="text-blue-600" />
            <div className="text-left hidden md:block">
              <p className="text-xs text-gray-500">Logged in as</p>
              <p className="text-sm font-medium text-blue-700">{user?.username || "User"}</p>
            </div>
            {/* Mobile user info */}
            <div className="text-left md:hidden">
              <p className="text-sm font-medium text-blue-700">{user?.username || "User"}</p>
            </div>
          </div>

          {/* Logout Icon Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg"
            aria-label="Logout"
          >
            <LogOut size={20} />
          </Button>
        </div>
      </header>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={handleLogin}
      />
    </>
  );
}