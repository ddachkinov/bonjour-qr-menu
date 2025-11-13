import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function WaiterLogin() {
  const router = useRouter();
  const { tenant_id, redirect } = router.query;

  const [name, setName] = useState('');
  const [pin, setPin] = useState(['', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);

  const pinRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => {
    // Check if already logged in
    const token = localStorage.getItem('waiter_token');
    if (token) {
      verifyAndRedirect(token);
    }
  }, []);

  const verifyAndRedirect = async (token: string) => {
    try {
      await axios.post(`${API_URL}/api/v1/waiters/verify`, { token });
      // Token is valid, redirect
      if (redirect) {
        router.push(redirect as string);
      } else {
        router.push('/waiter/my-orders');
      }
    } catch (error) {
      // Token invalid, clear it
      localStorage.removeItem('waiter_token');
      localStorage.removeItem('waiter_id');
      localStorage.removeItem('waiter_name');
    }
  };

  const handlePinChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) {
      return;
    }

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    // Auto-focus next input
    if (value && index < 3) {
      pinRefs[index + 1].current?.focus();
    }

    // Auto-submit when all 4 digits entered
    if (index === 3 && value && newPin.every((digit) => digit !== '')) {
      handleLogin(newPin.join(''));
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      // Move to previous input on backspace
      pinRefs[index - 1].current?.focus();
    }
  };

  const handleLogin = async (pinValue?: string) => {
    const pinToUse = pinValue || pin.join('');

    if (!name.trim()) {
      toast.error('Please enter your name');
      return;
    }

    if (pinToUse.length !== 4) {
      toast.error('Please enter your 4-digit PIN');
      return;
    }

    if (!tenant_id) {
      toast.error('Missing restaurant information');
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/v1/waiters/login`, {
        tenant_id,
        name: name.trim(),
        pin: pinToUse,
      });

      const { waiter, token } = response.data;

      // Store waiter info and token
      localStorage.setItem('waiter_token', token);
      localStorage.setItem('waiter_id', waiter.id);
      localStorage.setItem('waiter_name', waiter.name);

      toast.success(`Welcome, ${waiter.name}!`);

      // Redirect to appropriate page
      if (redirect) {
        router.push(redirect as string);
      } else {
        router.push('/waiter/my-orders');
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Invalid name or PIN';
      toast.error(errorMsg);
      // Clear PIN on error
      setPin(['', '', '', '']);
      pinRefs[0].current?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-indigo-100 rounded-full mb-4">
            <svg
              className="w-12 h-12 text-indigo-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Waiter Login</h1>
          <p className="text-gray-600">Enter your name and PIN to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Your Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg"
              autoFocus
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">4-Digit PIN</label>
            <div className="flex justify-center gap-3">
              {pin.map((digit, index) => (
                <input
                  key={index}
                  ref={pinRefs[index]}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePinChange(index, e.target.value)}
                  onKeyDown={(e) => handlePinKeyDown(index, e)}
                  className="w-14 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={isLoading}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !name.trim() || pin.some((d) => d === '')}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-bold py-4 rounded-lg text-lg transition-colors"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-center text-sm text-gray-600">
            First time? Contact your manager to get your PIN.
          </p>
        </div>
      </div>
    </div>
  );
}
