import { SignIn } from '@clerk/nextjs';

export default function Page(): JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-6">
      <SignIn />
    </div>
  );
}
