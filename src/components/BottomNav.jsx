import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, Users, MessageSquare, CreditCard, ClipboardList } from 'lucide-react';

export default function BottomNav({ propertyId }) {
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    { 
      name: 'Home', 
      page: 'Welcome', 
      icon: Home,
      url: createPageUrl('Welcome')
    },
    { 
      name: 'Directory', 
      page: 'Directory', 
      icon: Users,
      url: createPageUrl('Directory') + (propertyId ? `?propertyId=${propertyId}` : '')
    },
    { 
      name: 'Community', 
      page: 'Community', 
      icon: MessageSquare,
      url: createPageUrl('Community') + (propertyId ? `?propertyId=${propertyId}` : '')
    },
    { 
      name: 'Requests', 
      page: 'Recommendations', 
      icon: ClipboardList,
      url: createPageUrl('Recommendations') + (propertyId ? `?propertyId=${propertyId}` : '')
    },
    { 
      name: 'My Profile', 
      page: 'MyCard', 
      icon: CreditCard,
      url: createPageUrl('MyCard')
    }
  ];

  const isActive = (page) => {
    return currentPath.toLowerCase().includes(page.toLowerCase());
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900/60 backdrop-blur-2xl border-t border-white/5 safe-area-pb">
      <div className="flex items-center max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.page);

          return (
            <Link
              key={item.name}
              to={item.url}
              className={`flex-1 flex flex-col items-center gap-1.5 py-3 mx-1 rounded-2xl transition-all duration-300 ${
                active 
                  ? 'text-white' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <div className={`relative ${active ? 'scale-110' : ''} transition-transform`}>
                <Icon className="w-5 h-5" />
                {active && (
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full blur-lg opacity-50" />
                )}
              </div>
              <span className={`text-[10px] transition-all ${active ? 'font-bold' : 'font-medium'}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}