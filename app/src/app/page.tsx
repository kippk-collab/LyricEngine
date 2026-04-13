import { LoginGate } from "@/components/LoginGate";
import { LyricEngineApp } from "@/components/LyricEngineApp";

export default function Home() {
  return (
    <LoginGate>
      <LyricEngineApp />
    </LoginGate>
  );
}
