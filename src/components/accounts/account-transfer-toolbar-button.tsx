import { ArrowRightLeftIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/** Mensagem quando não há contas correntes ativas suficientes para transferir. */
export const ACCOUNT_TRANSFER_REQUIRES_TWO_CHECKING =
  "Para transferir entre contas, cadastre pelo menos duas contas correntes ativas."

export function AccountTransferToolbarButton({
  enabled,
  onPress,
  className,
}: {
  enabled: boolean
  onPress: () => void
  className?: string
}) {
  const button = (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className={className ?? "font-semibold"}
      disabled={!enabled}
      onClick={onPress}
    >
      <ArrowRightLeftIcon data-icon="inline-start" />
      Transferir entre contas
    </Button>
  )

  if (enabled) return button

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{button}</span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs text-pretty">
        {ACCOUNT_TRANSFER_REQUIRES_TWO_CHECKING}
      </TooltipContent>
    </Tooltip>
  )
}
