-- Migration: Sistema de Afiliados (Indica & Ganha)
-- Data: 11/09/2026

-- 1. Adicionar colunas de indicação na tabela stores se não existirem
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stores' AND column_name = 'referral_code'
  ) THEN
    ALTER TABLE public.stores ADD COLUMN referral_code text unique;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stores' AND column_name = 'referred_by_store_id'
  ) THEN
    ALTER TABLE public.stores ADD COLUMN referred_by_store_id uuid references public.stores(id) on delete set null;
    CREATE INDEX IF NOT EXISTS idx_stores_referred_by ON public.stores(referred_by_store_id);
  END IF;
END $$;

-- 2. Garantir que todas as lojas existentes tenham um referral_code gerado
UPDATE public.stores
SET referral_code = 'VID-' || UPPER(SUBSTRING(MD5(id::text || clock_timestamp()::text) FROM 1 FOR 6))
WHERE referral_code IS NULL;

-- 3. Trigger / Default para lojas novas sempre receberem referral_code
CREATE OR REPLACE FUNCTION public.fn_generate_store_referral_code()
RETURNS trigger AS $$
BEGIN
  IF NEW.referral_code IS NULL OR NEW.referral_code = '' THEN
    NEW.referral_code := 'VID-' || UPPER(SUBSTRING(MD5(NEW.id::text || clock_timestamp()::text) FROM 1 FOR 6));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_generate_store_referral_code ON public.stores;
CREATE TRIGGER tr_generate_store_referral_code
BEFORE INSERT ON public.stores
FOR EACH ROW
EXECUTE FUNCTION public.fn_generate_store_referral_code();

-- 4. Tabela de recompensas de indicação (referral_rewards)
CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  referred_store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL DEFAULT 0.00,
  status text NOT NULL DEFAULT 'paid' CHECK (status IN ('pending', 'paid', 'canceled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer ON public.referral_rewards(referrer_store_id, status);

-- RLS para referral_rewards
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lojistas podem ver suas recompensas de indicação" ON public.referral_rewards;
CREATE POLICY "Lojistas podem ver suas recompensas de indicação"
ON public.referral_rewards
FOR SELECT
TO authenticated
USING (
  referrer_store_id IN (
    SELECT id FROM public.stores WHERE owner_user_id = auth.uid()
  )
);

-- 5. RPC get_my_affiliate_data
CREATE OR REPLACE FUNCTION public.get_my_affiliate_data()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store RECORD;
  v_total_referrals INT := 0;
  v_active_subscribers INT := 0;
  v_monthly_recurring NUMERIC(10,2) := 0.00;
  v_accumulated_earnings NUMERIC(10,2) := 0.00;
  v_referrals_json JSON := '[]'::json;
  v_result JSON;
BEGIN
  -- Identifica a loja do usuário autenticado
  SELECT * INTO v_store
  FROM public.stores
  WHERE owner_user_id = auth.uid()
  ORDER BY created_at ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'referral_code', '',
      'total_referrals', 0,
      'active_subscribers', 0,
      'monthly_recurring_earnings', 0,
      'accumulated_earnings', 0,
      'referrals', '[]'::json
    );
  END IF;

  -- Se a loja ainda não tiver referral_code, cria agora
  IF v_store.referral_code IS NULL OR v_store.referral_code = '' THEN
    UPDATE public.stores
    SET referral_code = 'VID-' || UPPER(SUBSTRING(MD5(v_store.id::text || clock_timestamp()::text) FROM 1 FOR 6))
    WHERE id = v_store.id
    RETURNING * INTO v_store;
  END IF;

  -- Total acumulado já pago / registrado em referral_rewards
  SELECT COALESCE(SUM(amount), 0.00)
  INTO v_accumulated_earnings
  FROM public.referral_rewards
  WHERE referrer_store_id = v_store.id
    AND status = 'paid';

  -- Coleta dados dos indicados
  WITH referred_stores AS (
    SELECT
      s.id,
      s.name AS store_name,
      s.created_at,
      COALESCE(sub.plan_name, 'Trial') AS plan_name,
      COALESCE(sub.status, 'trialing') AS sub_status,
      -- Estima ou obtém o preço do plano:
      CASE 
        WHEN LOWER(COALESCE(sub.plan_name, '')) LIKE '%enterprise%' THEN 297.00
        WHEN LOWER(COALESCE(sub.plan_name, '')) LIKE '%pro%' THEN 147.00
        WHEN LOWER(COALESCE(sub.plan_name, '')) LIKE '%starter%' OR LOWER(COALESCE(sub.plan_name, '')) LIKE '%basic%' THEN 67.00
        ELSE 0.00
      END AS plan_price
    FROM public.stores s
    LEFT JOIN LATERAL (
      SELECT plan_name, status
      FROM public.subscriptions
      WHERE store_id = s.id
      ORDER BY created_at DESC
      LIMIT 1
    ) sub ON true
    WHERE s.referred_by_store_id = v_store.id
    ORDER BY s.created_at DESC
  ),
  aggregated_items AS (
    SELECT
      id,
      store_name,
      created_at,
      plan_name,
      plan_price,
      sub_status AS status,
      ROUND((plan_price * 0.10)::numeric, 2) AS monthly_commission
    FROM referred_stores
  )
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'active'),
    COALESCE(SUM(monthly_commission) FILTER (WHERE status = 'active'), 0.00),
    COALESCE(json_agg(aggregated_items), '[]'::json)
  INTO
    v_total_referrals,
    v_active_subscribers,
    v_monthly_recurring,
    v_referrals_json
  FROM aggregated_items;

  v_result := json_build_object(
    'referral_code', v_store.referral_code,
    'total_referrals', v_total_referrals,
    'active_subscribers', v_active_subscribers,
    'monthly_recurring_earnings', v_monthly_recurring,
    'accumulated_earnings', v_accumulated_earnings,
    'referrals', v_referrals_json
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_affiliate_data() TO authenticated;
