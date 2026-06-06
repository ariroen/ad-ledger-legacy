import { BootScreen } from "@/components/boot/BootScreen";
import { ContactProtocol } from "@/components/contact/ContactProtocol";
import { IdentityDossier } from "@/components/dossier/IdentityDossier";
import { InterfaceEffects } from "@/components/effects/InterfaceEffects";
import { Hero } from "@/components/hero/Hero";
import { ProjectsArchive } from "@/components/projects/ProjectsArchive";
import { CapabilityModules } from "@/components/services/CapabilityModules";
import { SkillGraph } from "@/components/skills/SkillGraph";
import { Terminal } from "@/components/terminal/Terminal";
import { ProcessTimeline } from "@/components/timeline/ProcessTimeline";
import { ClassifiedSection } from "@/components/classified/ClassifiedSection";
import { Signals } from "@/components/signals/Signals";
import { ModeSwitcher } from "@/components/ui/ModeSwitcher";
import { SoundToggle } from "@/components/ui/SoundToggle";

export default function Home() {
  return (
    <main className="site-shell">
      <BootScreen />
      <InterfaceEffects />
      <div className="fixed-controls" aria-label="Управление интерфейсом">
        <ModeSwitcher />
        <SoundToggle />
      </div>
      <Hero />
      <Terminal />
      <IdentityDossier />
      <CapabilityModules />
      <ProjectsArchive />
      <SkillGraph />
      <ProcessTimeline />
      <Signals />
      <ContactProtocol />
      <ClassifiedSection />
    </main>
  );
}
