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

export interface OrigemConversao {
  origem: string;
  total: number;
  ganhos: number;
  taxa: number;
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
  ticket: number;
  meta_vendas: number;
  meta_faturamento: number;
  meta_ticket: number;
  meta_leads: number;
  meta_reun_marcadas: number;
  meta_reun_realizadas: number;
  meta_taxa_fechamento: number;
  atingimento_vendas_pct: number | null;
  atingimento_faturamento_pct: number | null;
  // Campos legados (compatibilidade)
  meta_valor: number;
  atingimento_valor_pct: number | null;
  meta_qtd: number;
  atingimento_qtd_pct: number | null;
}

export interface VendedorContagem {
  owner_id: number;
  vendedor: string;
  qtd: number;
}

export interface VendedorPct {
  owner_id: number;
  vendedor: string;
  pct: number;
}

export interface VendaDetalhe {
  cliente: string;
  vendedor: string;
  valor: number;
  fechado_em: string;
  origem: string;
}

export interface PontoSerie {
  dia: string; // YYYY-MM-DD
  leads_abertos: number;
  reunioes_marcadas: number;
  reunioes_realizadas: number;
}

export type StatusReuniao = "Agendada" | "Realizada" | "No-Show" | string;

export interface ReuniaoDetalhe {
  cliente: string;
  vendedor: string;
  marcada_em: string;
  realizada_em: string;
  status: StatusReuniao;
}

export interface Metas {
  leads_abertos: number;
  reunioes_marcadas: number;
  reunioes_realizadas: number;
  vendas: number;
  faturamento: number;
}

export interface Metricas {
  leads_abertos: number;
  leads_para_abrir: number;
  reunioes_marcadas: number;
  reunioes_realizadas: number;
  no_show: number;
  taxa_comparecimento: number;
  atividades_atrasadas: number;
  metas: Metas;
  atividades_atrasadas_por_vendedor: VendedorContagem[];
  // Atividades concluídas (status 2) no período — só no funil Pré-Vendas (time todo).
  atividades_realizadas?: number;
  atividades_realizadas_por_vendedor?: VendedorContagem[];
  reunioes_marcadas_por_vendedor: VendedorContagem[];
  reunioes_realizadas_por_vendedor: VendedorContagem[];
  leads_abertos_por_vendedor: VendedorContagem[];
  leads_para_abrir_por_vendedor: VendedorContagem[];
  comparecimento_por_vendedor: VendedorPct[];
  serie_diaria: PontoSerie[];
  reunioes_detalhe: ReuniaoDetalhe[];
}

export interface Funil {
  pipeline_id: number;
  nome: string;
  pipeline_por_etapa: PipelinePorEtapa;
  ganhos_perdas: GanhosPerdas;
  conversao_ciclo: ConversaoCiclo;
  /** Conversão por origem do lead (opcional: só após republicar o Apps Script). */
  conversao_origem?: OrigemConversao[];
  /** Deals ganhos no período (opcional: só após republicar o Apps Script). */
  vendas_detalhe?: VendaDetalhe[];
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

/** Usuário (vendedor) para o seletor de "adicionar vendedor". */
export interface Usuario {
  owner_id: number;
  nome: string;
}

/** Linha editável de meta por vendedor (aba `metas`, por funil/mês). */
export interface MetaVendedorEdit {
  owner_id: number;
  vendedor: string;
  meta_leads: number;
  meta_reun_marcadas: number;
  meta_reun_realizadas: number;
  meta_vendas: number;
  meta_ticket: number;
  meta_faturamento: number;
  meta_taxa_fechamento: number;
}

/** Chave de métrica usada nos cards "hero" com curva + pace. */
export type SerieKey = "leads_abertos" | "reunioes_marcadas" | "reunioes_realizadas";
