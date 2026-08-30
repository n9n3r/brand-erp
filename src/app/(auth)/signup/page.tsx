import type { Metadata } from 'next';
import { SignupForm } from './signup-form';

export const metadata: Metadata = { title: 'Create your workspace' };

export default function SignupPage() {
  return (
    <>
      <h1 className="text-xl font-bold text-slate-900">Create your workspace</h1>
      <p className="mb-6 mt-1 text-sm text-slate-500">
        One minute to set up — your brand is created for you.
      </p>
      <SignupForm />
    </>
  );
}
