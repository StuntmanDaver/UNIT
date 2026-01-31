import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, Users, MessageSquare, CreditCard } from 'lucide-react';

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
      name: 'My Card', 
      page: 'MyCard', 
      icon: CreditCard,
      url: createPageUrl('MyCard')
    }
  ];

  const isActive = (page) => {
    return currentPath.toLowerCase().includes(page.toLowerCase());
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-gray-200 safe-area-pb">
      <div className="flex items-center justify-around py-2 px-2 max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.page);
          
          return (
            <Link
              key={item.name}
              to={item.url}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
                active 
                  ? 'text-indigo-600 bg-indigo-50' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5px]' : ''}`} />
              <span className={`text-xs ${active ? 'font-semibold' : 'font-medium'}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}