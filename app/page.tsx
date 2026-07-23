"use client"

import { useState, useEffect } from "react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts"
import {
  Building2, FileText, CheckCircle, XCircle, Clock, TrendingUp,
  MapPin, LogOut, Plus, Search, Eye, ArrowLeft,
  Shield, BarChart2, Bell, AlertCircle, Home, Menu, X,
  Users, Download, ChevronRight, Hash, Layers,
  Phone, Check, Calculator, Info
} from "lucide-react"
import { Toaster, toast } from "sonner"
import { WizardStep1 } from "./components/WizardStep1"
import { WizardStep2 } from "./components/WizardStep2"
import { WizardStep3 } from "./components/WizardStep3"
import { WizardStep4 } from "./components/WizardStep4"
import { Role, Status, View, AppUser, Floor, ValResult, Request } from "./types"

// ─── Valuation Engine ───────────────────────────────────────────────
const UNIT_RATES: Record<string, number> = {
  villa_lower: 28500, villa_higher: 52000,
  "g+1": 38000, "g+2": 42000, "g+3": 45000, "g+4": 47500,
  "g+5": 50000, "g+6": 52000, "g+7": 54000, "g+8": 56000,
  "g+9": 57500, "g+10": 59000, "g+11+": 62000,
  hall: 32000, factory: 22000, warehouse: 18000
}
const ELEC_RATES: Record<string, number> = {
  villa_lower: 0.04, villa_higher: 0.04,
  "g+1": 0.055, "g+2": 0.055, "g+3": 0.07, "g+4": 0.07,
  "g+5": 0.08, "g+6": 0.08, "g+7": 0.085, "g+8": 0.085,
  "g+9": 0.09, "g+10": 0.09, "g+11+": 0.10,
  hall: 0.04, factory: 0.05, warehouse: 0.04
}
const LOC_RATES: Record<string, number> = {
  "bole": 22000, "kirkos": 17500, "yeka": 13000, "arada": 16500,
  "lideta": 15000, "nifas silk-lafto": 26400, "kolfe keranio": 9500,
  "akaki kality": 6500, "gulele": 11500, "addis ketema": 15500,
  "outside_aa": 4000
}
// Consultancy fee with weighted components per BRD section 4.2.13
function getConsultancyRate(projectCost: number): { baseRate: number; architecturalWeight: number; structuralWeight: number; electricalWeight: number; saninaryWeight: number; boqWeight: number } {
  let baseRate = 0.0425
  if (projectCost <= 500000) baseRate = 0.0425
  else if (projectCost <= 1000000) baseRate = 0.0375
  else if (projectCost <= 2500000) baseRate = 0.0325
  else if (projectCost <= 5000000) baseRate = 0.0275
  else if (projectCost <= 10000000) baseRate = 0.0225
  else baseRate = 0.0175
  
  return {
    baseRate,
    architecturalWeight: 0.45,
    structuralWeight: 0.30,
    electricalWeight: 0.10,
    saninaryWeight: 0.0275,
    boqWeight: 0.0225
  }
}

function calculateConsultancyFee(projectCost: number): number {
  const rates = getConsultancyRate(projectCost)
  // Assuming Structural plan as per BRD example (could be enhanced with user selection)
  return projectCost * rates.baseRate * rates.structuralWeight
}

function depreciationRate(condition: string, yearBuilt: number) {
  const age = new Date().getFullYear() - yearBuilt
  // Per BRD: depreciation applied to building cost only
  if (condition === "new") return age < 5 ? 0.02 : 0.05
  if (condition === "moderate") return age < 15 ? 0.08 : age < 25 ? 0.15 : 0.22
  if (condition === "old") return age < 25 ? 0.28 : age < 40 ? 0.38 : 0.48
  return Math.min(0.45 + (age - 30) * 0.01, 0.70)
}
function calcValuation(r: Partial<Request>): ValResult {
  const bType = r.buildingType || "g+2"
  const area = r.totalArea || 0
  const buildingCost = area * (UNIT_RATES[bType] || 38000)
  const internalStructureCost = bType.startsWith("villa") ? 200000 : buildingCost * 0.02
  const externalElectricalCost = buildingCost * (ELEC_RATES[bType] || 0.055)
  
  // ─── Fence & Compound Calculation per BRD 4.2.11 ───
  // Fence Cost = Fence Length (m) × Fence Rate (ETB/m)
  const fenceCostPerM = r.fenceType === "brick" ? 1900 : r.fenceType === "stone" ? 1700 : 1400
  const fenceCost = (r.fenceLength || 0) * fenceCostPerM
  // Compound Cost = Compound Area (m²) × Unit Rate (ETB/m²)
  // Standard compound rate (can be parameterized from reference data)
  const compoundUnitRate = 850 // ETB/m² - can be updated from reference tables
  const compoundCost = (r.compoundArea || 0) * compoundUnitRate
  const fenceCompoundCost = fenceCost + compoundCost
  
  // Project Cost = Building Cost + Internal Structure + External Works + Fence & Compound
  const projectCost = buildingCost + internalStructureCost + externalElectricalCost + fenceCompoundCost
  
  // ─── Consultancy Fee Calculation per BRD 4.2.13 ───
  const consultancyCost = calculateConsultancyFee(projectCost)
  
  // Location Value (Land Value per BRD 4.2.1)
  const locRate = LOC_RATES[(r.subCity || "bole").toLowerCase()] || LOC_RATES["bole"]
  const locationValue = (r.plotArea || 0) * locRate
  
  // ─── Depreciation per BRD 4.2.15 ───
  // Depreciation applies only to building costs, not location value
  const depRate = depreciationRate(r.condition || "moderate", r.yearBuilt || 2010)
  const depAmount = (buildingCost + internalStructureCost + externalElectricalCost) * depRate
  
  // Final Property Value = Land Value + Building Value + External Works + Fence & Compound + Consultancy Fee - Depreciation
  const totalConstruction = buildingCost + internalStructureCost + externalElectricalCost + fenceCompoundCost + consultancyCost
  const marketValue = totalConstruction - depAmount + locationValue
  
  return {
    buildingCost, internalStructureCost, externalElectricalCost, fenceCompoundCost,
    consultancyCost, locationValue, depRate, depAmount, marketValue,
    marketLow: marketValue * 0.90, marketHigh: marketValue * 1.10,
    forcedSaleValue: marketValue * 0.90
  }
}

