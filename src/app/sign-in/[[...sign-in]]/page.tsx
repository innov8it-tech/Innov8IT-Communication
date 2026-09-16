import { SignIn } from '@clerk/nextjs';

export default function Page({ searchParams }: { searchParams: { redirect_url?: string } }) {
  const redirectUrl = searchParams.redirect_url || '/dashboard';

  return (
    <div className="w-svw h-svh bg-purple flex items-center justify-center">
      <SignIn forceRedirectUrl={redirectUrl} fallbackRedirectUrl={redirectUrl} />
    </div>
  );
}
