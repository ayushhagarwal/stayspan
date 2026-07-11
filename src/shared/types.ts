export type Stay = {
  id: string
  propertyName: string
  checkIn: string
  checkOut: string
  cancellationDeadline: string
  cancellationPolicy: string
  address: string
  phone: string
  sourceName: string
  sourceUrl: string
  createdAt: string
}

export type StayDraft = Omit<Stay, 'id' | 'createdAt'>

export type TripGroup = {
  id: string
  stayIds: string[]
}

export type Trip = {
  id: string
  stays: Stay[]
  start: string
  end: string
  manualGroupId?: string
}
