import { Outlet } from 'react-router-dom';
import StoreHeader from './StoreHeader';
import './StoreLayout.css';

export default function StoreLayout() {
  return (
    <div className="store-layout">
      <StoreHeader />
      <main className="store-layout__main">
        <Outlet />
      </main>
    </div>
  );
}
