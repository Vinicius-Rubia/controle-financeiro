import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface PageIntroProps {
  title: string
  description: string
  className?: string
}

/** Bloco introdutório reutilizável no topo das páginas. */
export function PageIntro({ title, description, className }: PageIntroProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  )
}
