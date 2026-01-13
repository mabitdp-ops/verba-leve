import { useState } from 'react';
import { Plus, Trash2, Pencil, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { VerbaNaoTributavel, BaseCalculoNaoTributavel } from '@/lib/rescisao-calculator';

interface FormVerbasNaoTributaveisProps {
    verbas: VerbaNaoTributavel[];
    onChange: (verbas: VerbaNaoTributavel[]) => void;
}

export function FormVerbasNaoTributaveis({ verbas, onChange }: FormVerbasNaoTributaveisProps) {
    const [editingVerba, setEditingVerba] = useState<VerbaNaoTributavel | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const addVerba = (tipo: 'provento' | 'desconto', natureza: 'fixo' | 'percentual') => {
        const newVerba: VerbaNaoTributavel = {
            id: Math.random().toString(36).substr(2, 9),
            descricao: '',
            tipo,
            natureza,
            valor: 0,
            baseTipo: natureza === 'percentual' ? 'remuneracao' : undefined,
        };
        onChange([...verbas, newVerba]);
    };

    const updateVerba = (id: string, updates: Partial<VerbaNaoTributavel>) => {
        onChange(verbas.map(v => v.id === id ? { ...v, ...updates } : v));
    };

    const removeVerba = (id: string) => {
        onChange(verbas.filter(v => v.id !== id));
    };

    const openBaseModal = (verba: VerbaNaoTributavel) => {
        setEditingVerba(verba);
        setIsModalOpen(true);
    };

    const saveBase = () => {
        if (editingVerba) {
            updateVerba(editingVerba.id, {
                baseTipo: editingVerba.baseTipo,
                baseCustom: editingVerba.baseCustom
            });
        }
        setIsModalOpen(false);
    };

    const formatCurrency = (val: number) => {
        return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const getBaseLabel = (type?: BaseCalculoNaoTributavel, custom?: number) => {
        switch (type) {
            case 'remuneracao': return 'Remuneração';
            case 'salarioBase': return 'Salário Base';
            case 'salarioMinimo': return 'Salário Mínimo';
            case 'assistencial': return 'Salário Assistencial';
            case 'custom': return `Personalizado: ${formatCurrency(custom || 0)}`;
            default: return 'Remuneração';
        }
    };

    const proventos = verbas.filter(v => v.tipo === 'provento');
    const descontos = verbas.filter(v => v.tipo === 'desconto');

    const renderSection = (title: string, items: VerbaNaoTributavel[], tipo: 'provento' | 'desconto') => (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            </div>

            {/* Valores Fixos */}
            <div className="space-y-2">
                <Label className="text-xs text-muted-foreground font-medium uppercase">Valores Fixos (R$)</Label>
                {items.filter(i => i.natureza === 'fixo').map(v => (
                    <div key={v.id} className="flex gap-2 items-center animate-in fade-in slide-in-from-left-1">
                        <Input
                            placeholder="Descrição (ex: Auxílio)"
                            value={v.descricao}
                            onChange={(e) => updateVerba(v.id, { descricao: e.target.value })}
                            className="flex-1"
                        />
                        <div className="relative w-32">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
                            <Input
                                type="number"
                                placeholder="0,00"
                                value={v.valor || ''}
                                onChange={(e) => updateVerba(v.id, { valor: parseFloat(e.target.value) || 0 })}
                                className="pl-8 font-mono text-right"
                            />
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeVerba(v.id)} className="text-destructive hover:text-destructive/80">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addVerba(tipo, 'fixo')}
                    className="w-full border-dashed border-2 text-xs"
                >
                    <Plus className="h-3 w-3 mr-1" /> Adicionar {tipo} fixo
                </Button>
            </div>

            {/* Valores Percentuais */}
            <div className="space-y-2">
                <Label className="text-xs text-muted-foreground font-medium uppercase">Calculados em %</Label>
                {items.filter(i => i.natureza === 'percentual').map(v => (
                    <div key={v.id} className="p-3 border rounded-lg bg-muted/20 space-y-2 animate-in fade-in slide-in-from-left-1">
                        <div className="flex gap-2 items-center">
                            <Input
                                placeholder="Descrição (ex: Pensão)"
                                value={v.descricao}
                                onChange={(e) => updateVerba(v.id, { descricao: e.target.value })}
                                className="flex-1"
                            />
                            <div className="relative w-24">
                                <Input
                                    type="number"
                                    placeholder="%"
                                    value={v.valor || ''}
                                    onChange={(e) => updateVerba(v.id, { valor: parseFloat(e.target.value) || 0 })}
                                    className="pr-6 font-mono text-right"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => removeVerba(v.id)} className="text-destructive hover:text-destructive/80">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex items-center justify-between text-xs px-1">
                            <span className="text-muted-foreground">
                                Base: <strong className="text-foreground">{getBaseLabel(v.baseTipo, v.baseCustom)}</strong>
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 gap-1 text-primary hover:text-primary/80"
                                onClick={() => openBaseModal(v)}
                            >
                                <Pencil className="h-3 w-3" /> Alterar Base
                            </Button>
                        </div>
                    </div>
                ))}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addVerba(tipo, 'percentual')}
                    className="w-full border-dashed border-2 text-xs"
                >
                    <Plus className="h-3 w-3 mr-1" /> Adicionar {tipo} em %
                </Button>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold tracking-tight">Verbas não tributáveis</h3>
                <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-none px-2 py-0 h-5 text-[10px] uppercase">
                    Não entram em INSS / IRRF / FGTS
                </Badge>
            </div>

            <p className="text-xs text-muted-foreground">
                Proventos e descontos que impactam apenas o salário líquido (auxílios, prêmios, empréstimos, pensão, VT 6%, etc.).
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {renderSection('Proventos não tributáveis', proventos, 'provento')}
                {renderSection('Descontos não tributáveis', descontos, 'desconto')}
            </div>

            <Separator />

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Pencil className="h-4 w-4" />
                            Base de cálculo deste item
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Selecione sobre qual valor este item em % será calculado:
                        </p>
                        <RadioGroup
                            value={editingVerba?.baseTipo}
                            onValueChange={(val: BaseCalculoNaoTributavel) => setEditingVerba(prev => prev ? { ...prev, baseTipo: val } : null)}
                        >
                            <div className="space-y-2">
                                {[
                                    { value: 'remuneracao', label: 'Remuneração (Padrão)', info: 'Soma do salário base + médias variáveis' },
                                    { value: 'salarioBase', label: 'Salário Base', info: 'Salário bruto contratual sem adicionais' },
                                    { value: 'salarioMinimo', label: 'Salário Mínimo', info: 'Valor vigente definido na configuração' },
                                    { value: 'assistencial', label: 'Salário Assistencial', info: 'Geralmente igual ao salário base' },
                                ].map((option) => (
                                    <Label key={option.value} className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                                        <RadioGroupItem value={option.value} className="mt-1" />
                                        <div className="grid gap-0.5">
                                            <span className="font-medium">{option.label}</span>
                                            <span className="text-[10px] text-muted-foreground leading-none">{option.info}</span>
                                        </div>
                                    </Label>
                                ))}

                                <Label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                                    <RadioGroupItem value="custom" className="mt-1" />
                                    <div className="grid gap-1.5 flex-1">
                                        <span className="font-medium">Outro valor específico</span>
                                        {editingVerba?.baseTipo === 'custom' && (
                                            <div className="relative w-full animate-in zoom-in-95 duration-200">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
                                                <Input
                                                    type="number"
                                                    placeholder="0,00"
                                                    className="h-8 pl-8 font-mono text-sm"
                                                    value={editingVerba.baseCustom || ''}
                                                    onChange={(e) => setEditingVerba(prev => prev ? { ...prev, baseCustom: parseFloat(e.target.value) || 0 } : null)}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                        <Button onClick={saveBase}>Salvar Base</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
