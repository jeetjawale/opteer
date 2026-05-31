import { LucideIcon } from "lucide-react";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export interface CommandAction {
  id: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  keywords?: string[];
  shortcut?: string[];
  onSelect: (router: AppRouterInstance) => void;
}

export interface CommandGroup {
  id: string;
  heading: string;
  actions: CommandAction[];
}