// ─── Utilities ──────────────────────────────────────────────────────
const ETB = (n: number) => `ETB ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtDate = (s: string) => new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
const fmtDateTime = (s: string) => new Date(s).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
function genRef() { return `ZZB-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}` }
function genId() { return Math.random().toString(36).slice(2, 9) }

const STATUS_STYLE: Record<Status, string> = {
  draft: "bg-gray-100 text-gray-600",
  pending: "bg-amber-100 text-amber-700",
  under_review: "bg-blue-100 text-blue-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  revision: "bg-purple-100 text-purple-700"
}
const STATUS_LABEL: Record<Status, string> = {
  draft: "Draft", pending: "Pending Review", under_review: "Under Review",
  approved: "Approved", rejected: "Rejected", revision: "Revision Requested"
}
const ROLE_LABEL: Record<Role, string> = {
  branch_manager: "Branch Manager", engineer: "Engineer / Appraiser",
  final_approver: "Final Approver", admin: "System Admin"
}

// ─── Demo Data ──────────────────────────────────────────────────────
const USERS: AppUser[] = [
  { id: "u1", name: "Ahmed Mohammed", role: "branch_manager", branch: "Bole Branch", initials: "AM" },
  { id: "u2", name: "Eng. Fatima Hassan", role: "engineer", branch: "Head Office", initials: "FH" },
  { id: "u3", name: "Dir. Ibrahim Yusuf", role: "final_approver", branch: "Head Office", initials: "IY" },
  { id: "u4", name: "System Admin", role: "admin", branch: "Head Office", initials: "SA" },
]

const SEED: Request[] = [
  {
    id: "r1", refNo: "ZZB-2023-0041", status: "approved",
    branch: "Bole Branch", submittedBy: "Ahmed Mohammed", submittedAt: "2023-12-15T09:23:00Z",
    financingRequested: 8000000,
    applicantName: "Dawit Kebede Haile", applicantPhone: "+251-911-234-567",
    ownershipCNo: "AA-NSL-02-2023-04521",
    town: "Addis Ababa", subCity: "Nifas Silk-Lafto", woreda: "02",
    plotArea: 94, compoundArea: 94, accessRoad: "Cobble",
    landMark: "Near Megenagna Square", distanceFromMain: "200m",
    generalUse: "Residential", marketability: "Marketable", housingStandard: "Excellent",
    developmentState: "Developing", futureTendency: "Promising",
    transportation: "Accessible", utilities: "Available",
    buildingType: "g+2", totalArea: 224.38,
    floors: [{ label: "GF", area: 73.83 }, { label: "FF", area: 75.28 }, { label: "2F", area: 75.28 }],
    wallType: "HCB", roofType: "Tiles", floorFinish: "Tiles",
    lighting: "Electrical", doorsWindows: "Aluminium",
    condition: "moderate", yearBuilt: 2018,
    permitNo: "CP/NSL/2017/04521", titleDeedNo: "TD-AA-NSL-2023-04521",
    presentUse: "G+2 Residence Building",
    fenceLength: 60, fenceType: "hcb",
    gpsCoords: "8.959403, 38.795122", hasTatchedRoof: false,
    docs: { titleDeed: true, permit: true, plan: true, photos: true, gps: true },
    remarks: "Valuation based on actual measurement. Approved plan verified by engineer.",
    valuation: {
      buildingCost: 9446280.12, internalStructureCost: 200000.00,
      externalElectricalCost: 429022.54, fenceCompoundCost: 249393.01,
      consultancyCost: 81306.98, locationValue: 2478592.00,
      depRate: 0.05, depAmount: 472030.13,
      marketValue: 12884594.65, marketLow: 11596135.19,
      marketHigh: 14173054.12, forcedSaleValue: 11596135.19
    },
    engineerNotes: "Property physically verified on 12/08/2023. Building measurements confirmed. All submitted documents authentic and consistent with the property.",
    reviewedBy: "Eng. Fatima Hassan", reviewedAt: "2024-01-18T14:30:00Z",
    approvedBy: "Dir. Ibrahim Yusuf", approvedAt: "2024-01-20T10:15:00Z"
  },
  {
    id: "r2", refNo: "ZZB-2024-0018", status: "under_review",
    branch: "Kirkos Branch", submittedBy: "Maryam Tesfaye", submittedAt: "2024-05-08T11:00:00Z",
    financingRequested: 15000000,
    applicantName: "Solomon Girma Tadesse", applicantPhone: "+251-912-345-678",
    ownershipCNo: "AA-KIR-05-2022-09876",
    town: "Addis Ababa", subCity: "Kirkos", woreda: "05",
    plotArea: 250, compoundArea: 300, accessRoad: "Asphalt",
    landMark: "Behind Bole International Airport", distanceFromMain: "50m",
    generalUse: "Commercial", marketability: "Highly Marketable", housingStandard: "Good",
    developmentState: "Developed", futureTendency: "Stable",
    transportation: "Very Accessible", utilities: "Available",
    buildingType: "g+4", totalArea: 1250,
    floors: [
      { label: "GF", area: 250 }, { label: "FF", area: 250 }, { label: "2F", area: 250 },
      { label: "3F", area: 250 }, { label: "4F", area: 250 }
    ],
    wallType: "HCB with RC Frame", roofType: "RC Slab", floorFinish: "Marble",
    lighting: "Electrical", doorsWindows: "Aluminium with Double Glass",
    condition: "new", yearBuilt: 2022,
    permitNo: "CP/KIR/2020/00321", titleDeedNo: "TD-AA-KIR-2022-09876",
    presentUse: "G+4 Commercial Office Building",
    fenceLength: 120, fenceType: "brick",
    gpsCoords: "9.005403, 38.763211", hasTatchedRoof: false,
    docs: { titleDeed: true, permit: true, plan: true, photos: true, gps: true },
    remarks: "",
    reviewedBy: "Eng. Fatima Hassan", reviewedAt: "2024-05-10T09:00:00Z"
  },
  {
    id: "r3", refNo: "ZZB-2024-0031", status: "pending",
    branch: "Yeka Branch", submittedBy: "Hassan Ali", submittedAt: "2024-06-01T14:20:00Z",
    financingRequested: 5500000,
    applicantName: "Tigist Bekele Alemu", applicantPhone: "+251-913-456-789",
    ownershipCNo: "AA-YEK-08-2020-03344",
    town: "Addis Ababa", subCity: "Yeka", woreda: "08",
    plotArea: 175, compoundArea: 200, accessRoad: "Gravel",
    landMark: "Near Medhane Alem Church", distanceFromMain: "350m",
    generalUse: "Residential", marketability: "Marketable", housingStandard: "Average",
    developmentState: "Developing", futureTendency: "Promising",
    transportation: "Accessible", utilities: "Available",
    buildingType: "villa_higher", totalArea: 320,
    floors: [{ label: "GF", area: 180 }, { label: "FF", area: 140 }],
    wallType: "HCB", roofType: "EGA", floorFinish: "Ceramic Tiles",
    lighting: "Electrical", doorsWindows: "Aluminium",
    condition: "moderate", yearBuilt: 2015,
    permitNo: "CP/YEK/2013/01122", titleDeedNo: "TD-AA-YEK-2020-03344",
    presentUse: "Villa Higher Residence",
    fenceLength: 80, fenceType: "stone",
    gpsCoords: "9.042503, 38.822400", hasTatchedRoof: false,
    docs: { titleDeed: true, permit: true, plan: false, photos: true, gps: true },
    remarks: "Approved plan under preparation, to be submitted upon availability."
  },
  {
    id: "r4", refNo: "ZZB-2024-0044", status: "rejected",
    branch: "Bole Branch", submittedBy: "Ahmed Mohammed", submittedAt: "2024-05-22T08:45:00Z",
    financingRequested: 3200000,
    applicantName: "Abebe Mulugeta", applicantPhone: "+251-914-567-890",
    ownershipCNo: "AA-BOL-03-2019-07788",
    town: "Addis Ababa", subCity: "Bole", woreda: "03",
    plotArea: 120, compoundArea: 130, accessRoad: "Cobble",
    landMark: "Near Dembel City Center", distanceFromMain: "500m",
    generalUse: "Residential", marketability: "Marketable", housingStandard: "Average",
    developmentState: "Stable", futureTendency: "Stable",
    transportation: "Accessible", utilities: "Available",
    buildingType: "g+1", totalArea: 180,
    floors: [{ label: "GF", area: 90 }, { label: "FF", area: 90 }],
    wallType: "HCB", roofType: "EGA", floorFinish: "Cement Screed",
    lighting: "Electrical", doorsWindows: "Wood",
    condition: "old", yearBuilt: 2005,
    permitNo: "CP/BOL/2004/05544", titleDeedNo: "TD-AA-BOL-2019-07788",
    presentUse: "G+1 Residence",
    fenceLength: 50, fenceType: "hcb",
    gpsCoords: "9.012101, 38.790022", hasTatchedRoof: false,
    docs: { titleDeed: true, permit: false, plan: false, photos: true, gps: false },
    remarks: "",
    engineerNotes: "Construction permit could not be verified. Significant discrepancies found between submitted plan and actual building dimensions. Title deed ownership issue: property appears under dispute. Recommend rejection pending legal clarification.",
    reviewedBy: "Eng. Fatima Hassan", reviewedAt: "2024-05-25T11:30:00Z",
    approvedBy: "Dir. Ibrahim Yusuf", approvedAt: "2024-05-27T09:00:00Z"
  },
  {
    id: "r5", refNo: "ZZB-2024-0058", status: "draft",
    branch: "Bole Branch", submittedBy: "Ahmed Mohammed", submittedAt: "2024-06-18T16:00:00Z",
    financingRequested: 12000000,
    applicantName: "Nour Ibrahim Mohammed", applicantPhone: "+251-915-678-901",
    ownershipCNo: "AA-BOL-01-2024-11234",
    town: "Addis Ababa", subCity: "Bole", woreda: "01",
    plotArea: 400, compoundArea: 450, accessRoad: "Asphalt",
    landMark: "Adjacent to Edna Mall", distanceFromMain: "20m",
    generalUse: "Commercial", marketability: "Highly Marketable", housingStandard: "Excellent",
    developmentState: "Developed", futureTendency: "Very Promising",
    transportation: "Highly Accessible", utilities: "Available",
    buildingType: "g+5", totalArea: 2400,
    floors: [
      { label: "GF", area: 400 }, { label: "FF", area: 400 }, { label: "2F", area: 400 },
      { label: "3F", area: 400 }, { label: "4F", area: 400 }, { label: "5F", area: 400 }
    ],
    wallType: "RC Frame with Curtain Wall", roofType: "RC Slab", floorFinish: "Marble",
    lighting: "Electrical with Solar Backup", doorsWindows: "Aluminium with Tempered Glass",
    condition: "new", yearBuilt: 2023,
    permitNo: "CP/BOL/2021/00881", titleDeedNo: "TD-AA-BOL-2024-11234",
    presentUse: "G+5 Mixed-Use Commercial Building",
    fenceLength: 150, fenceType: "brick",
    gpsCoords: "9.008801, 38.789500", hasTatchedRoof: false,
    docs: { titleDeed: true, permit: true, plan: true, photos: false, gps: false },
    remarks: "Site photos and GPS documentation pending field visit."
  },
  {
    id: "r6", refNo: "ZZB-2024-0062", status: "revision",
    branch: "Arada Branch", submittedBy: "Fatuma Osman", submittedAt: "2024-06-10T10:30:00Z",
    financingRequested: 7500000,
    applicantName: "Mulunesh Haile Tesfaye", applicantPhone: "+251-916-789-012",
    ownershipCNo: "AA-ARA-04-2021-05567",
    town: "Addis Ababa", subCity: "Arada", woreda: "04",
    plotArea: 220, compoundArea: 260, accessRoad: "Asphalt",
    landMark: "Near Piassa Market", distanceFromMain: "100m",
    generalUse: "Commercial", marketability: "Highly Marketable", housingStandard: "Good",
    developmentState: "Fully Developed", futureTendency: "Stable",
    transportation: "Very Accessible", utilities: "Available",
    buildingType: "g+3", totalArea: 880,
    floors: [
      { label: "GF", area: 220 }, { label: "FF", area: 220 },
      { label: "2F", area: 220 }, { label: "3F", area: 220 }
    ],
    wallType: "HCB with RC Frame", roofType: "RC Slab", floorFinish: "Ceramic Tiles",
    lighting: "Electrical", doorsWindows: "Aluminium",
    condition: "moderate", yearBuilt: 2016,
    permitNo: "CP/ARA/2014/03321", titleDeedNo: "TD-AA-ARA-2021-05567",
    presentUse: "G+3 Commercial / Residential Mixed-Use",
    fenceLength: 90, fenceType: "hcb",
    gpsCoords: "9.038100, 38.751200", hasTatchedRoof: false,
    docs: { titleDeed: true, permit: true, plan: true, photos: true, gps: true },
    remarks: "",
    engineerNotes: "Revision required: Please provide updated floor-by-floor measurement documentation. Area discrepancy of approximately 15% noted between submitted total and on-site verification. Also confirm land lease document is current.",
    reviewedBy: "Eng. Fatima Hassan", reviewedAt: "2024-06-14T15:00:00Z"
  }
]

// ─── Badge & Status helpers ──────────────────────────────────────────
function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLE[status]}`}>
      {status === "approved" && <Check size={10} />}
      {status === "rejected" && <XCircle size={10} />}
      {status === "pending" && <Clock size={10} />}
      {status === "under_review" && <Eye size={10} />}
      {status === "revision" && <AlertCircle size={10} />}
      {STATUS_LABEL[status]}
    </span>
  )
}

