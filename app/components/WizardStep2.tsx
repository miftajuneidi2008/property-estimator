"use client"

import { Request } from "../types"

interface Props {
  form: Partial<Request>
  set: (k: keyof Request, v: unknown) => void
}

export function WizardStep2({ form, set }: Props) {
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-4">
      <h3 className="font-semibold text-foreground">Neighborhood Analysis</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { label: "General Use", key: "generalUse", opts: ["Residential", "Commercial", "Industrial", "Mixed Use"] },
          { label: "Marketability", key: "marketability", opts: ["Highly Marketable", "Marketable", "Limited", "Not Marketable"] },
          { label: "Standard of Housing", key: "housingStandard", opts: ["Excellent", "Good", "Average", "Poor"] },
          { label: "Development State", key: "developmentState", opts: ["Fully Developed", "Developed", "Developing", "Undeveloped"] },
          { label: "Future Tendency", key: "futureTendency", opts: ["Very Promising", "Promising", "Stable", "Declining"] },
          { label: "Transportation Facilities", key: "transportation", opts: ["Highly Accessible", "Very Accessible", "Accessible", "Limited"] },
          { label: "Utilities (Water, Power, etc.)", key: "utilities", opts: ["Available", "Partially Available", "Not Available"] },
        ].map(f => (
          <div key={f.key}>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">{f.label}</label>
            <select
              value={(form as any)[f.key] || ""}
              onChange={e => set(f.key as keyof Request, e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5E]/30 focus:border-[#006B5E] bg-white"
            >
              {f.opts.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  )
}
