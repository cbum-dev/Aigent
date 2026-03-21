"use client"

import * as React from "react"
import { Check, Palette } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

const themes = [
  {
    name: "Violet",
    color: "263 70% 50%",
    hex: "#8b5cf6",
  },
  {
    name: "Blue",
    color: "221 83% 53%",
    hex: "#3b82f6",
  },
  {
    name: "Rose",
    color: "346 84% 61%",
    hex: "#f43f5e",
  },
  {
    name: "Orange",
    color: "24 95% 53%",
    hex: "#f97316",
  },
  {
    name: "Green",
    color: "142 71% 45%",
    hex: "#22c55e",
  },
]

export function ThemeCustomizer() {
  const [currentTheme, setCurrentTheme] = React.useState("Violet")

  React.useEffect(() => {
    // Determine current theme from local storage or default
    const savedTheme = localStorage.getItem("aigent-accent-theme")
    if (savedTheme) {
      const theme = themes.find(t => t.name === savedTheme)
      if (theme) {
        applyTheme(theme)
      }
    }
  }, [])

  const applyTheme = (theme: typeof themes[0]) => {
    const root = document.documentElement
    root.style.setProperty("--primary", `hsl(${theme.color})`)
    root.style.setProperty("--ring", `hsl(${theme.color})`)
    root.style.setProperty("--sidebar-primary", `hsl(${theme.color})`)
    root.style.setProperty("--sidebar-ring", `hsl(${theme.color})`)
    // We can update other variables if needed
    
    setCurrentTheme(theme.name)
    localStorage.setItem("aigent-accent-theme", theme.name)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Palette className="h-4 w-4" />
          <span className="sr-only">Customize theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel>Accent Color</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {themes.map((theme) => (
          <DropdownMenuItem
            key={theme.name}
            onClick={() => applyTheme(theme)}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <div
                className="h-4 w-4 rounded-full border border-black/10 shadow-sm"
                style={{ backgroundColor: theme.hex }}
              />
              <span className="text-sm font-medium">{theme.name}</span>
            </div>
            {currentTheme === theme.name && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
