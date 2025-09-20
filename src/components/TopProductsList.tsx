import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package } from 'lucide-react';

type ProductData = {
  name: string;
  quantity: number;
};

type TopProductsListProps = {
  data: ProductData[];
};

const TopProductsList = ({ data }: TopProductsListProps) => {
  return (
    <div className="p-0.5 rounded-lg bg-gradient-to-r from-pink-500 via-primary to-green-400">
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Produtos Mais Vendidos (Mês)</CardTitle>
          <CardDescription>Os produtos com maior volume de vendas no mês atual.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((product, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" /> {product.name}
                    </TableCell>
                    <TableCell className="text-right">{product.quantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
              Nenhum produto vendido neste mês.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TopProductsList;