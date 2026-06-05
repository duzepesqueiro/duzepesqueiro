import React, { useState } from 'react';
import Header from '../../../components/ui/Header';
import HostingSidebarMenu from './HostingSidebarMenu';
import Button from '../../../components/ui/Button';
import AlertNotificationCenter from '../../../components/ui/AlertNotificationCenter';

const HostingLayout = ({ title, subtitle, actions, children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-16">
        <HostingSidebarMenu isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <main className={`px-8 py-6 transition-all duration-300 ${isSidebarOpen ? 'lg:pl-80' : 'lg:pl-8'}`}>
          <div className="flex flex-col gap-6">
            <section className="flex-1 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mb-3"
                    iconName={isSidebarOpen ? 'PanelLeftClose' : 'PanelLeftOpen'}
                    onClick={() => setIsSidebarOpen((prev) => !prev)}
                  >
                    Menu lateral
                  </Button>
                  <h1 className="text-3xl font-heading font-bold text-foreground">{title}</h1>
                  {subtitle ? <p className="text-muted-foreground mt-1">{subtitle}</p> : null}
                </div>
                <div className="flex items-center gap-2">
                  <AlertNotificationCenter />
                  {actions}
                </div>
              </div>
              {children}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default HostingLayout;
