"use client"

import { Plus, X } from "lucide-react"
import { Request, Floor } from "../types"

interface Props {
  form: Partial<Request>
  set: (k: keyof Request, v: unknown) => void
  updateTotalArea: (floors: Floor[]) => void
}

export function WizardStep3({ form, set, updateTotalArea }: Props) {
  const addFloor = () => {
    const labels = ["GF", "FF", "2F", "3F", "4F", "5F", "6F", "7F", "8F", "9F", "10F"]
    const current = form.floors || []
    const next = labels[current.length] || `${current.length}F`
    updateTotalArea([...current, { label: next, area: 0 }])
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-4">
        <h3 className="font-semibold text-foreground">Building Specifications</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Building Type *</label>
            <select
              value={form.buildingType || "g+2"}
              onChange={e => set("buildingType", e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5E]/30 focus:border-[#006B5E] bg-white"
            >
              <option value="villa_lower">Villa Lower</option>
              <option value="villa_higher">Villa Higher</option>
              {["g+1","g+2","g+3","g+4","g+5","g+6","g+7","g+8","g+9","g+10","g+11+"].map(g => (
                <option key={g} value={g}>{g.toUpperCase()} Building</option>
              ))}
              <option value="hall">Multi-Purpose Hall</option>
              <option value="factory">Factory</option>
              <option value="warehouse">Warehouse</option>
            </select>
          </div>
          {[
            { label: "Present Use", key: "presentUse", placeholder: "e.g. G+2 Residence" },
            { label: "Construction Permit No.", key: "permitNo", placeholder: "CP/XXX/XXXX/XXXXX" },
            { label: "Title Deed No.", key: "titleDeedNo", placeholder: "TD-AA-XXX-XXXX-XXXXX" },
            { label: "Condition", key: "condition", type: "select", opts: [["new", "New"], ["moderate", "Moderate"], ["old", "Old"], ["very_old", "Very Old"]] },
            { label: "Year Built", key: "yearBuilt", type: "number", placeholder: "YYYY" },
          ].map((f: any) => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">{f.label}</label>
              {f.type === "select" ? (
                <select
                  value={(form as any)[f.key] || ""}
                  onChange={e => set(f.key as keyof Request, e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5E]/30 focus:border-[#006B5E] bg-white"
                >
                  {f.opts.map(([v, l]: [string, string]) => <option key={v} value={v}>{l}</option>)}
                </select>
              ) : (
                <input
                  type={f.type || "text"}
                  placeholder={f.placeholder}
                  value={(form as any)[f.key] || ""}
                  onChange={e => set(f.key as keyof Request, f.type === "number" ? parseInt(e.target.value) || 0 : e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5E]/30 focus:border-[#006B5E]"
                />
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Wall Type", key: "wallType", opts: ["HCB", "HCB with RC Frame", "Stone Masonry", "Brick", "Wood", "Other"] },
            { label: "Roof Type", key: "roofType", opts: ["Tiles", "EGA Sheet", "RC Slab", "Asbestos", "Thatch"] },
            { label: "Floor Finish", key: "floorFinish", opts: ["Tiles", "Marble", "Ceramic Tiles", "Cement Screed", "Terrazzo", "Parquet"] },
            { label: "Lighting System", key: "lighting", opts: ["Electrical", "Electrical with Solar Backup", "Solar", "None"] },
            { label: "Doors & Windows", key: "doorsWindows", opts: ["Aluminium", "Aluminium with Double Glass", "Steel", "Aluminium with Tempered Glass", "Wood"] },
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

      {/* Floor areas */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground text-sm">Floor Areas (m²)</h3>
          <button
            onClick={addFloor}
            className="text-[#006B5E] hover:bg-[#006B5E]/10 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
          >
            <Plus size={13} /> Add Floor
          </button>
        </div>
        {(form.floors || []).map((fl, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-12 h-9 bg-muted rounded-lg flex items-center justify-center text-xs font-bold text-[#006B5E]">{fl.label}</div>
            <input
              type="number"
              placeholder="Area in m²"
              value={fl.area || ""}
              onChange={e => {
                const floors = [...(form.floors || [])]
                floors[i] = { ...floors[i], area: parseFloat(e.target.value) || 0 }
                updateTotalArea(floors)
              }}
              className="flex-1 border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#006B5E]/30 focus:border-[#006B5E]"
            />
            <span className="text-xs text-muted-foreground">m²</span>
            {i > 0 && (
              <button
                onClick={() => {
                  const floors = (form.floors || []).filter((_, j) => j !== i)
                  updateTotalArea(floors)
                }}
                className="text-red-400 hover:text-red-600 p-1 rounded transition-colors"
              ><X size={14} /></button>
            )}
          </div>
        ))}
        <div className="flex justify-between items-center pt-2 border-t border-border">
          <span className="text-sm font-medium text-foreground">Total Building Area</span>
          <span className="font-mono font-bold text-[#006B5E]">{(form.totalArea || 0).toFixed(2)} m²</span>
        </div>
      </div>

      {/* Fence & Compound per BRD 4.2.11 */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-4">
        <h3 className="font-semibold text-foreground text-sm">Fence & Compound</h3>
        <h4 className="text-xs font-medium text-muted-foreground mt-4 mb-2">Fence Information</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Fence Length (m)</label>
            <input
              type="number"
              value={form.fenceLength || ""}
              onChange={e => set("fenceLength", parseFloat(e.target.value) || 0)}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#006B5E]/30 focus:border-[#006B5E]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Fence Type</label>
            <select
              value={form.fenceType || "hcb"}
              onChange={e => set("fenceType", e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5E]/30 focus:border-[#006B5E] bg-white"
            >
              <option value="hcb">HCB (ETB 1,400/m)</option>
              <option value="stone">Stone Masonry (ETB 1,700/m)</option>
              <option value="brick">Brick (ETB 1,900/m)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Fence Height (m)</label>
            <input
              type="number"
              step="0.1"
              value={form.fenceHeight || ""}
              onChange={e => set("fenceHeight", parseFloat(e.target.value) || 1.8)}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#006B5E]/30 focus:border-[#006B5E]"
            />
          </div>
        </div>
        <h4 className="text-xs font-medium text-muted-foreground mt-4 mb-2">Compound Information</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Compound Area (m²)</label>
            <input
              type="number"
              value={form.compoundArea || ""}
              onChange={e => set("compoundArea", parseFloat(e.target.value) || 0)}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#006B5E]/30 focus:border-[#006B5E]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Compound Surface Type</label>
            <select
              value={form.compoundType || "Asphalt"}
              onChange={e => set("compoundType", e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5E]/30 focus:border-[#006B5E] bg-white"
            >
              <option value="Asphalt">Asphalt</option>
              <option value="Concrete">Concrete</option>
              <option value="Stone">Stone Pavement</option>
              <option value="Gravel">Gravel</option>
              <option value="Tile">Ceramic Tile</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
