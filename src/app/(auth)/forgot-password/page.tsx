import type { Metadata } from 'next';
import { ForgotPasswordForm } from './forgot-form';

export const metadata: Metadata = { title: 'Reset password' };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-xl font-bold text-slate-900">Forgot your password?</h1>
      <p className="mb-6 mt-1 text-sm text-slate-500">
        Enter your email and we&apos;ll send you a reset link.
      </p>
      <ForgotPasswordForm />
    </>
  );
}
