import { Box } from "@mantine/core";

import { useAuth } from "@/auth/AuthContext";
import { signInFailure } from "@/auth/signInFailure";
import type { FormSubmitResult } from "@/components/form/Form";
import { SignInForm, type SignInFormData } from "@/components/sign-in";

/**
 * The sign-in page, at `/sign-in`. Outside the main layout: there is
 * nothing to navigate to before signing in. Once signed in, `GuestOnly`
 * sends the person on to the page they first asked for, or home.
 */
export default function SignInPage() {
  const { signIn } = useAuth();

  async function handleSubmit(data: SignInFormData): Promise<FormSubmitResult> {
    try {
      await signIn(data.username, data.password);
    } catch (error) {
      return { state: "error", message: { title: signInFailure(error) } };
    }

    return { state: "success", message: { title: "Signed in" } };
  }

  return (
    <Box component="main" px="md" py="xl">
      <SignInForm onSubmit={handleSubmit} />
    </Box>
  );
}
