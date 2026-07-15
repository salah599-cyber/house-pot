import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md items-center justify-center px-4 py-8 sm:py-12">
      <SignIn
        routing="path"
        path="/sign-in"
        forceRedirectUrl="/onboarding"
        signUpUrl="/sign-up"
      />
    </div>
  );
}
