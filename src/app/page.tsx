'use client';

import dynamic from 'next/dynamic';

const Dashboard = dynamic(() => import('./components/Dashboard'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-lg text-gray-600">Loading...</p>
      </div>
    </div>
  ),
});

export default function Home() {
  return <Dashboard />;
}
