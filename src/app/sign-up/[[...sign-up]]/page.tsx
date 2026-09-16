import { SignUp } from '@clerk/nextjs';

export default function Page({ searchParams }: { searchParams: { redirect_url?: string } }) {
  const redirectUrl = searchParams.redirect_url || '/dashboard';

  return (
    <div className="sm:w-svw sm:h-svh bg-purple w-full h-full flex items-center justify-center">
      <SignUp forceRedirectUrl={redirectUrl} fallbackRedirectUrl={redirectUrl} />
    </div>
  );
}
