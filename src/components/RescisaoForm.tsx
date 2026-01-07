import { useState, useEffect, useCallback } from 'react';
import { format, parse, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Calculator, Info, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { rescisaoConfig } from '@/lib/rescisao-config';
import { DadosRescisao } from '@/lib/rescisao-calculator';

interface RescisaoFormProps {
  onCalculate: (dados: DadosRescisao) => void;
  onClear: () => void;
}

const INITIAL_STATE = {
  salarioBase: '',
  dataAdmissaoStr: '',
  dataDesligamentoStr: '',
  dataAdmissao: undefined as Date | undefined,
  dataDesligamento: undefined as Date | undefined,
  motivoCodigo: '',
  tipoContrato: 'INDETERMINADO',
  tipoAviso: 'INDENIZADO',
  diasTrabalhados: '',
  periodosFeriasVencidas: '0',
  saldoFgts: '',
  dependentesIrrf: '0',
  mediaVariaveis: '0',
  descontoAvisoDias: '0',
  horasMensais: '220',
  quebraCaixaPercent: '0',
  ats: '0',
  comissoes: '0',
  insalubridade: '0',
  gratificacoes: '0',
  periculosidade: '0',
  horasExtras50: '0',
  horasExtras100: '0',
  adicionalNoturnoPercent: '0',
  horasNoturnas: '0',
  dsrDiasUteis: '',
  dsrDiasNaoUteis: '',
  diasAvisoEditado: '',
  justificativaAvisoEditado: '',
};

export function RescisaoForm({ onCalculate, onClear }: RescisaoFormProps) {
  const [formState, setFormState] = useState(INITIAL_STATE);
  const [dsrCalculado, setDsrCalculado] = useState<number>(0);
  const [diasAvisoCalculado, setDiasAvisoCalculado] = useState<number>(30);

  const updateField = useCallback(<K extends keyof typeof INITIAL_STATE>(
    field: K, 
    value: typeof INITIAL_STATE[K]
  ) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  }, []);

  const selectedMotivo = rescisaoConfig.motivos.find(m => m.codigo === formState.motivoCodigo);
  const showAvisoOptions = selectedMotivo && 
    ['SEM_JUSTA_CAUSA_EQUIVALENTE', 'ACORDO_484A'].includes(selectedMotivo.categoriaBase);
  const showDescontoAviso = selectedMotivo?.categoriaBase === 'PEDIDO_DEMISSAO';

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    const number = parseInt(numericValue, 10) / 100;
    if (isNaN(number)) return '';
    return number.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parseCurrency = (value: string): number => {
    return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
  };

  const handleCurrencyChange = (field: keyof typeof INITIAL_STATE) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrency(e.target.value);
    updateField(field, formatted);
  };

  // Parse e validação de data
  const parseDate = (dateStr: string): Date | undefined => {
    if (!dateStr || dateStr.length !== 10) return undefined;
    const parsed = parse(dateStr, 'dd/MM/yyyy', new Date());
    return isValid(parsed) ? parsed : undefined;
  };

  const formatDateInput = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
  };

  const handleDateChange = (field: 'dataAdmissaoStr' | 'dataDesligamentoStr') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatDateInput(e.target.value);
    updateField(field, formatted);
    
    const dateField = field === 'dataAdmissaoStr' ? 'dataAdmissao' : 'dataDesligamento';
    const parsed = parseDate(formatted);
    updateField(dateField, parsed);
  };

  const handleCalendarSelect = (field: 'dataAdmissao' | 'dataDesligamento') => (date: Date | undefined) => {
    updateField(field, date);
    const strField = field === 'dataAdmissao' ? 'dataAdmissaoStr' : 'dataDesligamentoStr';
    updateField(strField, date ? format(date, 'dd/MM/yyyy') : '');
  };

  // Auto-preencher dias trabalhados quando data de desligamento mudar
  useEffect(() => {
    if (formState.dataDesligamento) {
      const dia = formState.dataDesligamento.getDate();
      updateField('diasTrabalhados', dia.toString());
    }
  }, [formState.dataDesligamento, updateField]);

  // Calcular dias de aviso baseado no tempo de serviço
  useEffect(() => {
    if (formState.dataAdmissao && formState.dataDesligamento) {
      const diff = formState.dataDesligamento.getTime() - formState.dataAdmissao.getTime();
      const diasVinculo = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
      const anosCompletos = Math.floor(diasVinculo / 365);
      const dias = Math.min(30 + Math.max(0, anosCompletos - 1) * 3, 90);
      setDiasAvisoCalculado(dias);
    }
  }, [formState.dataAdmissao, formState.dataDesligamento]);

  // Calcular DSR automaticamente
  useEffect(() => {
    const diasUteis = parseInt(formState.dsrDiasUteis) || 0;
    const diasNaoUteis = parseInt(formState.dsrDiasNaoUteis) || 0;
    
    if (diasUteis > 0) {
      const comissoes = parseCurrency(formState.comissoes);
      const he50 = (parseCurrency(formState.salarioBase) / parseInt(formState.horasMensais || '220')) * 1.5 * parseFloat(formState.horasExtras50 || '0');
      const he100 = (parseCurrency(formState.salarioBase) / parseInt(formState.horasMensais || '220')) * 2.0 * parseFloat(formState.horasExtras100 || '0');
      const noturno = (parseCurrency(formState.salarioBase) / parseInt(formState.horasMensais || '220')) * parseFloat(formState.adicionalNoturnoPercent || '0') * (parseFloat(formState.horasNoturnas || '0') * (60/52.5));
      
      const totalVar = comissoes + he50 + he100 + noturno;
      const dsr = (totalVar / diasUteis) * diasNaoUteis;
      setDsrCalculado(dsr);
    } else {
      setDsrCalculado(0);
    }
  }, [formState.dsrDiasUteis, formState.dsrDiasNaoUteis, formState.comissoes, formState.horasExtras50, formState.horasExtras100, formState.horasNoturnas, formState.adicionalNoturnoPercent, formState.salarioBase, formState.horasMensais]);

  const handleClear = () => {
    setFormState(INITIAL_STATE);
    setDsrCalculado(0);
    setDiasAvisoCalculado(30);
    onClear();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formState.dataAdmissao || !formState.dataDesligamento || !formState.motivoCodigo) {
      return;
    }

    const dados: DadosRescisao = {
      salarioBase: parseCurrency(formState.salarioBase),
      dataAdmissao: formState.dataAdmissao,
      dataDesligamento: formState.dataDesligamento,
      motivoCodigo: formState.motivoCodigo,
      tipoContrato: formState.tipoContrato,
      tipoAviso: formState.tipoAviso,
      diasTrabalhados: parseInt(formState.diasTrabalhados) || 30,
      mesesFeriasVencidas: 0,
      periodosFeriasVencidas: parseInt(formState.periodosFeriasVencidas) || 0,
      saldoFgts: parseCurrency(formState.saldoFgts),
      dependentesIrrf: parseInt(formState.dependentesIrrf) || 0,
      mediaVariaveis: parseCurrency(formState.mediaVariaveis),
      descontoAvisoDias: parseInt(formState.descontoAvisoDias) || 0,
      horasMensais: parseInt(formState.horasMensais) || 220,
      quebraCaixaPercent: parseFloat(formState.quebraCaixaPercent) || 0,
      ats: parseCurrency(formState.ats),
      comissoes: parseCurrency(formState.comissoes),
      insalubridade: parseCurrency(formState.insalubridade),
      gratificacoes: parseCurrency(formState.gratificacoes),
      periculosidade: parseCurrency(formState.periculosidade),
      horasExtras50: parseFloat(formState.horasExtras50) || 0,
      horasExtras100: parseFloat(formState.horasExtras100) || 0,
      adicionalNoturnoPercent: parseFloat(formState.adicionalNoturnoPercent) || 0,
      horasNoturnas: parseFloat(formState.horasNoturnas) || 0,
      dsrDiasUteis: parseInt(formState.dsrDiasUteis) || 0,
      dsrDiasNaoUteis: parseInt(formState.dsrDiasNaoUteis) || 0,
      diasAvisoEditado: formState.diasAvisoEditado ? parseInt(formState.diasAvisoEditado) : undefined,
      justificativaAvisoEditado: formState.justificativaAvisoEditado || undefined,
    };

    onCalculate(dados);
  };

  return (
    <Card className="card-elevated">
      <CardHeader className="header-gradient text-primary-foreground rounded-t-lg">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Calculator className="h-5 w-5" />
              Dados da Rescisão
            </CardTitle>
            <CardDescription className="text-primary-foreground/80">
              Preencha as informações do funcionário
            </CardDescription>
          </div>
          <Button 
            type="button" 
            variant="secondary" 
            size="sm"
            onClick={handleClear}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Limpar dados
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Motivo da Rescisão */}
          <div className="space-y-2">
            <Label htmlFor="motivo" className="text-sm font-medium">
              Motivo da Rescisão *
            </Label>
            <Select value={formState.motivoCodigo} onValueChange={(v) => updateField('motivoCodigo', v)}>
              <SelectTrigger id="motivo" className="w-full">
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                {rescisaoConfig.motivos.map((motivo) => (
                  <SelectItem key={motivo.codigo} value={motivo.codigo}>
                    <span className="font-mono text-muted-foreground mr-2">{motivo.codigo}</span>
                    {motivo.descricao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Datas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Admissão * (dd/mm/aaaa)</Label>
              <div className="flex gap-2">
                <Input
                  value={formState.dataAdmissaoStr}
                  onChange={handleDateChange('dataAdmissaoStr')}
                  placeholder="dd/mm/aaaa"
                  maxLength={10}
                  className="font-mono flex-1"
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" className="shrink-0">
                      <CalendarIcon className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={formState.dataAdmissao}
                      onSelect={handleCalendarSelect('dataAdmissao')}
                      locale={ptBR}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Data de Desligamento * (dd/mm/aaaa)</Label>
              <div className="flex gap-2">
                <Input
                  value={formState.dataDesligamentoStr}
                  onChange={handleDateChange('dataDesligamentoStr')}
                  placeholder="dd/mm/aaaa"
                  maxLength={10}
                  className="font-mono flex-1"
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" className="shrink-0">
                      <CalendarIcon className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={formState.dataDesligamento}
                      onSelect={handleCalendarSelect('dataDesligamento')}
                      locale={ptBR}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Tipo de Contrato e Aviso */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Contrato</Label>
              <Select value={formState.tipoContrato} onValueChange={(v) => updateField('tipoContrato', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {rescisaoConfig.tiposContrato.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {showAvisoOptions && (
              <div className="space-y-2">
                <Label>Tipo de Aviso Prévio</Label>
                <Select value={formState.tipoAviso} onValueChange={(v) => updateField('tipoAviso', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {rescisaoConfig.tiposAviso.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <Separator />

          {/* Salário e Jornada */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="salario" className="flex items-center gap-1">
                Salário Base *
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Salário mensal bruto do funcionário
                  </TooltipContent>
                </Tooltip>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                <Input
                  id="salario"
                  value={formState.salarioBase}
                  onChange={handleCurrencyChange('salarioBase')}
                  className="pl-10 font-mono"
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Horas Mensais</Label>
              <Select value={formState.horasMensais} onValueChange={(v) => updateField('horasMensais', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="220">220 horas</SelectItem>
                  <SelectItem value="110">110 horas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="diasTrabalhados">Dias Trabalhados no Mês</Label>
              <Input
                id="diasTrabalhados"
                type="number"
                min="0"
                max="31"
                value={formState.diasTrabalhados}
                onChange={(e) => updateField('diasTrabalhados', e.target.value)}
                className="font-mono"
                placeholder="30"
              />
            </div>
          </div>

          <Separator />

          {/* Adicionais */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Adicionais (Base para Hora Extra)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>ATS (Adicional Tempo Serviço)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                  <Input
                    value={formState.ats}
                    onChange={handleCurrencyChange('ats')}
                    className="pl-10 font-mono"
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Comissões</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                  <Input
                    value={formState.comissoes}
                    onChange={handleCurrencyChange('comissoes')}
                    className="pl-10 font-mono"
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Insalubridade</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                  <Input
                    value={formState.insalubridade}
                    onChange={handleCurrencyChange('insalubridade')}
                    className="pl-10 font-mono"
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Gratificações</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                  <Input
                    value={formState.gratificacoes}
                    onChange={handleCurrencyChange('gratificacoes')}
                    className="pl-10 font-mono"
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Periculosidade</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                  <Input
                    value={formState.periculosidade}
                    onChange={handleCurrencyChange('periculosidade')}
                    className="pl-10 font-mono"
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Quebra de Caixa (%)</Label>
                <Select value={formState.quebraCaixaPercent} onValueChange={(v) => updateField('quebraCaixaPercent', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Não possui</SelectItem>
                    <SelectItem value="0.08">8%</SelectItem>
                    <SelectItem value="0.10">10%</SelectItem>
                    <SelectItem value="0.20">20%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Horas Extras e Noturno */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Horas Extras e Adicional Noturno
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Horas Extras 50%</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={formState.horasExtras50}
                  onChange={(e) => updateField('horasExtras50', e.target.value)}
                  className="font-mono"
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label>Horas Extras 100%</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={formState.horasExtras100}
                  onChange={(e) => updateField('horasExtras100', e.target.value)}
                  className="font-mono"
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label>Horas Noturnas</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={formState.horasNoturnas}
                  onChange={(e) => updateField('horasNoturnas', e.target.value)}
                  className="font-mono"
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label>Adicional Noturno (%)</Label>
                <Select value={formState.adicionalNoturnoPercent} onValueChange={(v) => updateField('adicionalNoturnoPercent', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Não possui</SelectItem>
                    <SelectItem value="0.20">20%</SelectItem>
                    <SelectItem value="0.25">25%</SelectItem>
                    <SelectItem value="0.30">30%</SelectItem>
                    <SelectItem value="0.50">50%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* DSR sobre Variáveis */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              DSR sobre Variáveis
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Dias Úteis do Mês</Label>
                <Input
                  type="number"
                  min="0"
                  max="31"
                  value={formState.dsrDiasUteis}
                  onChange={(e) => updateField('dsrDiasUteis', e.target.value)}
                  className="font-mono"
                  placeholder="Ex: 22"
                />
              </div>

              <div className="space-y-2">
                <Label>Dias Não Úteis (dom. + feriados)</Label>
                <Input
                  type="number"
                  min="0"
                  max="15"
                  value={formState.dsrDiasNaoUteis}
                  onChange={(e) => updateField('dsrDiasNaoUteis', e.target.value)}
                  className="font-mono"
                  placeholder="Ex: 5"
                />
              </div>

              <div className="space-y-2">
                <Label>DSR Calculado (R$)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                  <Input
                    value={dsrCalculado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    readOnly
                    className="pl-10 font-mono bg-muted"
                  />
                </div>
                {parseInt(formState.dsrDiasUteis) === 0 && formState.dsrDiasUteis !== '' && (
                  <p className="text-xs text-destructive">Dias úteis não pode ser zero</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Aviso Prévio (edição manual) */}
          {showAvisoOptions && formState.tipoAviso === 'INDENIZADO' && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                Aviso Prévio Indenizado
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Dias de Aviso (Calculado: {diasAvisoCalculado})
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        30 dias + 3 dias por ano completo (máx. 90)
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="90"
                    value={formState.diasAvisoEditado}
                    onChange={(e) => updateField('diasAvisoEditado', e.target.value)}
                    className="font-mono"
                    placeholder={`Automático: ${diasAvisoCalculado}`}
                  />
                </div>

                {formState.diasAvisoEditado && parseInt(formState.diasAvisoEditado) !== diasAvisoCalculado && (
                  <div className="space-y-2">
                    <Label>Justificativa da Edição *</Label>
                    <Input
                      value={formState.justificativaAvisoEditado}
                      onChange={(e) => updateField('justificativaAvisoEditado', e.target.value)}
                      placeholder="Motivo da alteração"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {showAvisoOptions && formState.tipoAviso === 'INDENIZADO' && <Separator />}

          {/* Outros dados */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="periodosFeriasVencidas">Períodos Férias Vencidas</Label>
              <Input
                id="periodosFeriasVencidas"
                type="number"
                min="0"
                max="3"
                value={formState.periodosFeriasVencidas}
                onChange={(e) => updateField('periodosFeriasVencidas', e.target.value)}
                className="font-mono"
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dependentes">Dependentes IRRF</Label>
              <Input
                id="dependentes"
                type="number"
                min="0"
                value={formState.dependentesIrrf}
                onChange={(e) => updateField('dependentesIrrf', e.target.value)}
                className="font-mono"
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mediaVariaveis" className="flex items-center gap-1">
                Média de Variáveis (12 meses)
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Média para base de férias e 13º
                  </TooltipContent>
                </Tooltip>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                <Input
                  id="mediaVariaveis"
                  value={formState.mediaVariaveis}
                  onChange={handleCurrencyChange('mediaVariaveis')}
                  className="pl-10 font-mono"
                  placeholder="0,00"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="saldoFgts" className="flex items-center gap-1">
                Saldo FGTS (para multa)
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Saldo total do FGTS para base da multa de 40% ou 20%
                  </TooltipContent>
                </Tooltip>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                <Input
                  id="saldoFgts"
                  value={formState.saldoFgts}
                  onChange={handleCurrencyChange('saldoFgts')}
                  className="pl-10 font-mono"
                  placeholder="0,00"
                />
              </div>
            </div>

            {showDescontoAviso && (
              <div className="space-y-2">
                <Label htmlFor="descontoAvisoDias">Dias de Aviso Não Cumprido</Label>
                <Input
                  id="descontoAvisoDias"
                  type="number"
                  min="0"
                  max="30"
                  value={formState.descontoAvisoDias}
                  onChange={(e) => updateField('descontoAvisoDias', e.target.value)}
                  className="font-mono"
                  placeholder="0"
                />
              </div>
            )}
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 text-base font-semibold bg-accent hover:bg-accent/90"
            disabled={!formState.salarioBase || !formState.dataAdmissao || !formState.dataDesligamento || !formState.motivoCodigo}
          >
            <Calculator className="mr-2 h-5 w-5" />
            Calcular Rescisão
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
