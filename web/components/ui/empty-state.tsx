"use client"

import { Button } from "@/components/ui/button"

interface EmptyStateProps {
  message: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      <p className="text-gray-500 mb-4">{message}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="bg-orange-500 hover:bg-orange-600">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
