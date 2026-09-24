import { AuthLayout } from "../components/AuthLayout";
import { SignupForm } from "../components/SignupForm";

export function SignupPage() {
  return (
    <AuthLayout title="Start your journey" subtitle="Create a free account to plan your first trip.">
      <SignupForm />
    </AuthLayout>
  );
}
