'use client';
import React, { useState } from 'react';
import type { User } from '@/types/user';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Building2, User as UserIcon, LogIn, X, Eye, EyeOff } from 'lucide-react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import { auth, googleProvider, db } from '@/lib/firebaseClient';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ensureUserProfile } from '@/lib/userProfile';

const philviewLogo = '/philview-logo.png';

interface AuthPageProps {
  onLogin: (user: User) => void;
  onClose?: () => void;
}

type AuthMode = 'signin' | 'signup';

export function AuthPage({ onLogin, onClose }: AuthPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleInitial, setMiddleInitial] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<AuthMode>('signin');

  const inferRoleFromEmail = (addr: string): User['role'] => {
    const lower = addr.toLowerCase();
    if (lower.includes('owner')) return 'owner';
    if (lower.includes('director')) return 'director';
    if (lower.includes('accountant')) return 'accountant';
    if (lower.includes('marketing')) return 'marketing';
    if (lower.includes('broker')) return 'broker';
    return 'client';
  };

  const getNameForRole = (role: User['role']) => {
    switch (role) {
      case 'owner':
        return 'Company Owner';
      case 'director':
        return 'Director Admin';
      case 'client':
        return 'Maria Santos';
      case 'broker':
        return 'John Broker';
      case 'accountant':
        return 'Jane Accountant';
      case 'marketing':
        return 'Marketing Coordinator';
      default:
        return 'User';
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedEmail = email.trim();
    const pwd = password.trim();
    const confirm = confirmPassword.trim();

    if (!trimmedEmail || !pwd) {
      alert('Please fill in all fields');
      return;
    }
    if (mode === 'signup') {
      if (!firstName || !lastName) {
        alert('Please provide your first and last name.');
        return;
      }
      if (!confirm) {
        setAuthError('Please confirm your password.');
        return;
      }
      if (pwd !== confirm) {
        setAuthError('Passwords do not match.');
        return;
      }
    }

    setIsLoading(true);
    setAuthError(null);

    try {
      const role = inferRoleFromEmail(trimmedEmail);
      const creds =
        mode === 'signup'
          ? await createUserWithEmailAndPassword(auth, trimmedEmail, pwd).catch(async (err) => {
            // If the account already exists, fall back to sign-in.
            if (typeof err === 'object' && err && 'code' in err && (err as { code?: string }).code === 'auth/email-already-in-use') {
              return signInWithEmailAndPassword(auth, trimmedEmail, pwd);
            }
            throw err;
          })
          : await signInWithEmailAndPassword(auth, trimmedEmail, pwd);

      const nameFromForm =
        firstName && lastName
          ? `${firstName} ${middleInitial ? `${middleInitial}. ` : ''}${lastName}`
          : '';
      const displayName = creds.user.displayName || nameFromForm || email.split('@')[0];
      const userId = creds.user.uid;

      // Ensure profile exists and block archived accounts.
      const userRef = doc(db, 'users', userId);
      const snap = await getDoc(userRef);
      if (snap.exists() && (snap.data() as { archived?: boolean }).archived) {
        setAuthError('This account is archived and cannot sign in.');
        await auth.signOut();
        setIsLoading(false);
        return;
      }
      if (!snap.exists()) {
        await setDoc(userRef, { balance: 0, transactions: [], role, name: displayName, email: trimmedEmail, archived: false });
      } else {
        // Merge role/name/email for consistency.
        await setDoc(userRef, { role, name: displayName, email: trimmedEmail }, { merge: true });
      }
      await ensureUserProfile(userId);

      const user: User = {
        id: userId,
        name: displayName,
        email: creds.user.email || trimmedEmail,
        role,
      };
      onLogin(user);
      onClose?.();
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as Error).message)
          : 'Authentication failed.';
      setAuthError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const role = inferRoleFromEmail(email || (auth.currentUser?.email ?? ''));
      const creds = await signInWithPopup(auth, googleProvider);
      const user: User = {
        id: creds.user.uid,
        name: creds.user.displayName || getNameForRole(role),
        email: creds.user.email || email || '',
        role,
      };
      onLogin(user);
      onClose?.();
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as Error).message)
          : 'Google sign-in failed.';
      setAuthError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = (demoRole: User['role']) => {
    const user: User = {
      id: 'demo',
      name: getNameForRole(demoRole),
      email: `demo@philstar.com`,
      role: demoRole,
    };
    onLogin(user);
    onClose?.();
  };

  return (
    <div className="bg-background">
      <Card className="shadow-2xl border border-slate-200 rounded-2xl overflow-hidden">
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div className="flex items-center space-x-3">
            <img
              src={philviewLogo}
              alt="Philstar Marketing Development Inc."
              className="h-12 w-12 object-contain"
            />
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Philview</p>
              <CardTitle className="text-xl">Welcome back</CardTitle>
              <p className="text-sm text-muted-foreground">Sign in to continue</p>
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex rounded-lg border bg-slate-50 p-1 text-sm font-medium">
            <button
              type="button"
              className={`flex-1 rounded-md px-3 py-2 transition ${
                mode === 'signin' ? 'bg-white shadow-sm text-[#1B2C48]' : 'text-slate-500'
              }`}
              onClick={() => {
                setMode('signin');
                setAuthError(null);
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              className={`flex-1 rounded-md px-3 py-2 transition ${
                mode === 'signup' ? 'bg-white shadow-sm text-[#1B2C48]' : 'text-slate-500'
              }`}
              onClick={() => {
                setMode('signup');
                setAuthError(null);
              }}
            >
              Create account
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            {mode === 'signup' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2 sm:col-span-1">
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Juan"
                  />
                </div>
                <div className="space-y-2 sm:col-span-1">
                  <Label htmlFor="middleInitial">M.I. (optional)</Label>
                  <Input
                    id="middleInitial"
                    value={middleInitial}
                    maxLength={2}
                    onChange={(e) => setMiddleInitial(e.target.value)}
                    placeholder="D"
                  />
                </div>
                <div className="space-y-2 sm:col-span-1">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Cruz"
                  />
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-2 flex items-center text-muted-foreground"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {mode === 'signup' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-2 flex items-center text-muted-foreground"
                      onClick={() => setShowPassword((prev) => !prev)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            <Button type="submit" className="w-full bg-[#2E5D9F] hover:bg-[#1B2C48]" disabled={isLoading}>
              {isLoading
                ? mode === 'signin'
                  ? 'Signing in...'
                  : 'Creating account...'
                : mode === 'signin'
                  ? 'Sign In'
                  : 'Create Account'}
            </Button>
          </form>

          <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            <span>or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            <LogIn className="h-4 w-4 mr-2" />
            Continue with Google
          </Button>

          {authError && <p className="text-sm text-red-600">{authError}</p>}

          <div className="rounded-lg border bg-slate-50 p-4">
            <p className="text-sm font-semibold mb-3 text-[#1B2C48]">Try the demo</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                onClick={() => handleDemoLogin('owner')}
              >
                <Building2 className="h-4 w-4 mr-2" />
                Owner
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleDemoLogin('director')}
              >
                <UserIcon className="h-4 w-4 mr-2" />
                Director
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleDemoLogin('broker')}
              >
                <UserIcon className="h-4 w-4 mr-2" />
                Broker
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleDemoLogin('accountant')}
              >
                <UserIcon className="h-4 w-4 mr-2" />
                Accountant
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleDemoLogin('marketing')}
              >
                <UserIcon className="h-4 w-4 mr-2" />
                Marketing
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleDemoLogin('client')}
              >
                <UserIcon className="h-4 w-4 mr-2" />
                Customer
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
