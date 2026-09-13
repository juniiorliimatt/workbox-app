export interface RevenueTypeDTO {
  id: string;
  name: string;
  includeInTotals?: boolean;
  includeInMonthlyTotals?: boolean;
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
  includeInTotals?: boolean;
  includeInMonthlyTotals?: boolean;
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

export interface RevenueTypeRevisionDTO {
  changedAt?: string;
  changedBy?: string;
  id?: string;
  name?: string;
  revision: number;
  revisionType: string;
}

export interface SpendingTypeRevisionDTO {
  changedAt?: string;
  changedBy?: string;
  id?: string;
  name?: string;
  category?: 'ESSENTIAL' | 'PERSONAL' | 'SAVINGS';
  revision: number;
  revisionType: string;
}

export interface YearlySummaryDTO {
  totalRevenue: number;
  totalSpending: number;
  balance: number;
}

export interface TypeTotalDTO {
  typeId: string;
  typeName: string;
  total: number;
}
