/**
 * Main app screen (home/dashboard).
 * This is the primary landing page when the PWA is opened from the home screen.
 */
export function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 text-neutral-50">
      <h1 className="text-4xl font-bold text-purple-400">LIFEY</h1>
      <p className="mt-2 text-neutral-400">Your life together, simplified.</p>
    </div>
  );
}
