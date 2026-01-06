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
}

export interface ResultadoVerba {
  rubrica: string;
  descricao: string;
  valor: number;
  tipo: 'provento' | 'desconto';
  incideInss: boolean;
  incideIrrf: boolean;
  incideFgts: boolean;
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
  meses13: number;
  mesesFerias: number;
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

  const remuneracaoReferencia = dados.salarioBase + dados.mediaVariaveis;
  const diasVinculo = calcularDiasVinculo(dados.dataAdmissao, dados.dataDesligamento);
  const mesesVinculo = calcularDiferencaMeses(dados.dataAdmissao, dados.dataDesligamento);
  
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

  // Férias Vencidas
  if (categoria.ferias_vencidas && dados.periodosFeriasVencidas > 0) {
    const feriasVencidas = remuneracaoReferencia * dados.periodosFeriasVencidas;
    const tercoFeriasVencidas = feriasVencidas / 3;
    
    verbas.push({
      rubrica: 'FERIAS_VENCIDAS',
      descricao: `Férias Vencidas (${dados.periodosFeriasVencidas} período${dados.periodosFeriasVencidas > 1 ? 's' : ''})`,
      valor: feriasVencidas,
      tipo: 'provento',
      incideInss: false,
      incideIrrf: false,
      incideFgts: false,
    });
    
    verbas.push({
      rubrica: 'TERCO_FERIAS_VENCIDAS',
      descricao: '1/3 Férias Vencidas',
      valor: tercoFeriasVencidas,
      tipo: 'provento',
      incideInss: false,
      incideIrrf: false,
      incideFgts: false,
    });
  }

  // Férias Proporcionais
  const mesesFerias = mesesVinculo % 12;
  if (categoria.ferias_prop && mesesFerias > 0) {
    const feriasProporcionais = (remuneracaoReferencia / 12) * mesesFerias;
    const tercoFeriasProp = feriasProporcionais / 3;
    
    verbas.push({
      rubrica: 'FERIAS_PROP',
      descricao: `Férias Proporcionais (${mesesFerias}/12)`,
      valor: feriasProporcionais,
      tipo: 'provento',
      incideInss: false,
      incideIrrf: false,
      incideFgts: false,
    });
    
    verbas.push({
      rubrica: 'TERCO_FERIAS_PROP',
      descricao: '1/3 Férias Proporcionais',
      valor: tercoFeriasProp,
      tipo: 'provento',
      incideInss: false,
      incideIrrf: false,
      incideFgts: false,
    });
  }

  // 13º Salário Proporcional
  const meses13 = dados.dataDesligamento.getMonth() + 1;
  if (categoria.decimo_terceiro) {
    const decimoTerceiro = (remuneracaoReferencia / 12) * meses13;
    
    verbas.push({
      rubrica: 'DECIMO_TERCEIRO',
      descricao: `13º Salário Proporcional (${meses13}/12)`,
      valor: decimoTerceiro,
      tipo: 'provento',
      incideInss: true,
      incideIrrf: true,
      incideFgts: true,
    });
  }

  // Aviso Prévio
  const diasAviso = calcularDiasAviso(diasVinculo);
  const fatorAviso = (categoria as any).fator_aviso ?? 1;
  
  if (categoria.aviso && dados.tipoAviso === 'INDENIZADO') {
    const avisoIndenizado = (remuneracaoReferencia / 30) * diasAviso * fatorAviso;
    
    verbas.push({
      rubrica: 'AVISO_PREVIO_INDENIZADO',
      descricao: `Aviso Prévio Indenizado (${diasAviso} dias${fatorAviso < 1 ? ' - 50%' : ''})`,
      valor: avisoIndenizado,
      tipo: 'provento',
      incideInss: false,
      incideIrrf: false,
      incideFgts: true,
    });

    // Reflexos sobre aviso
    if (categoria.reflexos_aviso) {
      const mesesProjecao = Math.ceil(diasAviso / 30);
      
      // Reflexo 13º
      const reflexo13 = (remuneracaoReferencia / 12) * mesesProjecao;
      verbas.push({
        rubrica: 'REFLEXO_13_SOBRE_AVISO',
        descricao: '13º sobre Aviso Prévio',
        valor: reflexo13,
        tipo: 'provento',
        incideInss: true,
        incideIrrf: true,
        incideFgts: true,
      });

      // Reflexo Férias
      const reflexoFerias = (remuneracaoReferencia / 12) * mesesProjecao;
      const tercoReflexoFerias = reflexoFerias / 3;
      
      verbas.push({
        rubrica: 'REFLEXO_FERIAS_SOBRE_AVISO',
        descricao: 'Férias sobre Aviso Prévio',
        valor: reflexoFerias,
        tipo: 'provento',
        incideInss: false,
        incideIrrf: false,
        incideFgts: false,
      });
      
      verbas.push({
        rubrica: 'TERCO_REFLEXO_FERIAS_SOBRE_AVISO',
        descricao: '1/3 Férias sobre Aviso Prévio',
        valor: tercoReflexoFerias,
        tipo: 'provento',
        incideInss: false,
        incideIrrf: false,
        incideFgts: false,
      });
    }
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
    diasAviso,
    meses13,
    mesesFerias,
  };
}
