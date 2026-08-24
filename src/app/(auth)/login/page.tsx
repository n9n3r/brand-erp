import type { Metadata } from 'next';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Log in' };

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  const initialError =
    searchParams.error === 'disabled'
      ? 'Your account or brand has been deactivated. Contact your administrator.'
      : undefined;
  return <LoginForm next={searchParams.next} initialError={initialError} />;
}
