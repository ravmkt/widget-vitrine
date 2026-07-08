import { useState, useEffect } from "react";
import { yampiClient, YampiProduct, YampiHealth } from "@/lib/yampi";
import { normalizeYampiProduct } from "@/lib/yampi-normalizer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Bug, Tag, Database, ExternalLink, Code, Package } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ProductsPage() {
  const [products, setProducts] = useState<YampiProduct[]>([]);
  const [health, setHealth] = useState<YampiHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const h = await yampiClient.checkHealth();
      setHealth(h);
      
      const raw = await yampiClient.listRawProducts();
      const normalized = raw.map(p => normalizeYampiProduct(p)); 
      setProducts(normalized);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="container mx-auto py-10 space-y-8 bg-slate-50/50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-violet-600" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Sincronia Yampi</h1>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
            <Badge variant="outline" className={health?.env.YAMPI_ALIAS ? "text-emerald-600 border-emerald-100" : "text-red-600"}>ALIAS</Badge>
            <Badge variant="outline" className={health?.env.YAMPI_TOKEN ? "text-emerald-600 border-emerald-100" : "text-red-600"}>TOKEN</Badge>
            <Badge variant="outline" className={health?.env.YAMPI_SECRET_KEY ? "text-emerald-600 border-emerald-100" : "text-red-600"}>SECRET</Badge>
          </div>
        </div>
        <Button onClick={fetchData} disabled={loading} className="rounded-xl bg-violet-600 hover:bg-violet-700 font-bold h-12 px-6">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Sincronizar Agora
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="rounded-2xl shadow-sm">
          <Bug className="h-5 w-5" />
          <AlertTitle className="font-black">Erro de Comunicação</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[400px] w-full rounded-2xl" />
          ))
        ) : products.map((product) => (
          <Card key={product.id} className="overflow-hidden border-slate-200 shadow-sm rounded-2xl bg-white flex flex-col group transition-all hover:shadow-md">
            <div className="relative aspect-square bg-slate-50 p-4">
              <img 
                src={product.image || '/placeholder.svg'} 
                alt={product.name}
                className="w-full h-full object-contain mix-blend-multiply transition-transform group-hover:scale-105"
                onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
              />
              
              <div className="absolute top-3 left-3 flex flex-col gap-2">
                <Badge className={product.active ? "bg-emerald-500 hover:bg-emerald-600" : "bg-slate-400"}>
                  {product.active ? "Ativo" : "Inativo"}
                </Badge>
              </div>

              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="secondary" size="sm" className="rounded-full font-bold">
                      <Code className="h-4 w-4 mr-2" /> VER JSON
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh]">
                    <DialogHeader>
                      <DialogTitle>JSON Bruto: {product.name}</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="h-[60vh] w-full rounded-md border p-4 bg-slate-950">
                      <pre className="text-[11px] text-emerald-400 font-mono">
                        {JSON.stringify(product.raw, null, 2)}
                      </pre>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            
            <CardContent className="p-4 flex-1 flex flex-col">
              <div className="space-y-1 mb-4">
                <div className="flex items-center justify-between gap-1 text-[10px] font-bold text-slate-400 uppercase">
                  <span className="flex items-center gap-1"><Tag className="h-3 w-3" /> {product.sku}</span>
                  <span className="flex items-center gap-1"><Package className="h-3 w-3" /> {product.stock} un</span>
                </div>
                <h3 className="text-sm font-black text-slate-900 line-clamp-2 leading-tight min-h-[2.5rem]">
                  {product.name}
                </h3>
                <div className="bg-slate-100 p-1.5 rounded-lg text-[8px] font-mono text-slate-500">
                  <p>P: {product.debug?.pricePath}</p>
                  <p>I: {product.debug?.imagePath}</p>
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-slate-100">
                <div className="flex flex-col mb-4">
                  <span className="text-2xl font-black text-violet-600">
                    R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button asChild variant="outline" className="h-8 text-[10px] font-black rounded-lg border-slate-200 hover:bg-slate-50">
                    <a href={product.url} target="_blank" rel="noreferrer">LOJA <ExternalLink className="ml-1 h-3 w-3" /></a>
                  </Button>
                  <Button asChild className="h-8 text-[10px] font-black rounded-lg bg-slate-900 hover:bg-black" disabled={!product.checkoutUrl}>
                    <a href={product.checkoutUrl || '#'} target="_blank" rel="noreferrer">CHECKOUT</a>
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