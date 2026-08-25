import type { Metadata } from 'next';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Log in' };

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string; verified?: string; verifyFailed?: string };
}) {
  const initialError =
    searchParams.error === 'disabled'
      ? 'Your account or brand has been deactivated. Contact your administrator.'
      : searchParams.error === 'expired'
        ? 'Session expired after a password change — please log in again.'
        : searchParams.verifyFailed === '1'
          ? 'That verification link is invalid or has expired. Request a new one from the app banner.'
          : undefined;
  const initialInfo =
    searchParams.verified === '1' ? 'Email verified successfully — you can log in now.' : undefined;
  return <LoginForm next={searchParams.next} initialError={initialError} initialInfo={initialInfo} />;
}
