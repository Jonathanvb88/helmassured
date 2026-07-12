'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';

interface Task {
  task_id: string;
  title: string;
  description: string | null;
  entity_type: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  assigned_to_name: string | null;
  is_overdue: boolean;
}

interface User { user_id: string; name: string; }

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-800',
  medium: 'bg-amber-100 text-amber-800',
  low: 'bg-slate-100 text-slate-600',
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [title, setTitle] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [msg, setMsg] = useState('');

  function load() {
    fetch('/api/tasks').then((r) => r.json()).then((d) => setTasks(d.tasks || []));
  }

  useEffect(() => {
    load();
    fetch('/api/users').then((r) => r.json()).then((d) => {
      setUsers(d.users || []);
      if (d.users?.length) setAssignedTo(d.users[0].user_id);
    });
  }, []);

  async function createTask() {
    if (!title.trim()) return;
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, assigned_to: assignedTo, priority, due_date: dueDate || null, entity_type: 'general' }),
    });
    const data = await res.json();
    if (data.error) setMsg(`Error: ${data.error}`);
    else {
      setTitle('');
      setDueDate('');
      setMsg('Task created.');
      load();
    }
  }

  async function complete(taskId: string) {
    await fetch(`/api/tasks/${taskId}/complete`, { method: 'POST' });
    load();
  }

  return (
    <main className="p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <PageHeader section="Tasks" title="Work Management" subtitle="General task assignment across the team, overdue tracked live" />

        <div className="bg-white border border-line rounded-xl p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" className="border border-line rounded-lg px-3 py-1.5 text-sm sm:col-span-2" />
            <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="border border-line rounded-lg px-2 py-1.5 text-sm">
              {users.map((u) => <option key={u.user_id} value={u.user_id}>{u.name}</option>)}
            </select>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="border border-line rounded-lg px-2 py-1.5 text-sm">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="border border-line rounded-lg px-2 py-1.5 text-sm sm:col-span-2" />
          </div>
          <button onClick={createTask} className="bg-accent-1 text-white text-sm px-4 py-1.5 rounded-lg">Create task</button>
          {msg && <p className="text-xs text-muted mt-2">{msg}</p>}
        </div>

        <div className="bg-white border border-line rounded-xl overflow-hidden">
          {tasks.length === 0 && <EmptyState message="No tasks yet." />}
          {tasks.map((t) => (
            <div key={t.task_id} className={`p-4 border-b border-line last:border-0 ${t.is_overdue ? 'bg-danger-bg' : ''}`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className={`text-sm font-medium ${t.status === 'completed' ? 'line-through text-muted' : ''}`}>{t.title}</div>
                  <div className="text-xs text-muted mt-0.5">
                    {t.assigned_to_name || 'Unassigned'} {t.due_date && `· due ${new Date(t.due_date).toLocaleDateString()}`}
                    {t.is_overdue && <span className="text-danger font-semibold"> · OVERDUE</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</span>
                  {t.status !== 'completed' && (
                    <button onClick={() => complete(t.task_id)} className="text-xs text-accent-1 underline">Complete</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
