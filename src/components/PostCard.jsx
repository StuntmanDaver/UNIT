import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Calendar, Tag, HelpCircle, Clock, Building2 } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";

export default function PostCard({ post, business }) {
  const getTypeConfig = (type) => {
    const configs = {
      announcement: {
        icon: Megaphone,
        color: 'bg-blue-100 text-blue-700',
        gradient: 'from-blue-500 to-cyan-500'
      },
      event: {
        icon: Calendar,
        color: 'bg-purple-100 text-purple-700',
        gradient: 'from-purple-500 to-pink-500'
      },
      offer: {
        icon: Tag,
        color: 'bg-green-100 text-green-700',
        gradient: 'from-green-500 to-emerald-500'
      },
      request: {
        icon: HelpCircle,
        color: 'bg-orange-100 text-orange-700',
        gradient: 'from-orange-500 to-amber-500'
      }
    };
    return configs[type] || configs.announcement;
  };

  const typeConfig = getTypeConfig(post.type);
  const Icon = typeConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="overflow-hidden bg-white/80 backdrop-blur-sm border-gray-100 hover:shadow-lg hover:shadow-gray-100/50 transition-all">
        <div className={`h-1 bg-gradient-to-r ${typeConfig.gradient}`} />
        
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${typeConfig.gradient} flex items-center justify-center`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <Badge className={`${typeConfig.color} border-0 text-xs font-medium`}>
                  {post.type.charAt(0).toUpperCase() + post.type.slice(1)}
                </Badge>
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                  <Clock className="w-3 h-3" />
                  {format(new Date(post.created_date), 'MMM d, yyyy')}
                </div>
              </div>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mt-4">{post.title}</h3>
          <p className="text-gray-600 mt-2 line-clamp-3">{post.content}</p>

          {post.type === 'event' && post.event_date && (
            <div className="mt-4 p-3 bg-purple-50 rounded-xl flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">
                {format(new Date(post.event_date), 'EEEE, MMMM d, yyyy')}
                {post.event_time && ` at ${post.event_time}`}
              </span>
            </div>
          )}

          {post.type === 'offer' && post.expiry_date && (
            <div className="mt-4 p-3 bg-green-50 rounded-xl flex items-center gap-2">
              <Tag className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">
                Valid until {format(new Date(post.expiry_date), 'MMMM d, yyyy')}
              </span>
            </div>
          )}

          {post.image_url && (
            <div className="mt-4 rounded-xl overflow-hidden">
              <img src={post.image_url} alt="" className="w-full h-48 object-cover" />
            </div>
          )}

          {business && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                {business.logo_url ? (
                  <img src={business.logo_url} alt="" className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <span className="text-xs font-bold text-white">
                    {business.business_name?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{business.business_name}</p>
                <p className="text-xs text-gray-500">Unit {business.unit_number}</p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}