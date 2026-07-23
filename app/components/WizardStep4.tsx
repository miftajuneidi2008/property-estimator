"use client"

import { Check } from "lucide-react"
import { Request } from "../types"

interface Props {
  form: Partial<Request>
  set: (k: keyof Request, v: unknown) => void
}

export function WizardStep4({ form, set }: Props) {
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-5">
      <h3 className="font-semibold text-foreground">Documents & Additional Information</h3>

      <div>
        <h4 className="text-sm font-medium text-foreground mb-3">Required Documents</h4>
        <div className="space-y-2">
          {[
            { key: "titleDeed", label: "Title Deed / Ownership Certificate", required: true },
            { key: "permit", label: "Construction Permit", required: true },
            { key: "plan", label: "Approved Architectural Plan", required: false },
            { key: "photos", label: "Property Photos (min. 4)", required: true },
            { key: "gps", label: "GPS Screenshot / Map", required: true },
          ].map(d => (
            <label key={d.key} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer transition-colors">
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${(form.docs as any)?.[d.key] ? "bg-[#006B5E] border-[#006B5E]" : "border-gray-300"}`}
                onClick={() => set("docs", { ...(form.docs || {}), [d.key]: !(form.docs as any)?.[d.key] })}>
                {(form.docs as any)?.[d.key] && <Check size={12} className="text-white" />}
              </div>
              <span className="text-sm text-foreground flex-1">{d.label}</span>
              {d.required && <span className="text-xs text-red-500 font-medium">Required</span>}
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">GPS Coordinates</label>
          <input
            type="text"
            placeholder="8.959403, 38.795122"
            value={form.gpsCoords || ""}
            onChange={e => set("gpsCoords", e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#006B5E]/30 focus:border-[#006B5E]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Any Thatched Roof on Site?</label>
          <div className="flex gap-3">
            {["Yes", "No"].map(opt => (
              <label key={opt} className={`flex items-center gap-2 px-4 py-2.5 border-2 rounded-lg cursor-pointer transition-colors text-sm ${(form.hasTatchedRoof ? "Yes" : "No") === opt ? "border-[#006B5E] bg-[#006B5E]/5 text-[#006B5E] font-medium" : "border-border text-foreground"}`}>
                <input type="radio" className="sr-only" checked={(form.hasTatchedRoof ? "Yes" : "No") === opt} onChange={() => set("hasTatchedRoof", opt === "Yes")} />
                {opt}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Remarks / Additional Notes</label>
        <textarea
          value={form.remarks || ""}
          onChange={e => set("remarks", e.target.value)}
          placeholder="Any relevant notes, observations, or discrepancies to flag…"
          className="w-full border border-border rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#006B5E]/30 focus:border-[#006B5E]"
          rows={3}
        />
      </div>
    </div>
  )
}
