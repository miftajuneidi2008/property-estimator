export type Role = "branch_manager" | "engineer" | "final_approver" | "admin"
export type Status = "draft" | "pending" | "under_review" | "approved" | "rejected" | "revision"
export type View = "dashboard" | "new_request" | "requests" | "detail" | "review" | "reports"

export interface AppUser {
  id: string
  name: string
  role: Role
  branch: string
  initials: string
}

export interface Floor {
  label: string
  area: number
}

export interface ValResult {
  buildingCost: number
  internalStructureCost: number
  externalElectricalCost: number
  fenceCompoundCost: number
  consultancyCost: number
  locationValue: number
  depRate: number
  depAmount: number
  marketValue: number
  marketLow: number
  marketHigh: number
  forcedSaleValue: number
}

export interface Request {
  id: string
  refNo: string
  status: Status
  branch: string
  submittedBy: string
  submittedAt: string
  financingRequested?: number
  applicantName: string
  applicantPhone: string
  ownershipCNo: string
  town: string
  subCity: string
  woreda: string
  plotArea: number
  compoundArea: number
  compoundType?: string
  accessRoad: string
  landMark: string
  distanceFromMain: string
  generalUse: string
  marketability: string
  housingStandard: string
  developmentState: string
  futureTendency: string
  transportation: string
  utilities: string
  buildingType: string
  floors: Floor[]
  totalArea: number
  wallType: string
  roofType: string
  floorFinish: string
  lighting: string
  doorsWindows: string
  condition: string
  yearBuilt: number
  permitNo: string
  titleDeedNo: string
  presentUse: string
  fenceLength: number
  fenceType: string
  fenceHeight?: number
  gpsCoords: string
  hasTatchedRoof: boolean
  docs: Record<string, boolean>
  remarks: string
  valuation?: ValResult
  engineerNotes?: string
  reviewedBy?: string
  reviewedAt?: string
  approvedBy?: string
  approvedAt?: string
}
