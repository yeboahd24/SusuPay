import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { BottomNav, type NavItem } from './BottomNav';

interface AppShellProps {
  navItems: NavItem[];
}

export function AppShell({ navItems }: AppShellProps) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      <BottomNav items={navItems} />
    </div>
  );
}
