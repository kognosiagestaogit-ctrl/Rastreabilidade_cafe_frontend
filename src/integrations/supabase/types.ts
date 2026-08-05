export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      fazendas: {
        Row: {
          cooperado_iniciais: string | null
          created_at: string
          id: string
          localizacao: string | null
          nome: string
          observacoes: string | null
          proprietario: string | null
          updated_at: string
        }
        Insert: {
          cooperado_iniciais?: string | null
          created_at?: string
          id?: string
          localizacao?: string | null
          nome: string
          observacoes?: string | null
          proprietario?: string | null
          updated_at?: string
        }
        Update: {
          cooperado_iniciais?: string | null
          created_at?: string
          id?: string
          localizacao?: string | null
          nome?: string
          observacoes?: string | null
          proprietario?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      lotes: {
        Row: {
          colheita_tipo: Database["public"]["Enums"]["colheita_tipo"] | null
          created_at: string
          data_beneficio: string | null
          data_colheita_fim: string | null
          data_colheita_inicio: string | null
          data_entrada_secador: string | null
          data_entrada_terreiro: string | null
          data_envio_cooperativa: string | null
          data_saida_secador: string | null
          data_saida_terreiro: string | null
          fazenda_id: string
          id: string
          lote_colheita: string | null
          nf_remessa_cooperativa: string | null
          numero_lote_cooperativa: string | null
          numero_lote_fazenda: string
          numero_sacas: number | null
          numero_tulha: string | null
          observacoes: string | null
          safra: number
          status: Database["public"]["Enums"]["lote_status"]
          talhao_id: string | null
          talhao_ids: string[]
          tipo_cafe: string | null
          umidade: number | null
          updated_at: string
        }
        Insert: {
          colheita_tipo?: Database["public"]["Enums"]["colheita_tipo"] | null
          created_at?: string
          data_beneficio?: string | null
          data_colheita_fim?: string | null
          data_colheita_inicio?: string | null
          data_entrada_secador?: string | null
          data_entrada_terreiro?: string | null
          data_envio_cooperativa?: string | null
          data_saida_secador?: string | null
          data_saida_terreiro?: string | null
          fazenda_id: string
          id?: string
          lote_colheita?: string | null
          nf_remessa_cooperativa?: string | null
          numero_lote_cooperativa?: string | null
          numero_lote_fazenda: string
          numero_sacas?: number | null
          numero_tulha?: string | null
          observacoes?: string | null
          safra?: number
          status?: Database["public"]["Enums"]["lote_status"]
          talhao_id?: string | null
          talhao_ids?: string[]
          tipo_cafe?: string | null
          umidade?: number | null
          updated_at?: string
        }
        Update: {
          colheita_tipo?: Database["public"]["Enums"]["colheita_tipo"] | null
          created_at?: string
          data_beneficio?: string | null
          data_colheita_fim?: string | null
          data_colheita_inicio?: string | null
          data_entrada_secador?: string | null
          data_entrada_terreiro?: string | null
          data_envio_cooperativa?: string | null
          data_saida_secador?: string | null
          data_saida_terreiro?: string | null
          fazenda_id?: string
          id?: string
          lote_colheita?: string | null
          nf_remessa_cooperativa?: string | null
          numero_lote_cooperativa?: string | null
          numero_lote_fazenda?: string
          numero_sacas?: number | null
          numero_tulha?: string | null
          observacoes?: string | null
          safra?: number
          status?: Database["public"]["Enums"]["lote_status"]
          talhao_id?: string | null
          talhao_ids?: string[]
          tipo_cafe?: string | null
          umidade?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lotes_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotes_talhao_id_fkey"
            columns: ["talhao_id"]
            isOneToOne: false
            referencedRelation: "talhoes"
            referencedColumns: ["id"]
          },
        ]
      }
      ordens_servico: {
        Row: {
          area_hectares: number | null
          atividade: string | null
          created_at: string
          data: string | null
          dose_por_ha: number | null
          fazenda_id: string
          hora_fim: string | null
          hora_inicio: string | null
          horas_trabalhadas: number | null
          id: string
          insumo: string | null
          maquina: string | null
          observacoes: string | null
          operador: string | null
          quantidade_total: number | null
          safra: number
          talhao_id: string | null
          updated_at: string
        }
        Insert: {
          area_hectares?: number | null
          atividade?: string | null
          created_at?: string
          data?: string | null
          dose_por_ha?: number | null
          fazenda_id: string
          hora_fim?: string | null
          hora_inicio?: string | null
          horas_trabalhadas?: number | null
          id?: string
          insumo?: string | null
          maquina?: string | null
          observacoes?: string | null
          operador?: string | null
          quantidade_total?: number | null
          safra?: number
          talhao_id?: string | null
          updated_at?: string
        }
        Update: {
          area_hectares?: number | null
          atividade?: string | null
          created_at?: string
          data?: string | null
          dose_por_ha?: number | null
          fazenda_id?: string
          hora_fim?: string | null
          hora_inicio?: string | null
          horas_trabalhadas?: number | null
          id?: string
          insumo?: string | null
          maquina?: string | null
          observacoes?: string | null
          operador?: string | null
          quantidade_total?: number | null
          safra?: number
          talhao_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordens_servico_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_talhao_id_fkey"
            columns: ["talhao_id"]
            isOneToOne: false
            referencedRelation: "talhoes"
            referencedColumns: ["id"]
          },
        ]
      }
      talhoes: {
        Row: {
          area_hectares: number | null
          created_at: string
          fazenda_id: string
          id: string
          nome: string
          observacoes: string | null
          updated_at: string
          variedade: string | null
        }
        Insert: {
          area_hectares?: number | null
          created_at?: string
          fazenda_id: string
          id?: string
          nome: string
          observacoes?: string | null
          updated_at?: string
          variedade?: string | null
        }
        Update: {
          area_hectares?: number | null
          created_at?: string
          fazenda_id?: string
          id?: string
          nome?: string
          observacoes?: string | null
          updated_at?: string
          variedade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "talhoes_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas: {
        Row: {
          a_receber_previsto: number | null
          amostra: string | null
          anuncio_venda: string | null
          cliente: string | null
          conta_corrente: string | null
          cooperado: string | null
          created_at: string
          data_envio_armazem: string | null
          data_recebimento: string | null
          data_recebimento_premio: string | null
          data_venda: string | null
          descontos: number | null
          fazenda_id: string
          id: string
          is_ds: number | null
          lote_id: string | null
          lotes_agrupados: string | null
          nf_premio_rainforest: string | null
          nf_venda: string | null
          nr_remessa_cooperativa: string | null
          numero_lote_cooperativa: string | null
          observacoes: string | null
          padrao: string | null
          peneira: string | null
          premio_liquido_funrural: number | null
          premio_rainforest: number | null
          quebra: number | null
          sacas_do_lote: number | null
          sacas_vendidas: number
          tipo_venda: Database["public"]["Enums"]["venda_tipo"] | null
          updated_at: string
          valor_recebido: number | null
          vl_bruto: number | null
          vl_liquido: number | null
        }
        Insert: {
          a_receber_previsto?: number | null
          amostra?: string | null
          anuncio_venda?: string | null
          cliente?: string | null
          conta_corrente?: string | null
          cooperado?: string | null
          created_at?: string
          data_envio_armazem?: string | null
          data_recebimento?: string | null
          data_recebimento_premio?: string | null
          data_venda?: string | null
          descontos?: number | null
          fazenda_id: string
          id?: string
          is_ds?: number | null
          lote_id?: string | null
          lotes_agrupados?: string | null
          nf_premio_rainforest?: string | null
          nf_venda?: string | null
          nr_remessa_cooperativa?: string | null
          numero_lote_cooperativa?: string | null
          observacoes?: string | null
          padrao?: string | null
          peneira?: string | null
          premio_liquido_funrural?: number | null
          premio_rainforest?: number | null
          quebra?: number | null
          sacas_do_lote?: number | null
          sacas_vendidas?: number
          tipo_venda?: Database["public"]["Enums"]["venda_tipo"] | null
          updated_at?: string
          valor_recebido?: number | null
          vl_bruto?: number | null
          vl_liquido?: number | null
        }
        Update: {
          a_receber_previsto?: number | null
          amostra?: string | null
          anuncio_venda?: string | null
          cliente?: string | null
          conta_corrente?: string | null
          cooperado?: string | null
          created_at?: string
          data_envio_armazem?: string | null
          data_recebimento?: string | null
          data_recebimento_premio?: string | null
          data_venda?: string | null
          descontos?: number | null
          fazenda_id?: string
          id?: string
          is_ds?: number | null
          lote_id?: string | null
          lotes_agrupados?: string | null
          nf_premio_rainforest?: string | null
          nf_venda?: string | null
          nr_remessa_cooperativa?: string | null
          numero_lote_cooperativa?: string | null
          observacoes?: string | null
          padrao?: string | null
          peneira?: string | null
          premio_liquido_funrural?: number | null
          premio_rainforest?: number | null
          quebra?: number | null
          sacas_do_lote?: number | null
          sacas_vendidas?: number
          tipo_venda?: Database["public"]["Enums"]["venda_tipo"] | null
          updated_at?: string
          valor_recebido?: number | null
          vl_bruto?: number | null
          vl_liquido?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vendas_fazenda_id_fkey"
            columns: ["fazenda_id"]
            isOneToOne: false
            referencedRelation: "fazendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      colheita_tipo: "MANUAL" | "MECANICA"
      lote_status:
        | "EM_COLHEITA"
        | "NO_TERREIRO"
        | "NO_SECADOR"
        | "NA_TULHA"
        | "BENEFICIADO"
        | "ENVIADO_COOPERATIVA"
      venda_tipo: "CPR" | "TERMO" | "FISICA"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      colheita_tipo: ["MANUAL", "MECANICA"],
      lote_status: [
        "EM_COLHEITA",
        "NO_TERREIRO",
        "NO_SECADOR",
        "NA_TULHA",
        "BENEFICIADO",
        "ENVIADO_COOPERATIVA",
      ],
      venda_tipo: ["CPR", "TERMO", "FISICA"],
    },
  },
} as const
