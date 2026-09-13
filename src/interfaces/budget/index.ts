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
