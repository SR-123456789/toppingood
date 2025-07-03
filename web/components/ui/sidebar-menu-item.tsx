"use client"

import { Button } from "@/components/ui/button"
import type { LucideIcon } from "lucide-react"

interface SidebarMenuItemProps {
  icon: LucideIcon
  label: string
  isActive: boolean
  onClick: () => void
}

export function SidebarMenuItem({ icon: Icon, label, isActive, onClick }: SidebarMenuItemProps) {
  return (
    <Button
      variant="ghost"
      className={`w-full justify-start px-4 py-3 h-auto ${
        isActive ? "bg-orange-50 text-orange-600 border-r-2 border-orange-600" : "text-gray-700 hover:bg-gray-50"
      }`}
      onClick={onClick}
    >
      <Icon className="w-6 h-6 mr-4" />
      <span className="text-lg">{label}</span>
    </Button>
  )
}
