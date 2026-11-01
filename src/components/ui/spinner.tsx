import { HugeiconsIcon } from "@hugeicons/react"
import { Loading03Icon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"

function Spinner({ className, ...props }: Omit<React.ComponentProps<"svg">, "ref">) {
  return <HugeiconsIcon icon={Loading03Icon} role="status" aria-label="Loading" className={cn("size-4 animate-spin", className)} {...(props as object)} />
}

export { Spinner }
