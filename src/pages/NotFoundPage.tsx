import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/Feedback";
import { navigate } from "@/hooks/useRouter";

export function NotFoundPage() {
  return (
    <Card>
      <EmptyState
        icon="search"
        title="Página não encontrada"
        action={
          <Button icon="home" onClick={() => navigate("/", { replace: true })}>
            Ir para o início
          </Button>
        }
      >
        O endereço pode ter mudado. Use o menu para chegar onde você quer.
      </EmptyState>
    </Card>
  );
}
