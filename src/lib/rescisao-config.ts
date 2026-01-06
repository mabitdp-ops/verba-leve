// Configuration based on the Brazilian labor termination spec
export const rescisaoConfig = {
  version: "1.0.0",
  locale: "pt-BR",
  currency: "BRL",
  defaults: {
    limite_experiencia_dias: 90,
    dias_mes_padrao: 30,
    valor_dependente_irrf: 189.59,
  },
  
  motivos: [
    { codigo: "01", descricao: "Demitido COM justa causa", categoriaBase: "JUSTA_CAUSA" },
    { codigo: "02", descricao: "Demitido SEM justa causa", categoriaBase: "SEM_JUSTA_CAUSA_EQUIVALENTE" },
    { codigo: "03", descricao: "Rescisão indireta", categoriaBase: "SEM_JUSTA_CAUSA_EQUIVALENTE" },
    { codigo: "04", descricao: "Pedido de demissão", categoriaBase: "PEDIDO_DEMISSAO" },
    { codigo: "08", descricao: "Morte do empregado", categoriaBase: "MORTE" },
    { codigo: "10", descricao: "Experiência antecipado pelo empregador", categoriaBase: "A_TERMO_ANTECIPADO_EMPREGADOR" },
    { codigo: "11", descricao: "Experiência antecipado pelo empregado", categoriaBase: "A_TERMO_ANTECIPADO_EMPREGADO" },
    { codigo: "12", descricao: "Término do contrato de experiência", categoriaBase: "TERMINO_A_TERMO" },
    { codigo: "22", descricao: "Término do contrato por tempo determinado", categoriaBase: "TERMINO_A_TERMO" },
    { codigo: "23", descricao: "Antecipado pelo empregador (tempo determinado)", categoriaBase: "A_TERMO_ANTECIPADO_EMPREGADOR" },
    { codigo: "24", descricao: "Antecipado pelo empregado (tempo determinado)", categoriaBase: "A_TERMO_ANTECIPADO_EMPREGADO" },
    { codigo: "28", descricao: "Culpa recíproca", categoriaBase: "REDUCAO_50" },
    { codigo: "29", descricao: "Extinção da empresa", categoriaBase: "SEM_JUSTA_CAUSA_EQUIVALENTE" },
    { codigo: "44", descricao: "Rescisão por acordo entre as partes (484-A)", categoriaBase: "ACORDO_484A" },
  ],

  tiposContrato: [
    { value: "INDETERMINADO", label: "Prazo Indeterminado" },
    { value: "DETERMINADO", label: "Prazo Determinado" },
    { value: "EXPERIENCIA", label: "Experiência" },
  ],

  tiposAviso: [
    { value: "TRABALHADO", label: "Trabalhado" },
    { value: "INDENIZADO", label: "Indenizado" },
    { value: "AUSENCIA_DISPENSA", label: "Ausência/Dispensa" },
  ],

  tabelas: {
    inss: {
      teto: 8157.41,
      faixas: [
        { ate: 1518.0, aliquota: 0.075 },
        { ate: 2793.88, aliquota: 0.09 },
        { ate: 4190.83, aliquota: 0.12 },
        { ate: 8157.41, aliquota: 0.14 },
      ],
    },
    irrf: {
      faixas: [
        { ate: 2428.8, aliquota: 0.0, deduzir: 0.0 },
        { de: 2428.81, ate: 2826.65, aliquota: 0.075, deduzir: 182.16 },
        { de: 2826.66, ate: 3751.05, aliquota: 0.15, deduzir: 394.16 },
        { de: 3751.06, ate: 4664.68, aliquota: 0.225, deduzir: 675.49 },
        { de: 4664.69, ate: Infinity, aliquota: 0.275, deduzir: 908.73 },
      ],
    },
  },

  categorias: {
    JUSTA_CAUSA: {
      descricao: "Justa causa",
      saldo_salario: true,
      ferias_vencidas: true,
      ferias_prop: false,
      decimo_terceiro: false,
      aviso: false,
      reflexos_aviso: false,
      multa_fgts_percent: 0.0,
    },
    SEM_JUSTA_CAUSA_EQUIVALENTE: {
      descricao: "Sem justa causa",
      saldo_salario: true,
      ferias_vencidas: true,
      ferias_prop: true,
      decimo_terceiro: true,
      aviso: true,
      reflexos_aviso: true,
      multa_fgts_percent: 0.4,
    },
    PEDIDO_DEMISSAO: {
      descricao: "Pedido de demissão",
      saldo_salario: true,
      ferias_vencidas: true,
      ferias_prop: true,
      decimo_terceiro: true,
      aviso: false,
      reflexos_aviso: false,
      multa_fgts_percent: 0.0,
      desconto_aviso: true,
    },
    ACORDO_484A: {
      descricao: "Acordo 484-A",
      saldo_salario: true,
      ferias_vencidas: true,
      ferias_prop: true,
      decimo_terceiro: true,
      aviso: true,
      reflexos_aviso: true,
      multa_fgts_percent: 0.2,
      fator_aviso: 0.5,
    },
    MORTE: {
      descricao: "Morte do empregado",
      saldo_salario: true,
      ferias_vencidas: true,
      ferias_prop: true,
      decimo_terceiro: true,
      aviso: false,
      reflexos_aviso: false,
      multa_fgts_percent: 0.0,
    },
    TERMINO_A_TERMO: {
      descricao: "Término de contrato a termo",
      saldo_salario: true,
      ferias_vencidas: true,
      ferias_prop: true,
      decimo_terceiro: true,
      aviso: false,
      reflexos_aviso: false,
      multa_fgts_percent: 0.0,
    },
    A_TERMO_ANTECIPADO_EMPREGADOR: {
      descricao: "Antecipado pelo empregador",
      saldo_salario: true,
      ferias_vencidas: true,
      ferias_prop: true,
      decimo_terceiro: true,
      aviso: false,
      reflexos_aviso: false,
      multa_fgts_percent: 0.0,
      art_479: true,
    },
    A_TERMO_ANTECIPADO_EMPREGADO: {
      descricao: "Antecipado pelo empregado",
      saldo_salario: true,
      ferias_vencidas: true,
      ferias_prop: true,
      decimo_terceiro: true,
      aviso: false,
      reflexos_aviso: false,
      multa_fgts_percent: 0.0,
    },
    REDUCAO_50: {
      descricao: "Com redução de 50%",
      saldo_salario: true,
      ferias_vencidas: true,
      ferias_prop: true,
      decimo_terceiro: true,
      aviso: true,
      reflexos_aviso: true,
      multa_fgts_percent: 0.2,
      fator_reducao: 0.5,
    },
  },
} as const;

export type Motivo = typeof rescisaoConfig.motivos[number];
export type CategoriaKey = keyof typeof rescisaoConfig.categorias;
export type TipoContrato = typeof rescisaoConfig.tiposContrato[number]['value'];
export type TipoAviso = typeof rescisaoConfig.tiposAviso[number]['value'];
