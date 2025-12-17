"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calculator, BookOpen, Code2, ChevronDown } from "lucide-react";

export type ModelType = "maths" | "literature" | "programming";

interface ModelOption {
  id: ModelType;
  name: string;
  description: string;
  icon: React.ReactNode;
  model: string; // Actual model name for the API
}

const MODEL_OPTIONS: ModelOption[] = [
  {
    id: "maths",
    name: "Matematika",
    description: "Matematik masalalar uchun",
    icon: <Calculator className="h-4 w-4" />,
    model: "openai/gpt-oss-20b:free", // Free, excellent for math reasoning
  },
  {
    id: "literature",
    name: "Adabiyot",
    description: "Adabiyot va yozuv uchun",
    icon: <BookOpen className="h-4 w-4" />,
    model: "mistralai/devstral-2512:free", // Free, great for literature and writing
  },
  {
    id: "programming",
    name: "Dasturlash",
    description: "Kod yozish va tushuntirish uchun",
    icon: <Code2 className="h-4 w-4" />,
    model: "kwaipilot/kat-coder-pro:free", // Free, specialized for coding
  },
];

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
          variant="outline"
          size="sm"
          className="gap-2 h-9 px-4 w-full md:w-auto justify-center md:min-w-[160px]"
        >
          {currentModel.icon}
          <span className="font-medium text-sm">{currentModel.name}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {MODEL_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.id}
            onClick={() => {
              onModelChange(option.id);
              setOpen(false);
            }}
            className="flex items-start gap-3 p-3 cursor-pointer"
          >
            <div className="mt-0.5">{option.icon}</div>
            <div className="flex-1">
              <div className="font-medium text-sm">{option.name}</div>
              <div className="text-xs text-muted-foreground">
                {option.description}
              </div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function getModelByType(type: ModelType): string {
  return (
    MODEL_OPTIONS.find((m) => m.id === type)?.model || MODEL_OPTIONS[0].model
  );
}
