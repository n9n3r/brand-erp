import type { Metadata } from 'next';
import { ResetForm } from './reset-form';

export const metadata: Metadata = { title: 'Choose a new password' };

export default function ResetPasswordPage({ params }: { params: { token: string } }) {
  return (
    <>
      <h1 className="text-xl font-bold text-slate-900">Choose a new password</h1>
      <p className="mb-6 mt-1 text-sm text-slate-500">
        After saving, you&apos;ll be signed out everywhere and can sign in with the new password.
      </p>
      <ResetForm token={params.token} />
    </>
  );
}
