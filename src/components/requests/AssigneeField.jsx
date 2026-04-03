import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, Loader2 } from 'lucide-react';

export default function AssigneeField({ assignedTo, onAssign, isLoading }) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(assignedTo || '');

  const handleAssign = () => {
    onAssign(value);
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2">
        {assignedTo ? (
          <span className="text-sm text-zinc-300">{assignedTo}</span>
        ) : (
          <span className="text-sm text-zinc-500">Unassigned</span>
        )}
        <button
          onClick={() => setIsEditing(true)}
          className="text-zinc-500 hover:text-white transition-colors"
          aria-label="Edit assignee"
        >
          <Pencil size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        size="sm"
        placeholder="Name or email"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={isLoading}
        className="h-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-zinc-500"
      />
      <Button
        size="sm"
        onClick={handleAssign}
        disabled={isLoading}
        className="bg-gradient-to-r from-brand-slate to-brand-navy text-white h-8"
      >
        {isLoading ? <Loader2 size={14} className="animate-spin" /> : 'Assign'}
      </Button>
    </div>
  );
}
