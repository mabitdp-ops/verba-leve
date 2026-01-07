import { rescisaoConfig, CategoriaKey } from './rescisao-config';

export interface DadosRescisao {
  salarioBase: number;
  dataAdmissao: Date;
  dataDesligamento: Date;
  motivoCodigo: string;
  tipoContrato: string;
  tipoAviso: string;
  diasTrabalhados: number;
  mesesFeriasVencidas: number;
  periodosFeriasVencidas: number;
  saldoFgts: number;
  dependentesIrrf: number;
  mediaVariaveis: number;
  descontoAvisoDias: number;
  dataTerminoContrato?: Date;
  // Campos existentes
  horasMensais: number;
  quebraCaixaPercent: number;
  ats: number;
  comissoes: number;
  insalubridade: number;
  gratificacoes: number;
  periculosidade: number;
  horasExtras50: number;
  horasExtras100: number;
  adicionalNoturnoPercent: number;
  horasNoturnas: number;
  dsrDiasUteis: number;
  dsrDiasNaoUteis: number;
  diasAvisoEditado?: number;
  justificativaAvisoEditado?: string;
  // Novos campos: Avos editados
  avosFeriasEditado?: number;
  avos13Editado?: number;
  // Novos campos: Valores editados
  feriasVencidasEditado?: number;
  feriasProporcionaisEditado?: number;
  decimoTerceiroEditado?: number;
}

export interface DetalheCalculo {
  descricao: string;
  formula: string;
  valores: Record<string, number | string>;
}

export interface ResultadoVerba {
  rubrica: string;
  descricao: string;
  valor: number;
  tipo: 'provento' | 'desconto';
  incideInss: boolean;
  incideIrrf: boolean;
  incideFgts: boolean;
  detalhes?: DetalheCalculo;
  valorCalculado?: number;
  valorEditado?: boolean;
}

export interface ResultadoRescisao {
  verbas: ResultadoVerba[];
  totalProventos: number;
  totalDescontos: number;
  inss: number;
  irrf: number;
  liquido: number;
  multaFgts: number;
  diasAviso: number;
  diasAvisoCalculado: number;
  diasAvisoEditado: boolean;
  meses13: number;
  mesesFerias: number;
  anosCompletos: number;
  // DSR separados
  dsrHorasExtrasValor: number;
  dsrComissoesValor: number;
  dsrTotalValor: number;
  dsrDiasUteis: number;
  dsrDiasNaoUteis: number;
  baseHoraExtra: number;
  valorHora: number;
  // Avos
  avosFeriasCalculado: number;
  avos13Calculado: number;
  avosFeriasEditado?: number;
  avos13Editado?: number;
  // Totais variáveis
  totalHorasExtras: number;
  totalComissoes: number;
  totalVariaveis: number;
}

function calcularDiferencaMeses(dataInicio: Date, dataFim: Date): number {
  const anos = dataFim.getFullYear() - dataInicio.getFullYear();
  const meses = dataFim.getMonth() - dataInicio.getMonth();
  const dias = dataFim.getDate() - dataInicio.getDate();
  
  let totalMeses = anos * 12 + meses;
  if (dias >= 15) totalMeses++;
  
  return Math.max(0, totalMeses);
}

function calcularDiasVinculo(dataInicio: Date, dataFim: Date): number {
  const diff = dataFim.getTime() - dataInicio.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
}

function calcularDiasAviso(diasVinculo: number): number {
  const anosCompletos = Math.floor(diasVinculo / 365);
  return Math.min(30 + Math.max(0, anosCompletos - 1) * 3, 90);
}

function calcularAnosCompletos(diasVinculo: number): number {
  return Math.floor(diasVinculo / 365);
}

function calcularInssProgressivo(base: number): number {
  const { faixas, teto } = rescisaoConfig.tabelas.inss;
  const baseCalculo = Math.min(base, teto);
  let inss = 0;
  let baseRestante = baseCalculo;
  let faixaAnterior = 0;

  for (const faixa of faixas) {
    const faixaValor = faixa.ate - faixaAnterior;
    const baseNaFaixa = Math.min(baseRestante, faixaValor);
    
    if (baseNaFaixa > 0) {
      inss += baseNaFaixa * faixa.aliquota;
      baseRestante -= baseNaFaixa;
    }
    
    faixaAnterior = faixa.ate;
    if (baseRestante <= 0) break;
  }

  return inss;
}

