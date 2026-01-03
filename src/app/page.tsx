'use client';

import { useMemo, useState } from "react";
import { Navigation } from "@/components/Navigation";
import { LandingPage } from "@/components/LandingPage";
import { PropertiesPage } from "@/components/PropertiesPage";
import { AboutPage } from "@/components/AboutPage";
import { AuthPage } from "@/components/AuthPage";
import { Chatbot } from "@/components/Chatbot";
import { ClientDashboard } from "@/components/dashboards/ClientDashboard";
import { BrokerDashboard } from "@/components/dashboards/BrokerDashboard";
import { AccountantDashboard } from "@/components/dashboards/AccountantDashboard";
import { CompanyOwnerDashboard } from "@/components/dashboards/CompanyOwnerDashboard";
import { DirectorDashboard } from "@/components/dashboards/DirectorDashboard";
import { MarketingCoordinatorDashboard } from "@/components/dashboards/MarketingCoordinatorDashboard";
import type { User } from "@/types/user";
import type { ChatAction, AppointmentPrefill } from "@/types/actions";

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<string>("home");
  const [appointmentPrefill, setAppointmentPrefill] = useState<AppointmentPrefill>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setCurrentPage("dashboard");
    setShowAuthModal(false);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentPage("home");
  };

  const handleNavigate = (page: string) => {
    if (page === "login") {
      setShowAuthModal(true);
      return;
    }
    setCurrentPage(page);
  };

  const handleChatAction = (action: ChatAction) => {
    if (action.type === "logout") {
      handleLogout();
      return;
    }

    if (action.type === "navigate") {
      // If navigating to appointments, set a prefill hint so the dashboard opens the form.
      if (action.target === "appointments") {
        setAppointmentPrefill({
          propertyId: typeof action.payload?.propertyId === "string" ? action.payload.propertyId : undefined,
          date: typeof action.payload?.date === "string" ? action.payload.date : undefined,
          time: typeof action.payload?.time === "string" ? action.payload.time : undefined,
          autoSubmit: action.payload?.autoSubmit === true,
          nonce: typeof action.payload?.nonce === "string" ? action.payload.nonce : undefined,
          cancel: action.payload?.cancel
            ? {
                propertyName:
                  typeof (action.payload as Record<string, unknown>).cancel === "object" &&
                  action.payload &&
                  typeof (action.payload as { cancel?: Record<string, unknown> }).cancel?.propertyName === "string"
                    ? ((action.payload as { cancel?: { propertyName?: string } }).cancel?.propertyName as string)
                    : undefined,
                date:
                  typeof (action.payload as { cancel?: { date?: string } }).cancel?.date === "string"
                    ? ((action.payload as { cancel?: { date?: string } }).cancel?.date as string)
                    : undefined,
                time:
                  typeof (action.payload as { cancel?: { time?: string } }).cancel?.time === "string"
                    ? ((action.payload as { cancel?: { time?: string } }).cancel?.time as string)
                    : undefined,
              }
            : undefined,
        });
      }
      setCurrentPage(action.target);
    }
  };

  const content = useMemo(() => {
    if (!currentUser) {
      switch (currentPage) {
        case "home":
          return <LandingPage onNavigate={handleNavigate} />;
        case "properties":
          return <PropertiesPage onNavigate={handleNavigate} />;
        case "about":
          return <AboutPage />;
        default:
          return <LandingPage onNavigate={handleNavigate} />;
      }
    }

    switch (currentUser.role) {
      case "client":
        return (
          <ClientDashboard
            currentPage={currentPage}
            onNavigate={handleNavigate}
            appointmentPrefill={appointmentPrefill}
            currentUser={currentUser}
          />
        );
      case "broker":
        return <BrokerDashboard currentPage={currentPage} />;
      case "accountant":
        return <AccountantDashboard currentPage={currentPage} />;
      case "owner":
        return <CompanyOwnerDashboard currentPage={currentPage} />;
      case "director":
        return <DirectorDashboard currentPage={currentPage} />;
      case "marketing":
        return <MarketingCoordinatorDashboard currentPage={currentPage} />;
      default:
        return <LandingPage onNavigate={handleNavigate} />;
    }
  }, [appointmentPrefill, currentPage, currentUser]);

  return (
    <div className="min-h-screen bg-background">
      <Navigation
        currentUser={currentUser}
        onLogout={handleLogout}
        onNavigate={handleNavigate}
        currentPage={currentPage}
        onOpenLogin={() => setShowAuthModal(true)}
      />
      <main>{content}</main>
      {showAuthModal && !currentUser ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowAuthModal(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-3xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <AuthPage
              onLogin={handleLogin}
              onClose={() => setShowAuthModal(false)}
            />
          </div>
        </div>
      ) : null}
      {currentUser ? (
        <Chatbot
          currentUser={currentUser}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          onAction={handleChatAction}
        />
      ) : null}
    </div>
  );
}
