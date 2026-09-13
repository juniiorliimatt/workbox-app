export interface RevenueTypeDTO {
  id: string;
  name: string;
}

export interface RevenueDTO {
  id: string;
  date: string;
  referenceDate?: string;
  typeId: string;
  typeName?: string;
  value: number;
}

export interface SpendingTypeDTO {
  id: string;
  name: string;
  category?: 'ESSENTIAL' | 'PERSONAL' | 'SAVINGS';
}

export interface SpendingDTO {
  id: string;
  date: string;
  referenceDate?: string;
  description?: string;
  typeId: string;
  typeName?: string;
  value: number;
  wasPaid: boolean;
}

export interface TotalDTO {
  total: number;
}

export interface BudgetBucketDTO {
  actual: number;
  target: number;
  difference: number;
}

export interface FiftyThirtyTwentyDTO {
  essential: BudgetBucketDTO;
  personal: BudgetBucketDTO;
  savings: BudgetBucketDTO;
  totalRevenue: number;
}

export interface MonthlySummaryDTO {
  projectedBalance: number;
  totalPaid: number;
  totalPending: number;
  totalRevenue: number;
  totalSpending: number;
}

export interface RevenueRevisionDTO {
  changedAt?: string;
  changedBy?: string;
  date?: string;
  id?: string;
  referenceDate?: string;
  revision: number;
  revisionType: string;
  typeId?: string;
  value?: number;
}

export interface SpendingRevisionDTO {
  changedAt?: string;
  changedBy?: string;
  date?: string;
  description?: string;
  id?: string;
  referenceDate?: string;
  revision: number;
  revisionType: string;
  typeId?: string;
  value?: number;
  wasPaid?: boolean;
}
