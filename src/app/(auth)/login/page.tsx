import type { Metadata } from 'next';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Sign in' };

type SearchParams = {
  next?: string;
  verified?: string;
  verifyFailed?: string;
  error?: string;
};

export default function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  let info: string | null = null;
  if (searchParams.verified === '1') {
    info = 'Email verified — you can now sign in.';
  } else if (searchParams.verifyFailed === '1') {
    info = 'That verification link is invalid or has expired. You can resend it from your account.';
  } else if (searchParams.error === 'expired') {
    info = 'Your session expired (password changed or account disabled). Please sign in again.';
  }

  return (
    <>
      <h1 className="text-xl font-bold text-slate-900">Welcome back</h1>
      <p className="mb-6 mt-1 text-sm text-slate-500">Sign in to your workspace.</p>
      <LoginForm next={searchParams.next} initialInfo={info} />
    </>
  );
}
