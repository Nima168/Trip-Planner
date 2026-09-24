import { AuthLayout } from "../components/AuthLayout";
import { LoginForm } from "../components/LoginForm";

export function LoginPage() {
  return (
    <AuthLayout title="Welcome back" subtitle="Log in to see your trips and keep planning.">
      <LoginForm />
    </AuthLayout>
  );
}
