// src/app/(app)/page.tsx
// This page is an alias for /dashboard for now.
// In a more complex app, you might have a different root page for the (app) group.
import { redirect } from 'next/navigation';

export default function AuthenticatedRootPage() {
  redirect('/dashboard');
}
