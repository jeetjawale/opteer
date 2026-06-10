"use client";

import { useState, useEffect } from "react";
import { ExternalLink, Activity, CheckCircle, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { fetchServiceStatus } from "./actions";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";

interface Service {
  name: string;
  nativeUrl: string;
  apiUrl?: string;
  type: "statuspage" | "fastapi" | "betterstack" | "googlecloud" | "link";
  info: string;
}

const STATUS_SERVICES: Service[] = [
  { name: "OpenAI", nativeUrl: "https://status.openai.com/", apiUrl: "https://status.openai.com/api/v2/summary.json", type: "statuspage", info: "Monitors OpenAI API endpoints and ChatGPT" },
  { name: "Claude (Anthropic)", nativeUrl: "https://status.claude.com/", apiUrl: "https://status.claude.com/api/v2/summary.json", type: "statuspage", info: "Monitors Claude API and web console" },
  { name: "Firecrawl", nativeUrl: "https://status.firecrawl.dev/", apiUrl: "https://status.firecrawl.dev/index.json", type: "betterstack", info: "Monitors scraping and extraction services" },
  { name: "Tavily", nativeUrl: "https://status.tavily.com/", apiUrl: "https://status.tavily.com/api/v2/summary.json", type: "statuspage", info: "Monitors AI research and search API" },
  { name: "Google AI Studio", nativeUrl: "https://aistudio.google.com/status", apiUrl: "https://status.cloud.google.com/incidents.json", type: "googlecloud", info: "Monitors Google Cloud Gemini API" },
  { name: "FastAPI Backend", nativeUrl: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/docs`, apiUrl: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/health`, type: "fastapi", info: "Local Opteer python backend service" }
];

function StatusIndicator({ indicator }: { indicator: string }) {
  if (indicator === "none" || indicator === "healthy") {
    return <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full text-xs font-medium border border-emerald-200"><CheckCircle size={14} /> Operational</span>;
  }
  if (indicator === "minor") {
    return <span className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full text-xs font-medium border border-amber-200"><AlertTriangle size={14} /> Degraded</span>;
  }
  return <span className="flex items-center gap-1.5 text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full text-xs font-medium border border-rose-200"><XCircle size={14} /> Outage</span>;
}

function StatusCard({ service }: { service: Service }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (service.type === "link") {
      setLoading(false);
      return;
    }

    const fetchStatus = async () => {
      try {
        const { data, error: fetchError } = await fetchServiceStatus(service.apiUrl!);
        if (fetchError) throw new Error(fetchError);
        setData(data);
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [service]);

  return (
    <Card variant="interactive" className="p-0 overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="bg-surface-container-low border-b border-outline-variant px-4 py-3 flex justify-between items-center shrink-0">
        <h3 className="font-label-md text-label-md font-semibold text-on-surface">{service.name}</h3>
        <a 
          href={service.nativeUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 text-xs font-medium"
        >
          View Native <ExternalLink size={14} />
        </a>
      </div>
      
      {/* Body */}
      <div className="flex-1 p-6 flex flex-col items-center justify-center bg-surface-container-lowest">
        {loading ? (
          <Loader2 className="animate-spin text-outline mb-2" size={24} />
        ) : service.type === "link" ? (
          <div className="text-center">
            <Activity className="text-outline mx-auto mb-3" size={32} />
            <p className="text-sm text-on-surface-variant">External Status Page</p>
            <p className="text-xs text-outline mt-1">Click 'View Native' to open</p>
          </div>
        ) : error ? (
          <div className="text-center">
            <AlertTriangle className="text-amber-500 mx-auto mb-3" size={32} />
            <p className="text-sm font-medium text-on-surface">Unable to fetch status</p>
            <p className="text-xs text-on-surface-variant mt-1">The service might be unreachable.</p>
          </div>
        ) : service.type === "statuspage" && data?.status ? (
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <StatusIndicator indicator={data.status.indicator} />
            </div>
            <p className="text-lg font-semibold text-on-surface">{data.status.description}</p>
            <p className="text-xs text-on-surface-variant mt-2 max-w-[250px] mx-auto truncate">
              {service.info}
            </p>
            {data.page?.updated_at && (
              <p className="text-xs text-outline mt-1.5">
                Last updated: {new Date(data.page.updated_at).toLocaleTimeString()}
              </p>
            )}
          </div>
        ) : service.type === "betterstack" && data?.data?.attributes ? (
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <StatusIndicator 
                indicator={data.data.attributes.aggregate_state === "operational" ? "healthy" : 
                           data.data.attributes.aggregate_state === "degraded" ? "minor" : "major"} 
              />
            </div>
            <p className="text-lg font-semibold text-on-surface">
              {data.data.attributes.aggregate_state === "operational" 
                ? "All Systems Operational" 
                : data.data.attributes.aggregate_state.replace(/_/g, ' ')}
            </p>
            <p className="text-xs text-on-surface-variant mt-2 max-w-[250px] mx-auto truncate">
              {service.info}
            </p>
            {data.data.attributes.updated_at && (
              <p className="text-xs text-outline mt-1.5">
                Last updated: {new Date(data.data.attributes.updated_at).toLocaleTimeString()}
              </p>
            )}
          </div>
        ) : service.type === "fastapi" && data?.status ? (
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <StatusIndicator indicator={data.status === "healthy" ? "healthy" : "major"} />
            </div>
            <p className="text-lg font-semibold text-on-surface">
              {data.status === "healthy" ? "All Systems Operational" : "API is Down"}
            </p>
            <p className="text-xs text-on-surface-variant mt-2 max-w-[250px] mx-auto truncate">
              {service.info} (Project: {data.project})
            </p>
          </div>
        ) : service.type === "googlecloud" && Array.isArray(data) ? (
          (() => {
            const geminiIncidents = data.filter((incident: any) =>
              incident.affected_products?.some((p: any) => p.id === "Z0FZJAMvEB4j3NbCJs6B")
            );
            const active = geminiIncidents.filter((i: any) => !i.end); // no end time = ongoing
            const status = active.length > 0 ? "major" : "healthy";
            const description = active.length > 0 ? "Incident Active" : "All Systems Operational";
            
            return (
              <div className="text-center">
                <div className="mb-4 flex justify-center">
                  <StatusIndicator indicator={status} />
                </div>
                <p className="text-lg font-semibold text-on-surface">{description}</p>
                {active.length > 0 && active[0].title && (
                  <p className="text-xs text-rose-500 font-medium mt-2 max-w-[250px] mx-auto truncate">
                    {active[0].title}
                  </p>
                )}
                <p className="text-xs text-on-surface-variant mt-2 max-w-[250px] mx-auto truncate">
                  {service.info}
                </p>
              </div>
            );
          })()
        ) : (
          <div className="text-center text-outline">Unknown Status</div>
        )}
      </div>
    </Card>
  );
}

export default function StatusPage() {
  return (
    <main className="flex-1 p-lg w-full flex flex-col">
      <PageHeader 
        title="System & API Status"
        subtitle="Monitor the live uptime and health of all connected AI providers and internal services."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md flex-1">
        {STATUS_SERVICES.map((service) => (
          <StatusCard key={service.name} service={service} />
        ))}
      </div>
    </main>
  );
}
