import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type Venda = {
  id: string;
  created_at: string;
  valor_total: number;
  lucro_total: number;
  canais_venda: { nome: string } | null;
};

const Vendas = () => {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVendas = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('vendas')
        .select('id, created_at, valor_total, lucro_total, canais_venda(nome)')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar vendas:', error);
      } else {
        setVendas(data as Venda[] || []);
      }
      setLoading(false);
    };

    fetchVendas();
  }, []);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Vendas</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead className="text-right">Valor Total</TableHead>
              <TableHead className="text-right">Lucro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : vendas.length > 0 ? (
              vendas.map((venda) => (
                <TableRow key={venda.id}>
                  <TableCell>{formatDate(venda.created_at)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{venda.canais_venda?.nome || 'N/A'}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(venda.valor_total)}</TableCell>
                  <TableCell className="text-right text-green-600">{formatCurrency(venda.lucro_total)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  Nenhuma venda encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default Vendas;