function calcularIrrf(base: number, dependentes: number, inss: number): number {
  const valorDependente = rescisaoConfig.defaults.valor_dependente_irrf;
  const baseCalculo = base - inss - (dependentes * valorDependente);
  
  if (baseCalculo <= 0) return 0;

  const { faixas } = rescisaoConfig.tabelas.irrf;
  
  for (const faixa of faixas) {
    const de = 'de' in faixa ? faixa.de : 0;
    const ate = faixa.ate ?? Infinity;
    if (baseCalculo >= de && baseCalculo <= ate) {
      return Math.max(0, baseCalculo * faixa.aliquota - faixa.deduzir);
    }
  }
  
  return 0;
}

export function calcularRescisao(dados: DadosRescisao): ResultadoRescisao {
  const motivo = rescisaoConfig.motivos.find(m => m.codigo === dados.motivoCodigo);
  if (!motivo) throw new Error('Motivo não encontrado');
  
  const categoria = rescisaoConfig.categorias[motivo.categoriaBase as CategoriaKey];
  if (!categoria) throw new Error('Categoria não encontrada');

  const diasVinculo = calcularDiasVinculo(dados.dataAdmissao, dados.dataDesligamento);
  const mesesVinculo = calcularDiferencaMeses(dados.dataAdmissao, dados.dataDesligamento);
  const anosCompletos = calcularAnosCompletos(diasVinculo);
  
  // Base para hora extra (salário + adicionais)
  const baseHoraExtra = dados.salarioBase + dados.ats + dados.comissoes + 
    dados.insalubridade + dados.gratificacoes + dados.periculosidade;
  
  const valorHora = baseHoraExtra / dados.horasMensais;
  
  // Calcular variáveis do mês
  const quebraCaixa = dados.salarioBase * dados.quebraCaixaPercent;
  const horasExtras50Valor = valorHora * 1.5 * dados.horasExtras50;
  const horasExtras100Valor = valorHora * 2.0 * dados.horasExtras100;
  const totalHorasExtras = horasExtras50Valor + horasExtras100Valor;
  
  // Adicional noturno (hora reduzida: 60/52.5)
  const horasNoturasEquivalentes = dados.horasNoturnas * (60 / 52.5);
  const adicionalNoturnoValor = valorHora * dados.adicionalNoturnoPercent * horasNoturasEquivalentes;
  
  // DSR SEPARADOS: HE e Comissões
  let dsrHorasExtrasValor = 0;
  let dsrComissoesValor = 0;
  
  if (dados.dsrDiasUteis > 0) {
    // DSR sobre HE (inclui noturno)
    const baseHeDsr = totalHorasExtras + adicionalNoturnoValor;
    dsrHorasExtrasValor = (baseHeDsr / dados.dsrDiasUteis) * dados.dsrDiasNaoUteis;
    
    // DSR sobre Comissões
    dsrComissoesValor = (dados.comissoes / dados.dsrDiasUteis) * dados.dsrDiasNaoUteis;
  }
  
  const dsrTotalValor = dsrHorasExtrasValor + dsrComissoesValor;

  // Totais de variáveis
  const totalComissoes = dados.comissoes;
  const totalVariaveis = totalHorasExtras + totalComissoes + adicionalNoturnoValor;

  // Remuneração de referência para cálculo (salário + média de variáveis)
  const remuneracaoReferencia = dados.salarioBase + dados.mediaVariaveis;
  
  const verbas: ResultadoVerba[] = [];
  
  // Saldo de Salário
  if (categoria.saldo_salario) {
    const saldoSalario = (remuneracaoReferencia / 30) * dados.diasTrabalhados;
    verbas.push({
      rubrica: 'SALDO_SALARIO',
      descricao: 'Saldo de Salário',
      valor: saldoSalario,
      tipo: 'provento',
      incideInss: true,
      incideIrrf: true,
      incideFgts: true,
    });
  }

  // Quebra de Caixa
  if (quebraCaixa > 0) {
    verbas.push({
      rubrica: 'QUEBRA_CAIXA',
      descricao: `Quebra de Caixa (${(dados.quebraCaixaPercent * 100).toFixed(0)}%)`,
      valor: quebraCaixa,
      tipo: 'provento',
      incideInss: true,
      incideIrrf: true,
      incideFgts: true,
      detalhes: {
        descricao: 'Quebra de caixa calculada sobre salário base',
        formula: 'Salário Base × Percentual',
        valores: { 'Salário Base': dados.salarioBase, 'Percentual': `${(dados.quebraCaixaPercent * 100).toFixed(0)}%` }
      }
    });
  }

  // Horas Extras 50%
  if (horasExtras50Valor > 0) {
    verbas.push({
      rubrica: 'HORAS_EXTRAS_50',
      descricao: `Horas Extras 50% (${dados.horasExtras50}h)`,
      valor: horasExtras50Valor,
      tipo: 'provento',
      incideInss: true,
      incideIrrf: true,
      incideFgts: true,
      detalhes: {
        descricao: 'Horas extras com adicional de 50%',
        formula: '(Base ÷ Horas Mensais) × 1,5 × Quantidade',
        valores: { 
          'Base HE': baseHoraExtra, 
          'Divisor': dados.horasMensais, 
          'Valor Hora': valorHora,
          'Quantidade': dados.horasExtras50 
        }
      }
    });
  }

  // Horas Extras 100%
  if (horasExtras100Valor > 0) {
    verbas.push({
      rubrica: 'HORAS_EXTRAS_100',
      descricao: `Horas Extras 100% (${dados.horasExtras100}h)`,
      valor: horasExtras100Valor,
      tipo: 'provento',
      incideInss: true,
      incideIrrf: true,
      incideFgts: true,
      detalhes: {
        descricao: 'Horas extras com adicional de 100%',
        formula: '(Base ÷ Horas Mensais) × 2,0 × Quantidade',
        valores: { 
          'Base HE': baseHoraExtra, 
          'Divisor': dados.horasMensais, 
          'Valor Hora': valorHora,
          'Quantidade': dados.horasExtras100 
        }
      }
    });
  }

  // Adicional Noturno
  if (adicionalNoturnoValor > 0) {
    verbas.push({
      rubrica: 'ADICIONAL_NOTURNO',
      descricao: `Adicional Noturno ${(dados.adicionalNoturnoPercent * 100).toFixed(0)}% (${dados.horasNoturnas}h → ${horasNoturasEquivalentes.toFixed(2)}h eq.)`,
      valor: adicionalNoturnoValor,
      tipo: 'provento',
      incideInss: true,
      incideIrrf: true,
      incideFgts: true,
      detalhes: {
        descricao: 'Adicional noturno com hora reduzida',
        formula: 'Valor Hora × Percentual × Horas Equivalentes (h × 60/52,5)',
        valores: { 
          'Valor Hora': valorHora,
          'Percentual': `${(dados.adicionalNoturnoPercent * 100).toFixed(0)}%`,
          'Horas Trabalhadas': dados.horasNoturnas,
          'Horas Equivalentes': horasNoturasEquivalentes.toFixed(2)
        }
      }
    });
  }

  // DSR sobre Horas Extras (separado)
  if (dsrHorasExtrasValor > 0) {
    verbas.push({
      rubrica: 'DSR_HORAS_EXTRAS',
      descricao: `DSR sobre Horas Extras (${dados.dsrDiasUteis} úteis / ${dados.dsrDiasNaoUteis} não úteis)`,
      valor: dsrHorasExtrasValor,
      tipo: 'provento',
      incideInss: true,
      incideIrrf: true,
      incideFgts: true,
      detalhes: {
        descricao: 'DSR calculado sobre horas extras e adicional noturno',
        formula: '(Total HE + Noturno ÷ Dias Úteis) × Dias Não Úteis',
        valores: { 
          'Total HE': totalHorasExtras,
          'Adicional Noturno': adicionalNoturnoValor,
          'Base DSR': totalHorasExtras + adicionalNoturnoValor,
          'Dias Úteis': dados.dsrDiasUteis,
          'Dias Não Úteis': dados.dsrDiasNaoUteis
        }
      }
    });
  }

  // DSR sobre Comissões (separado)
  if (dsrComissoesValor > 0) {
    verbas.push({
      rubrica: 'DSR_COMISSOES',
      descricao: `DSR sobre Comissões (${dados.dsrDiasUteis} úteis / ${dados.dsrDiasNaoUteis} não úteis)`,
      valor: dsrComissoesValor,
      tipo: 'provento',
      incideInss: true,
      incideIrrf: true,
      incideFgts: true,
      detalhes: {
        descricao: 'DSR calculado sobre comissões',
        formula: '(Comissões ÷ Dias Úteis) × Dias Não Úteis',
        valores: { 
          'Comissões': dados.comissoes,
          'Dias Úteis': dados.dsrDiasUteis,
          'Dias Não Úteis': dados.dsrDiasNaoUteis
        }
      }
    });
  }

  // Adicionais que vão ao demonstrativo
  if (dados.ats > 0) {
    verbas.push({
      rubrica: 'ATS',
      descricao: 'Adicional por Tempo de Serviço',
      valor: dados.ats,
      tipo: 'provento',
      incideInss: true,
      incideIrrf: true,
      incideFgts: true,
    });
  }

  if (dados.insalubridade > 0) {
    verbas.push({
      rubrica: 'INSALUBRIDADE',
      descricao: 'Adicional de Insalubridade',
      valor: dados.insalubridade,
      tipo: 'provento',
      incideInss: true,
      incideIrrf: true,
      incideFgts: true,
    });
  }

  if (dados.periculosidade > 0) {
    verbas.push({
      rubrica: 'PERICULOSIDADE',
      descricao: 'Adicional de Periculosidade',
      valor: dados.periculosidade,
      tipo: 'provento',
      incideInss: true,
      incideIrrf: true,
      incideFgts: true,
    });
  }

  if (dados.gratificacoes > 0) {
    verbas.push({
      rubrica: 'GRATIFICACOES',
      descricao: 'Gratificações',
      valor: dados.gratificacoes,
      tipo: 'provento',
      incideInss: true,
      incideIrrf: true,
      incideFgts: true,
    });
  }

  // AVOS CALCULADOS
  const mesesFerias = mesesVinculo % 12;
  const avosFeriasCalculado = mesesFerias;
  const meses13 = dados.dataDesligamento.getMonth() + 1;
  const avos13Calculado = meses13;

  // Usar avos editados se fornecidos
  const avosFeriasUtilizado = dados.avosFeriasEditado !== undefined && dados.avosFeriasEditado >= 0 
    ? dados.avosFeriasEditado 
    : avosFeriasCalculado;
  const avos13Utilizado = dados.avos13Editado !== undefined && dados.avos13Editado >= 0 
    ? dados.avos13Editado 
    : avos13Calculado;

  // Férias Vencidas
  let feriasVencidasCalculado = 0;
  let feriasVencidasValor = 0;
  if (categoria.ferias_vencidas && dados.periodosFeriasVencidas > 0) {
    feriasVencidasCalculado = remuneracaoReferencia * dados.periodosFeriasVencidas;
    // Usar valor editado se fornecido
    feriasVencidasValor = dados.feriasVencidasEditado !== undefined && dados.feriasVencidasEditado >= 0
      ? dados.feriasVencidasEditado
      : feriasVencidasCalculado;
    
    verbas.push({
      rubrica: 'FERIAS_VENCIDAS',
      descricao: `Férias Vencidas (${dados.periodosFeriasVencidas} período${dados.periodosFeriasVencidas > 1 ? 's' : ''})`,
      valor: feriasVencidasValor,
      tipo: 'provento',
      incideInss: false,
      incideIrrf: false,
      incideFgts: false,
      valorCalculado: feriasVencidasCalculado,
      valorEditado: dados.feriasVencidasEditado !== undefined && dados.feriasVencidasEditado !== feriasVencidasCalculado,
    });
  }

  // Férias Proporcionais
  let feriasProporcionaisCalculado = 0;
  let feriasProporcionaisValor = 0;
  if (categoria.ferias_prop && avosFeriasUtilizado > 0) {
    feriasProporcionaisCalculado = (remuneracaoReferencia / 12) * avosFeriasCalculado;
    const feriasProporcionaisComAvos = (remuneracaoReferencia / 12) * avosFeriasUtilizado;
    
    // Usar valor editado se fornecido
    feriasProporcionaisValor = dados.feriasProporcionaisEditado !== undefined && dados.feriasProporcionaisEditado >= 0
      ? dados.feriasProporcionaisEditado
      : feriasProporcionaisComAvos;
    
    verbas.push({
      rubrica: 'FERIAS_PROP',
      descricao: `Férias Proporcionais (${avosFeriasUtilizado}/12)${dados.avosFeriasEditado !== undefined ? ' - avos editado' : ''}`,
      valor: feriasProporcionaisValor,
      tipo: 'provento',
      incideInss: false,
      incideIrrf: false,
      incideFgts: false,
      valorCalculado: feriasProporcionaisCalculado,
      valorEditado: dados.feriasProporcionaisEditado !== undefined || dados.avosFeriasEditado !== undefined,
    });
  }

  // 13º Salário Proporcional
  let decimoTerceiroCalculado = 0;
  let decimoTerceiroValor = 0;
  if (categoria.decimo_terceiro) {
    decimoTerceiroCalculado = (remuneracaoReferencia / 12) * avos13Calculado;
    const decimoTerceiroComAvos = (remuneracaoReferencia / 12) * avos13Utilizado;
    
    // Usar valor editado se fornecido
    decimoTerceiroValor = dados.decimoTerceiroEditado !== undefined && dados.decimoTerceiroEditado >= 0
      ? dados.decimoTerceiroEditado
      : decimoTerceiroComAvos;
    
    verbas.push({
      rubrica: 'DECIMO_TERCEIRO',
      descricao: `13º Salário Proporcional (${avos13Utilizado}/12)${dados.avos13Editado !== undefined ? ' - avos editado' : ''}`,
      valor: decimoTerceiroValor,
      tipo: 'provento',
      incideInss: true,
      incideIrrf: true,
      incideFgts: true,
      valorCalculado: decimoTerceiroCalculado,
      valorEditado: dados.decimoTerceiroEditado !== undefined || dados.avos13Editado !== undefined,
    });
  }

  // Aviso Prévio
  const diasAvisoCalculado = calcularDiasAviso(diasVinculo);
  const diasAvisoFinal = dados.diasAvisoEditado !== undefined && dados.diasAvisoEditado > 0 
    ? dados.diasAvisoEditado 
    : diasAvisoCalculado;
  const diasAvisoEditado = dados.diasAvisoEditado !== undefined && dados.diasAvisoEditado !== diasAvisoCalculado;
  
  const fatorAviso = (categoria as any).fator_aviso ?? 1;
  
  // Férias indenizadas sobre aviso (separada)
  let feriasAvisoValor = 0;
  
  if (categoria.aviso && dados.tipoAviso === 'INDENIZADO') {
    // Aviso = (salário + médias) / 30 × dias
    const avisoIndenizado = (remuneracaoReferencia / 30) * diasAvisoFinal * fatorAviso;
    
    verbas.push({
      rubrica: 'AVISO_PREVIO_INDENIZADO',
      descricao: `Aviso Prévio Indenizado (${diasAvisoFinal} dias${fatorAviso < 1 ? ' - 50%' : ''}${diasAvisoEditado ? ' - editado' : ''})`,
      valor: avisoIndenizado,
      tipo: 'provento',
      incideInss: false,
      incideIrrf: false,
      incideFgts: true,
      detalhes: {
        descricao: 'Aviso prévio indenizado',
        formula: '(Salário + Médias) ÷ 30 × Dias de Aviso',
        valores: {
          'Base': remuneracaoReferencia,
          'Dias Calculados': diasAvisoCalculado,
          'Dias Utilizados': diasAvisoFinal,
          'Anos de Serviço': anosCompletos
        }
      }
    });

    // Reflexos sobre aviso (avos por projeção)
    if (categoria.reflexos_aviso) {
      // +1/12 por ano completo
      const avosProjecao = anosCompletos >= 1 ? 1 : 0;
      
      if (avosProjecao > 0) {
        // 13º indenizado por projeção do aviso (separado)
        const reflexo13 = (remuneracaoReferencia / 12) * avosProjecao;
        verbas.push({
          rubrica: 'DECIMO_TERCEIRO_PROJECAO_AVISO',
          descricao: `13º Indenizado por Projeção do Aviso (${avosProjecao}/12)`,
          valor: reflexo13,
          tipo: 'provento',
          incideInss: true,
          incideIrrf: true,
          incideFgts: true,
        });

        // Férias indenizadas por projeção do aviso (separada)
        feriasAvisoValor = (remuneracaoReferencia / 12) * avosProjecao;
        
        verbas.push({
          rubrica: 'FERIAS_PROJECAO_AVISO',
          descricao: `Férias Indenizadas por Projeção do Aviso (${avosProjecao}/12)`,
          valor: feriasAvisoValor,
          tipo: 'provento',
          incideInss: false,
          incideIrrf: false,
          incideFgts: false,
        });
      }
    }
  }

  // 1/3 de Férias (base única: vencidas + proporcionais + projeção aviso)
  const baseUnicaFerias = feriasVencidasValor + feriasProporcionaisValor + feriasAvisoValor;
  if (baseUnicaFerias > 0) {
    const tercoFerias = baseUnicaFerias / 3;
    verbas.push({
      rubrica: 'TERCO_FERIAS',
      descricao: '1/3 Constitucional de Férias',
      valor: tercoFerias,
      tipo: 'provento',
      incideInss: false,
      incideIrrf: false,
      incideFgts: false,
      detalhes: {
        descricao: '1/3 constitucional sobre o total de férias',
        formula: '(Férias Vencidas + Férias Proporcionais + Férias Aviso) ÷ 3',
        valores: {
          'Férias Vencidas': feriasVencidasValor,
          'Férias Proporcionais': feriasProporcionaisValor,
          'Férias Projeção Aviso': feriasAvisoValor,
          'Base Total': baseUnicaFerias
        }
      }
    });
  }

  // Desconto aviso não cumprido (Pedido de demissão)
  if ((categoria as any).desconto_aviso && dados.descontoAvisoDias > 0) {
    const descontoAviso = (remuneracaoReferencia / 30) * dados.descontoAvisoDias;
    
    verbas.push({
      rubrica: 'DESCONTO_AVISO_NAO_CUMPRIDO',
      descricao: `Desconto Aviso Não Cumprido (${dados.descontoAvisoDias} dias)`,
      valor: descontoAviso,
      tipo: 'desconto',
      incideInss: false,
      incideIrrf: false,
      incideFgts: false,
    });
  }

  // Art. 479 - Indenização para contratos a termo
  if ((categoria as any).art_479 && dados.dataTerminoContrato) {
    const diasRestantes = calcularDiasVinculo(dados.dataDesligamento, dados.dataTerminoContrato);
    const indenizacao479 = ((remuneracaoReferencia / 30) * diasRestantes) * 0.5;
    
    verbas.push({
      rubrica: 'INDENIZACAO_ART_479',
      descricao: `Indenização Art. 479 (${diasRestantes} dias)`,
      valor: indenizacao479,
      tipo: 'provento',
      incideInss: false,
      incideIrrf: false,
      incideFgts: false,
    });
  }

  // Cálculo de totais
  const totalProventos = verbas
    .filter(v => v.tipo === 'provento')
    .reduce((acc, v) => acc + v.valor, 0);
  
  const totalDescontos = verbas
    .filter(v => v.tipo === 'desconto')
    .reduce((acc, v) => acc + v.valor, 0);

  // Base INSS (verbas salariais)
  const baseInss = verbas
    .filter(v => v.incideInss && v.tipo === 'provento')
    .reduce((acc, v) => acc + v.valor, 0);
  
  const inss = calcularInssProgressivo(baseInss);

  // Base IRRF
  const baseIrrf = verbas
    .filter(v => v.incideIrrf && v.tipo === 'provento')
    .reduce((acc, v) => acc + v.valor, 0);
  
  const irrf = calcularIrrf(baseIrrf, dados.dependentesIrrf, inss);

  // Multa FGTS
  const multaFgts = dados.saldoFgts * categoria.multa_fgts_percent;
  
  if (multaFgts > 0) {
    verbas.push({
      rubrica: 'MULTA_FGTS',
      descricao: `Multa FGTS (${categoria.multa_fgts_percent * 100}%)`,
      valor: multaFgts,
      tipo: 'provento',
      incideInss: false,
      incideIrrf: false,
      incideFgts: false,
    });
  }

  const liquido = totalProventos + multaFgts - totalDescontos - inss - irrf;

  return {
    verbas,
    totalProventos: totalProventos + multaFgts,
    totalDescontos: totalDescontos + inss + irrf,
    inss,
    irrf,
    liquido,
    multaFgts,
    diasAviso: diasAvisoFinal,
    diasAvisoCalculado,
    diasAvisoEditado,
    meses13: avos13Utilizado,
    mesesFerias: avosFeriasUtilizado,
    anosCompletos,
    // DSR separados
    dsrHorasExtrasValor,
    dsrComissoesValor,
    dsrTotalValor,
    dsrDiasUteis: dados.dsrDiasUteis,
    dsrDiasNaoUteis: dados.dsrDiasNaoUteis,
    baseHoraExtra,
    valorHora,
    // Avos
    avosFeriasCalculado,
    avos13Calculado,
    avosFeriasEditado: dados.avosFeriasEditado,
    avos13Editado: dados.avos13Editado,
    // Totais variáveis
    totalHorasExtras,
    totalComissoes,
    totalVariaveis,
  };
}
