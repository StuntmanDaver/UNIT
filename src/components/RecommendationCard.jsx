import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from 'framer-motion';
import { AlertCircle, Wrench, Lightbulb, MapPin, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function RecommendationCard({ recommendation, business }) {
  const getTypeConfig = (type) => {
    const configs = {
      enhancement: {
        icon: Lightbulb,
        color: 'from-blue-500 to-blue-600',
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        label: 'Enhancement'
      },
      issue: {
        icon: AlertCircle,
        color: 'from-orange-500 to-red-600',
        bg: 'bg-orange-50',
        text: 'text-orange-700',
        label: 'Issue'
      },
      work_order: {
        icon: Wrench,
        color: 'from-purple-500 to-purple-600',
        bg: 'bg-purple-50',
        text: 'text-purple-700',
        label: 'Work Order'
      }
    };
    return configs[type] || configs.issue;
  };

  const getStatusBadge = (status) => {
    const styles = {
      submitted: 'bg-gray-100 text-gray-700',
      in_progress: 'bg-blue-100 text-blue-700',
      resolved: 'bg-green-100 text-green-700',
      closed: 'bg-gray-200 text-gray-600'
    };
    return styles[status] || styles.submitted;
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      low: 'bg-slate-100 text-slate-600',
      medium: 'bg-yellow-100 text-yellow-700',
      high: 'bg-red-100 text-red-700'
    };
    return styles[priority] || styles.medium;
  };

  const typeConfig = getTypeConfig(recommendation.type);
  const Icon = typeConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="overflow-hidden bg-white hover:shadow-lg transition-all">
        <div className={`h-2 bg-gradient-to-r ${typeConfig.color}`} />
        
        <div className="p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className={`w-10 h-10 rounded-xl ${typeConfig.bg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-5 h-5 ${typeConfig.text}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-gray-900 text-lg">{recommendation.title}</h3>
                <Badge className={getStatusBadge(recommendation.status)}>
                  {recommendation.status.replace('_', ' ')}
                </Badge>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge variant="outline" className={typeConfig.text}>
                  {typeConfig.label}
                </Badge>
                <Badge className={getPriorityBadge(recommendation.priority)}>
                  {recommendation.priority} priority
                </Badge>
                <Badge variant="outline">
                  {recommendation.category}
                </Badge>
              </div>
            </div>
          </div>

          <p className="text-gray-600 text-sm mb-4 line-clamp-3">
            {recommendation.description}
          </p>

          {recommendation.location && (
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
              <MapPin className="w-4 h-4" />
              <span>{recommendation.location}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              {business?.logo_url ? (
                <img src={business.logo_url} alt="" className="w-6 h-6 rounded-full" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                  <span className="text-xs font-medium text-emerald-600">
                    {business?.business_name?.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <span className="text-sm text-gray-600">{business?.business_name}</span>
            </div>
            
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Calendar className="w-3.5 h-3.5" />
              {format(new Date(recommendation.created_date), 'MMM d')}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}