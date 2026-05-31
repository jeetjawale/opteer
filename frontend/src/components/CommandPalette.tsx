"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { commandGroups } from "@/lib/commands/registry";
import { Search } from "lucide-react";

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Global Command Menu"
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] p-4 bg-black/60 backdrop-blur-sm"
    >
      <Command
        className="relative flex flex-col w-full max-w-2xl overflow-hidden rounded-xl bg-zinc-950 border border-zinc-800 shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_30px_60px_rgba(0,0,0,0.5)] z-10 animate-in fade-in zoom-in-95 duration-200"
        shouldFilter={true}
      >
        <div className="flex items-center px-4 py-3 border-b border-zinc-800/80 gap-3">
          <Search className="w-5 h-5 text-zinc-500" />
          <Command.Input
            autoFocus
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-white placeholder-zinc-500 outline-none text-base"
          />
          <div className="flex items-center gap-1.5 hidden sm:flex">
            <kbd className="bg-zinc-800 border border-zinc-700 text-zinc-400 px-1.5 py-0.5 rounded text-xs font-medium font-sans">ESC</kbd>
          </div>
        </div>

        <Command.List className="max-h-[350px] overflow-y-auto p-2 custom-scrollbar">
          <Command.Empty className="py-6 text-center text-sm text-zinc-500">
            No results found.
          </Command.Empty>

          {commandGroups.map((group) => (
            <Command.Group 
              key={group.id} 
              heading={<span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-2 py-1.5 block">{group.heading}</span>}
              className="mb-2"
            >
              {group.actions.map((action) => {
                const Icon = action.icon;
                return (
                  <Command.Item
                    key={action.id}
                    value={`${action.title} ${action.keywords?.join(" ") || ""}`}
                    onSelect={() => runCommand(() => action.onSelect(router))}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer aria-selected:bg-zinc-800 aria-selected:text-white text-zinc-300 transition-colors"
                  >
                    {Icon && <Icon className="w-4 h-4 text-zinc-400" />}
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{action.title}</span>
                      {action.description && (
                        <span className="text-xs text-zinc-500">{action.description}</span>
                      )}
                    </div>
                  </Command.Item>
                );
              })}
            </Command.Group>
          ))}
        </Command.List>
      </Command>
    </Command.Dialog>
  );
}
