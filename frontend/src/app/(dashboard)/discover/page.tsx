"use client";

import { useEffect, useState } from "react";
import { Search, MapPin, Briefcase, ExternalLink, Loader2, Plus, Building2, Calendar, DollarSign, Download } from "lucide-react";
import { CompanyLogo } from "@/components/ui/CompanyLogo";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { Badge } from "@/components/ui/Badge";
import { useMutation } from "@tanstack/react-query";
import { apiClient as api } from "@/lib/api-client";

interface JobResult {
  id: string;
  title: string;
  company: string;
  company_url?: string;
  job_url: string;
  location: string;
  description?: string;
  job_type?: string;
  interval?: string;
  min_amount?: number;
  max_amount?: number;
  date_posted?: string;
  company_logo?: string;
  site?: string;
}

export default function DiscoverPage() {
  const [searchQuery, setSearchQuery] = useState("Software Developer");
  const [locationQuery, setLocationQuery] = useState("");
  const [country, setCountry] = useState("");
  const [hoursOld, setHoursOld] = useState("");
  const [jobType, setJobType] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [isRemote, setIsRemote] = useState(false);
  const AVAILABLE_SITES = ["linkedin", "indeed", "glassdoor", "zip_recruiter", "google", "naukri"];
  
  const [selectedSites, setSelectedSites] = useState<string[]>(AVAILABLE_SITES);

  const toggleSite = (site: string) => {
    setSelectedSites(prev => 
      prev.includes(site) 
        ? prev.filter(s => s !== site)
        : [...prev, site]
    );
  };



  const [jobs, setJobs] = useState<JobResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);


  const searchMutation = useMutation({
    mutationFn: async () => {
      const params = new URLSearchParams({
        q: searchQuery,
        location: locationQuery || country,
        remote: isRemote.toString(),
        results: "20",
        country: country
      });
      if (hoursOld) {
        params.append("hours_old", hoursOld);
      }
      if (jobType) {
        params.append("job_type", jobType);
      }
      if (experienceLevel) {
        params.append("experience_level", experienceLevel);
      }
      if (selectedSites.length > 0) {
        params.append("sites", selectedSites.join(","));
      } else {
        params.append("sites", AVAILABLE_SITES.join(",")); // Fallback if user unchecks all
      }
      return api.get(`/jobs/search?${params.toString()}`) as Promise<JobResult[]>;
    },
    onSuccess: (data) => {
      setJobs(data);
      setHasSearched(true);
    }
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    searchMutation.mutate();
  };

  const handleImport = (jobUrl: string, companyLogo?: string) => {
    // Dispatch event to open import modal with pre-filled URL
    const event = new CustomEvent("opteer:open-job-import-modal", {
      detail: { url: jobUrl, logo_url: companyLogo }
    });
    window.dispatchEvent(event);
  };

  return (
    <main className="flex-1 p-lg w-full flex flex-col h-full overflow-hidden">
      <PageHeader 
        title="Discover" 
        subtitle="Search and import jobs from LinkedIn, Indeed, and Glassdoor in real-time."
      />

      <div className="mb-md shrink-0">
        <form onSubmit={handleSearch} className="flex flex-col gap-4">
          
          <div className="flex flex-wrap gap-2 items-center mb-1">
            <span className="text-body-sm font-medium text-on-surface-variant mr-2">
              Sources ({selectedSites.length}/{AVAILABLE_SITES.length})
            </span>
            {AVAILABLE_SITES.map(site => (
              <button
                key={site}
                type="button"
                onClick={() => toggleSite(site)}
                className={`px-3 py-1.5 rounded-md text-label-sm transition-colors ${
                  selectedSites.includes(site)
                    ? "bg-[#F97316] text-white hover:bg-[#EA580C]" 
                    : "bg-surface-container-high border border-outline-variant text-on-surface-variant hover:bg-surface-container-highest"
                }`}
              >
                {site.charAt(0).toUpperCase() + site.slice(1).replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-[2] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-5 h-5" />
              <input 
                type="text" 
                placeholder="Job title, keywords, or company..." 
                className="w-full bg-surface border border-outline-variant rounded-lg py-2.5 pl-10 pr-4 text-on-surface focus:outline-none focus:border-primary transition-colors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                required
              />
            </div>
            <div className="flex-1 relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-5 h-5" />
              <input 
                type="text" 
                placeholder="City, state, or zip" 
                className="w-full bg-surface border border-outline-variant rounded-lg py-2.5 pl-10 pr-4 text-on-surface focus:outline-none focus:border-primary transition-colors"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <input
                type="text"
                placeholder="Country (e.g. USA, India)"
                className="w-full bg-surface border border-outline-variant rounded-lg py-2.5 px-4 text-on-surface focus:outline-none focus:border-primary transition-colors"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                required
              />
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <select
                className="w-full bg-surface border border-outline-variant rounded-lg py-2.5 px-4 text-on-surface focus:outline-none focus:border-primary transition-colors appearance-none"
                value={jobType}
                onChange={(e) => setJobType(e.target.value)}
              >
                <option value="">Any Job Type</option>
                <option value="fulltime">Full-time</option>
                <option value="parttime">Part-time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
              </select>
            </div>
            <div className="flex-1">
              <select
                className="w-full bg-surface border border-outline-variant rounded-lg py-2.5 px-4 text-on-surface focus:outline-none focus:border-primary transition-colors appearance-none"
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
              >
                <option value="">Any Experience Level</option>
                <option value="entry">Entry Level</option>
                <option value="mid">Mid Level</option>
                <option value="senior">Senior / Lead</option>
                <option value="executive">Director / Exec</option>
              </select>
            </div>
            <div className="flex-1">
              <select
                className="w-full bg-surface border border-outline-variant rounded-lg py-2.5 px-4 text-on-surface focus:outline-none focus:border-primary transition-colors appearance-none"
                value={hoursOld}
                onChange={(e) => setHoursOld(e.target.value)}
              >
                <option value="">Any Time</option>
                <option value="24">Past 24 hours</option>
                <option value="72">Past 3 days</option>
                <option value="168">Past week</option>
                <option value="720">Past month</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 px-2">
              <Toggle checked={isRemote} onChange={setIsRemote} />
              <span className="text-body-sm text-on-surface-variant">Remote Only</span>
            </div>
            <Button type="submit" disabled={searchMutation.isPending} className="min-w-[140px]">
              {searchMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Search Jobs"}
            </Button>
          </div>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pr-2">
        {searchMutation.isPending ? (
          <div className="flex flex-col items-center justify-center h-64 text-on-surface-variant">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="font-body-lg">Searching multiple boards...</p>
            <p className="text-sm mt-2 opacity-70">This might take 10-20 seconds to bypass bot protections.</p>
          </div>
        ) : searchMutation.isError ? (
          <div className="flex flex-col items-center justify-center h-64 text-error">
            <p className="font-headline-sm font-semibold mb-2">Search failed</p>
            <p className="text-sm">We hit a rate limit or bot protection screen. Wait a moment and try again.</p>
          </div>
        ) : hasSearched && jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-on-surface-variant">
            <Briefcase className="w-12 h-12 mb-4 opacity-50" />
            <p className="font-headline-sm font-semibold mb-2">No jobs found</p>
            <p className="text-sm">Try broadening your search terms or location.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md pb-xl">
            {jobs.map((job) => (
              <Card key={job.id} variant="interactive" className="flex flex-col h-full group hover:border-primary/50 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-lg bg-surface flex items-center justify-center shrink-0 border border-outline-variant overflow-hidden text-lg font-bold text-on-surface-variant">
                      <CompanyLogo company={job.company} logoUrl={job.company_logo} fallback={(job.company || 'U')[0].toUpperCase()} />
                    </div>
                    <div>
                      <h3 className="font-headline-sm font-semibold text-on-surface line-clamp-2 leading-tight mb-2 group-hover:text-primary transition-colors">
                        {job.title}
                      </h3>
                      <div className="flex items-center gap-2 text-on-surface font-medium text-sm mb-1">
                        <Building2 className="w-4 h-4 text-primary" />
                        {job.company}
                      </div>
                      <div className="flex items-center gap-2 text-on-surface-variant text-sm">
                        <MapPin className="w-4 h-4" />
                        {job.location}
                      </div>
                    </div>
                  </div>
                </div>

                {job.description && (
                  <p className="text-sm text-on-surface-variant line-clamp-3 mb-4 flex-1">
                    {job.description.replace(/\*\*/g, '').replace(/\*/g, '').replace(/\\-/g, '-')}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 mb-5 mt-auto pt-2">
                  {job.job_type && (
                    <Badge variant="default" className="capitalize">
                      {job.job_type}
                    </Badge>
                  )}
                  {job.min_amount && (
                    <Badge variant="success" className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      {job.min_amount.toLocaleString()}{job.max_amount ? ` - ${job.max_amount.toLocaleString()}` : ''} {job.interval === "yearly" ? "/yr" : ""}
                    </Badge>
                  )}
                  {job.date_posted && (
                    <Badge variant="default" className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {job.date_posted}
                    </Badge>
                  )}
                  {job.site && (
                    <Badge variant="primary" className="capitalize border-primary/20 bg-primary/5 text-primary">
                      {job.site.replace('_', ' ')}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-outline-variant/50">
                  <Button 
                    variant="primary" 
                    className="flex-1 flex items-center justify-center gap-2"
                    onClick={() => handleImport(job.job_url, job.company_logo)}
                  >
                    <Plus className="w-4 h-4" /> Import & Analyze
                  </Button>
                  <a 
                    href={job.job_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="p-2.5 rounded-lg border border-outline hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors"
                    title="View Original Posting"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
