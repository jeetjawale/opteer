import { CommandGroup } from "./types";
import { Plus, Upload, BarChart3, Search } from "lucide-react";

export const commandGroups: CommandGroup[] = [
  {
    id: "actions",
    heading: "Actions",
    actions: [
      {
        id: "import-job",
        title: "Import Job",
        description: "Add a new job application via URL",
        icon: Plus,
        keywords: ["add", "new", "job", "import", "url"],
        onSelect: (router) => {
          // Navigating to applications triggers the modal via query parameter or state
          router.push("/applications?action=import");
        }
      },
      {
        id: "upload-resume",
        title: "Upload Resume",
        description: "Add a new master resume",
        icon: Upload,
        keywords: ["resume", "upload", "cv", "pdf", "new"],
        onSelect: (router) => {
          router.push("/resumes?action=upload");
        }
      }
    ]
  },
  {
    id: "navigation",
    heading: "Navigation",
    actions: [
      {
        id: "search-applications",
        title: "Search Applications",
        description: "Find jobs you've applied to",
        icon: Search,
        keywords: ["search", "find", "jobs", "applications", "lookup"],
        onSelect: (router) => {
          router.push("/applications?focus=search");
        }
      },
      {
        id: "open-analytics",
        title: "Open Analytics",
        description: "View your application pipeline and metrics",
        icon: BarChart3,
        keywords: ["analytics", "metrics", "stats", "dashboard", "funnel"],
        onSelect: (router) => {
          router.push("/analytics");
        }
      }
    ]
  }
];
