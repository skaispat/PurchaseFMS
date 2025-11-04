// src/App.jsx
"use client";

import React, { useState } from "react";
import Dashboard from "./components/Dashboard";
import IndentForm from "./components/IndentForm";
import StockApproval from "./components/StockApproval";
import GeneratePO from "./components/generate-po";
// import TallyEntry from "./components/tally-entry";
import LiftMaterial from "./components/lift-material";
import ReceiptCheck from "./components/receipt-check";
import LabTesting from "./components/lab-testing";
import GateOut from "./components/gate-out";
import FinalTallyEntry from "./components/final-tally-entry";
import LoginForm from "./components/LoginForm";
import AppHeader from "./components/AppHeader";
import { useAuth } from "./context/AuthContext";
import Approval from "./components/Approval";
import IssuedDebitNote from "./components/IssuedDebitNote"

// Shadcn/ui components
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator"; // Separator is imported but not used, can be removed if not needed.
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

// Lucide icons
import {
  LayoutDashboard, FilePlus, PackageCheck, FileText, Calculator,
  Truck, CheckSquare, TestTube, Archive, Menu, X
} from 'lucide-react';

// Import the Toaster from Sonner
import { Toaster } from "@/components/ui/sonner";

function App() {
  // All Hooks must be called unconditionally at the top level
  const { isAuthenticated, allowedSteps } = useAuth(); // Call useAuth first
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Now, perform conditional rendering based on isAuthenticated
  if (!isAuthenticated) {
    return <LoginForm />;
  }

  const toggleDesktopSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const allTabs = [
    { id: "dashboard", label: "Dashboard", number: null, icon: <LayoutDashboard size={20} />, stepName: "Dashboard" },
    { id: "indent", label: "Indent", number: null, icon: <FilePlus size={20} />, stepName: "Indent" },
    { id: "stock", label: "Check The Indent", number: null, icon: <PackageCheck size={20} />, stepName: "Check The Indent" },
    { id: "generate-po", label: "PO", number: null, icon: <FileText size={20} />, stepName: "PO" },
    // { id: "tally-entry", label: "Tally", number: null, icon: <Calculator size={20} />, stepName: "Purchase Order Entry In Tally" },
    { id: "lift-material", label: "Lift", number: null, icon: <Truck size={20} />, stepName: "Lift" },
    { id: "lab-testing", label: "Lab", number: null, icon: <TestTube size={20} />, stepName: "Lab" },
    { id: "receipt-check", label: "Receipt", number: null, icon: <CheckSquare size={20} />, stepName: "Receipt" },
    { id: "gate-out", label: "Gate Out", number: null, icon: <Truck size={20} />, stepName: "Gate Out" },
    { id: "final-tally-entry", label: "Bill Entry", number: null, icon: <FileText size={20} />, stepName: "Bill Entry" },
    { id: "approval", label: "Return Approval", number: null, icon: <CheckSquare size={20} />, stepName: "Return Approval" },
    { id: "issued-debit-note", label: "Issued Debit Note", number: null, icon: <Archive size={20} />, stepName: "Issued Debit Note" },


  ];

  const accessibleTabs = allTabs.filter(tab => {
    return allowedSteps.includes("Admin") || allowedSteps.includes(tab.stepName);
  });

  React.useEffect(() => {
    // If current activeTab is not accessible, or if no activeTab is set but accessible tabs exist,
    // set activeTab to the first accessible one, or default to dashboard if no accessible tabs.
    if (!activeTab || !accessibleTabs.some(tab => tab.id === activeTab)) {
      if (accessibleTabs.length > 0) {
        setActiveTab(accessibleTabs[0].id);
      } else {
        // Fallback to dashboard if no specific accessible tabs, assuming dashboard is always default/accessible
        setActiveTab("dashboard");
      }
    }
  }, [accessibleTabs, activeTab]);


  const renderSidebarContent = (isMobile = false) => (
    <>
      <ScrollArea className="flex-grow py-2">
        <nav className="space-y-1 pr-2">
          {accessibleTabs.map((tab) => (
            <Button
              key={tab.id}
              className={`w-full justify-start h-12 relative group rounded-lg transition-all duration-200 ease-in-out
                        ${isMobile ? 'px-4' : (isSidebarOpen ? 'pl-4' : 'justify-center')}
                        ${activeTab === tab.id
                  ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md"
                  : "bg-white text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                }`}
              onClick={() => {
                setActiveTab(tab.id);
                if (isMobile) setIsMobileSidebarOpen(false);
              }}
              title={tab.label}
            >
              <span className={`transition-colors duration-150 ease-in-out
                              ${activeTab === tab.id ? 'text-white' : 'text-gray-600 group-hover:text-gray-900'}`}>
                {tab.icon}
              </span>
              {/* Only render label and number if sidebar is open or it's mobile */}
              {isMobile || isSidebarOpen ? (
                <span className="ml-3 text-base font-medium flex items-center flex-1 min-w-0"> {/* Increased font-size to text-base */}
                  <span className="truncate">{tab.label}</span>
                  {tab.number && (
                    <span
                      className={`ml-auto flex items-center justify-center rounded-full w-5 h-5 text-xs font-bold
                                ${activeTab === tab.id ? 'bg-white text-blue-600' : 'bg-blue-100 text-blue-700'}`}
                    >
                      {tab.number}
                    </span>
                  )}
                </span>
              ) : null}
              {/* Active tab indicator when sidebar is collapsed (desktop only) */}
              {!isMobile && !isSidebarOpen && activeTab === tab.id && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-r-full"></span>
              )}
            </Button>
          ))}
        </nav>
      </ScrollArea>
      {/* Sidebar Footer */}
      {!isMobile && isSidebarOpen && (
        <div className="p-4 border-t border-gray-200 text-center">
          <p className="text-sm text-gray-500 font-semibold">Powered By</p>
          <a className="text-base font-bold bg-gradient-to-r from-blue-500 to-teal-500 bg-clip-text text-transparent" href="https://www.botivate.in/">Botivate</a>
        </div>
      )}
    </>
  );

  const renderContent = () => {
    // Show access denied message if activeTab is not in accessibleTabs
    if (!accessibleTabs.some(tab => tab.id === activeTab)) {
      return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center text-gray-500">
          <X size={48} className="text-red-400 mb-4" />
          <h2 className="text-2xl font-bold">Access Denied</h2>
          <p className="mt-2">You do not have permission to view this section.</p>
          <Button onClick={() => setActiveTab("dashboard")} className="mt-4">Go to Dashboard</Button>
        </div>
      );
    }

    switch (activeTab) {
      case "dashboard": return <Dashboard />;
      case "indent": return <IndentForm />;
      case "stock": return <StockApproval />;
      case "generate-po": return <GeneratePO />;
      // case "tally-entry": return <TallyEntry />;
      case "lift-material": return <LiftMaterial />;
      case "lab-testing": return <LabTesting />;
      case "receipt-check": return <ReceiptCheck />;
      case "gate-out": return <GateOut />;
      case "final-tally-entry": return <FinalTallyEntry />;
      case "approval": return <Approval />
      case "issued-debit-note": return <IssuedDebitNote />
      default: return <Dashboard />; // Fallback
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex bg-white shadow-lg transition-all duration-300 ease-in-out flex-col flex-shrink-0 ${isSidebarOpen ? "w-72" : "w-[80px]" // Increased open width to w-72, collapsed to w-[80px]
          }`}
      >
        <div
          className={`h-16 flex items-center border-b border-gray-200 ${isSidebarOpen ? "px-4 justify-start" : "px-0 justify-center"
            }`}
        >
          {isSidebarOpen ? (
            <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"> {/* Increased font-size to text-xl */}
              Purchase Management
            </span>
          ) : (
            <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"> {/* Increased font-size to text-xl */}
              P
            </span>
          )}
        </div>
        {renderSidebarContent(false)}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <AppHeader
          toggleDesktopSidebar={toggleDesktopSidebar}
          isSidebarOpen={isSidebarOpen}
          setIsMobileSidebarOpen={setIsMobileSidebarOpen}
        />

        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8 xl:p-10 bg-gray-100">
          {renderContent()}
        </main>
      </div>

      {/* Mobile Sidebar (Sheet) */}
      <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
        <SheetContent side="left" className="p-0 flex flex-col w-60"> {/* Mobile sidebar width remains w-60 as it's a temporary overlay */}
          <div className="h-16 flex items-center border-b border-gray-200 px-4 justify-start">
            <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"> {/* Increased font-size to text-xl */}
              Purchase Management
            </span>
          </div>
          {renderSidebarContent(true)}
        </SheetContent>
      </Sheet>

      {/* Toaster for notifications */}
      <Toaster />
    </div>
  );
}

export default App;