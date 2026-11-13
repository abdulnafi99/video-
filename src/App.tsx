import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "./components/Icon";
import { ToastProvider } from "./components/ui";
import { go, useRoute } from "./router";
import { api, subscribeJobs } from "./services/api";
import { Overview } from "./dashboard/Overview";
import { Projects } from "./pages/Projects";
import { CreateVideo } from "./pages/CreateVideo";
import { SceneLibrary } from "./scene-library/SceneLibrary";
import { BrandKitPage } from "./brand-kit/BrandKit";
import { MediaLibrary } from "./pages/MediaLibrary";
import { AudioStudio } from "./audio-studio/AudioStudio";
import { RenderQueue } from "./render-queue/RenderQueue";
import { ExportHistory } from "./pages/ExportHistory";
import { SettingsPage } from "./pages/Settings";
import { Editor } from "./editor/Editor";

const NAV = [
  { id: "overview", label: "Overview", icon: "overview" },
  { id: "projects", label: "My Projects", icon: "projects" },
  { id: "create", label: "Create Video", icon: "create" },
  { group: "Studio" },
  { id: "scenes", label: "Scene Library", icon: "scenes" },
  { id: "brand", label: "Brand Kit", icon: "brand" },
  { id: "media", label: "Media Library", icon: "media" },
  { id: "audio", label: "Audio Studio", icon: "audio" },
  { group: "Delivery" },
  { id: "queue", label: "Render Queue", icon: "queue" },
  { id: "exports", label: "Export History", icon: "history" },
  { id: "settings", label: "Settings", icon: "settings" },
] as const;

export const App: React.FC = () => {
  const [route, param] = useRoute();
  const [activeJobs, setActiveJobs] = useState(0);

  useEffect(() => {
    const refresh = () => api.jobs().then((j) => setActiveJobs(j.filter((x) => x.status === "running" || x.status === "queued").length)).catch(() => {});
    refresh();
    return subscribeJobs(() => refresh());
  }, []);

  const page = (() => {
    switch (route) {
      case "overview": return <Overview />;
      case "projects": return <Projects />;
      case "create": return <CreateVideo />;
      case "editor": return <Editor projectId={param} />;
      case "scenes": return <SceneLibrary />;
      case "brand": return <BrandKitPage projectId={param} />;
      case "media": return <MediaLibrary />;
      case "audio": return <AudioStudio projectId={param} />;
      case "queue": return <RenderQueue />;
      case "exports": return <ExportHistory />;
      case "settings": return <SettingsPage />;
      default: return <Overview />;
    }
  })();
  const activeNav = route === "editor" ? "projects" : route;

  return (
    <ToastProvider>
      <div className="app">
        <aside className="sidebar">
          <div className="brand">
            <img src="/icons/logo.svg" width={34} height={34} alt="" />
            <div>
              <div className="brand-name">CINEMOTION</div>
              <div className="brand-tag">Create. Animate. Inspire.</div>
            </div>
          </div>
          {NAV.map((n, i) =>
            "group" in n ? (
              <div key={i} className="nav-label">{n.group}</div>
            ) : (
              <button key={n.id} className={`nav-item ${activeNav === n.id ? "active" : ""}`} onClick={() => go(n.id)}>
                {activeNav === n.id && <motion.span layoutId="nav-bg" className="nav-bg" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
                <Icon name={n.icon} />
                {n.label}
                {n.id === "queue" && activeJobs > 0 && <span className="nav-count">{activeJobs}</span>}
              </button>
            ),
          )}
          <div className="sidebar-foot">
            HyperFrames scene engine
            <br />
            Remotion composition engine
          </div>
        </aside>
        <main className="main" key={route + (param ?? "")}>
          {page}
        </main>
      </div>
    </ToastProvider>
  );
};
