"use client";

import React, { useState, useEffect } from "react";
import { getUserSettings, updateUserSettings, UserSettingsResponse } from "@/lib/api";
import DemoSequenceEngine from "./demo/DemoSequenceEngine";

interface OnboardingGateProps {
  children: React.ReactNode;
}

export default function OnboardingGate({ children }: OnboardingGateProps) {
  const [settings, setSettings] = useState<UserSettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const data = await getUserSettings();
        setSettings(data);
      } catch (err) {
        console.error("Failed to load settings for onboarding gate", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleSkip = async () => {
    try {
      await updateUserSettings({ onboarding_completed: true, onboarding_step: "skipped" });
      setSettings((prev) => prev ? { ...prev, onboarding_completed: true, onboarding_step: "skipped" } : null);
    } catch (err) {
      console.error("Failed to skip onboarding", err);
    }
  };

  useEffect(() => {
    const handleRestartDemo = async () => {
      try {
        await updateUserSettings({ onboarding_completed: false });
        setSettings((prev) => prev ? { ...prev, onboarding_completed: false } : null);
      } catch (err) {
        console.error("Failed to restart demo", err);
      }
    };
    window.addEventListener('restart_demo', handleRestartDemo);
    return () => {
      window.removeEventListener('restart_demo', handleRestartDemo);
    };
  }, []);

  // We always render the real application underneath.
  // The DemoSequenceEngine overlays on top if onboarding is incomplete.
  
  const showDemo = !loading && (!settings || !settings.onboarding_completed);

  const handleDemoComplete = async () => {
    try {
      await updateUserSettings({ onboarding_completed: true, onboarding_step: "completed" });
      setSettings((prev) => prev ? { ...prev, onboarding_completed: true, onboarding_step: "completed" } : null);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('onboarding_completed'));
      }
    } catch (err) {
      console.error("Failed to complete demo", err);
    }
  };

  return (
    <>
      {children}
      {showDemo && (
        <DemoSequenceEngine 
          onComplete={handleDemoComplete}
          onSkip={handleDemoComplete} 
        />
      )}
    </>
  );
}