// ─── Login ──────────────────────────────────────────────────────────
function Login({ onLogin }: { onLogin: (u: AppUser) => void }) {
  const [selected, setSelected] = useState<string>("u1")
  return (
    <div className="min-h-screen bg-[#003d35] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-xl mb-4">
            <Building2 size={40} className="text-[#006B5E]" />
          </div>
          <h1 className="text-white text-3xl font-bold tracking-tight">ZamZam Bank</h1>
          <p className="text-emerald-200/80 text-sm mt-1">Property Valuation System</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-[#006B5E] px-6 py-4">
            <h2 className="text-white font-semibold text-lg">Sign In</h2>
            <p className="text-emerald-100/80 text-sm">Select a demo account to continue</p>
          </div>
          <div className="p-6 space-y-3">
            {USERS.map(u => (
              <button
                key={u.id}
                onClick={() => setSelected(u.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                  selected === u.id
                    ? "border-[#006B5E] bg-[#006B5E]/5"
                    : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                  selected === u.id ? "bg-[#006B5E] text-white" : "bg-gray-100 text-gray-600"
                }`}>{u.initials}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm">{u.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{ROLE_LABEL[u.role]} · {u.branch}</p>
                </div>
                {selected === u.id && <Check size={18} className="text-[#006B5E] flex-shrink-0" />}
              </button>
            ))}
          </div>
          <div className="px-6 pb-6">
            <button
              onClick={() => onLogin(USERS.find(u => u.id === selected)!)}
              className="w-full bg-[#006B5E] hover:bg-[#005a4e] text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Sign In as {USERS.find(u => u.id === selected)?.name.split(" ")[0]}
            </button>
          </div>
        </div>
        <p className="text-emerald-200/50 text-xs text-center mt-6">
          ZamZam Bank S.C. · Property Valuation & Estimation Automation System · v1.0
        </p>
      </div>
    </div>
  )
}

// ─── Sidebar ────────────────────────────────────────────────────────
const NAV: Record<Role, { icon: React.ElementType; label: string; view: View }[]> = {
  branch_manager: [
    { icon: Home, label: "Dashboard", view: "dashboard" },
    { icon: Plus, label: "New Request", view: "new_request" },
    { icon: FileText, label: "My Requests", view: "requests" },
  ],
  engineer: [
    { icon: Home, label: "Dashboard", view: "dashboard" },
    { icon: Layers, label: "Pending Reviews", view: "requests" },
    { icon: FileText, label: "All Requests", view: "requests" },
  ],
  final_approver: [
    { icon: Home, label: "Dashboard", view: "dashboard" },
    { icon: Layers, label: "Pending Approvals", view: "requests" },
    { icon: FileText, label: "All Requests", view: "requests" },
  ],
  admin: [
    { icon: Home, label: "Dashboard", view: "dashboard" },
    { icon: FileText, label: "All Requests", view: "requests" },
    { icon: BarChart2, label: "Reports", view: "reports" },
    { icon: Users, label: "User Management", view: "dashboard" },
  ],
}

function Sidebar({
  user, view, onNavigate, onLogout, open, onClose
}: {
  user: AppUser; view: View
  onNavigate: (v: View) => void
  onLogout: () => void
  open: boolean; onClose: () => void
}) {
  const nav = NAV[user.role]
  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-20 md:hidden" onClick={onClose} />}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-[#003d35] flex flex-col z-30 transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}>
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <div className="w-9 h-9 bg-white/15 rounded-lg flex items-center justify-center">
            <Building2 size={20} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">ZamZam Bank</p>
            <p className="text-emerald-300/70 text-xs">Valuation System</p>
          </div>
          <button onClick={onClose} className="ml-auto md:hidden text-white/60 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {nav.map(item => {
            const Icon = item.icon
            const active = view === item.view
            return (
              <button
                key={item.label}
                onClick={() => { onNavigate(item.view); onClose() }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-white/15 text-white"
                    : "text-emerald-100/70 hover:bg-white/8 hover:text-white"
                }`}
              >
                <Icon size={17} />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
            <div className="w-8 h-8 bg-emerald-400/20 rounded-lg flex items-center justify-center text-emerald-300 text-xs font-bold">
              {user.initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{user.name}</p>
              <p className="text-emerald-300/60 text-xs truncate">{user.branch}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-300/70 hover:bg-red-900/30 hover:text-red-300 transition-colors mt-1"
          >
            <LogOut size={17} />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  )
}

// ─── Header ─────────────────────────────────────────────────────────
function Header({ user, title, onMenuClick }: { user: AppUser; title: string; onMenuClick: () => void }) {
  return (
    <header className="sticky top-0 z-10 bg-white border-b border-border px-4 md:px-6 h-14 flex items-center gap-4 shadow-sm">
      <button onClick={onMenuClick} className="md:hidden text-muted-foreground hover:text-foreground">
        <Menu size={20} />
      </button>
      <h1 className="font-semibold text-foreground text-base flex-1">{title}</h1>
      <div className="flex items-center gap-2">
        <button className="relative p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <div className="flex items-center gap-2 pl-2 border-l border-border">
          <div className="w-8 h-8 bg-[#006B5E] rounded-lg flex items-center justify-center text-white text-xs font-bold">
            {user.initials}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-foreground leading-tight">{user.name}</p>
            <p className="text-xs text-muted-foreground">{ROLE_LABEL[user.role]}</p>
          </div>
        </div>
      </div>
    </header>
  )
}

// ─── Dashboard ──────────────────────────────────────────────────────
function Dashboard({ user, requests, onNavigate, onView }: {
  user: AppUser; requests: Request[]
  onNavigate: (v: View) => void
  onView: (id: string) => void
}) {
  const myReqs = user.role === "branch_manager"
    ? requests.filter(r => r.branch === user.branch)
    : requests

  const stats = {
    total: myReqs.length,
    pending: myReqs.filter(r => r.status === "pending").length,
    review: myReqs.filter(r => r.status === "under_review").length,
    approved: myReqs.filter(r => r.status === "approved").length,
    rejected: myReqs.filter(r => r.status === "rejected").length,
    totalCollateral: myReqs.filter(r => r.valuation).reduce((a, r) => a + (r.valuation?.marketValue || 0), 0),
    totalFinancing: myReqs.filter(r => r.financingRequested).reduce((a, r) => a + (r.financingRequested || 0), 0),
  }

  const pieData = [
    { name: "Approved", value: stats.approved, color: "#10b981" },
    { name: "Pending", value: stats.pending, color: "#f59e0b" },
    { name: "Under Review", value: stats.review, color: "#3b82f6" },
    { name: "Rejected", value: stats.rejected, color: "#ef4444" },
  ].filter(d => d.value > 0)

  const monthlyData = [
    { month: "Jan", requests: 4, approved: 3 },
    { month: "Feb", requests: 6, approved: 5 },
    { month: "Mar", requests: 8, approved: 6 },
    { month: "Apr", requests: 5, approved: 4 },
    { month: "May", requests: 9, approved: 7 },
    { month: "Jun", requests: 7, approved: 5 },
  ]

  const recent = myReqs.slice(0, 5)

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-[#006B5E] to-[#00a693] rounded-xl p-5 text-white">
        <p className="text-emerald-100/80 text-sm">Welcome back,</p>
        <h2 className="text-2xl font-bold mt-0.5">{user.name}</h2>
        <p className="text-emerald-100/70 text-sm mt-1">{user.branch} · {ROLE_LABEL[user.role]}</p>
        {user.role === "branch_manager" && (
          <button
            onClick={() => onNavigate("new_request")}
            className="mt-4 inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} /> New Valuation Request
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: "Total Requests", value: stats.total, icon: FileText, color: "text-[#006B5E]", bg: "bg-[#006B5E]/10" },
          { label: "Pending Review", value: stats.pending + stats.review, icon: Clock, color: "text-amber-600", bg: "bg-amber-100" },
          { label: "Approved", value: stats.approved, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-100" },
          { label: "Rejected", value: stats.rejected, icon: XCircle, color: "text-red-600", bg: "bg-red-100" },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className="bg-white rounded-xl border border-border p-4 shadow-sm">
              <div className={`w-10 h-10 ${s.bg} rounded-lg flex items-center justify-center mb-3`}>
                <Icon size={20} className={s.color} />
              </div>
              <p className="text-2xl font-bold text-foreground font-mono">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          )
        })}
      </div>

      {/* Financial summary */}
      {(user.role === "admin" || user.role === "final_approver") && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
            <p className="text-xs text-muted-foreground mb-1">Total Collateral Value</p>
            <p className="text-xl font-bold text-foreground font-mono">
              {(stats.totalCollateral / 1_000_000).toFixed(1)}M
            </p>
            <p className="text-xs text-muted-foreground">ETB (approved valuations)</p>
          </div>
          <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
            <p className="text-xs text-muted-foreground mb-1">Total Financing Requested</p>
            <p className="text-xl font-bold text-foreground font-mono">
              {(stats.totalFinancing / 1_000_000).toFixed(1)}M
            </p>
            <p className="text-xs text-muted-foreground">ETB across all requests</p>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-border p-4 shadow-sm">
          <h3 className="font-semibold text-foreground text-sm mb-4">Monthly Valuation Activity</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData} barSize={14} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="requests" fill="#006B5E" name="Submitted" radius={[3, 3, 0, 0]} />
              <Bar dataKey="approved" fill="#00a693" name="Approved" radius={[3, 3, 0, 0]} />
              <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl border border-border p-4 shadow-sm flex flex-col">
          <h3 className="font-semibold text-foreground text-sm mb-4">Status Distribution</h3>
          <div className="flex-1 flex items-center justify-center">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 mt-2">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                  <span className="text-muted-foreground">{d.name}</span>
                </div>
                <span className="font-mono font-semibold">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent */}
      <div className="bg-white rounded-xl border border-border shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-foreground text-sm">Recent Requests</h3>
          <button onClick={() => onNavigate("requests")} className="text-xs text-[#006B5E] hover:underline">View all →</button>
        </div>
        <div className="divide-y divide-border">
          {recent.length === 0 && (
            <p className="text-center text-muted-foreground py-8 text-sm">No requests yet</p>
          )}
          {recent.map(r => (
            <div key={r.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 cursor-pointer transition-colors" onClick={() => onView(r.id)}>
              <div className="w-8 h-8 bg-[#006B5E]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Building2 size={16} className="text-[#006B5E]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{r.applicantName}</p>
                <p className="text-xs text-muted-foreground">{r.refNo} · {r.subCity}, W{r.woreda}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <StatusBadge status={r.status} />
                <p className="text-xs text-muted-foreground mt-1">{fmtDate(r.submittedAt)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Requests List ───────────────────────────────────────────────────
function RequestsList({ user, requests, onView }: {
  user: AppUser; requests: Request[]; onView: (id: string) => void
}) {
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")

  const myReqs = user.role === "branch_manager"
    ? requests.filter(r => r.branch === user.branch)
    : requests

  const filtered = myReqs.filter(r => {
    const matchSearch = !search ||
      r.applicantName.toLowerCase().includes(search.toLowerCase()) ||
      r.refNo.toLowerCase().includes(search.toLowerCase()) ||
      r.subCity.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === "all" || r.status === filterStatus
    return matchSearch && matchStatus
  })

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by applicant, reference, location…"
            className="w-full bg-white border border-border rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5E]/30 focus:border-[#006B5E]"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="bg-white border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#006B5E]/30 focus:border-[#006B5E]"
        >
          <option value="all">All Statuses</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Reference</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Applicant</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Location</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Building</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Valuation</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Date</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">No requests found</td></tr>
              )}
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => onView(r.id)}>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-[#006B5E] font-medium">{r.refNo}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground truncate max-w-[140px]">{r.applicantName}</p>
                    <p className="text-xs text-muted-foreground">{r.branch}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="text-foreground">{r.subCity}</p>
                    <p className="text-xs text-muted-foreground">Woreda {r.woreda}</p>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <p className="text-foreground capitalize">{r.buildingType.replace("_", " ")}</p>
                    <p className="text-xs text-muted-foreground">{r.totalArea.toLocaleString()} m²</p>
                  </td>
                  <td className="px-4 py-3 text-right hidden lg:table-cell">
                    {r.valuation ? (
                      <span className="font-mono text-sm font-semibold text-foreground">
                        {(r.valuation.marketValue / 1_000_000).toFixed(2)}M
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 hidden sm:table-cell text-xs text-muted-foreground">{fmtDate(r.submittedAt)}</td>
                  <td className="px-4 py-3">
                    <Eye size={16} className="text-muted-foreground" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-border bg-muted/30 text-xs text-muted-foreground">
          Showing {filtered.length} of {myReqs.length} requests
        </div>
      </div>
    </div>
  )
}

// ─── Request Detail ──────────────────────────────────────────────────
function RequestDetail({ request, user, onBack, onReview, onApprove, onReject, onRequestRevision }: {
  request: Request; user: AppUser
  onBack: () => void
  onReview: (id: string) => void
  onApprove: (id: string) => void
  onReject: (id: string, notes: string) => void
  onRequestRevision: (id: string, notes: string) => void
}) {
  const [rejectNotes, setRejectNotes] = useState("")
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [revisionNotes, setRevisionNotes] = useState("")
  const [showRevisionForm, setShowRevisionForm] = useState(false)

  const v = request.valuation

  const canReview = user.role === "engineer" && request.status === "pending"
  const canApproveReject = user.role === "final_approver" && request.status === "under_review"
  const canRequestRevision = user.role === "engineer" && request.status === "under_review"

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-5xl mx-auto">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex items-center gap-2">
          {canReview && (
            <button
              onClick={() => onReview(request.id)}
              className="bg-[#006B5E] hover:bg-[#005a4e] text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Calculator size={16} /> Start Review
            </button>
          )}
          {canApproveReject && (
            <>
              <button
                onClick={() => onApprove(request.id)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <CheckCircle size={16} /> Approve
              </button>
              <button
                onClick={() => setShowRejectForm(true)}
                className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <XCircle size={16} /> Reject
              </button>
            </>
          )}
          {canRequestRevision && (
            <button
              onClick={() => setShowRevisionForm(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <AlertCircle size={16} /> Request Revision
            </button>
          )}
        </div>
      </div>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm text-[#006B5E] font-semibold">{request.refNo}</span>
              <StatusBadge status={request.status} />
            </div>
            <h2 className="text-xl font-bold text-foreground">{request.applicantName}</h2>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin size={13} /> {request.subCity}, W{request.woreda}, {request.town}</span>
              <span className="flex items-center gap-1"><Phone size={13} /> {request.applicantPhone}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Submitted</p>
            <p className="text-sm font-medium">{fmtDateTime(request.submittedAt)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">by {request.submittedBy}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Property Info */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-4">
          <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
            <Building2 size={16} className="text-[#006B5E]" /> Property Details
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ["Ownership C/No.", request.ownershipCNo],
              ["Title Deed No.", request.titleDeedNo],
              ["Plot Area", `${request.plotArea} m²`],
              ["Compound Area", `${request.compoundArea} m²`],
              ["Access Road", request.accessRoad],
              ["Land Mark", request.landMark],
            ].map(([k, v]) => (
              <div key={k as string}>
                <p className="text-muted-foreground text-xs">{k}</p>
                <p className="font-medium text-foreground">{v}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">GPS Coordinates</p>
            <p className="font-mono text-sm font-medium text-foreground">{request.gpsCoords}</p>
          </div>
        </div>

        {/* Neighborhood */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-4">
          <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
            <MapPin size={16} className="text-[#006B5E]" /> Neighborhood Analysis
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ["General Use", request.generalUse],
              ["Marketability", request.marketability],
              ["Housing Standard", request.housingStandard],
              ["Development State", request.developmentState],
              ["Future Tendency", request.futureTendency],
              ["Transportation", request.transportation],
              ["Utilities", request.utilities],
            ].map(([k, v]) => (
              <div key={k as string}>
                <p className="text-muted-foreground text-xs">{k}</p>
                <p className="font-medium text-foreground">{v}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Building Specs */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-4">
          <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
            <Layers size={16} className="text-[#006B5E]" /> Building Specifications
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ["Building Type", request.buildingType.toUpperCase().replace("_", " ")],
              ["Present Use", request.presentUse],
              ["Wall Type", request.wallType],
              ["Roof Type", request.roofType],
              ["Floor Finish", request.floorFinish],
              ["Lighting", request.lighting],
              ["Doors & Windows", request.doorsWindows],
              ["Condition", request.condition.charAt(0).toUpperCase() + request.condition.slice(1).replace("_", " ")],
              ["Year Built", String(request.yearBuilt)],
              ["Permit No.", request.permitNo],
            ].map(([k, v]) => (
              <div key={k as string}>
                <p className="text-muted-foreground text-xs">{k}</p>
                <p className="font-medium text-foreground">{v}</p>
              </div>
            ))}
          </div>
          {/* Floor areas */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Floor Areas</p>
            <div className="space-y-1">
              {request.floors.map(f => (
                <div key={f.label} className="flex justify-between items-center py-1 border-b border-border last:border-0 text-sm">
                  <span className="font-medium text-foreground">{f.label}</span>
                  <span className="font-mono text-foreground">{f.area.toLocaleString()} m²</span>
                </div>
              ))}
              <div className="flex justify-between items-center py-1 font-semibold text-sm">
                <span className="text-[#006B5E]">Total</span>
                <span className="font-mono text-[#006B5E]">{request.totalArea.toLocaleString()} m²</span>
              </div>
            </div>
          </div>
        </div>

        {/* Documents */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-4">
          <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
            <FileText size={16} className="text-[#006B5E]" /> Documents & Compliance
          </h3>
          <div className="space-y-2">
            {[
              ["Title Deed / Ownership Certificate", request.docs.titleDeed],
              ["Construction Permit", request.docs.permit],
              ["Approved Architectural Plan", request.docs.plan],
              ["Property Photos", request.docs.photos],
              ["GPS Screenshot", request.docs.gps],
            ].map(([label, val]) => (
              <div key={label as string} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${val ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-500"}`}>
                  {val ? <Check size={11} /> : <XCircle size={11} />}
                </div>
                <span className="text-sm text-foreground">{label}</span>
              </div>
            ))}
          </div>
          {request.remarks && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-amber-700 mb-1">Remarks</p>
              <p className="text-xs text-amber-800">{request.remarks}</p>
            </div>
          )}
          {request.financingRequested && (
            <div className="bg-[#006B5E]/5 border border-[#006B5E]/20 rounded-lg p-3">
              <p className="text-xs font-semibold text-[#006B5E] mb-1">Financing Requested</p>
              <p className="text-base font-bold font-mono text-[#006B5E]">{ETB(request.financingRequested)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Valuation Results */}
      {v && (
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="bg-[#006B5E] px-5 py-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Calculator size={18} /> Automated Valuation Result
            </h3>
            <p className="text-emerald-100/70 text-xs mt-0.5">Based on ZZB Property Valuation Guideline 2022</p>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Cost Components</h4>
                <div className="space-y-2">
                  {[
                    ["a. Building Cost", v.buildingCost],
                    ["b. Internal Structure", v.internalStructureCost],
                    ["c. External Electrical & Sanitary", v.externalElectricalCost],
                    ["d. Fence & Compound", v.fenceCompoundCost],
                    ["e. Consultancy Service", v.consultancyCost],
                    ["f. Location Value", v.locationValue],
                  ].map(([label, value]) => (
                    <div key={label as string} className="flex justify-between items-center py-1.5 border-b border-border last:border-0 text-sm">
                      <span className="text-foreground">{label as string}</span>
                      <span className="font-mono font-medium">{ETB(value as number)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center py-2 bg-[#006B5E]/5 rounded-lg px-3 mt-3">
                  <span className="font-semibold text-[#006B5E] text-sm">Total Market Value</span>
                  <span className="font-mono font-bold text-[#006B5E]">{ETB(v.marketValue)}</span>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Valuation Summary</h4>
                <div className="space-y-3">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Depreciation ({(v.depRate * 100).toFixed(0)}% of construction costs)</p>
                    <p className="font-mono font-semibold text-red-600 text-sm">- {ETB(v.depAmount)}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Property Sales Value Range</p>
                    <p className="font-mono font-semibold text-foreground text-sm">
                      {ETB(v.marketLow)} — {ETB(v.marketHigh)}
                    </p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-emerald-700">Forced Sale Value (90%)</p>
                    <p className="font-mono font-bold text-emerald-700 text-lg">{ETB(v.forcedSaleValue)}</p>
                  </div>
                  {request.financingRequested && (
                    <div className={`rounded-lg p-3 border ${request.financingRequested <= v.forcedSaleValue ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
                      <p className={`text-xs font-semibold ${request.financingRequested <= v.forcedSaleValue ? "text-emerald-700" : "text-red-700"}`}>
                        Financing vs. Collateral {request.financingRequested <= v.forcedSaleValue ? "✓ Covered" : "⚠ Exceeds"}
                      </p>
                      <p className={`text-xs mt-0.5 ${request.financingRequested <= v.forcedSaleValue ? "text-emerald-600" : "text-red-600"}`}>
                        Requested: {ETB(request.financingRequested)} / Coverage: {((v.forcedSaleValue / request.financingRequested) * 100).toFixed(1)}%
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Workflow notes */}
      {request.engineerNotes && (
        <div className="bg-white rounded-xl border border-border shadow-sm p-5">
          <h3 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
            <Shield size={16} className="text-[#006B5E]" /> Engineer Assessment
          </h3>
          <p className="text-sm text-foreground">{request.engineerNotes}</p>
          {request.reviewedBy && (
            <p className="text-xs text-muted-foreground mt-2">
              — {request.reviewedBy} · {request.reviewedAt ? fmtDateTime(request.reviewedAt) : ""}
            </p>
          )}
        </div>
      )}

      {/* Action forms */}
      {showRejectForm && (
        <div className="bg-white rounded-xl border border-red-200 shadow-sm p-5">
          <h3 className="font-semibold text-red-700 text-sm mb-3">Rejection Reason</h3>
          <textarea
            value={rejectNotes}
            onChange={e => setRejectNotes(e.target.value)}
            placeholder="Provide detailed reason for rejection…"
            className="w-full border border-border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400"
            rows={3}
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => { onReject(request.id, rejectNotes); setShowRejectForm(false) }}
              className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >Confirm Rejection</button>
            <button
              onClick={() => setShowRejectForm(false)}
              className="border border-border text-foreground text-sm font-medium px-4 py-2 rounded-lg hover:bg-muted transition-colors"
            >Cancel</button>
          </div>
        </div>
      )}

      {showRevisionForm && (
        <div className="bg-white rounded-xl border border-purple-200 shadow-sm p-5">
          <h3 className="font-semibold text-purple-700 text-sm mb-3">Revision Request Notes</h3>
          <textarea
            value={revisionNotes}
            onChange={e => setRevisionNotes(e.target.value)}
            placeholder="Describe what needs to be revised or resubmitted…"
            className="w-full border border-border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400"
            rows={3}
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => { onRequestRevision(request.id, revisionNotes); setShowRevisionForm(false) }}
              className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >Send Revision Request</button>
            <button
              onClick={() => setShowRevisionForm(false)}
              className="border border-border text-foreground text-sm font-medium px-4 py-2 rounded-lg hover:bg-muted transition-colors"
            >Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Engineer Review Form ────────────────────────────────────────────
function EngineerReview({ request, onBack, onSubmit }: {
  request: Request;
  onBack: () => void
  onSubmit: (id: string, val: ValResult, notes: string) => void
}) {
  const auto = calcValuation(request)
  const [val, setVal] = useState<ValResult>(request.valuation || auto)
  const [notes, setNotes] = useState(request.engineerNotes || "")
  const [useAuto, setUseAuto] = useState(!request.valuation)

  const displayed = useAuto ? auto : val

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex items-center gap-2 text-sm text-[#006B5E] bg-[#006B5E]/10 px-3 py-1.5 rounded-lg">
          <Calculator size={15} /> Reviewing: <strong>{request.refNo}</strong>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-[#006B5E] text-white rounded-xl p-5">
        <h2 className="font-bold text-lg">{request.applicantName}</h2>
        <div className="flex flex-wrap gap-4 mt-2 text-emerald-100/80 text-sm">
          <span>{request.buildingType.toUpperCase().replace("_", " ")} · {request.totalArea} m²</span>
          <span>{request.subCity}, Woreda {request.woreda}</span>
          <span>Plot: {request.plotArea} m²</span>
          <span>Built: {request.yearBuilt} · {request.condition}</span>
        </div>
      </div>

      {/* Auto vs Manual */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
            <Calculator size={16} className="text-[#006B5E]" /> Valuation Calculation
          </h3>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <div className={`w-10 h-5 rounded-full relative transition-colors ${useAuto ? "bg-[#006B5E]" : "bg-gray-200"}`}
              onClick={() => setUseAuto(!useAuto)}>
              <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform ${useAuto ? "translate-x-5" : "translate-x-0.5"}`} />
            </div>
            <span className="text-muted-foreground">Auto-calculate</span>
          </label>
        </div>
        <div className="p-5 space-y-3">
          {[
            { key: "buildingCost", label: "Building Cost (Area × Unit Rate)" },
            { key: "internalStructureCost", label: "Internal Structure" },
            { key: "externalElectricalCost", label: "External Electrical & Sanitary" },
            { key: "fenceCompoundCost", label: "Fence & Compound" },
            { key: "consultancyCost", label: "Consultancy Service" },
            { key: "locationValue", label: "Location Value (Plot Area × Rate)" },
          ].map(f => (
            <div key={f.key} className="grid grid-cols-2 items-center gap-4">
              <label className="text-sm text-foreground">{f.label}</label>
              {useAuto ? (
                <div className="bg-muted/50 rounded-lg px-3 py-2 text-right">
                  <span className="font-mono text-sm font-semibold text-[#006B5E]">
                    {ETB((displayed as any)[f.key])}
                  </span>
                </div>
              ) : (
                <input
                  type="number"
                  value={(val as any)[f.key]}
                  onChange={e => setVal(prev => ({ ...prev, [f.key]: parseFloat(e.target.value) || 0 }))}
                  className="border border-border rounded-lg px-3 py-2 text-sm font-mono text-right focus:outline-none focus:ring-2 focus:ring-[#006B5E]/30 focus:border-[#006B5E]"
                />
              )}
            </div>
          ))}

          {/* Depreciation */}
          <div className="grid grid-cols-2 items-center gap-4">
            <label className="text-sm text-foreground">
              Depreciation Rate ({(displayed.depRate * 100).toFixed(0)}%)
            </label>
            <div className="bg-red-50 rounded-lg px-3 py-2 text-right">
              <span className="font-mono text-sm font-semibold text-red-600">- {ETB(displayed.depAmount)}</span>
            </div>
          </div>

          {/* Totals */}
          <div className="bg-[#006B5E]/5 rounded-xl p-4 space-y-2 mt-2">
            <div className="flex justify-between text-sm">
              <span className="text-foreground">Market Value</span>
              <span className="font-mono font-bold text-[#006B5E] text-base">{ETB(displayed.marketValue)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Value Range</span>
              <span className="font-mono text-foreground">{ETB(displayed.marketLow)} – {ETB(displayed.marketHigh)}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-[#006B5E]/20 pt-2 mt-2">
              <span className="font-semibold text-foreground">Forced Sale Value (90%)</span>
              <span className="font-mono font-bold text-emerald-700">{ETB(displayed.forcedSaleValue)}</span>
            </div>
          </div>

          {/* Auto info */}
          {useAuto && (
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <Info size={14} className="text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-700">
                Values calculated using ZZB Property Valuation Guideline 2022 formulas. Unit rate for {request.buildingType.toUpperCase().replace("_", " ")}: ETB {(UNIT_RATES[request.buildingType] || 38000).toLocaleString()}/m². Location rate for {request.subCity}: ETB {(LOC_RATES[(request.subCity || "bole").toLowerCase()] || 22000).toLocaleString()}/m².
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-5">
        <h3 className="font-semibold text-foreground text-sm mb-3">Engineer Assessment Notes</h3>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Provide your professional assessment of the property, any observations, and recommendation…"
          className="w-full border border-border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#006B5E]/30 focus:border-[#006B5E]"
          rows={4}
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => onSubmit(request.id, useAuto ? auto : val, notes)}
          className="flex-1 bg-[#006B5E] hover:bg-[#005a4e] text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <CheckCircle size={18} /> Submit Assessment & Forward for Approval
        </button>
        <button
          onClick={onBack}
          className="px-6 border border-border text-foreground font-medium py-3 rounded-xl hover:bg-muted transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── New Request Wizard ──────────────────────────────────────────────
const INIT_FORM: Partial<Request> = {
  applicantName: "", applicantPhone: "",
  ownershipCNo: "", town: "Addis Ababa", subCity: "Bole",
  woreda: "01", plotArea: 0, compoundArea: 0, compoundType: "Asphalt",
  accessRoad: "Asphalt", landMark: "", distanceFromMain: "",
  generalUse: "Residential", marketability: "Marketable",
  housingStandard: "Average", developmentState: "Developing",
  futureTendency: "Stable", transportation: "Accessible", utilities: "Available",
  buildingType: "g+2", floors: [{ label: "GF", area: 0 }],
  totalArea: 0, wallType: "HCB", roofType: "Tiles",
  floorFinish: "Ceramic Tiles", lighting: "Electrical",
  doorsWindows: "Aluminium", condition: "moderate",
  yearBuilt: 2015, permitNo: "", titleDeedNo: "", presentUse: "",
  fenceLength: 0, fenceType: "hcb", fenceHeight: 1.8,
  gpsCoords: "", hasTatchedRoof: false,
  docs: { titleDeed: false, permit: false, plan: false, photos: false, gps: false },
  remarks: "", financingRequested: 0
}

function NewRequestWizard({ onSubmit, onCancel }: {
  onSubmit: (data: Partial<Request>) => void
  onCancel: () => void
}) {
  const [step, setStep] = useState(1)
  const TOTAL = 5
  const [form, setForm] = useState<Partial<Request>>(INIT_FORM)

  const set = (k: keyof Request, v: unknown) => setForm(p => ({ ...p, [k]: v }))

  const updateTotalArea = (floors: Floor[]) => {
    set("floors", floors)
    set("totalArea", floors.reduce((s, f) => s + (f.area || 0), 0))
  }

  const previewVal = calcValuation(form)

  const steps = ["Applicant & Property", "Neighborhood", "Building Specs", "Documents", "Review & Submit"]

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-3xl mx-auto">
      {/* Progress */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          {steps.map((_, i) => (
            <div key={i} className={`flex-1 h-1.5 rounded-full transition-colors ${i + 1 <= step ? "bg-[#006B5E]" : "bg-muted"}`} />
          ))}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">Step {step}: {steps[step - 1]}</span>
          <span className="text-xs text-muted-foreground">{step} of {TOTAL}</span>
        </div>
      </div>

      {/* Step 1 */}
      {step === 1 && <WizardStep1 form={form} set={set} />}

      {/* Step 2 */}
      {step === 2 && <WizardStep2 form={form} set={set} />}

      {/* Step 3 */}
      {step === 3 && <WizardStep3 form={form} set={set} updateTotalArea={updateTotalArea} />}

      {/* Step 4 */}
      {step === 4 && <WizardStep4 form={form} set={set} />}

      {/* Step 5 */}
      {step === 5 && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-border shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calculator size={18} className="text-[#006B5E]" />
              <h3 className="font-semibold text-foreground">Preliminary Valuation Estimate</h3>
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Pre-submission estimate</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                {[
                  ["Building Cost", previewVal.buildingCost],
                  ["Internal Structure", previewVal.internalStructureCost],
                  ["Electrical & Sanitary", previewVal.externalElectricalCost],
                  ["Fence & Compound", previewVal.fenceCompoundCost],
                  ["Consultancy Service", previewVal.consultancyCost],
                  ["Location Value", previewVal.locationValue],
                ].map(([k, v]) => (
                  <div key={k as string} className="flex justify-between text-sm py-1.5 border-b border-border last:border-0">
                    <span className="text-foreground">{k as string}</span>
                    <span className="font-mono font-medium">{ETB(v as number)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Depreciation ({(previewVal.depRate * 100).toFixed(0)}%)</p>
                  <p className="font-mono font-semibold text-red-600">- {ETB(previewVal.depAmount)}</p>
                </div>
                <div className="bg-[#006B5E]/5 border border-[#006B5E]/20 rounded-lg p-3">
                  <p className="text-xs text-[#006B5E] font-medium">Estimated Market Value</p>
                  <p className="font-mono font-bold text-[#006B5E] text-xl">{ETB(previewVal.marketValue)}</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  <p className="text-xs text-emerald-700 font-medium">Estimated Forced Sale Value</p>
                  <p className="font-mono font-bold text-emerald-700 text-lg">{ETB(previewVal.forcedSaleValue)}</p>
                </div>
                {(form.financingRequested || 0) > 0 && (
                  <div className={`rounded-lg p-3 border text-sm ${(form.financingRequested || 0) <= previewVal.forcedSaleValue ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
                    <strong>Financing Coverage:</strong>{" "}
                    {((previewVal.forcedSaleValue / (form.financingRequested || 1)) * 100).toFixed(1)}%
                    {(form.financingRequested || 0) <= previewVal.forcedSaleValue ? " ✓ Sufficient" : " ⚠ Insufficient"}
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4 bg-muted/50 rounded-lg p-2">
              ⓘ This is a preliminary auto-calculated estimate. Final valuation will be confirmed by a certified ZZB engineer following physical inspection per ZZB Property Valuation Guideline 2022.
            </p>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-xl border border-border shadow-sm p-5">
            <h3 className="font-semibold text-foreground text-sm mb-3">Submission Summary</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ["Applicant", form.applicantName || "—"],
                ["Property Location", `${form.subCity}, W${form.woreda}`],
                ["Building Type", (form.buildingType || "").toUpperCase().replace("_", " ")],
                ["Total Area", `${(form.totalArea || 0).toFixed(2)} m²`],
                ["Plot Area", `${form.plotArea || 0} m²`],
                ["Year Built", String(form.yearBuilt || "—")],
                ["Condition", form.condition || "—"],
                ["Documents Ready", `${Object.values(form.docs || {}).filter(Boolean).length}/5`],
              ].map(([k, v]) => (
                <div key={k as string}>
                  <p className="text-muted-foreground text-xs">{k}</p>
                  <p className="font-medium text-foreground">{v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        {step > 1 ? (
          <button onClick={() => setStep(s => s - 1)} className="px-5 py-2.5 border border-border text-foreground text-sm font-medium rounded-xl hover:bg-muted transition-colors">
            ← Back
          </button>
        ) : (
          <button onClick={onCancel} className="px-5 py-2.5 border border-border text-foreground text-sm font-medium rounded-xl hover:bg-muted transition-colors">
            Cancel
          </button>
        )}
        <div className="flex-1" />
        {step < TOTAL ? (
          <button
            onClick={() => setStep(s => s + 1)}
            className="px-6 py-2.5 bg-[#006B5E] hover:bg-[#005a4e] text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2"
          >
            Continue <ChevronRight size={16} />
          </button>
        ) : (
          <button
            onClick={() => onSubmit(form)}
            className="px-6 py-2.5 bg-[#006B5E] hover:bg-[#005a4e] text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2"
          >
            <CheckCircle size={16} /> Submit Request
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Reports ────────���────────────────────────────────────────────────
function Reports({ requests }: { requests: Request[] }) {
  const approved = requests.filter(r => r.status === "approved")
  const totalCollateral = approved.reduce((a, r) => a + (r.valuation?.marketValue || 0), 0)
  const totalForced = approved.reduce((a, r) => a + (r.valuation?.forcedSaleValue || 0), 0)
  const totalFinancing = requests.reduce((a, r) => a + (r.financingRequested || 0), 0)

  const byBranch = Object.entries(
    requests.reduce((acc, r) => {
      acc[r.branch] = (acc[r.branch] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  ).map(([branch, count]) => ({ branch: branch.replace(" Branch", ""), count }))

  const bySubCity = Object.entries(
    approved.reduce((acc, r) => {
      const key = r.subCity
      acc[key] = (acc[key] || 0) + (r.valuation?.marketValue || 0)
      return acc
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value: Math.round(value / 1_000_000) }))

  const monthly = [
    { month: "Jan '24", approved: 3, rejected: 1, value: 38.2 },
    { month: "Feb '24", approved: 5, rejected: 0, value: 62.1 },
    { month: "Mar '24", approved: 4, rejected: 2, value: 51.8 },
    { month: "Apr '24", approved: 6, rejected: 1, value: 74.5 },
    { month: "May '24", approved: 8, rejected: 1, value: 95.3 },
    { month: "Jun '24", approved: 5, rejected: 2, value: 63.7 },
  ]

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Collateral Value", value: `ETB ${(totalCollateral / 1e9).toFixed(2)}B`, sub: `${approved.length} approved`, icon: TrendingUp, color: "text-[#006B5E]", bg: "bg-[#006B5E]/10" },
          { label: "Total Forced Sale Value", value: `ETB ${(totalForced / 1e9).toFixed(2)}B`, sub: "At 90% MCF", icon: Shield, color: "text-emerald-600", bg: "bg-emerald-100" },
          { label: "Financing Requests", value: `ETB ${(totalFinancing / 1e6).toFixed(1)}M`, sub: `${requests.length} total`, icon: Hash, color: "text-blue-600", bg: "bg-blue-100" },
          { label: "Avg. Processing Days", value: "4.2 days", sub: "Submission to approval", icon: Clock, color: "text-purple-600", bg: "bg-purple-100" },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className="bg-white rounded-xl border border-border shadow-sm p-4">
              <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center mb-3`}>
                <Icon size={18} className={s.color} />
              </div>
              <p className="text-lg font-bold font-mono text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-xs text-[#006B5E] mt-0.5">{s.sub}</p>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Monthly trend */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-5">
          <h3 className="font-semibold text-foreground text-sm mb-4">Monthly Collateral Value Trend (ETB Million)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Line type="monotone" dataKey="value" stroke="#006B5E" strokeWidth={2.5} dot={{ r: 4, fill: "#006B5E" }} name="Value (M ETB)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* By branch */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-5">
          <h3 className="font-semibold text-foreground text-sm mb-4">Requests by Branch</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byBranch} layout="vertical" barSize={18}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="branch" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="count" fill="#00a693" radius={[0, 4, 4, 0]} name="Requests" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Collateral by sub-city */}
      {bySubCity.length > 0 && (
        <div className="bg-white rounded-xl border border-border shadow-sm p-5">
          <h3 className="font-semibold text-foreground text-sm mb-4">Approved Collateral Value by Sub-City (ETB Million)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={bySubCity} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => [`${v}M ETB`, "Value"]} />
              <Bar dataKey="value" fill="#006B5E" radius={[4, 4, 0, 0]} name="ETB Million" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-foreground text-sm">Approved Valuations Register</h3>
          <button className="flex items-center gap-1.5 text-sm text-[#006B5E] hover:bg-[#006B5E]/5 px-3 py-1.5 rounded-lg transition-colors">
            <Download size={15} /> Export
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                {["Reference", "Applicant", "Location", "Building", "Market Value", "Forced Sale", "Financing"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {approved.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-muted-foreground text-sm">No approved valuations yet</td></tr>
              )}
              {approved.map(r => (
                <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-[#006B5E] font-medium">{r.refNo}</td>
                  <td className="px-4 py-3 font-medium">{r.applicantName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.subCity}, W{r.woreda}</td>
                  <td className="px-4 py-3 capitalize">{r.buildingType.replace("_", " ")} · {r.totalArea}m²</td>
                  <td className="px-4 py-3 font-mono font-semibold">{r.valuation ? (r.valuation.marketValue / 1e6).toFixed(2) + "M" : "—"}</td>
                  <td className="px-4 py-3 font-mono text-emerald-700 font-semibold">{r.valuation ? (r.valuation.forcedSaleValue / 1e6).toFixed(2) + "M" : "—"}</td>
                  <td className="px-4 py-3 font-mono">{r.financingRequested ? (r.financingRequested / 1e6).toFixed(2) + "M" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── App Root ────────────────────────────────────────────────────────
const STORAGE_KEY = "zzb_requests_v1"

export default function App() {
  const [user, setUser] = useState<AppUser | null>(null)
  const [view, setView] = useState<View>("dashboard")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [requests, setRequests] = useState<Request[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : SEED
    } catch { return SEED }
  })

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(requests)) } catch {}
  }, [requests])

  const updateRequest = (id: string, updates: Partial<Request>) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r))
  }

  const handleLogin = (u: AppUser) => { setUser(u); setView("dashboard") }
  const handleLogout = () => { setUser(null); setView("dashboard") }

  const navigate = (v: View) => { setView(v); setSidebarOpen(false) }

  const viewRequest = (id: string) => {
    setSelectedId(id)
    const r = requests.find(r => r.id === id)
    if (!r) return
    if (user?.role === "engineer" && r.status === "pending") {
      setView("review")
    } else {
      setView("detail")
    }
  }

  const handleNewRequest = (data: Partial<Request>) => {
    const newReq: Request = {
      ...INIT_FORM as Request,
      ...data,
      id: genId(),
      refNo: genRef(),
      status: "pending",
      branch: user?.branch || "Unknown Branch",
      submittedBy: user?.name || "Unknown",
      submittedAt: new Date().toISOString(),
    }
    setRequests(prev => [newReq, ...prev])
    toast.success(`Request ${newReq.refNo} submitted successfully!`)
    navigate("requests")
  }

  const handleReviewSubmit = (id: string, val: ValResult, notes: string) => {
    updateRequest(id, {
      status: "under_review",
      valuation: val,
      engineerNotes: notes,
      reviewedBy: user?.name,
      reviewedAt: new Date().toISOString(),
    })
    toast.success("Assessment submitted. Forwarded to final approver.")
    navigate("requests")
  }

  const handleApprove = (id: string) => {
    updateRequest(id, {
      status: "approved",
      approvedBy: user?.name,
      approvedAt: new Date().toISOString(),
    })
    toast.success("Valuation approved successfully.")
    setView("requests")
  }

  const handleReject = (id: string, notes: string) => {
    updateRequest(id, {
      status: "rejected",
      engineerNotes: notes,
      approvedBy: user?.name,
      approvedAt: new Date().toISOString(),
    })
    toast.error("Request rejected.")
    setView("requests")
  }

  const handleRevision = (id: string, notes: string) => {
    updateRequest(id, {
      status: "revision",
      engineerNotes: notes,
    })
    toast.info("Revision requested. Branch notified.")
    setView("requests")
  }

  if (!user) return <Login onLogin={handleLogin} />

  const selected = requests.find(r => r.id === selectedId) ?? null

  const VIEW_TITLES: Record<View, string> = {
    dashboard: "Dashboard",
    new_request: "New Valuation Request",
    requests: user.role === "engineer" ? "Valuation Requests" : user.role === "branch_manager" ? "My Requests" : "All Requests",
    detail: selected ? `Request ${selected.refNo}` : "Request Details",
    review: selected ? `Review: ${selected.refNo}` : "Engineer Review",
    reports: "Reports & Analytics",
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Toaster richColors position="top-right" />
      <Sidebar
        user={user} view={view}
        onNavigate={navigate}
        onLogout={handleLogout}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col md:ml-64 min-w-0">
        <Header user={user} title={VIEW_TITLES[view]} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          {view === "dashboard" && (
            <Dashboard user={user} requests={requests} onNavigate={navigate} onView={viewRequest} />
          )}
          {view === "new_request" && (
            <NewRequestWizard onSubmit={handleNewRequest} onCancel={() => navigate("dashboard")} />
          )}
          {view === "requests" && (
            <RequestsList user={user} requests={requests} onView={viewRequest} />
          )}
          {view === "detail" && selected && (
            <RequestDetail
              request={selected} user={user}
              onBack={() => navigate("requests")}
              onReview={(id) => { setSelectedId(id); setView("review") }}
              onApprove={handleApprove}
              onReject={handleReject}
              onRequestRevision={handleRevision}
            />
          )}
          {view === "review" && selected && (
            <EngineerReview
              request={selected}
              onBack={() => { setView("detail") }}
              onSubmit={handleReviewSubmit}
            />
          )}
          {view === "reports" && (
            <Reports requests={requests} />
          )}
        </main>
      </div>
    </div>
  )
}
