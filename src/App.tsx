import { ToastProvider } from "./kit";
import { useRoute } from "./ui/route";
import { StudyProvider } from "./ui/state";
import { Shell } from "./ui/shell/Shell";
import { Study } from "./ui/study/Study";
import { Condition } from "./ui/pages/Condition";
import { Method } from "./ui/pages/Method";
import { Sources } from "./ui/pages/Sources";

export function App() {
  const route = useRoute();
  return (
    <ToastProvider>
      <StudyProvider>
        <Shell route={route}>
          {route === "study" ? <Study /> : null}
          {route === "condition" ? <Condition /> : null}
          {route === "method" ? <Method /> : null}
          {route === "sources" ? <Sources /> : null}
        </Shell>
      </StudyProvider>
    </ToastProvider>
  );
}
