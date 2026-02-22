import { OfflineIndicator } from '../OfflineIndicator';

export function Header() {
  return (
    <header className="sticky top-0 z-10 bg-primary-600 text-white shadow-md">
      <div className="flex items-center justify-between h-14 px-4">
        <h1 className="text-xl font-bold tracking-tight">SusuPay</h1>
      </div>
      <OfflineIndicator />
    </header>
  );
}
