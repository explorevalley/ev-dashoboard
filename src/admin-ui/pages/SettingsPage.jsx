import React, { useState } from "react";
import { FaGlobeAsia, FaRobot, FaServer, FaTable } from "react-icons/fa";

export default function SettingsPage({ BotsAgentsCard, ControlsPanel, UrlsPanel, TablesPanel, UsersPanel }) {
  const [activeTab, setActiveTab] = useState("controls");
  const tabItems = [
    { id: "controls", label: "Controls", icon: <FaServer /> },
    { id: "urls", label: "URLs", icon: <FaGlobeAsia /> },
    { id: "tables", label: "Tables", icon: <FaTable /> },
    { id: "users", label: "Dashboard Users", icon: <FaServer /> },
    { id: "bots", label: "Bot Agents", icon: <FaRobot /> }
  ];

  return (
    <div className="settings-page">
      <section className="settings-hero-card">
        <h2 className="m-0">Settings</h2>
        <p className="small mt-8">Control platform behavior, dashboard visibility, and operational safety from this panel.</p>
      </section>
      <section className="settings-tab-bar">
        <div className="tabs">
          {tabItems.map((tab) => (
            <button
              key={tab.id}
              className={`tab ${activeTab === tab.id ? "active" : ""}`}
              type="button"
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </section>
      <section className="settings-block">
        {activeTab === "controls" && typeof ControlsPanel === "function" ? <ControlsPanel /> : null}
        {activeTab === "urls" && typeof UrlsPanel === "function" ? <UrlsPanel /> : null}
        {activeTab === "tables" && typeof TablesPanel === "function" ? <TablesPanel /> : null}
        {activeTab === "users" && typeof UsersPanel === "function" ? <UsersPanel /> : null}
        {activeTab === "bots" ? <BotsAgentsCard /> : null}
      </section>
    </div>
  );
}
