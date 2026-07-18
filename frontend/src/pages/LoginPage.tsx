import { useAuthStore } from '@/features/auth/stores/authStore';
import { WelcomePage } from './WelcomePage';
import { SignUpPage } from './SignUpPage';
import { AccountCreatedPage } from './AccountCreatedPage';

export function LoginPage() {
  const { phase } = useAuthStore();

  switch (phase) {
    case 'sign_up':
      return <SignUpPage onBack={() => useAuthStore.getState().setPhase('welcome')} />;
    case 'account_created':
      return <AccountCreatedPage />;
    default:
      return <WelcomePage />;
  }
}
