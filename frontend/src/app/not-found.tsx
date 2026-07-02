import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex h-full min-h-[400px] flex-col items-center justify-center p-8 text-center bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 m-4">
      <h2 className="text-2xl font-bold mb-4">Page Not Found</h2>
      <p className="text-gray-500 mb-8">
        Could not find the requested resource.
      </p>
      <Link href="/">
        <span className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
          Return Home
        </span>
      </Link>
    </div>
  );
}
