/** Tipos do payload retornado pelo endpoint do Apps Script. */

export interface Etapa {
  stage_id: number;
  qtd: number;
  valor: number;
  stage_name: string;
  order: number;
}

export interface PipelinePorEtapa {
  etapas: Etapa[];
  total_aberto: number;
  total_oportunidades: number;
}

export interface MotivoPerda {
  motivo: string;
  qtd: number;
  valor: number;
}

export interface GanhosPerdas {
  ganhos: { qtd: number; valor: number };
  perdas: { qtd: number; valor: number };
  motivos_perda: MotivoPerda[];
}

export interface ConversaoCiclo {
  win_rate: number;
  ciclo_medio_dias: number;
  ticket_medio: number;
  fechadas_periodo: number;
}

export interface VendedorMeta {
  owner_id: number;
  qtd: number;
  valor: number;
  vendedor: string;
  meta_valor: number;
  meta_qtd: number;
  atingimento_valor_pct: number | null;
  atingimento_qtd_pct: number | null;
}

export interface VendedorContagem {
  owner_id: number;
  vendedor: string;
  qtd: number;
}

export interface Metricas {
  leads_abertos: number;
  leads_para_abrir: number;
  reunioes_marcadas: number;
  reunioes_realizadas: number;
  no_show: number;
  taxa_comparecimento: number;
  atividades_atrasadas: number;
  atividades_atrasadas_por_vendedor: VendedorContagem[];
  reunioes_marcadas_por_vendedor: VendedorContagem[];
  reunioes_realizadas_por_vendedor: VendedorContagem[];
}

export interface Funil {
  pipeline_id: number;
  nome: string;
  pipeline_por_etapa: PipelinePorEtapa;
  ganhos_perdas: GanhosPerdas;
  conversao_ciclo: ConversaoCiclo;
  ranking_metas: { vendedores: VendedorMeta[] };
  metricas: Metricas;
}

export interface BiResponse {
  ok: boolean;
  period: { from: string; to: string };
  funis: Funil[];
  updated_at: string;
}

export type FunilNome = "Pre-Vendas" | "Vendas";
