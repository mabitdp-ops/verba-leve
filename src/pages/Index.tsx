import { useState } from 'react';
import { Scale, Shield, BookOpen } from 'lucide-react';
import { RescisaoForm } from '@/components/RescisaoForm';
import { RescisaoResult } from '@/components/RescisaoResult';
import { calcularRescisao, DadosRescisao, ResultadoRescisao } from '@/lib/rescisao-calculator';
import { Badge } from '@/components/ui/badge';

const Index = () => {
  const [resultado, setResultado] = useState<ResultadoRescisao | null>(null);

  const handleCalculate = (dados: DadosRescisao) => {
    const result = calcularRescisao(dados);
    setResultado(result);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="header-gradient text-primary-foreground">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-primary-foreground/10 backdrop-blur-sm">
              <Scale className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                Calculadora de Rescisão Trabalhista
              </h1>
              <p className="text-primary-foreground/80 text-sm md:text-base mt-1">
                Cálculo completo conforme CLT e legislação vigente
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-6">
            <Badge variant="secondary" className="bg-primary-foreground/10 text-primary-foreground border-0">
              <Shield className="h-3 w-3 mr-1" />
              Tabela INSS 2025
            </Badge>
            <Badge variant="secondary" className="bg-primary-foreground/10 text-primary-foreground border-0">
              <BookOpen className="h-3 w-3 mr-1" />
              Tabela IRRF 2025
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Formulário */}
          <div>
            <RescisaoForm onCalculate={handleCalculate} />
          </div>

          {/* Resultado */}
          <div>
            {resultado ? (
              <RescisaoResult resultado={resultado} />
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center py-16 px-8 rounded-2xl border-2 border-dashed border-muted-foreground/20">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                    <Scale className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Aguardando Cálculo
                  </h3>
                  <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                    Preencha os dados do funcionário ao lado e clique em calcular para ver o resultado detalhado
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-auto">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-sm text-muted-foreground">
            Cálculo baseado na CLT e tabelas vigentes. Este simulador é apenas informativo e não substitui orientação profissional.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
