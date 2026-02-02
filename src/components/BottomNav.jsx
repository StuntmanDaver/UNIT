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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-2xl border-t border-gray-100 safe-area-pb shadow-lg shadow-gray-200/20">
      <div className="flex items-center max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.page);

          return (
            <Link
              key={item.name}
              to={item.url}
              className={`flex-1 flex flex-col items-center gap-1.5 py-2.5 mx-1 rounded-2xl transition-all duration-200 ${
                active 
                  ? 'text-emerald-600 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-sm' 
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50/50'
              }`}
            >
              <Icon className={`w-5 h-5 transition-all ${active ? 'stroke-[2.5px] scale-110' : 'stroke-[2px]'}`} />
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