import { useState, useEffect } from "react";
import { yampiClient, YampiProduct } from "@/lib/yampi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, RefreshCw, AlertCircle, ShoppingBag, Bug } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ProductsPage() {
  const [products, setProducts] = useState<YampiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      // Primeiro valida o ambiente
      await yampiClient.checkHealth();
      // Depois busca produtos
      const data = await yampiClient.listProducts();
      setProducts(data);
    } catch (err: any) {
      console.error("Erro na integração:", err);
      setError(err.message || "Ocorreu um erro ao carregar os produtos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <div className="container mx-auto py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Integração Yampi</h1>
          <p className="text-slate-500 font-medium">Sincronização segura de produtos via backend proxy.</p>
        </div>
        <Button 
          variant="outline" 
          onClick={fetchProducts} 
          disabled={loading}
          className="rounded-full border-slate-200 hover:bg-slate-50 font-bold"
        >
          {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Sincronizar
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="border-rose-200 bg-rose-50 text-rose-900 rounded-2xl p-6">
          <Bug className="h-5 w-5" />
          <AlertTitle className="font-black text-lg mb-1">Diagnóstico de Erro</AlertTitle>
          <AlertDescription className="space-y-4">
            <p className="font-bold bg-white/50 p-3 rounded-lg border border-rose-100">
              {error}
            </p>
            <div className="text-xs font-medium text-rose-700/80 leading-relaxed">
              Dica: Erros 401 sugerem que o <strong>YAMPI_TOKEN</strong> ou o <strong>YAMPI_SECRET_KEY</strong> no seu arquivo .env estão incorretos. 
              Erros 404 sugerem que o <strong>YAMPI_ALIAS</strong> (nome da loja na URL) não foi encontrado.
            </div>
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="overflow-hidden border-slate-100 shadow-sm rounded-3xl">
              <Skeleton className="aspect-square w-full" />
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : products.length === 0 && !error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="p-6 bg-slate-100 rounded-full">
            <ShoppingBag className="h-12 w-12 text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Nenhum produto encontrado</h3>
          <p className="text-slate-500 max-w-xs mx-auto font-medium">Verifique se sua conta Yampi possui produtos cadastrados e visíveis no catálogo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <Card key={product.id} className="group overflow-hidden border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 rounded-3xl bg-white">
              <div className="relative aspect-square overflow-hidden bg-slate-50">
                {product.image_url ? (
                  <img 
                    src={product.image_url} 
                    alt={product.name}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <ShoppingBag className="h-12 w-12" />
                  </div>
                )}
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black text-violet-600 shadow-sm">
                  Yampi
                </div>
              </div>
              <CardHeader className="p-4 pb-0">
                <CardTitle className="text-sm font-black text-slate-900 line-clamp-2 leading-tight min-h-[2.5rem]">
                  {product.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-black text-violet-600">
                    R$ {product.sale_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  {product.price > product.sale_price && (
                    <span className="text-xs text-slate-400 line-through font-bold">
                      R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    asChild 
                    variant="outline" 
                    className="w-full rounded-2xl text-[10px] uppercase tracking-widest font-black h-9 border-slate-200"
                  >
                    <a href={product.product_url} target="_blank" rel="noopener noreferrer">
                      Ver Loja <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </Button>
                  <Button 
                    asChild
                    className="w-full rounded-2xl text-[10px] uppercase tracking-widest font-black h-9 bg-violet-600 hover:bg-violet-700"
                  >
                    <a href={product.checkout_url} target="_blank" rel="noopener noreferrer">
                      Checkout
                    </a>
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