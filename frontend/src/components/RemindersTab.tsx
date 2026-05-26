"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Loader2, Plus, Trash2, Calendar, CheckSquare, Square, Bell, AlertTriangle } from "lucide-react";
import { getReminders, createReminder, updateReminder, deleteReminder } from "@/lib/api";

interface Reminder {
  id: string;
  application_id: string;
  type: "follow-up" | "interview" | "deadline" | string;
  due_at: string;
  note: string | null;
  is_sent: boolean;
  is_completed: boolean;
  created_at: string;
}

interface RemindersTabProps {
  applicationId: string;
}

export default function RemindersTab({ applicationId }: RemindersTabProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [type, setType] = useState<"follow-up" | "interview" | "deadline">("follow-up");
  const [dueAt, setDueAt] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchReminders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getReminders(applicationId);
      // Sort reminders: incompleted first, then by due date
      const sorted = (data || []).sort((a: Reminder, b: Reminder) => {
        if (a.is_completed !== b.is_completed) {
          return a.is_completed ? 1 : -1;
        }
        return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
      });
      setReminders(sorted);
    } catch (err: any) {
      setError(err.message || "Failed to load reminders.");
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dueAt) return;

    setSubmitting(true);
    setError(null);
    try {
      // API expects ISO string format for due_at
      const isoDate = new Date(dueAt).toISOString();
      await createReminder({
        application_id: applicationId,
        type,
        due_at: isoDate,
        note: note.trim() || undefined
      });
      // Reset form
      setDueAt("");
      setNote("");
      fetchReminders();
    } catch (err: any) {
      setError(err.message || "Failed to create reminder.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleCompleted = async (id: string, currentVal: boolean) => {
    setUpdatingId(id);
    setError(null);
    try {
      await updateReminder(id, { is_completed: !currentVal });
      fetchReminders();
    } catch (err: any) {
      setError(err.message || "Failed to update reminder.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this reminder?")) {
      return;
    }
    setUpdatingId(id);
    setError(null);
    try {
      await deleteReminder(id);
      fetchReminders();
    } catch (err: any) {
      setError(err.message || "Failed to delete reminder.");
    } finally {
      setUpdatingId(null);
    }
  };

  // Helpers
  const formatDateTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
      });
    } catch {
      return isoString;
    }
  };

  const getTypeStyle = (typeVal: string) => {
    switch (typeVal) {
      case "interview":
        return "bg-amber-950 text-amber-300 border-amber-800/40";
      case "deadline":
        return "bg-red-950 text-red-300 border-red-800/40";
      default:
        return "bg-blue-950 text-blue-300 border-blue-800/40";
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      
      {/* Reminders List (Left Column) */}
      <div className="md:col-span-2 space-y-4">
        <h3 className="text-white text-base font-bold flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-zinc-400" />
          <span>Active Tasks & Reminders</span>
        </h3>

        {error && (
          <div className="p-4 bg-red-950/40 border border-red-800/50 rounded-xl text-red-300 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-500 space-y-2 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
            <span className="text-xs">Loading reminders...</span>
          </div>
        ) : reminders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-500 bg-zinc-900/50 border border-zinc-800 border-dashed rounded-2xl">
            <Bell className="w-8 h-8 text-zinc-700 mb-2" />
            <span className="text-xs font-semibold text-zinc-400">No reminders scheduled</span>
            <span className="text-[10px] text-zinc-600 mt-0.5">Use the form to schedule follow-ups or interviews.</span>
          </div>
        ) : (
          <div className="space-y-3">
            {reminders.map((reminder) => {
              const isPast = new Date(reminder.due_at).getTime() < Date.now();
              
              return (
                <div 
                  key={reminder.id}
                  className={`p-4 border rounded-xl flex items-start justify-between gap-4 transition-all ${
                    reminder.is_completed 
                      ? "bg-zinc-900/40 border-zinc-800/60 opacity-60" 
                      : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {/* Checkbox */}
                    <button
                      onClick={() => handleToggleCompleted(reminder.id, reminder.is_completed)}
                      disabled={updatingId === reminder.id}
                      className="text-zinc-500 hover:text-white transition-colors mt-0.5"
                    >
                      {reminder.is_completed ? (
                        <CheckSquare className="w-5 h-5 text-green-500 stroke-[2.5]" />
                      ) : (
                        <Square className="w-5 h-5 stroke-[2]" />
                      )}
                    </button>

                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        {/* Type badge */}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getTypeStyle(reminder.type)}`}>
                          {reminder.type}
                        </span>
                        
                        {/* Due Date & Overdue label */}
                        <span className={`text-xs ${
                          reminder.is_completed 
                            ? "text-zinc-500 line-through" 
                            : isPast 
                              ? "text-red-400 font-semibold" 
                              : "text-zinc-400"
                        }`}>
                          {formatDateTime(reminder.due_at)}
                        </span>
                        
                        {!reminder.is_completed && isPast && (
                          <span className="text-[9px] bg-red-950 text-red-400 px-1.5 py-0.5 rounded font-bold uppercase border border-red-900/30 flex items-center space-x-1">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            <span>Overdue</span>
                          </span>
                        )}
                      </div>

                      {reminder.note && (
                        <p className={`text-sm ${
                          reminder.is_completed 
                            ? "text-zinc-650 line-through" 
                            : "text-zinc-200"
                        }`}>
                          {reminder.note}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <button
                    onClick={() => handleDelete(reminder.id)}
                    disabled={updatingId === reminder.id}
                    className="p-1 text-zinc-600 hover:text-red-400 hover:bg-zinc-800/50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {updatingId === reminder.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Reminder Form (Right Column) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 h-fit space-y-4">
        <h4 className="text-white text-sm font-bold">Schedule Reminder</h4>

        <form onSubmit={handleCreate} className="space-y-4">
          {/* Type Selection */}
          <div>
            <label className="block text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-2" htmlFor="reminder-type">
              Reminder Type
            </label>
            <select
              id="reminder-type"
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-zinc-700 transition-colors"
            >
              <option value="follow-up">Follow-up</option>
              <option value="interview">Interview</option>
              <option value="deadline">Deadline</option>
            </select>
          </div>

          {/* Date & Time Picker */}
          <div>
            <label className="block text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-2" htmlFor="reminder-due">
              Due Date & Time
            </label>
            <input
              id="reminder-due"
              type="datetime-local"
              required
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-zinc-700 transition-colors"
            />
          </div>

          {/* Note Input */}
          <div>
            <label className="block text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-2" htmlFor="reminder-note">
              Optional Note
            </label>
            <textarea
              id="reminder-note"
              rows={3}
              placeholder="e.g. Prepare presentation, follow up with recruiter..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-zinc-700 transition-colors resize-none"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || !dueAt}
            className="w-full py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-sm transition-colors flex items-center justify-center space-x-2 disabled:bg-zinc-800 disabled:text-zinc-650"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Scheduling...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Add Reminder</span>
              </>
            )}
          </button>
        </form>
      </div>

    </div>
  );
}
