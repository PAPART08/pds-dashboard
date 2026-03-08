import { redirect } from 'next/navigation';

export default function RootPage() {
  // Always redirect to login as the starting point
  redirect('/login');
}
