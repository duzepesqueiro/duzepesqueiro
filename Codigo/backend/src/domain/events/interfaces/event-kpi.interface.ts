export type KpiType =
  | 'ACTIVE_EVENTS'
  | 'REGISTERED_PARTICIPANTS'
  | 'REGISTRATION_PERCENTAGE'
  | 'SOLD_OUT_EVENTS';

/**
 * Resultado consolidado de KPI em um período.
 */
export interface IKpiResult {
  value: number;
  previousValue: number;
  percentageChange: number;
  changeType: 'increase' | 'decrease' | 'stable';
  goal: number | null;
  goalPercentage: number | null;
  goalStatus: 'achieved' | 'in_progress' | 'not_set';
}

/**
 * Meta configurada para um KPI mensal.
 */
export interface IKpiGoal {
  id: string;
  kpiType: KpiType;
  targetValue: number;
  month: number;
  year: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Contrato para criação/atualização de meta de KPI.
 */
export interface IKpiGoalInput {
  kpiType: KpiType;
  targetValue: number;
  month: number;
  year: number;
}

/**
 * Comparativo entre resultado atual e meta de KPI.
 */
export interface IKpiComparison {
  kpiType: KpiType;
  month: number;
  year: number;
  currentValue: number;
  targetValue: number;
  difference: number;
  achievementPercent: number;
}

/**
 * Ponto de dados para gráficos de evolução de eventos.
 */
export interface IEventChartData<TValue = number> {
  label: string;
  month: number;
  year: number;
  value: TValue;
}

/**
 * Coleção completa dos KPIs do dashboard administrativo.
 */
export interface IAllKpis {
  activeEvents: IKpiResult;
  registeredParticipants: IKpiResult;
  registrationPercentage: IKpiResult;
  soldOutEvents: IKpiResult;
}
