import { useState, useEffect } from "react";
import { yampiClient, YampiProduct } from "@/lib/yampi";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Bug, CheckCircle2, XCircle, Tag, Database, ExternalLink, Image as ImageIcon } from "lucide-react";
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
      const data = await yampiClient.listProducts();
      setProducts(data);
      console.log("Produtos normalizados carregados:", data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  return (
    <div className="container mx-auto py-10 space-y-8 bg-slate-50/50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-violet-600" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Admin: Sincronia Yampi</h1>
          </div>
          <p className="text-slate-500 font-medium text-sm">
            Validando mapeamento de campos para o <strong>Video Commerce</strong>.
          </p>
        </div>
        <Button onClick={fetchProducts} disabled={loading} className="rounded-xl bg-violet-600 hover:bg-violet-700 font-bold h-12 px-6">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Sincronizar e Inspecionar
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="rounded-2xl shadow-sm">
          <Bug className="h-5 w-5" />
          <AlertTitle className="font-black">Erro de Proxy</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[450px] w-full rounded-2xl" />
          ))
        ) : products.map((product) => (
          <Card key={product.id} className="overflow-hidden border-slate-200 shadow-sm rounded-2xl bg-white flex flex-col group">
            <div className="relative aspect-square bg-slate-100 p-4">
              {product.image ? (
                <img 
                  src={product.image} 
                  alt={product.name}
                  className="w-full h-full object-contain mix-blend-multiply"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                  <ImageIcon className="h-8 w-8" />
                  <span className="text-[10px] font-bold uppercase tracking-tighter">Imagem não mapeada</span>
                </div>
              )}
              
              <div className="absolute top-3 right-3 flex flex-col gap-2">
                <Badge className={product.active ? "bg-emerald-500" : "bg-slate-400"}>
                  {product.active ? "Ativo" : "Inativo"}
                </Badge>
              </div>

              {/* Debug Overlay */}
              <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-sm p-2 text-[8px] text-white font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                <div>IMG: {product.debug?.imagePath}</div>
                <div>PRC: {product.debug?.pricePath}</div>
              </div>
            </div>
            
            <CardContent className="p-4 flex-1 flex flex-col">
              <div className="space-y-1 mb-4">
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                  <Tag className="h-3 w-3" /> SKU: {product.sku}
                </div>
                <h3 className="text-sm font-black text-slate-900 line-clamp-2 leading-tight">
                  {product.name}
                </h3>
              </div>

              <div className="mt-auto pt-4 border-t border-slate-100">
                <div className="flex flex-col mb-4">
                  <span className="text-2xl font-black text-violet-600">
                    R$ {(product.salePrice || product.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  {product.salePrice && product.price > product.salePrice && (
                    <span className="text-xs text-slate-400 line-through font-bold">
                      Original: R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button asChild variant="outline" className="h-8 text-[10px] font-black rounded-lg">
                    <a href={product.productUrl} target="_blank" rel="noreferrer">PÁGINA <ExternalLink className="ml-1 h-3 w-3" /></a>
                  </Button>
                  <Button asChild className="h-8 text-[10px] font-black rounded-lg bg-slate-900">
                    <a href={product.checkoutUrl} target="_blank" rel="noreferrer">CHECKOUT</a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}