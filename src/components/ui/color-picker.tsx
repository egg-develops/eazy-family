import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <label htmlFor="color-picker" className="cursor-pointer">
          <div
            className="size-12 cursor-pointer rounded-lg border-2 border-muted-foreground/20 hover:border-muted-foreground/40 transition-colors"
            style={{ backgroundColor: value }}
          />
        </label>
        <Input
          id="color-picker"
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
      </div>
      <div className="flex-1 space-y-1">
        <Label htmlFor="color-input">Custom Accent Color</Label>
        <Input
          id="color-input"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="font-mono"
        />
      </div>
    </div>
  );
}
