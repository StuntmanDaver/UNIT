import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Megaphone, Calendar, Tag, HelpCircle, Loader2 } from "lucide-react";

export default function CreatePostModal({ isOpen, onClose, onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    type: 'announcement',
    title: '',
    content: '',
    event_date: '',
    event_time: '',
    expiry_date: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const postTypes = [
    { value: 'announcement', icon: Megaphone, label: 'Announcement' },
    { value: 'event', icon: Calendar, label: 'Event' },
    { value: 'offer', icon: Tag, label: 'Offer' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Create Post</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-3 block">Post Type</Label>
            <Tabs value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
              <TabsList className="grid grid-cols-3 bg-gray-100 p-1 rounded-xl">
                {postTypes.map(({ value, icon: Icon, label }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-1.5 text-xs"
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div>
            <Label htmlFor="title" className="text-sm font-medium text-gray-700">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter a catchy title..."
              className="mt-1.5 rounded-xl"
              required
            />
          </div>

          <div>
            <Label htmlFor="content" className="text-sm font-medium text-gray-700">Content</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Share the details..."
              className="mt-1.5 rounded-xl min-h-[120px]"
              required
            />
          </div>

          {formData.type === 'event' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="event_date" className="text-sm font-medium text-gray-700">Event Date</Label>
                <Input
                  id="event_date"
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                  className="mt-1.5 rounded-xl"
                />
              </div>
              <div>
                <Label htmlFor="event_time" className="text-sm font-medium text-gray-700">Event Time</Label>
                <Input
                  id="event_time"
                  type="time"
                  value={formData.event_time}
                  onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                  className="mt-1.5 rounded-xl"
                />
              </div>
            </div>
          )}

          {formData.type === 'offer' && (
            <div>
              <Label htmlFor="expiry_date" className="text-sm font-medium text-gray-700">Valid Until</Label>
              <Input
                id="expiry_date"
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                className="mt-1.5 rounded-xl"
              />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 rounded-xl"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 rounded-xl bg-gradient-to-r from-brand-slate to-brand-navy hover:from-brand-slate-light hover:to-brand-navy-light text-white"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Posting...
                </>
              ) : (
                'Create Post'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}