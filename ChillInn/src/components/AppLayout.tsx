import React from 'react';
import { Layout } from 'antd';
import Sidebar from './Sidebar';
import PageTransition from './PageTransition';
import { useSidebar } from './SidebarContext';

interface AppLayoutProps {
  children: React.ReactNode;
  userRole: 'admin' | 'guest';
  userName?: string;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, userRole, userName }) => {
  const { collapsed, isMobile } = useSidebar();

  return (
    <div className="flex min-h-screen">
      <Sidebar userRole={userRole} userName={userName} />
      
      <div 
        className="flex-1 transition-all duration-300"
        style={{ marginLeft: isMobile ? 0 : collapsed ? 0 : 280 }}
      >
        <PageTransition>
          {children}
        </PageTransition>
      </div>
    </div>
  );
};

export default AppLayout; 