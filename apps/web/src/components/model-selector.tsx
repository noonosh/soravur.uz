"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calculator, BookOpen, Code2, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import modelsConfig from "../../../../models.json";

export type ModelType = "maths" | "literature" | "programming";

interface ModelOption {
  id: ModelType;
  name: string;
  description: string;
  icon: React.ReactNode;
  model: string; // Actual model name for the API
}

const ICON_MAP: Record<string, React.ReactNode> = {
  calculator: <Calculator className="h-4 w-4" strokeWidth={1.5} />,
  "book-open": <BookOpen className="h-4 w-4" strokeWidth={1.5} />,
  "code-2": <Code2 className="h-4 w-4" strokeWidth={1.5} />,
};

const MODEL_OPTIONS: ModelOption[] = modelsConfig.models.map(
  (model: {
    id: string;
    displayName: string;
    description: string;
    icon: string;
    openRouterModel: string;
  }) => ({
    id: model.id as ModelType,
    name: model.displayName,
    description: model.description,
    icon:
      ICON_MAP[model.icon] || (
        <Calculator className="h-4 w-4" strokeWidth={1.5} />
      ),
    model: model.openRouterModel,
  })
);

interface ModelSelectorProps {
  selectedModel: ModelType;
  onModelChange: (model: ModelType) => void;
}

export function ModelSelector({
  selectedModel,
  onModelChange,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const currentModel = MODEL_OPTIONS.find((m) => m.id === selectedModel)!;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 h-9 px-3.5 rounded-full border border-border/70 hover:bg-muted/60 hover:border-border w-full md:w-auto md:min-w-[180px] justify-center font-medium"
        >
          <span className="text-muted-foreground">{currentModel.icon}</span>
          <span className="text-sm tracking-tight">{currentModel.name}</span>
          <ChevronDown
            className="h-3.5 w-3.5 opacity-50"
            strokeWidth={1.5}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="center"
        sideOffset={8}
        className="w-72 p-1.5 border-border/70"
      >
        {MODEL_OPTIONS.map((option) => {
          const isActive = option.id === selectedModel;
          return (
            <DropdownMenuItem
              key={option.id}
              onClick={() => {
                onModelChange(option.id);
                setOpen(false);
              }}
              className={cn(
                "flex items-start gap-3 p-2.5 rounded-sm cursor-pointer focus:bg-muted",
                isActive && "bg-muted/60"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 grid place-items-center size-7 rounded-md border border-border/70 bg-background",
                  isActive && "border-foreground/40"
                )}
              >
                {option.icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium tracking-tight">
                    {option.name}
                  </span>
                  {isActive && (
                    <Check className="h-3.5 w-3.5 text-brand" strokeWidth={2} />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                  {option.description}
                </p>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function getModelByType(type: ModelType): string {
  return (
    MODEL_OPTIONS.find((m) => m.id === type)?.model || MODEL_OPTIONS[0].model
  );
}
