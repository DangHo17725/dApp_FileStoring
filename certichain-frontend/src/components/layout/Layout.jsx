import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function Layout({ children }) {
  return (
    <div className="min-h-screen bg-dark-950">
      <Sidebar />
      <div className="lg:ml-64">
        <Topbar />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
