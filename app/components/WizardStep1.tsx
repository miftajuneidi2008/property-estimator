"use client"

import { Request } from "../types"
import { CITIES, getSubCities } from "../lib/city-config"

interface Props {
  form: Partial<Request>
  set: (k: keyof Request, v: unknown) => void
}

export function WizardStep1({ form, set }: Props) {
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-4">
      <h3 className="font-semibold text-foreground">Applicant & Property Information</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { label: "Applicant Full Name *", key: "applicantName", type: "text", placeholder: "Full legal name" },
          { label: "Applicant Phone", key: "applicantPhone", type: "tel", placeholder: "+251-9XX-XXX-XXX" },
          { label: "Ownership Certificate No. *", key: "ownershipCNo", type: "text", placeholder: "AA-XXX-XX-XXXX-XXXXX" },
          { label: "Financing Amount Requested (ETB)", key: "financingRequested", type: "number", placeholder: "0.00" },
        ].map(f => (
          <div key={f.key}>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">{f.label}</label>
            <input
              type={f.type}
              placeholder={f.placeholder}
              value={(form as any)[f.key] || ""}
              onChange={e => set(f.key as keyof Request, f.type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5E]/30 focus:border-[#006B5E]"
            />
          </div>
        ))}
      </div>
      <hr className="border-border" />
      <h4 className="font-medium text-foreground text-sm">Property Location</h4>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* City Dropdown - from Location Value Sheets */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">City / Town *</label>
          <select
            value={form.town || "Addis Ababa"}
            onChange={e => set("town", e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5E]/30 focus:border-[#006B5E] bg-white"
          >
            {CITIES.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>
        {/* Sub-City: Dropdown for Addis Ababa, text input for others */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Sub-City</label>
          {form.town === "Addis Ababa" ? (
            <select
              value={form.subCity || ""}
              onChange={e => set("subCity", e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5E]/30 focus:border-[#006B5E] bg-white"
            >
              <option value="">Select sub-city...</option>
              {getSubCities("Addis Ababa").map(subCity => (
                <option key={subCity} value={subCity}>{subCity}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={form.subCity || ""}
              onChange={e => set("subCity", e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5E]/30 focus:border-[#006B5E]"
            />
          )}
        </div>
        {[
          { label: "Woreda", key: "woreda" },
          { label: "House No.", key: "houseNo" },
        ].map(f => (
          <div key={f.key}>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">{f.label}</label>
            <input
              type="text"
              value={(form as any)[f.key] || ""}
              onChange={e => set(f.key as keyof Request, e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5E]/30 focus:border-[#006B5E]"
            />
          </div>
        ))}
        {[
          { label: "Plot Area (m²) *", key: "plotArea", type: "number" },
          { label: "Distance from Main Road", key: "distanceFromMain" },
        ].map(f => (
          <div key={f.key}>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">{f.label}</label>
            <input
              type={f.type || "text"}
              value={(form as any)[f.key] || ""}
              onChange={e => set(f.key as keyof Request, f.type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5E]/30 focus:border-[#006B5E]"
            />
          </div>
        ))}
      </div>
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Type of Access Road</label>
        <div className="flex gap-3">
          {["Asphalt", "Gravel", "Cobble"].map(opt => (
            <label key={opt} className={`flex items-center gap-2 px-4 py-2.5 border-2 rounded-lg cursor-pointer transition-colors text-sm ${form.accessRoad === opt ? "border-[#006B5E] bg-[#006B5E]/5 text-[#006B5E] font-medium" : "border-border text-foreground hover:border-gray-300"}`}>
              <input type="radio" className="sr-only" checked={form.accessRoad === opt} onChange={() => set("accessRoad", opt)} />
              {opt}
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
