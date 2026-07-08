import { useState, useEffect } from "react";
import { yampiClient, YampiProduct } from "@/lib/yampi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, ShoppingBag, Bug, CheckCircle2, XCircle, Tag, Database } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export default function ProductsPage() {
  const [products, setProducts] = useState<YampiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      await yampiClient.checkHealth();
      const data = await yampiClient.listProducts();
      setProducts(data);
    } catch (err: any) {
      setError(err.message || "Erro na sincronização.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <div className="container mx-auto py-10 space-y-8 bg-slate-50/50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-violet-600" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Diagnóstico Yampi</h1>
          </div>
          <p className="text-slate-500 font-medium text-sm">
            Ferramenta administrativa para validar produtos sincronizados para o <strong>Video Commerce</strong>.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-white font-bold py-1 px-3">
            {products.length} Produtos Encontrados
          </Badge>
          <Button 
            variant="default" 
            onClick={fetchProducts} 
            disabled={loading}
            className="rounded-xl bg-violet-600 hover:bg-violet-700 font-bold h-10 shadow-sm"
          >
            {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Sincronizar Catálogo
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="border-rose-200 bg-rose-50 text-rose-900 rounded-2xl p-6 shadow-sm">
          <Bug className="h-5 w-5" />
          <AlertTitle className="font-black text-lg mb-1">Falha de Integração</AlertTitle>
          <AlertDescription>
            <p className="font-bold bg-white/50 p-3 rounded-lg border border-rose-100 mb-2">{error}</p>
            <span className="text-xs font-medium text-rose-700/80">Verifique as variáveis de ambiente YAMPI_TOKEN e YAMPI_SECRET_KEY.</span>
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="overflow-hidden border-slate-200 shadow-sm rounded-2xl bg-white">
              <Skeleton className="aspect-square w-full" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            </Card>
          ))}
        </div>
      ) : products.length === 0 && !error ? (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 bg-white rounded-[2rem] border border-dashed border-slate-300">
          <div className="p-6 bg-slate-50 rounded-full">
            <ShoppingBag className="h-12 w-12 text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Catálogo Vazio</h3>
          <p className="text-slate-500 max-w-xs mx-auto font-medium">Não encontramos produtos na sua conta Yampi para esta loja (alias).</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <Card key={product.id} className="group overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-all rounded-2xl bg-white">
              <div className="relative aspect-square overflow-hidden bg-slate-100">
                {product.image_url ? (
                  <img 
                    src={product.image_url} 
                    alt={product.name}
                    className="object-contain w-full h-full p-2 group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50">
                    <ShoppingBag className="h-12 w-12" />
                  </div>
                )}
                <div className="absolute top-3 right-3 flex flex-col gap-2">
                  <div className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-tight flex items-center gap-1 shadow-sm ${product.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                    {product.active ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {product.active ? 'Ativo' : 'Inativo'}
                  </div>
                </div>
              </div>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <Tag className="h-3 w-3" /> SKU: {product.sku}
                  </div>
                  <CardTitle className="text-sm font-black text-slate-900 line-clamp-2 leading-tight min-h-[2.5rem]">
                    {product.name}
                  </CardTitle>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-black text-violet-600">
                      {product.sale_price > 0 
                        ? `R$ ${product.sale_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        : `R$ ${product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      }
                    </span>
                    {product.sale_price > 0 && product.price > product.sale_price && (
                      <span className="text-xs text-slate-400 line-through font-bold">
                        R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Button asChild variant="outline" className="w-full rounded-xl text-[10px] font-black h-9 border-slate-200 hover:bg-slate-50">
                    <a href={product.product_url} target="_blank" rel="noopener noreferrer">LOJA</a>
                  </Button>
                  <Button asChild className="w-full rounded-xl text-[10px] font-black h-9 bg-slate-900 hover:bg-black text-white">
                    <a href={product.checkout_url} target="_blank" rel="noopener noreferrer">CHECKOUT</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}