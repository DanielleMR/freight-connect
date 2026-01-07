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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      auditoria: {
        Row: {
          acao: string
          created_at: string | null
          dados_anteriores: Json | null
          dados_novos: Json | null
          id: string
          registro_id: string | null
          tabela: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string | null
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          registro_id?: string | null
          tabela: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string | null
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          id?: string
          registro_id?: string | null
          tabela?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      avaliacoes: {
        Row: {
          comentario: string | null
          created_at: string | null
          frete_id: string
          id: string
          nota: number
          produtor_id: string
          transportador_id: string
        }
        Insert: {
          comentario?: string | null
          created_at?: string | null
          frete_id: string
          id?: string
          nota: number
          produtor_id: string
          transportador_id: string
        }
        Update: {
          comentario?: string | null
          created_at?: string | null
          frete_id?: string
          id?: string
          nota?: number
          produtor_id?: string
          transportador_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_frete_id_fkey"
            columns: ["frete_id"]
            isOneToOne: true
            referencedRelation: "fretes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_transportador_id_fkey"
            columns: ["transportador_id"]
            isOneToOne: false
            referencedRelation: "transportadores"
            referencedColumns: ["id"]
          },
        ]
      }
      fretes: {
        Row: {
          created_at: string | null
          data_prevista: string | null
          descricao: string | null
          destino: string | null
          distancia_estimada: number | null
          id: string
          observacoes_valor: string | null
          origem: string | null
          produtor_id: string
          quantidade_animais: number | null
          status: Database["public"]["Enums"]["frete_status"]
          tipo_animal: string | null
          tipo_cobranca: string | null
          transportador_id: string
          updated_at: string | null
          valor_contraproposta: number | null
          valor_frete: number | null
        }
        Insert: {
          created_at?: string | null
          data_prevista?: string | null
          descricao?: string | null
          destino?: string | null
          distancia_estimada?: number | null
          id?: string
          observacoes_valor?: string | null
          origem?: string | null
          produtor_id: string
          quantidade_animais?: number | null
          status?: Database["public"]["Enums"]["frete_status"]
          tipo_animal?: string | null
          tipo_cobranca?: string | null
          transportador_id: string
          updated_at?: string | null
          valor_contraproposta?: number | null
          valor_frete?: number | null
        }
        Update: {
          created_at?: string | null
          data_prevista?: string | null
          descricao?: string | null
          destino?: string | null
          distancia_estimada?: number | null
          id?: string
          observacoes_valor?: string | null
          origem?: string | null
          produtor_id?: string
          quantidade_animais?: number | null
          status?: Database["public"]["Enums"]["frete_status"]
          tipo_animal?: string | null
          tipo_cobranca?: string | null
          transportador_id?: string
          updated_at?: string | null
          valor_contraproposta?: number | null
          valor_frete?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fretes_produtor_id_fkey"
            columns: ["produtor_id"]
            isOneToOne: false
            referencedRelation: "produtores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fretes_transportador_id_fkey"
            columns: ["transportador_id"]
            isOneToOne: false
            referencedRelation: "transportadores"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes: {
        Row: {
          created_at: string | null
          id: string
          lida: boolean | null
          mensagem: string | null
          referencia_id: string | null
          referencia_tipo: string | null
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          lida?: boolean | null
          mensagem?: string | null
          referencia_id?: string | null
          referencia_tipo?: string | null
          tipo: string
          titulo: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          lida?: boolean | null
          mensagem?: string | null
          referencia_id?: string | null
          referencia_tipo?: string | null
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: []
      }
      produtores: {
        Row: {
          cidade: string | null
          cpf_cnpj: string | null
          created_at: string
          estado: string | null
          id: string
          nome: string
          telefone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cidade?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          estado?: string | null
          id?: string
          nome: string
          telefone: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cidade?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          estado?: string | null
          id?: string
          nome?: string
          telefone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      transportadores: {
        Row: {
          ativo: boolean
          capacidade_animais: number | null
          cpf_cnpj: string | null
          created_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          nome: string
          placa_veiculo: string | null
          regiao_atendimento: string | null
          telefone: string
          tipo_animal: string | null
          tipo_caminhao: string | null
          updated_at: string | null
          user_id: string | null
          whatsapp: string | null
        }
        Insert: {
          ativo?: boolean
          capacidade_animais?: number | null
          cpf_cnpj?: string | null
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome: string
          placa_veiculo?: string | null
          regiao_atendimento?: string | null
          telefone: string
          tipo_animal?: string | null
          tipo_caminhao?: string | null
          updated_at?: string | null
          user_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          ativo?: boolean
          capacidade_animais?: number | null
          cpf_cnpj?: string | null
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome?: string
          placa_veiculo?: string | null
          regiao_atendimento?: string | null
          telefone?: string
          tipo_animal?: string | null
          tipo_caminhao?: string | null
          updated_at?: string | null
          user_id?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      criar_notificacao: {
        Args: {
          p_mensagem?: string
          p_referencia_id?: string
          p_referencia_tipo?: string
          p_tipo: string
          p_titulo: string
          p_user_id: string
        }
        Returns: string
      }
      get_produtor_name: { Args: { produtor_uuid: string }; Returns: string }
      get_transportadores_directory: {
        Args: never
        Returns: {
          ativo: boolean
          capacidade_animais: number
          id: string
          latitude: number
          longitude: number
          nome: string
          regiao_atendimento: string
          tipo_animal: string
          tipo_caminhao: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      registrar_auditoria: {
        Args: {
          p_acao: string
          p_dados_anteriores?: Json
          p_dados_novos?: Json
          p_registro_id?: string
          p_tabela: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "produtor" | "transportador"
      frete_status:
        | "solicitado"
        | "aceito"
        | "recusado"
        | "em_andamento"
        | "concluido"
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
      app_role: ["admin", "produtor", "transportador"],
      frete_status: [
        "solicitado",
        "aceito",
        "recusado",
        "em_andamento",
        "concluido",
      ],
    },
  },
} as const
