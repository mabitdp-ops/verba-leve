import { ArrowDownCircle, ArrowUpCircle, FileText, TrendingUp, Wallet, Info, Edit2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ResultadoRescisao, ResultadoVerba } from '@/lib/rescisao-calculator';

interface RescisaoResultProps {
  resultado: ResultadoRescisao;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function VerbaRow({ verba }: { verba: ResultadoVerba }) {
  const isDesconto = verba.tipo === 'desconto';
  
  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        {isDesconto ? (
          <ArrowDownCircle className="h-5 w-5 text-desconto" />
        ) : (
          <ArrowUpCircle className="h-5 w-5 text-provento" />
        )}
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground">{verba.descricao}</p>
            {verba.valorEditado && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                <Edit2 className="h-2.5 w-2.5 mr-0.5" />
                Editado
              </Badge>
            )}
            {verba.detalhes && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <div className="space-y-2">
                    <p className="font-medium">{verba.detalhes.descricao}</p>
                    <p className="text-xs text-muted-foreground">{verba.detalhes.formula}</p>
                    <div className="text-xs space-y-1">
                      {Object.entries(verba.detalhes.valores).map(([key, val]) => (
                        <div key={key} className="flex justify-between gap-4">
                          <span>{key}:</span>
                          <span className="font-mono">
                            {typeof val === 'number' ? formatCurrency(val) : val}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <div className="flex gap-1 mt-1">
            {verba.incideInss && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">INSS</Badge>
            )}
            {verba.incideIrrf && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">IRRF</Badge>
            )}
            {verba.incideFgts && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">FGTS</Badge>
            )}
          </div>
        </div>
      </div>
      <div className="text-right">
        <span className={`font-mono text-base font-semibold ${isDesconto ? 'text-desconto' : 'text-provento'}`}>
          {isDesconto ? '- ' : ''}{formatCurrency(verba.valor)}
        </span>
        {verba.valorEditado && verba.valorCalculado !== undefined && (
          <p className="text-xs text-muted-foreground font-mono">
            (calc: {formatCurrency(verba.valorCalculado)})
          </p>
        )}
      </div>
    </div>
  );
}

export function RescisaoResult({ resultado }: RescisaoResultProps) {
  const proventos = resultado.verbas.filter(v => v.tipo === 'provento');
  const descontos = resultado.verbas.filter(v => v.tipo === 'desconto');

  return (
    <div className="space-y-6">
      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card-elevated border-l-4 border-l-provento">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-provento/10">
                <TrendingUp className="h-5 w-5 text-provento" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Proventos</p>
                <p className="text-xl font-bold text-provento font-mono">
                  {formatCurrency(resultado.totalProventos)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated border-l-4 border-l-desconto">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-desconto/10">
                <ArrowDownCircle className="h-5 w-5 text-desconto" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Descontos</p>
                <p className="text-xl font-bold text-desconto font-mono">
                  {formatCurrency(resultado.totalDescontos)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated border-l-4 border-l-primary">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor Líquido</p>
                <p className="text-xl font-bold text-primary font-mono">
                  {formatCurrency(resultado.liquido)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info do cálculo */}
      {(resultado.baseHoraExtra > 0 || resultado.dsrTotalValor > 0) && (
        <Card className="card-elevated bg-muted/30">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Base Hora Extra</p>
                <p className="font-mono font-semibold">{formatCurrency(resultado.baseHoraExtra)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Valor Hora</p>
                <p className="font-mono font-semibold">{formatCurrency(resultado.valorHora)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Dias Aviso</p>
                <p className="font-mono font-semibold">
                  {resultado.diasAviso} dias
                  {resultado.diasAvisoEditado && <span className="text-xs text-muted-foreground ml-1">(editado)</span>}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Anos Completos</p>
                <p className="font-mono font-semibold">{resultado.anosCompletos} ano(s)</p>
              </div>
            </div>
            
            {/* DSR Separados */}
            {(resultado.dsrHorasExtrasValor > 0 || resultado.dsrComissoesValor > 0) && (
              <>
                <Separator className="my-4" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">DSR sobre HE</p>
                    <p className="font-mono font-semibold text-provento">{formatCurrency(resultado.dsrHorasExtrasValor)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">DSR sobre Comissões</p>
                    <p className="font-mono font-semibold text-provento">{formatCurrency(resultado.dsrComissoesValor)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total DSR</p>
                    <p className="font-mono font-semibold text-provento">{formatCurrency(resultado.dsrTotalValor)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Dias</p>
                    <p className="font-mono font-semibold">{resultado.dsrDiasUteis} úteis / {resultado.dsrDiasNaoUteis} não úteis</p>
                  </div>
                </div>
              </>
            )}

            {/* Avos */}
            <Separator className="my-4" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Avos Férias</p>
                <p className="font-mono font-semibold">
                  {resultado.mesesFerias}/12
                  {resultado.avosFeriasEditado !== undefined && (
                    <span className="text-xs text-muted-foreground ml-1">(calc: {resultado.avosFeriasCalculado})</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Avos 13º</p>
                <p className="font-mono font-semibold">
                  {resultado.meses13}/12
                  {resultado.avos13Editado !== undefined && (
                    <span className="text-xs text-muted-foreground ml-1">(calc: {resultado.avos13Calculado})</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Total HE</p>
                <p className="font-mono font-semibold text-provento">{formatCurrency(resultado.totalHorasExtras)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Variáveis</p>
                <p className="font-mono font-semibold text-provento">{formatCurrency(resultado.totalVariaveis)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detalhamento */}
      <Card className="card-elevated">
        <CardHeader className="header-gradient text-primary-foreground rounded-t-lg">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Detalhamento das Verbas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Proventos */}
          <div className="p-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Proventos
            </h3>
            <div className="space-y-1">
              {proventos.map((verba, index) => (
                <VerbaRow key={index} verba={verba} />
              ))}
            </div>
          </div>

          <Separator />

          {/* Descontos */}
          <div className="p-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Descontos
            </h3>
            <div className="space-y-1">
              {descontos.length > 0 ? (
                descontos.map((verba, index) => (
                  <VerbaRow key={index} verba={verba} />
                ))
              ) : null}
              
              {/* INSS e IRRF */}
              <div className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <ArrowDownCircle className="h-5 w-5 text-desconto" />
                  <p className="font-medium text-foreground">INSS</p>
                </div>
                <span className="font-mono text-base font-semibold text-desconto">
                  - {formatCurrency(resultado.inss)}
                </span>
              </div>

              {resultado.irrf > 0 && (
                <div className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <ArrowDownCircle className="h-5 w-5 text-desconto" />
                    <p className="font-medium text-foreground">IRRF</p>
                  </div>
                  <span className="font-mono text-base font-semibold text-desconto">
                    - {formatCurrency(resultado.irrf)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Total */}
          <div className="p-6 bg-primary/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Wallet className="h-6 w-6 text-primary" />
                <p className="text-lg font-semibold text-foreground">Valor Líquido a Receber</p>
              </div>
              <span className="font-mono text-2xl font-bold text-primary">
                {formatCurrency(resultado.liquido)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informações adicionais */}
      {resultado.multaFgts > 0 && (
        <Card className="card-elevated bg-accent/5 border-accent/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Wallet className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Multa FGTS</p>
                <p className="text-sm text-muted-foreground mt-1">
                  A multa de FGTS no valor de <span className="font-semibold text-accent">{formatCurrency(resultado.multaFgts)}</span> será
                  depositada diretamente na conta vinculada do FGTS do trabalhador.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
