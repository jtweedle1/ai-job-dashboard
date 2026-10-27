// The small confirmation pill at the bottom of the screen.
export default function Toast({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg shadow-gray-900/20">
      <i className="ti ti-circle-check text-primary-300 text-base" aria-hidden="true" />
      {message}
    </div>
  );
}
