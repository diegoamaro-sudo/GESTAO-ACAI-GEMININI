import { useQuery } from '@tanstack/react-query';
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

type Despesa = {
  id: string;
  descricao: string;
  valor: number;
  categoria: string;
  data: string;
};

const fetchDespesas = async () => {
  const { data, error } = await supabase
    .from('despesas')
    .select('*')
    .order('data', { ascending: false });

  if (error) {
    throw new Error('Erro ao buscar despesas: ' + error.message);
  }
  return data || [];
};

const Despesas = () => {
  const { data: despesas, isLoading } = useQuery<Despesa[]>({
    queryKey: ['despesas'],
    queryFn: fetchDespesas,
  });

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Despesas</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : despesas && despesas.length > 0 ? (
              despesas.map((despesa) => (
                <TableRow key={despesa.id}>
                  <TableCell className="font-medium">{despesa.descricao}</TableCell>
                  <TableCell>
                    <Badge variant={despesa.categoria === 'fixa' ? 'destructive' : 'secondary'}>
                      {despesa.categoria === 'fixa' ? 'Fixa' : 'Variável'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-destructive">{formatCurrency(despesa.valor)}</TableCell>
                  <TableCell className="text-right">{formatDate(despesa.data)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  Nenhuma despesa encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default Despesas;