import { signIn, useSession } from "next-auth/react";
import { Button } from "@/src/components/ui/button";
import { useEffect, useState } from "react";
import { z } from "zod";
import { usePostHogClientCapture } from "@/src/features/posthog-analytics/usePostHogClientCapture";
import { useLanguage } from "@/src/contexts/LanguageContext";

export function RequestResetPasswordEmailButton({
  email,
  className,
  variant = "default",
}: {
  email: string;
  className?: string;
  variant?: "default" | "secondary";
}) {
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidEmail, setIsValidEmail] = useState(false);
  const session = useSession();
  const capture = usePostHogClientCapture();
  const { t } = useLanguage()

  useEffect(() => {
    const isValidEmail = z.string().email().safeParse(email).success;
    setIsValidEmail(isValidEmail);
  }, [email]);

  const handleResetPassword = async () => {
    if (!isValidEmail) return;
    capture("auth:reset_password_email_requested");
    setIsLoading(true);
    try {
      await signIn("email", {
        email: email,
        callbackUrl: "/auth/reset-password",
        redirect: false,
      });
      setIsEmailSent(true);
    } catch (error) {
      console.error("Error sending reset password email:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleResetPassword}
      className={className}
      loading={isLoading}
      disabled={isEmailSent || !isValidEmail}
      variant={variant}
    >
      {isEmailSent
        ? session.status === "authenticated"
          ? t("buttons.Email sent Please check your inbox")
          : t("buttons.Email sent if account exists")
        : session.status === "authenticated"
          ? t("buttons.Verify email to change password")
          : t("buttons.Request password reset")}
    </Button>
  );
}
