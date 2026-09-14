'use client';

import { useEffect, useState } from 'react';
import Modal from './Modal';

type Activity = { id: string; type: string; message: string; createdAt: string };

export default function ActivityModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    if (!open) return;
    fetch('/api/workspaces/current/activity')
      .then((response) => response.json())
      .then((result) => setActivities(result.activities || []))
      .catch((error) => console.error('Unable to load activity:', error));
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="Activity">
      <div className="max-h-[60vh] overflow-y-auto">
        {activities.length === 0 ? <p className="py-8 text-center text-sm text-[#a6a8bd]">No activity yet.</p> : <div className="space-y-3">{activities.map((activity) => <div key={activity.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3"><p className="text-sm text-white">{activity.message}</p><p className="mt-1 text-xs text-[#a6a8bd]">{new Date(activity.createdAt).toLocaleString()}</p></div>)}</div>}
      </div>
    </Modal>
  );
}
