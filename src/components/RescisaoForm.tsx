import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Calculator, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { rescisaoConfig } from '@/lib/rescisao-config';
import { DadosRescisao } from '@/lib/rescisao-calculator';

interface RescisaoFormProps {
  onCalculate: (dados: DadosRescisao) => void;
}

export function RescisaoForm({ onCalculate }: RescisaoFormProps) {
  const [salarioBase, setSalarioBase] = useState<string>('');
  const [dataAdmissao, setDataAdmissao] = useState<Date>();
  const [dataDesligamento, setDataDesligamento] = useState<Date>();
  const [motivoCodigo, setMotivoCodigo] = useState<string>('');
  const [tipoContrato, setTipoContrato] = useState<string>('INDETERMINADO');
  const [tipoAviso, setTipoAviso] = useState<string>('INDENIZADO');
  const [diasTrabalhados, setDiasTrabalhados] = useState<string>('');
  const [periodosFeriasVencidas, setPeriodosFeriasVencidas] = useState<string>('0');
  const [saldoFgts, setSaldoFgts] = useState<string>('');
  const [dependentesIrrf, setDependentesIrrf] = useState<string>('0');
  const [mediaVariaveis, setMediaVariaveis] = useState<string>('0');
  const [descontoAvisoDias, setDescontoAvisoDias] = useState<string>('0');

  const selectedMotivo = rescisaoConfig.motivos.find(m => m.codigo === motivoCodigo);
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

  const handleSalarioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrency(e.target.value);
    setSalarioBase(formatted);
  };

  const handleSaldoFgtsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrency(e.target.value);
    setSaldoFgts(formatted);
  };

  const handleMediaVariaveisChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrency(e.target.value);
    setMediaVariaveis(formatted);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!dataAdmissao || !dataDesligamento || !motivoCodigo) {
      return;
    }

    const dados: DadosRescisao = {
      salarioBase: parseCurrency(salarioBase),
      dataAdmissao,
      dataDesligamento,
      motivoCodigo,
      tipoContrato,
      tipoAviso,
      diasTrabalhados: parseInt(diasTrabalhados) || 30,
      mesesFeriasVencidas: 0,
      periodosFeriasVencidas: parseInt(periodosFeriasVencidas) || 0,
      saldoFgts: parseCurrency(saldoFgts),
      dependentesIrrf: parseInt(dependentesIrrf) || 0,
      mediaVariaveis: parseCurrency(mediaVariaveis),
      descontoAvisoDias: parseInt(descontoAvisoDias) || 0,
    };

    onCalculate(dados);
  };

  return (
    <Card className="card-elevated">
      <CardHeader className="header-gradient text-primary-foreground rounded-t-lg">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Calculator className="h-5 w-5" />
          Dados da Rescisão
        </CardTitle>
        <CardDescription className="text-primary-foreground/80">
          Preencha as informações do funcionário
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Motivo da Rescisão */}
          <div className="space-y-2">
            <Label htmlFor="motivo" className="text-sm font-medium">
              Motivo da Rescisão *
            </Label>
            <Select value={motivoCodigo} onValueChange={setMotivoCodigo}>
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
              <Label>Data de Admissão *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dataAdmissao && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataAdmissao ? format(dataAdmissao, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataAdmissao}
                    onSelect={setDataAdmissao}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Data de Desligamento *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dataDesligamento && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataDesligamento ? format(dataDesligamento, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataDesligamento}
                    onSelect={setDataDesligamento}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Tipo de Contrato e Aviso */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Contrato</Label>
              <Select value={tipoContrato} onValueChange={setTipoContrato}>
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
                <Select value={tipoAviso} onValueChange={setTipoAviso}>
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

          {/* Valores */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  value={salarioBase}
                  onChange={handleSalarioChange}
                  className="pl-10 font-mono"
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mediaVariaveis" className="flex items-center gap-1">
                Média de Variáveis
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Média de comissões, horas extras, adicionais, etc.
                  </TooltipContent>
                </Tooltip>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                <Input
                  id="mediaVariaveis"
                  value={mediaVariaveis}
                  onChange={handleMediaVariaveisChange}
                  className="pl-10 font-mono"
                  placeholder="0,00"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="diasTrabalhados">Dias Trabalhados no Mês</Label>
              <Input
                id="diasTrabalhados"
                type="number"
                min="0"
                max="31"
                value={diasTrabalhados}
                onChange={(e) => setDiasTrabalhados(e.target.value)}
                className="font-mono"
                placeholder="30"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="periodosFeriasVencidas">Períodos Férias Vencidas</Label>
              <Input
                id="periodosFeriasVencidas"
                type="number"
                min="0"
                max="3"
                value={periodosFeriasVencidas}
                onChange={(e) => setPeriodosFeriasVencidas(e.target.value)}
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
                value={dependentesIrrf}
                onChange={(e) => setDependentesIrrf(e.target.value)}
                className="font-mono"
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="saldoFgts" className="flex items-center gap-1">
                Saldo FGTS (para cálculo da multa)
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
                  value={saldoFgts}
                  onChange={handleSaldoFgtsChange}
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
                  value={descontoAvisoDias}
                  onChange={(e) => setDescontoAvisoDias(e.target.value)}
                  className="font-mono"
                  placeholder="0"
                />
              </div>
            )}
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 text-base font-semibold bg-accent hover:bg-accent/90"
            disabled={!salarioBase || !dataAdmissao || !dataDesligamento || !motivoCodigo}
          >
            <Calculator className="mr-2 h-5 w-5" />
            Calcular Rescisão
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
